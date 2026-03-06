/**
 * SHLL Token Registry - Known BSC tokens with addresses and decimals.
 * Single source of truth used by both CLI and MCP.
 */
import type { Address } from "viem";
import { WBNB } from "./constants.js";
import type { TokenInfo } from "./types.js";

export const TOKEN_REGISTRY: Record<string, TokenInfo> = {
    BNB: { symbol: "BNB", address: "0x0000000000000000000000000000000000000000" as Address, decimals: 18 },
    WBNB: { symbol: "WBNB", address: WBNB as Address, decimals: 18 },
    USDT: { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955" as Address, decimals: 18 },
    USDC: { symbol: "USDC", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" as Address, decimals: 18 },
    BUSD: { symbol: "BUSD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56" as Address, decimals: 18 },
    CAKE: { symbol: "CAKE", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82" as Address, decimals: 18 },
    ETH: { symbol: "ETH", address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8" as Address, decimals: 18 },
    BTCB: { symbol: "BTCB", address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c" as Address, decimals: 18 },
    DAI: { symbol: "DAI", address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3" as Address, decimals: 18 },
};

/**
 * Resolve a token symbol or 0x address to its full TokenInfo.
 * For unknown 0x addresses, defaults to 18 decimals.
 */
export function resolveToken(symbolOrAddress: string): TokenInfo {
    const upper = symbolOrAddress.toUpperCase();
    if (TOKEN_REGISTRY[upper]) return TOKEN_REGISTRY[upper];
    if (symbolOrAddress.startsWith("0x") && symbolOrAddress.length === 42) {
        return { symbol: symbolOrAddress.slice(0, 8), address: symbolOrAddress as Address, decimals: 18 };
    }
    throw new Error(`Unknown token: ${symbolOrAddress}. Known: ${Object.keys(TOKEN_REGISTRY).join(", ")}`);
}

/**
 * Parse a human-readable amount string to wei/smallest unit.
 * Supports decimal notation ("0.5") and integer notation ("500000000000000000").
 */
export function parseAmount(amountStr: string, decimals: number): bigint {
    if (amountStr.includes(".")) {
        const [whole, frac = ""] = amountStr.split(".");
        const paddedFrac = frac.padEnd(decimals, "0").slice(0, decimals);
        return BigInt(whole || "0") * (10n ** BigInt(decimals)) + BigInt(paddedFrac);
    }
    // Heuristic: if the string has >10 digits, assume it's already in smallest unit (wei).
    // This means amounts like "99999999999" (100B units) will be treated as raw wei.
    // For tokens with 0 decimals where large whole-unit amounts are expected, use decimal
    // notation (e.g. "99999999999.0") to bypass this heuristic.
    if (amountStr.length > 10) return BigInt(amountStr);
    // Otherwise treat as whole units
    return BigInt(amountStr) * (10n ** BigInt(decimals));
}

const tokenResolveCache = new Map<string, TokenInfo>();

/**
 * Resolves an unknown token by fetching its symbol and decimals on-chain, and caches the result.
 */
export async function resolveTokenAsync(publicClient: any, input: string): Promise<TokenInfo> {
    const upper = input.toUpperCase();
    if (TOKEN_REGISTRY[upper]) return TOKEN_REGISTRY[upper];

    // Use lowercase for address cache keys to avoid checksum-related duplicates
    const cacheKey = input.startsWith("0x") ? input.toLowerCase() : upper;
    if (tokenResolveCache.has(cacheKey)) return tokenResolveCache.get(cacheKey)!;

    try {
        const address = input as Address;
        const [decimals, symbol] = await Promise.all([
            publicClient.readContract({ address, abi: [{ name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }], functionName: "decimals" }),
            publicClient.readContract({ address, abi: [{ name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] }], functionName: "symbol" })
        ]);
        const info = { symbol: symbol as string, address, decimals: Number(decimals) };
        tokenResolveCache.set(cacheKey, info);
        return info;
    } catch {
        const fallback = { symbol: input.slice(0, 8), address: input as Address, decimals: 18 };
        tokenResolveCache.set(cacheKey, fallback);
        return fallback;
    }
}
