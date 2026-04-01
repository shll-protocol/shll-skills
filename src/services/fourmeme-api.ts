/**
 * Four.meme Public HTTP API Wrapper
 * Data queries only — no on-chain execution.
 * Endpoints reverse-engineered from official @four-meme/four-meme-ai CLI.
 * Base: https://four.meme/meme-api/v1
 */

import { SkillError } from "../shared/errors.js";

const API_BASE = "https://four.meme/meme-api/v1";
const DEFAULT_TIMEOUT = 10_000; // 10s

// ═══════════════════════════════════════════════════════
//                  Types
// ═══════════════════════════════════════════════════════

/** Ranking types aligned with official API RankingType enum */
export type FourMemeRankingType =
    | "NEW" | "PROGRESS" | "HOT" | "DEX" | "CAP" | "VOL"
    | "VOL_MIN_5" | "VOL_MIN_30" | "VOL_HOUR_1" | "VOL_HOUR_4" | "VOL_DAY_1"
    | "LAST" | "BURN";

export interface FourMemeRankingParams {
    type: FourMemeRankingType;
    pageSize?: number;
    symbol?: string;
    version?: string;
    rankingKind?: string;
    minCap?: number;
    maxCap?: number;
    minVol?: number;
    maxVol?: number;
    minHold?: number;
    maxHold?: number;
}

export interface FourMemeTokenListParams {
    type?: string;        // HOT | NEW | PROGRESS | VOL | ...
    listType?: string;    // NOR | BIN | BIN_DEX | USD1 | USD1_DEX
    keyword?: string;
    tag?: string[];
    status?: string;      // PUBLISH | TRADE | ALL
    sort?: "ASC" | "DESC";
    version?: string;
    pageIndex?: number;
    pageSize?: number;
}

export interface FourMemeRankingItem {
    address: string;
    name: string;
    symbol: string;
    marketCap?: number;
    volume24h?: number;
    progress?: number;
    holders?: number;
    creatorType?: number;
    [key: string]: unknown;
}

export interface FourMemeApiResponse<T = unknown> {
    code: number;
    msg: string;
    data: T;
}

// ═══════════════════════════════════════════════════════
//                  HTTP Helper
// ═══════════════════════════════════════════════════════

async function fourPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
        const res = await fetch(`${API_BASE}${path}`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new SkillError("RPC_ERROR", `Four.meme API ${path} failed: ${res.status} ${text}`);
        }
        const json = await res.json() as FourMemeApiResponse<T>;
        if (json.code !== 0 && json.code !== 200) {
            throw new SkillError("RPC_ERROR", `Four.meme API error: ${json.msg || JSON.stringify(json)}`);
        }
        return json.data;
    } catch (e) {
        if (e instanceof SkillError) throw e;
        const msg = e instanceof Error ? e.message : String(e);
        throw new SkillError("RPC_ERROR", `Four.meme API request failed: ${msg}`);
    } finally {
        clearTimeout(timer);
    }
}

async function fourGet<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: { "Accept": "application/json" },
            signal: controller.signal,
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new SkillError("RPC_ERROR", `Four.meme API ${path} failed: ${res.status} ${text}`);
        }
        const json = await res.json() as FourMemeApiResponse<T>;
        if (json.code !== 0 && json.code !== 200) {
            throw new SkillError("RPC_ERROR", `Four.meme API error: ${json.msg || JSON.stringify(json)}`);
        }
        return json.data;
    } catch (e) {
        if (e instanceof SkillError) throw e;
        const msg = e instanceof Error ? e.message : String(e);
        throw new SkillError("RPC_ERROR", `Four.meme API request failed: ${msg}`);
    } finally {
        clearTimeout(timer);
    }
}

// ═══════════════════════════════════════════════════════
//                  Public API Functions
// ═══════════════════════════════════════════════════════

/**
 * Query Four.meme token rankings.
 * POST /public/token/ranking
 */
export async function getFourMemeRankings(params: FourMemeRankingParams) {
    const body: Record<string, unknown> = {
        type: params.type,
        pageSize: Math.min(100, Math.max(1, params.pageSize ?? 20)),
    };
    if (params.symbol) body.symbol = params.symbol;
    if (params.version) body.version = params.version;
    if (params.rankingKind) body.rankingKind = params.rankingKind;
    for (const key of ["minCap", "maxCap", "minVol", "maxVol", "minHold", "maxHold"] as const) {
        if (params[key] !== undefined) body[key] = params[key];
    }

    return fourPost<FourMemeRankingItem[]>("/public/token/ranking", body);
}

/**
 * Search/filter Four.meme token list.
 * POST /public/token/search
 */
export async function getFourMemeTokenList(params: FourMemeTokenListParams) {
    const body: Record<string, unknown> = {
        type: params.type ?? "HOT",
        listType: params.listType ?? "NOR",
        pageIndex: params.pageIndex ?? 1,
        pageSize: Math.min(100, Math.max(1, params.pageSize ?? 20)),
        status: params.status ?? "ALL",
        sort: params.sort ?? "DESC",
    };
    if (params.keyword) body.keyword = params.keyword;
    if (params.tag && params.tag.length > 0) body.tag = params.tag;
    if (params.version) body.version = params.version;

    return fourPost("/public/token/search", body);
}

/**
 * Get single token detail with trading info.
 * GET /private/token/get/v2?address=<address>
 */
export async function getFourMemeTokenDetail(tokenAddress: string) {
    if (!tokenAddress || !tokenAddress.startsWith("0x")) {
        throw new SkillError("INVALID_INPUT", "Token address must start with 0x");
    }
    return fourGet(`/private/token/get/v2?address=${encodeURIComponent(tokenAddress)}`);
}

/**
 * Get Four.meme public config (raisedToken, etc.)
 * GET /public/config
 */
export async function getFourMemeConfig() {
    return fourGet("/public/config");
}
