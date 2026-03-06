import { Command } from "commander";
import { addSharedOptions, output, outputError } from "./utils.js";
import { lendToken, redeemToken } from "../services/index.js";

export function registerLendingCommands(program: Command) {
    const lendCmd = new Command("lend")
        .description("Supply assets to Venus Protocol")
        .requiredOption("-t, --token <symbol>", "Token to supply (e.g. BNB, USDC)")
        .requiredOption("-a, --amount <amount>", "Amount to supply");

    addSharedOptions(lendCmd).action(async (opts) => {
        try {
            output(await lendToken(opts.tokenId, opts.token, opts.amount, opts.rpc));
        } catch (error: unknown) {
            outputError(error);
            process.exit(1);
        }
    });

    const redeemCmd = new Command("redeem")
        .description("Redeem assets from Venus Protocol")
        .requiredOption("-t, --token <symbol>", "Underlying token to redeem")
        .requiredOption("-a, --amount <amount>", "Amount of underlying to redeem");

    addSharedOptions(redeemCmd).action(async (opts) => {
        try {
            output(await redeemToken(opts.tokenId, opts.token, opts.amount, opts.rpc));
        } catch (error: unknown) {
            outputError(error);
            process.exit(1);
        }
    });

    program.addCommand(lendCmd);
    program.addCommand(redeemCmd);
}
