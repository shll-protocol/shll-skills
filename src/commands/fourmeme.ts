import { Command } from "commander";
import {
    buyFourMeme,
    getFourMemeInfo,
    sellFourMeme,
    getFourMemeRankings,
    getFourMemeTokenList,
    getFourMemeTokenDetail,
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

    // ═══════════════════════════════════════════════════════
    //   HTTP API query commands (Four.meme official API)
    // ═══════════════════════════════════════════════════════

    const rankingsCmd = new Command("four_rankings")
        .description("Query Four.meme token rankings (hot, volume, market cap, newest, progress/graduation)")
        .option("--type <type>", "Ranking type: HOT|NEW|PROGRESS|DEX|CAP|VOL|VOL_DAY_1|VOL_HOUR_4|VOL_HOUR_1|VOL_MIN_30|VOL_MIN_5|LAST|BURN", "HOT")
        .option("--page-size <n>", "Number of results", "10");

    rankingsCmd.action(async (opts) => {
        try {
            const result = await getFourMemeRankings({
                type: opts.type as any,
                pageSize: Number(opts.pageSize),
            });
            output({ status: "success", rankings: result });
        } catch (error) {
            outputError(error);
            process.exit(1);
        }
    });

    const tokenListCmd = new Command("four_token_list")
        .description("Search Four.meme tokens by keyword, tag, or type")
        .option("--type <type>", "Sort type: HOT|NEW|PROGRESS|VOL|LAST|CAP|DEX|BURN", "HOT")
        .option("--keyword <keyword>", "Search by token name or address")
        .option("--tag <tags>", "Comma-separated labels")
        .option("--status <status>", "PUBLISH|TRADE|ALL", "ALL")
        .option("--page-size <n>", "Results per page", "20")
        .option("--page-index <n>", "Page number (1-based)", "1");

    tokenListCmd.action(async (opts) => {
        try {
            const tagArray = opts.tag ? opts.tag.split(",").map((t: string) => t.trim()).filter(Boolean) : undefined;
            const result = await getFourMemeTokenList({
                type: opts.type,
                keyword: opts.keyword,
                tag: tagArray,
                status: opts.status,
                pageSize: Number(opts.pageSize),
                pageIndex: Number(opts.pageIndex),
            });
            output({ status: "success", tokens: result });
        } catch (error) {
            outputError(error);
            process.exit(1);
        }
    });

    const tokenDetailCmd = new Command("four_token_detail")
        .description("Get detailed info for a specific Four.meme token")
        .requiredOption("-t, --token <address>", "Token contract address (0x...)");

    tokenDetailCmd.action(async (opts) => {
        try {
            const result = await getFourMemeTokenDetail(opts.token);
            output({ status: "success", detail: result });
        } catch (error) {
            outputError(error);
            process.exit(1);
        }
    });

    program.addCommand(infoCmd);
    program.addCommand(buyCmd);
    program.addCommand(sellCmd);
    program.addCommand(rankingsCmd);
    program.addCommand(tokenListCmd);
    program.addCommand(tokenDetailCmd);
}
