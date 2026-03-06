/**
 * SHLL Shared Types - Common interfaces used across CLI and MCP.
 */
import type { Address } from "viem";

// Token resolution
export interface TokenInfo {
    symbol: string;
    address: Address;
    decimals: number;
}

// Recipient safety check result
export type RecipientCheckResult =
    | { ok: true; checkedRecipient?: Address; mode: "direct" | "decoded" | "no-recipient" }
    | { ok: false; reason: string };

// DexScreener pair data
export interface DexScreenerPair {
    chainId?: string;
    baseToken: { address: string; symbol: string; name: string };
    priceUsd: string;
    volume: { h24: number };
    liquidity: { usd: number };
    priceChange: { h24: number };
    fdv: number;
}

// Indexer listing type
export interface IndexerListing {
    id: string;
    agentName: string;
    agentType: string;
    pricePerDay: string;
    minDays: number;
    active: boolean;
    nfa: string;
    tokenId?: string;
    owner?: string;
}
