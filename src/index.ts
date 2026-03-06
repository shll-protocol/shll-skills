#!/usr/bin/env node

/**
 * SHLL OpenClaw - Reference CLI interacting with BNB Chain intents framework (BAP-578 NFA Agent Accounts)
 * Uses shll-policy-sdk and direct viem calls to simulate or execute operations on-chain.
 */

import { Command } from "commander";
import { SKILL_VERSION, BINDINGS_UPDATED_AT } from "./shared/index.js";
import { registerAllCommands } from "./commands/index.js";

const program = new Command();

program
    .name("shll-run")
    .description(`SHLL OpenClaw CLI v${SKILL_VERSION}. Bindings updated: ${BINDINGS_UPDATED_AT}`)
    .version(SKILL_VERSION);

// Register all modular commands
registerAllCommands(program);

program.parse(process.argv);
