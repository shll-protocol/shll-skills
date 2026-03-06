import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeSwap, unwrapWbnb, wrapBnb } from "../services/index.js";
import { CommonSchemas, formatMcpError } from "../shared/index.js";

function asToolResult(payload: unknown) {
    return {
        content: [{
            type: "text" as const,
            text: JSON.stringify(payload),
        }],
    };
}

export function registerDefiTools(server: McpServer) {
    server.tool(
        "swap",
        "Swap tokens using PancakeSwap V2/V3 (default: V3)",
        {
            token_id: CommonSchemas.tokenId,
            from_token: z.string().describe("Symbol or Address to sell"),
            to_token: z.string().describe("Symbol or Address to buy"),
            amount: CommonSchemas.amount,
            version: z.enum(["V2", "V3"]).default("V3").describe("PancakeSwap version"),
            slippage: CommonSchemas.slippage.default(2),
        },
        async ({ token_id, from_token, to_token, amount, version, slippage }) => {
            try {
                return asToolResult(await executeSwap({
                    tokenId: token_id,
                    fromToken: from_token,
                    toToken: to_token,
                    amount,
                    version,
                    slippage,
                }));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    server.tool(
        "wrap",
        "Wrap BNB to WBNB",
        { token_id: CommonSchemas.tokenId, amount: CommonSchemas.amount.describe("BNB amount to wrap") },
        async ({ token_id, amount }) => {
            try {
                return asToolResult(await wrapBnb(token_id, amount));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    server.tool(
        "unwrap",
        "Unwrap WBNB to BNB",
        { token_id: CommonSchemas.tokenId, amount: CommonSchemas.amount.describe("WBNB amount to unwrap") },
        async ({ token_id, amount }) => {
            try {
                return asToolResult(await unwrapWbnb(token_id, amount));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );
}
