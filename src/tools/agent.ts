import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    getHistory,
    getPolicySummary,
    getStatusOverview,
    readTokenRestriction,
    updateRiskConfig,
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

export function registerAgentTools(server: McpServer) {
    server.tool(
        "policies",
        "View active policies and risk settings",
        { token_id: CommonSchemas.tokenId },
        async ({ token_id }) => {
            try {
                return asToolResult(await getPolicySummary(token_id));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    server.tool(
        "token_restriction",
        "Check token whitelist restriction status",
        { token_id: CommonSchemas.tokenId },
        async ({ token_id }) => {
            try {
                return asToolResult(await readTokenRestriction(token_id));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    server.tool(
        "status",
        "One-shot readiness overview: vault, operator session, access blockers, warnings, and next actions",
        { token_id: CommonSchemas.tokenId },
        async ({ token_id }) => {
            try {
                return asToolResult(await getStatusOverview(token_id));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    server.tool(
        "history",
        "Show recent transactions executed through the vault",
        {
            token_id: CommonSchemas.tokenId,
            limit: z.number().default(10),
        },
        async ({ token_id, limit }) => {
            try {
                return asToolResult(await getHistory(token_id, limit));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    server.tool(
        "config",
        "Configure risk parameters",
        {
            token_id: CommonSchemas.tokenId.describe("Agent Token ID"),
            tx_limit: z.string().optional().describe("Max BNB per tx"),
            daily_limit: z.string().optional().describe("Max BNB per day"),
            cooldown: z.string().optional().describe("Seconds between tx"),
        },
        async ({ token_id, tx_limit, daily_limit, cooldown }) => {
            try {
                return asToolResult(await updateRiskConfig(token_id, {
                    txLimit: tx_limit,
                    dailyLimit: daily_limit,
                    cooldown,
                }));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );
}
