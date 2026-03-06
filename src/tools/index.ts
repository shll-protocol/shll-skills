import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerInfoTools } from "./info.js";
import { registerDefiTools } from "./defi.js";
import { registerLendingTools } from "./lending.js";
import { registerTransferTools } from "./transfer.js";
import { registerAgentTools } from "./agent.js";
import { registerFourMemeTools } from "./fourmeme.js";
import { registerSetupTools } from "./setup.js";
import { registerCalldataTools } from "./calldata.js";

export function registerTools(server: McpServer) {
    registerInfoTools(server);
    registerDefiTools(server);
    registerLendingTools(server);
    registerTransferTools(server);
    registerAgentTools(server);
    registerFourMemeTools(server);
    registerSetupTools(server);
    registerCalldataTools(server);
}
