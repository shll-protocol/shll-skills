import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { transferFromVault } from "../services/index.js";
import { CommonSchemas, formatMcpError } from "../shared/index.js";

function asToolResult(payload: unknown) {
    return {
        content: [{
            type: "text" as const,
            text: JSON.stringify(payload),
        }],
    };
}

export function registerTransferTools(server: McpServer) {
    server.tool(
        "transfer",
        "Transfer ERC20 tokens or BNB to a recipient. Often blocked by ReceiverGuard policy.",
        {
            token_id: CommonSchemas.tokenId,
            to: CommonSchemas.address.describe("Recipient Ethereum address (0x...)"),
            token: CommonSchemas.tokenSymbolOrAddress,
            amount: CommonSchemas.amount,
        },
        async ({ token_id, to, token, amount }) => {
            try {
                return asToolResult(await transferFromVault(token_id, token, to, amount));
            } catch (error) {
                return formatMcpError(error);
            }
        },
    );
}
