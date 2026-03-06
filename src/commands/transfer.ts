import { Command } from "commander";
import { transferFromVault } from "../services/index.js";
import { addSharedOptions, output, outputError } from "./utils.js";

export function registerTransferCommands(program: Command) {
    const transferCmd = new Command("transfer")
        .description("Transfer tokens out of agent vault")
        .requiredOption("-t, --token <symbol>", "Token symbol (e.g. USDC, BNB)")
        .requiredOption("-d, --to <address>", "Recipient address (0x...)")
        .requiredOption("-a, --amount <amount>", "Amount to transfer");

    addSharedOptions(transferCmd).action(async (opts) => {
        try {
            const result = await transferFromVault(
                opts.tokenId,
                opts.token,
                opts.to,
                opts.amount,
                opts.rpc,
            );
            output(result);
        } catch (error) {
            outputError(error);
            process.exit(1);
        }
    });

    program.addCommand(transferCmd);
}
