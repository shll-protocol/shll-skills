import { Command } from "commander";
import {
    buyFourMeme,
    getFourMemeInfo,
    sellFourMeme,
} from "../services/index.js";
import { addSharedOptions, output, outputError } from "./utils.js";

export function registerFourMemeCommands(program: Command) {
    const infoCmd = new Command("four_info")
        .description("Query Four.meme bonding curve token info")
        .requiredOption("-t, --token <address>", "Token contract address on Four.meme");

    addSharedOptions(infoCmd, false).action(async (opts) => {
        try {
            const result = await getFourMemeInfo(opts.token);
            output({
                status: "success",
                token: result.token,
                version: result.version,
                tokenManager: result.tokenManager,
                quoteToken: result.quoteToken,
                lastPriceHuman: result.lastPriceHuman,
                tradingFeePct: result.tradingFeePct,
                launchTime: result.launchTime,
                tokensSoldPct: result.tokensSoldPct,
                fundsRaisedBNB: result.fundsRaisedBNB,
                maxFundsBNB: result.maxFundsBNB,
                bondingCurveProgress: result.bondingCurveProgress,
                tradingPhase: result.tradingPhase,
            });
        } catch (error) {
            outputError(error);
            process.exit(1);
        }
    });

    const buyCmd = new Command("four_buy")
        .description("Buy tokens on Four.meme bonding curve")
        .requiredOption("-t, --token <address>", "Token contract address")
        .requiredOption("-a, --amount <amount>", "BNB amount to spend")
        .option("-s, --slippage <percent>", "Slippage tolerance", "10");

    addSharedOptions(buyCmd).action(async (opts) => {
        try {
            const result = await buyFourMeme(
                opts.tokenId,
                opts.token,
                opts.amount,
                Number(opts.slippage),
                opts.rpc,
            );
            output({
                status: result.status,
                hash: result.hash,
                protocol: result.protocol,
                action: result.action,
                estimatedTokens: result.estimatedTokens,
            });
        } catch (error) {
            outputError(error);
            process.exit(1);
        }
    });

    const sellCmd = new Command("four_sell")
        .description("Sell tokens on Four.meme bonding curve")
        .requiredOption("-t, --token <address>", "Token contract address")
        .requiredOption("-a, --amount <amount>", "Amount of tokens to sell")
        .option("-s, --slippage <percent>", "Slippage tolerance", "10");

    addSharedOptions(sellCmd).action(async (opts) => {
        try {
            const result = await sellFourMeme(
                opts.tokenId,
                opts.token,
                opts.amount,
                Number(opts.slippage),
                opts.rpc,
            );
            output({
                status: result.status,
                hash: result.hash,
                protocol: result.protocol,
                action: result.action,
                tokensSold: result.tokensSold,
                estimatedBNB: result.estimatedBNB,
                minAcceptableBNB: result.minAcceptableBNB,
                note: result.note,
            });
        } catch (error) {
            outputError(error);
            process.exit(1);
        }
    });

    program.addCommand(infoCmd);
    program.addCommand(buyCmd);
    program.addCommand(sellCmd);
}
