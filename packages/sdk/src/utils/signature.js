"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.constructSettlementMessage = constructSettlementMessage;
/**
 * Constructs the canonical message for settlement signature verification.
 * The layout must match exactly what the on-chain program expects.
 * Message format: "X402_FLOW_SETTLE" || vaultPda (32) || providerPda (32) || amount (u64) || nonce (u64)
 */
function constructSettlementMessage(vaultPda, providerPda, amount, nonce) {
    const prefix = Buffer.from("X402_FLOW_SETTLE");
    const vaultBuffer = vaultPda.toBuffer();
    const providerBuffer = providerPda.toBuffer();
    const amountBuffer = amount.toBuffer("le", 8);
    const nonceBuffer = nonce.toBuffer("le", 8);
    return Buffer.concat([
        prefix,
        vaultBuffer,
        providerBuffer,
        amountBuffer,
        nonceBuffer,
    ]);
}
//# sourceMappingURL=signature.js.map