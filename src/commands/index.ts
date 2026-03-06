import { Command } from "commander";
import { registerInfoCommands } from "./info.js";
import { registerDefiCommands } from "./defi.js";
import { registerLendingCommands } from "./lending.js";
import { registerTransferCommands } from "./transfer.js";
import { registerAgentCommands } from "./agent.js";
import { registerFourMemeCommands } from "./fourmeme.js";
import { registerSetupCommands } from "./setup.js";
import { registerCalldataCommands } from "./calldata.js";

export function registerAllCommands(program: Command) {
    registerInfoCommands(program);
    registerDefiCommands(program);
    registerLendingCommands(program);
    registerTransferCommands(program);
    registerAgentCommands(program);
    registerFourMemeCommands(program);
    registerSetupCommands(program);
    registerCalldataCommands(program);
}
