import { Command } from "commander";
import { addSharedOptions, output, outputError } from "./utils.js";
import {
    getBalance,
    getPortfolio,
    getPrice,
    listMappedTokens,
    searchTokens,
} from "../services/index.js";

export function registerInfoCommands(program: Command) {
    const portfolioCmd = new Command("portfolio")
        .description("Get full portfolio overview: BNB, WBNB, mapped tokens, and agent vault details");
    addSharedOptions(portfolioCmd).action(async (opts) => {
        try {
            const result = await getPortfolio(opts.tokenId, opts.rpc);
            output(result);
        } catch (error: unknown) {
            outputError(error);
            process.exit(1);
        }
    });

    const balanceCmd = new Command("balance")
        .description("Check BNB or token balance of the agent vault")
        .requiredOption("-t, --token <symbol>", "Token symbol (e.g. USDC) or 0x address, use BNB for native");
    addSharedOptions(balanceCmd).action(async (opts) => {
        try {
            const result = await getBalance(opts.tokenId, opts.token, opts.rpc);
            output(result);
        } catch (error: unknown) {
            outputError(error);
            process.exit(1);
        }
    });

    const tokensCmd = new Command("tokens")
        .description("List all pre-mapped tokens");
    tokensCmd.action(() => {
        output(listMappedTokens());
    });

    const priceCmd = new Command("price")
        .description("Get live token price data from DexScreener")
        .requiredOption("-t, --token <symbol|address>", "Token symbol or 0x address");
    priceCmd.action(async (opts) => {
        try {
            const result = await getPrice(opts.token);
            output(result);
        } catch (error: unknown) {
            outputError(error);
            process.exit(1);
        }
    });

    const searchCmd = new Command("search")
        .description("Search for BSC tokens by name/symbol on DexScreener")
        .requiredOption("-q, --query <string>", "Token name or symbol to search for");
    searchCmd.action(async (opts) => {
        try {
            const result = await searchTokens(opts.query);
            output(result);
        } catch (error: unknown) {
            outputError(error);
            process.exit(1);
        }
    });

    program.addCommand(portfolioCmd);
    program.addCommand(balanceCmd);
    program.addCommand(tokensCmd);
    program.addCommand(priceCmd);
    program.addCommand(searchCmd);
}
