import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    getBalance,
    getPortfolio,
    getPrice,
    listMappedTokens,
    searchTokens,
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

export function registerInfoTools(server: McpServer) {
    server.tool(
        "portfolio",
        "Get full portfolio overview: BNB balance, mapped tokens, and agent vault details",
        { token_id: CommonSchemas.tokenId },
        async ({ token_id }) => {
            try {
                return asToolResult(await getPortfolio(token_id));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    server.tool(
        "balance",
        "Get BNB or Token balance of the agent vault",
        {
            token_id: CommonSchemas.tokenId,
            token: CommonSchemas.tokenSymbolOrAddress,
        },
        async ({ token_id, token }) => {
            try {
                return asToolResult(await getBalance(token_id, token));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    server.tool(
        "price",
        "Get live token price data from DexScreener (BSC only)",
        { token: z.string().describe("Token 0x address or symbol (if mapped)") },
        async ({ token }) => {
            try {
                return asToolResult(await getPrice(token));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    server.tool(
        "search",
        "Search for BSC tokens by name/symbol on DexScreener",
        { query: z.string().describe("Token name or symbol to search for") },
        async ({ query }) => {
            try {
                return asToolResult(await searchTokens(query));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    server.tool(
        "tokens",
        "List all pre-mapped tokens",
        {},
        async () => asToolResult(listMappedTokens()),
    );
}
