"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USDC_MINT_DEVNET = exports.CASH_MINT_DEVNET = exports.FLOW_VAULT_PROGRAM_ID = void 0;
const web3_js_1 = require("@solana/web3.js");
/**
 * The on-chain Program ID for the FlowVault program.
 */
exports.FLOW_VAULT_PROGRAM_ID = new web3_js_1.PublicKey("Ca5JKghY5ECswAfm3NkvxeEXFmCongnnfkvpFyr5Yirg");
/**
 * [BOUNTY: Phantom $CASH]
 * Devnet mint for Phantom CASH bounty
 */
exports.CASH_MINT_DEVNET = new web3_js_1.PublicKey("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
/**
 * Devnet mint for USDC
 */
exports.USDC_MINT_DEVNET = new web3_js_1.PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
//# sourceMappingURL=constants.js.map