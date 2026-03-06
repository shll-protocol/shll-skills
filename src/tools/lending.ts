import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { lendToken, redeemToken } from "../services/index.js";
import { CommonSchemas, formatMcpError } from "../shared/index.js";

function asToolResult(payload: unknown) {
    return {
        content: [{
            type: "text" as const,
            text: JSON.stringify(payload),
        }],
    };
}

export function registerLendingTools(server: McpServer) {
    server.tool(
        "lend",
        "Supply assets to Venus Protocol to earn interest",
        {
            token_id: CommonSchemas.tokenId,
            token: z.string().describe("Token to supply (BNB, USDC, USDT)"),
            amount: CommonSchemas.amount,
        },
        async ({ token_id, token, amount }) => {
            try {
                return asToolResult(await lendToken(token_id, token, amount));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    server.tool(
        "redeem",
        "Redeem assets from Venus Protocol",
        {
            token_id: CommonSchemas.tokenId,
            token: z.string().describe("Underlying token to redeem (BNB, USDC, USDT)"),
            amount: CommonSchemas.amount.describe("Amount of underlying to redeem (human-readable)"),
        },
        async ({ token_id, token, amount }) => {
            try {
                return asToolResult(await redeemToken(token_id, token, amount));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );
}
