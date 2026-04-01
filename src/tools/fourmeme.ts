import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    buyFourMeme,
    getFourMemeInfo,
    sellFourMeme,
    getFourMemeRankings,
    getFourMemeTokenList,
    getFourMemeTokenDetail,
} from "../services/index.js";
import { CommonSchemas, formatMcpError } from "../shared/index.js";

function asToolResult(payload: unknown) {
    return {
        content: [{
            type: "text" as const,
            text: JSON.stringify(payload),
        }],
    };
}

export function registerFourMemeTools(server: McpServer) {
    // ═══════════════════════════════════════════════════════
    //   On-chain tools (existing)
    // ═══════════════════════════════════════════════════════

    server.tool(
        "four_info",
        "Query Four.meme bonding curve token info.",
        { token: z.string().describe("Token contract address on Four.meme (0x...)") },
        async ({ token }) => {
            try {
                return asToolResult(await getFourMemeInfo(token));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    server.tool(
        "four_buy",
        "Buy tokens on Four.meme bonding curve using BNB",
        {
            token_id: CommonSchemas.tokenId,
            token: z.string().describe("Token contract address on Four.meme (0x...)"),
            amount: CommonSchemas.amount.describe("BNB amount to spend"),
            slippage: CommonSchemas.slippage.default(10),
        },
        async ({ token_id, token, amount, slippage }) => {
            try {
                return asToolResult(await buyFourMeme(token_id, token, amount, slippage));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    server.tool(
        "four_sell",
        "Sell tokens on Four.meme bonding curve",
        {
            token_id: CommonSchemas.tokenId,
            token: z.string().describe("Token contract address on Four.meme (0x...)"),
            amount: CommonSchemas.amount.describe("Amount to sell"),
            slippage: CommonSchemas.slippage.default(10),
        },
        async ({ token_id, token, amount, slippage }) => {
            try {
                return asToolResult(await sellFourMeme(token_id, token, amount, slippage));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    // ═══════════════════════════════════════════════════════
    //   HTTP API query tools (new — Four.meme official API)
    // ═══════════════════════════════════════════════════════

    server.tool(
        "four_rankings",
        "Query Four.meme token rankings: hot, volume, market cap, newest, progress (graduation), etc.",
        {
            type: z.enum([
                "HOT", "NEW", "PROGRESS", "DEX", "CAP", "VOL",
                "VOL_MIN_5", "VOL_MIN_30", "VOL_HOUR_1", "VOL_HOUR_4", "VOL_DAY_1",
                "LAST", "BURN",
            ]).default("HOT").describe("Ranking type"),
            page_size: z.number().min(1).max(100).default(10).describe("Number of results"),
        },
        async ({ type, page_size }) => {
            try {
                return asToolResult(await getFourMemeRankings({ type, pageSize: page_size }));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    server.tool(
        "four_token_list",
        "Search for Four.meme tokens by keyword, tag, or type. Returns paginated token list.",
        {
            type: z.enum(["HOT", "NEW", "PROGRESS", "VOL", "LAST", "CAP", "DEX", "BURN"]).default("HOT").describe("Sort/filter type"),
            keyword: z.string().optional().describe("Search by token name or address"),
            tag: z.string().optional().describe("Comma-separated labels: Meme,AI,Defi,Games,Infra,De-Sci,Social,Depin,Charity,Others"),
            status: z.enum(["PUBLISH", "TRADE", "ALL"]).default("ALL").describe("Token status filter"),
            page_size: z.number().min(1).max(100).default(20).describe("Number of results"),
            page_index: z.number().min(1).default(1).describe("Page number (1-based)"),
        },
        async ({ type, keyword, tag, status, page_size, page_index }) => {
            try {
                const tagArray = tag ? tag.split(",").map(t => t.trim()).filter(Boolean) : undefined;
                return asToolResult(await getFourMemeTokenList({
                    type, keyword, tag: tagArray, status, pageSize: page_size, pageIndex: page_index,
                }));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    server.tool(
        "four_token_detail",
        "Get detailed info for a specific Four.meme token: price, market cap, holder count, trading info, creator data.",
        {
            token: z.string().describe("Token contract address on Four.meme (0x...)"),
        },
        async ({ token }) => {
            try {
                return asToolResult(await getFourMemeTokenDetail(token));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );
}

