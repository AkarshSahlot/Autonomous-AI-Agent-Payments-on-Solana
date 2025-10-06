"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlashClient = void 0;
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const spl_token_1 = require("@solana/spl-token");
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const isomorphic_ws_1 = __importDefault(require("isomorphic-ws"));
const flow_vault_json_1 = __importDefault(require("./idl/flow_vault.json"));
const vault_pda_1 = require("./utils/vault-pda");
const signature_1 = require("./utils/signature");
class FlashClient extends eventemitter3_1.default {
    constructor(connection, signer, options) {
        super();
        this.ws = null;
        this.providerAuthority = null;
        this.isConnected = false;
        this.connection = connection;
        this.signer = signer;
        this.options = options;
        const readOnlyWallet = {
            publicKey: signer.publicKey,
            signTransaction: (tx) => {
                return Promise.reject(new Error("This is a read-only wallet. Use the client's signer object to sign transactions."));
            },
            signAllTransactions: (txs) => {
                return Promise.reject(new Error("This is a read-only wallet. Use the client's signer object to sign transactions."));
            },
            payer: web3_js_1.Keypair.generate(),
        };
        this.provider = new anchor_1.AnchorProvider(this.connection, readOnlyWallet, anchor_1.AnchorProvider.defaultOptions());
        this.program = new anchor_1.Program(flow_vault_json_1.default, this.provider);
        [this.vaultPda] = (0, vault_pda_1.findVaultPda)(this.signer.publicKey);
    }
    /**
     * Creates and funds an on-chain FlowVault for the agent.
     * Automatically handles wrapped SOL setup if using native SOL.
     */
    async createVault(depositAmount, tokenMint) {
        const agentTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(tokenMint, this.signer.publicKey);
        const accountInfo = await this.connection.getAccountInfo(agentTokenAccount);
        if (!accountInfo) {
            console.log('Creating token account...');
            const createAtaIx = (0, spl_token_1.createAssociatedTokenAccountInstruction)(this.signer.publicKey, agentTokenAccount, this.signer.publicKey, tokenMint);
            const createAtaTx = new web3_js_1.Transaction().add(createAtaIx);
            if (tokenMint.equals(spl_token_1.NATIVE_MINT)) {
                console.log('Setting up wrapped SOL...');
                const transferIx = web3_js_1.SystemProgram.transfer({
                    fromPubkey: this.signer.publicKey,
                    toPubkey: agentTokenAccount,
                    lamports: depositAmount.toNumber() + 2039280,
                });
                const syncIx = (0, spl_token_1.createSyncNativeInstruction)(agentTokenAccount);
                createAtaTx.add(transferIx, syncIx);
            }
            await this.signAndSendTransaction(createAtaTx);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        else if (tokenMint.equals(spl_token_1.NATIVE_MINT)) {
            console.log('Wrapped SOL account exists, checking balance...');
            try {
                const tokenAccountInfo = await this.connection.getTokenAccountBalance(agentTokenAccount);
                const currentBalance = new anchor_1.BN(tokenAccountInfo.value.amount);
                if (currentBalance.lt(depositAmount)) {
                    console.log('Adding more wrapped SOL...');
                    const transferIx = web3_js_1.SystemProgram.transfer({
                        fromPubkey: this.signer.publicKey,
                        toPubkey: agentTokenAccount,
                        lamports: depositAmount.sub(currentBalance).toNumber(),
                    });
                    const syncIx = (0, spl_token_1.createSyncNativeInstruction)(agentTokenAccount);
                    const wrapTx = new web3_js_1.Transaction().add(transferIx, syncIx);
                    await this.signAndSendTransaction(wrapTx);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            catch (error) {
                console.log('Error checking balance, will try to wrap anyway:', error);
                const transferIx = web3_js_1.SystemProgram.transfer({
                    fromPubkey: this.signer.publicKey,
                    toPubkey: agentTokenAccount,
                    lamports: depositAmount.toNumber(),
                });
                const syncIx = (0, spl_token_1.createSyncNativeInstruction)(agentTokenAccount);
                const wrapTx = new web3_js_1.Transaction().add(transferIx, syncIx);
                await this.signAndSendTransaction(wrapTx);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        const [vaultTokenAccountPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("vault_token_account"), this.signer.publicKey.toBuffer()], this.program.programId);
        const tx = await this.program.methods
            .createVault(depositAmount)
            .accounts({
            agent: this.signer.publicKey,
            vault: this.vaultPda,
            vaultTokenAccount: vaultTokenAccountPda,
            agentTokenAccount: agentTokenAccount,
            tokenMint: tokenMint,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .transaction();
        await this.signAndSendTransaction(tx);
        return this.vaultPda.toBase58();
    }
    /**
     * [BOUNTY: ATXP & Visa TAP]
     * Registers the wallet as a Provider on-chain.
     */
    async registerProvider(options) {
        const [providerPda] = (0, vault_pda_1.findProviderPda)(this.signer.publicKey);
        const tx = await this.program.methods
            .registerProvider(options.visaMerchantId ?? null, options.protocol)
            .accounts({
            authority: this.signer.publicKey,
            provider: providerPda,
            destination: options.destinationTokenAccount,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .transaction();
        return this.signAndSendTransaction(tx);
    }
    async x402Fetch(url, options = {}) {
        if (!this.vaultPda) {
            throw new Error("Must create a vault before making x402 requests");
        }
        if (!this.providerAuthority) {
            throw new Error("Must call connect() before making x402 requests");
        }
        const pricePerRequest = 1000;
        const headers = {
            ...options.headers,
            "X-402-Vault": this.vaultPda.toBase58(),
            "X-402-Provider": this.providerAuthority.toBase58(),
            "X-402-Price": pricePerRequest.toString(),
        };
        const response = await fetch(url, { ...options, headers });
        if (response.status === 402) {
            const errorData = await response.json();
            throw new Error(`Payment Required: ${errorData.message}`);
        }
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
    }
    /**
     * Withdraws all remaining funds from the agent's vault.
     */
    async withdraw(agentTokenAccount) {
        const vaultAccount = await this.program.account.vault.fetch(this.vaultPda);
        const tx = await this.program.methods
            .withdraw()
            .accounts({
            agent: this.signer.publicKey,
            vault: this.vaultPda,
            vaultTokenAccount: vaultAccount.vaultTokenAccount,
            agentTokenAccount: agentTokenAccount,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
        })
            .transaction();
        return this.signAndSendTransaction(tx);
    }
    /**
     * Connects to the facilitator to begin an autonomous session.
     * [BOUNTY: Visa TAP] - Requires a valid JWT credential.
     */
    connect(providerAuthority, visaTapCredentialJwt) {
        if (this.ws) {
            console.warn("FlashClient is already connected or connecting.");
            return;
        }
        this.providerAuthority = providerAuthority;
        const url = new URL(this.options.facilitatorUrl);
        url.searchParams.set("agent", this.signer.publicKey.toBase58());
        url.searchParams.set("provider", providerAuthority.toBase58());
        url.searchParams.set("visa_tap_credential", visaTapCredentialJwt);
        this.ws = new isomorphic_ws_1.default(url.toString());
        this.ws.onopen = () => {
            this.isConnected = true;
            this.emit("connect");
        };
        this.ws.onmessage = (event) => this.handleFacilitatorMessage(event.data.toString());
        this.ws.onclose = () => {
            this.isConnected = false;
            this.ws = null;
            this.emit("disconnect");
        };
        this.ws.onerror = (error) => {
            this.emit("error", new Error(error.message));
        };
    }
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
    /**
     * Handles incoming messages from the facilitator.
     */
    async handleFacilitatorMessage(message) {
        try {
            const data = JSON.parse(message);
            switch (data.type) {
                case "request_signature":
                    await this._handleSettlementRequest({
                        amount: new anchor_1.BN(data.amount),
                        nonce: new anchor_1.BN(data.nonce),
                    });
                    break;
                case "settlement_confirmed":
                    this.emit("settlement_confirmed", data.txId);
                    break;
                case "settlement_failed":
                    this.emit("settlement_failed", data.message);
                    break;
                case "error":
                    this.emit("error", new Error(data.message || "Facilitator error"));
                    this.disconnect();
                    break;
            }
        }
        catch (error) {
            console.error("Failed to handle facilitator message", error);
        }
    }
    /**
     * Automatically signs and sends a settlement signature.
     */
    async _handleSettlementRequest(request) {
        if (!this.ws || !this.providerAuthority) {
            throw new Error("Not connected to facilitator.");
        }
        try {
            const [providerPda] = (0, vault_pda_1.findProviderPda)(this.providerAuthority);
            const message = (0, signature_1.constructSettlementMessage)(this.vaultPda, providerPda, request.amount, request.nonce);
            const signatureBytes = await this.signer.signMessage(message);
            const payload = {
                type: "settlement_signature",
                amount: request.amount.toString(),
                nonce: request.nonce.toString(),
                signature: Buffer.from(signatureBytes).toString("base64"),
            };
            this.ws.send(JSON.stringify(payload));
        }
        catch (error) {
            this.emit("error", new Error(`Failed to sign settlement: ${error.message}`));
        }
    }
    /**
     * Helper to sign and send a standard transaction.
     */
    async signAndSendTransaction(tx) {
        const { blockhash } = await this.connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = this.signer.publicKey;
        const signedTx = await this.signer.signTransaction(tx);
        const txId = await this.connection.sendRawTransaction(signedTx.serialize());
        await this.connection.confirmTransaction(txId, "confirmed");
        return txId;
    }
}
exports.FlashClient = FlashClient;
//# sourceMappingURL=FlashClient.js.map