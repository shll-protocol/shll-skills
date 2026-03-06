/**
 * SHLL Shared Indexer Utilities - Listing resolution and indexer API calls.
 */
import { DEFAULT_INDEXER, DEFAULT_LISTING_ID, DEFAULT_NFA, DEXSCREENER_API } from "./constants.js";
import type { IndexerListing, DexScreenerPair } from "./types.js";
import { isValidListingId, toSafeInt } from "./security.js";

export function normalizeIndexerListing(raw: unknown): IndexerListing | null {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id : "";
    const nfa = typeof item.nfa === "string" ? item.nfa : "";
    if (!isValidListingId(id)) return null;

    const pricePerDayRaw = item.pricePerDay;
    const pricePerDay = typeof pricePerDayRaw === "string"
        || typeof pricePerDayRaw === "number"
        || typeof pricePerDayRaw === "bigint"
        ? String(pricePerDayRaw)
        : "0";

    return {
        id,
        agentName: typeof item.agentName === "string" ? item.agentName : "",
        agentType: typeof item.agentType === "string" ? item.agentType : "",
        pricePerDay,
        minDays: Math.max(0, toSafeInt(item.minDays, 0)),
        active: item.active === true,
        nfa,
        tokenId: typeof item.tokenId === "string" ? item.tokenId : undefined,
        owner: typeof item.owner === "string" ? item.owner : undefined,
    };
}

export async function fetchActiveListings(indexerUrl?: string): Promise<IndexerListing[]> {
    const normalized = (indexerUrl || DEFAULT_INDEXER).replace(/\/+$/, "");
    const res = await fetch(`${normalized}/api/listings`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Indexer returned ${res.status}`);
    const data = await res.json() as { items?: unknown };
    const items = Array.isArray(data.items) ? data.items : [];
    return items
        .map((raw) => normalizeIndexerListing(raw))
        .filter((l): l is IndexerListing => l !== null && l.active);
}

export function pickPreferredListing(listings: IndexerListing[]): IndexerListing | null {
    if (listings.length === 0) return null;
    const nfaLower = DEFAULT_NFA.toLowerCase();
    const sameNfa = listings.filter((l) => (l.nfa || "").toLowerCase() === nfaLower);
    const pool = sameNfa.length > 0 ? sameNfa : listings;
    return pool.find((l) => l.id.toLowerCase() === DEFAULT_LISTING_ID.toLowerCase()) || pool[0] || null;
}

export async function resolveSetupListing(listingId?: string, indexerUrl?: string) {
    if (listingId) {
        return {
            listingId,
            source: "manual" as const,
            listing: null as IndexerListing | null,
            warning: null as string | null,
        };
    }

    try {
        const active = await fetchActiveListings(indexerUrl);
        const selected = pickPreferredListing(active);
        if (selected) {
            return {
                listingId: selected.id,
                source: "indexer-auto" as const,
                listing: selected,
                warning: null as string | null,
            };
        }
        return {
            listingId: DEFAULT_LISTING_ID,
            source: "default-fallback" as const,
            listing: null as IndexerListing | null,
            warning: "No active listings returned by indexer; fell back to default listing_id.",
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown indexer error";
        return {
            listingId: DEFAULT_LISTING_ID,
            source: "default-fallback" as const,
            listing: null as IndexerListing | null,
            warning: `Failed to fetch listings from indexer (${message}); fell back to default listing_id.`,
        };
    }
}

// === DexScreener helpers ===

export async function fetchTokenPrice(tokenAddress: string): Promise<DexScreenerPair | null> {
    try {
        const resp = await fetch(`${DEXSCREENER_API}/tokens/${tokenAddress}`, {
            signal: AbortSignal.timeout(8000),
        });
        if (!resp.ok) return null;
        const data = await resp.json() as { pairs?: DexScreenerPair[] };
        if (!data.pairs || data.pairs.length === 0) return null;
        return data.pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    } catch {
        return null;
    }
}

export async function searchToken(query: string): Promise<DexScreenerPair[]> {
    try {
        const encoded = encodeURIComponent(query);
        const resp = await fetch(`${DEXSCREENER_API}/search?q=${encoded}`, {
            signal: AbortSignal.timeout(8000),
        });
        if (!resp.ok) return [];
        const data = await resp.json() as { pairs?: DexScreenerPair[] };
        return (data.pairs || [])
            .filter((p) => p.chainId === "bsc")
            .slice(0, 10);
    } catch {
        return [];
    }
}
