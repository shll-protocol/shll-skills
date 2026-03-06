import { Command } from "commander";
import { addSharedOptions, output, outputError } from "./utils.js";
import { executeSwap, unwrapWbnb, wrapBnb } from "../services/index.js";

export function registerDefiCommands(program: Command) {
    const swapCmd = new Command("swap")
        .description("Swap tokens using PancakeSwap V2/V3")
        .requiredOption("-f, --from <symbol>", "Token to sell")
        .requiredOption("-t, --to <symbol>", "Token to buy")
        .requiredOption("-a, --amount <amount>", "Amount to sell")
        .option("-v, --version <v2|v3>", "PancakeSwap version", "v3")
        .option("-s, --slippage <percent>", "Slippage tolerance", "2");

    addSharedOptions(swapCmd).action(async (opts) => {
        try {
            const result = await executeSwap({
                tokenId: opts.tokenId,
                fromToken: opts.from,
                toToken: opts.to,
                amount: opts.amount,
                version: opts.version.toUpperCase() === "V2" ? "V2" : "V3",
                slippage: Number(opts.slippage),
                rpcUrl: opts.rpc,
            });
            output(result);
        } catch (error) {
            outputError(error);
            process.exit(1);
        }
    });

    const wrapCmd = new Command("wrap")
        .description("Wrap BNB to WBNB")
        .requiredOption("-a, --amount <amount>", "Amount of BNB to wrap");
    addSharedOptions(wrapCmd).action(async (opts) => {
        try {
            output(await wrapBnb(opts.tokenId, opts.amount, opts.rpc));
        } catch (error) {
            outputError(error);
            process.exit(1);
        }
    });

    const unwrapCmd = new Command("unwrap")
        .description("Unwrap WBNB to BNB")
        .requiredOption("-a, --amount <amount>", "Amount of WBNB to unwrap");
    addSharedOptions(unwrapCmd).action(async (opts) => {
        try {
            output(await unwrapWbnb(opts.tokenId, opts.amount, opts.rpc));
        } catch (error) {
            outputError(error);
            process.exit(1);
        }
    });

    program.addCommand(swapCmd);
    program.addCommand(wrapCmd);
    program.addCommand(unwrapCmd);
}
