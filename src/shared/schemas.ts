/**
 * SHLL Common Zod Schemas
 * Standardizes parameter validation across all MCP tools.
 */
import { z } from "zod";

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/i;
const LISTING_ID_REGEX = /^0x[0-9a-fA-F]{64}$/;
const HEX_DATA_REGEX = /^0x[0-9a-fA-F]*$/;

export const CommonSchemas = {
    // Standard Token ID for the Agent NFA (uint256 string)
    tokenId: z.string().describe("Agent NFA Token ID"),

    // Standard token parameter (symbol like BNB, USDC, or 0x address)
    tokenSymbolOrAddress: z.string().describe("Token symbol or 0x address. Use BNB for native."),

    // Strict contract address check
    address: z.string().regex(EVM_ADDRESS_REGEX).describe("EVM Contract or Wallet Address (0x...)"),

    // Amount in human-readable format (e.g. 1.5)
    amount: z.string().describe("Human-readable amount (e.g. 1.5)"),

    // Slippage tolerance in percentage
    slippage: z.number().describe("Slippage tolerance percent"),

    // Transaction limits
    limitAmount: z.string().optional().describe("Amount limit in BNB (human-readable)"),

    // Listing ID (bytes32 hex)
    listingId: z.string().regex(LISTING_ID_REGEX).describe("Template listing ID (bytes32 hex). Auto-select if omitted."),

    // Calldata hex
    hexData: z.string().regex(HEX_DATA_REGEX).describe("Transaction calldata hex string"),

    // Native value in wei
    weiValue: z.string().default("0").describe("Native BNB value in wei"),

    rawAction: z.object({
        target: z.string().regex(EVM_ADDRESS_REGEX),
        data: z.string().regex(HEX_DATA_REGEX),
        value: z.string().default("0"),
    }),
};
