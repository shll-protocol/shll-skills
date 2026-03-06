import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    buyFourMeme,
    getFourMemeInfo,
    sellFourMeme,
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
}
