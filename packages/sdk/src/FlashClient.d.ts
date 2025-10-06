import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import EventEmitter from "eventemitter3";
import WebSocket from "isomorphic-ws";
import { FlashClientEvents, FlashClientOptions, AutonomousSigner, RegisterProviderOptions } from "./types";
export declare class FlashClient extends EventEmitter<FlashClientEvents> {
    private connection;
    private signer;
    private options;
    private program;
    private provider;
    ws: WebSocket | null;
    private vaultPda;
    private providerAuthority;
    private isConnected;
    constructor(connection: Connection, signer: AutonomousSigner, options: FlashClientOptions);
    /**
     * Creates and funds an on-chain FlowVault for the agent.
     * Automatically handles wrapped SOL setup if using native SOL.
     */
    createVault(depositAmount: BN, tokenMint: PublicKey): Promise<string>;
    /**
     * [BOUNTY: ATXP & Visa TAP]
     * Registers the wallet as a Provider on-chain.
     */
    registerProvider(options: RegisterProviderOptions): Promise<string>;
    x402Fetch(url: string, options?: RequestInit): Promise<Response>;
    /**
     * Withdraws all remaining funds from the agent's vault.
     */
    withdraw(agentTokenAccount: PublicKey): Promise<string>;
    /**
     * Connects to the facilitator to begin an autonomous session.
     * [BOUNTY: Visa TAP] - Requires a valid JWT credential.
     */
    connect(providerAuthority: PublicKey, visaTapCredentialJwt: string): void;
    disconnect(): void;
    /**
     * Handles incoming messages from the facilitator.
     */
    private handleFacilitatorMessage;
    /**
     * Automatically signs and sends a settlement signature.
     */
    private _handleSettlementRequest;
    /**
     * Helper to sign and send a standard transaction.
     */
    private signAndSendTransaction;
}
//# sourceMappingURL=FlashClient.d.ts.map