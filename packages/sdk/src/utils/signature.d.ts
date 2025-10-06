import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
/**
 * Constructs the canonical message for settlement signature verification.
 * The layout must match exactly what the on-chain program expects.
 * Message format: "X402_FLOW_SETTLE" || vaultPda (32) || providerPda (32) || amount (u64) || nonce (u64)
 */
export declare function constructSettlementMessage(vaultPda: PublicKey, providerPda: PublicKey, amount: BN, nonce: BN): Buffer;
//# sourceMappingURL=signature.d.ts.map