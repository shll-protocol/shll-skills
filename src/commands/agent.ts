import { Command } from "commander";
import {
    getHistory,
    getPolicySummary,
    getStatusOverview,
    updateRiskConfig,
} from "../services/index.js";
import { addSharedOptions, output, outputError } from "./utils.js";

export function registerAgentCommands(program: Command) {
    const policiesCmd = new Command("policies")
        .description("View active policies and risk settings");
    addSharedOptions(policiesCmd).action(async (opts) => {
        try {
            const result = await getPolicySummary(opts.tokenId, opts.rpc);
            output({
                status: "success",
                tokenId: result.tokenId,
                summary: result.summary,
                policies: result.policies,
                manageUrl: result.manageUrl,
            });
        } catch (error) {
            outputError(error);
            process.exit(1);
        }
    });

    const configCmd = new Command("config")
        .description("Configure agent risk parameters (Requires RENTER status!)")
        .option("--tx-limit <amount>", "Max BNB per tx")
        .option("--daily-limit <amount>", "Max BNB per day")
        .option("--cooldown <seconds>", "Seconds between tx");
    addSharedOptions(configCmd).action(async (opts) => {
        try {
            output(await updateRiskConfig(opts.tokenId, {
                txLimit: opts.txLimit,
                dailyLimit: opts.dailyLimit,
                cooldown: opts.cooldown,
                rpcUrl: opts.rpc,
            }));
        } catch (error) {
            outputError(error);
            process.exit(1);
        }
    });

    const statusCmd = new Command("status")
        .description("One-shot readiness overview with blockers, warnings, and next actions");
    addSharedOptions(statusCmd).action(async (opts) => {
        try {
            output(await getStatusOverview(opts.tokenId, opts.rpc));
        } catch (error) {
            outputError(error);
            process.exit(1);
        }
    });

    const historyCmd = new Command("history")
        .description("Show recent transactions executed through the vault")
        .option("-l, --limit <number>", "Number of records to fetch", "10");
    addSharedOptions(historyCmd).action(async (opts) => {
        try {
            output({
                status: "success",
                ...(await getHistory(opts.tokenId, Number(opts.limit))),
            });
        } catch (error) {
            outputError(error);
            process.exit(1);
        }
    });

    program.addCommand(policiesCmd);
    program.addCommand(configCmd);
    program.addCommand(statusCmd);
    program.addCommand(historyCmd);
}
