import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SKILL_VERSION } from "./shared/index.js";
import { registerTools } from "./tools/index.js";

const server = new McpServer({
    name: "shll-skills",
    version: SKILL_VERSION,
});

registerTools(server);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((err) => {
    process.stderr.write(`SHLL MCP Server error: ${err.message}\n`);
    process.exit(1);
});
