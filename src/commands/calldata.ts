import { Command } from "commander";
import { executeRawCalldata } from "../services/index.js";
import { addSharedOptions, output, outputError } from "./utils.js";

export function registerCalldataCommands(program: Command) {
    const rawCmd = new Command("raw")
        .description("Execute raw calldata through PolicyGuard")
        .requiredOption("-t, --target <address>", "Target contract address")
        .requiredOption("-d, --data <hex>", "Calldata hex string")
        .option("-v, --value <wei>", "Native value in wei", "0");

    addSharedOptions(rawCmd).action(async (opts) => {
        try {
            const result = await executeRawCalldata(
                opts.tokenId,
                opts.target,
                opts.data,
                opts.value,
                opts.rpc,
            );
            output(result);
        } catch (error) {
            outputError(error);
            process.exit(1);
        }
    });

    program.addCommand(rawCmd);
}
