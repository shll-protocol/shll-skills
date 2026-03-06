import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    executeRawCalldata,
    executeRawCalldataBatch,
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

export function registerCalldataTools(server: McpServer) {
    server.tool(
        "execute_calldata",
        "Execute raw calldata through PolicyGuard safety layer.",
        {
            token_id: CommonSchemas.tokenId,
            target: CommonSchemas.address.describe("Target contract address (0x...)"),
            data: CommonSchemas.hexData,
            value: CommonSchemas.weiValue,
        },
        async ({ token_id, target, data, value }) => {
            try {
                return asToolResult(await executeRawCalldata(token_id, target, data, value));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );

    server.tool(
        "execute_calldata_batch",
        "Execute multiple raw calldata actions atomically through PolicyGuard.",
        {
            token_id: CommonSchemas.tokenId,
            actions: z.array(CommonSchemas.rawAction),
        },
        async ({ token_id, actions }) => {
            try {
                return asToolResult(await executeRawCalldataBatch(token_id, actions));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );
}
