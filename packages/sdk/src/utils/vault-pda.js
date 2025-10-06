"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findVaultPda = findVaultPda;
exports.findProviderPda = findProviderPda;
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("../constants");
function findVaultPda(agent) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("vault"), agent.toBuffer()], constants_1.FLOW_VAULT_PROGRAM_ID);
}
function findProviderPda(providerAuthority) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("provider"), providerAuthority.toBuffer()], constants_1.FLOW_VAULT_PROGRAM_ID);
}
//# sourceMappingURL=vault-pda.js.map