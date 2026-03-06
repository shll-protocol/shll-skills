import { Command } from "commander";
import { DEFAULT_RPC } from "../shared/index.js";
import { normalizeError, toErrorPayload } from "../shared/errors.js";

/** Prints structured JSON output for CLI clients */
export function output(data: unknown) {
    console.log(JSON.stringify(data, null, 2));
}

/** Prints structured error JSON and exits */
export function outputError(messageOrError: string | unknown, nextStep?: string, details?: Record<string, unknown>) {
    if (typeof messageOrError === "string") {
        output({
            status: "error",
            errorCode: "INTERNAL_ERROR",
            message: messageOrError,
            next_step: nextStep,
            details,
        });
        return;
    }

    const normalized = normalizeError(messageOrError);
    if (nextStep && !normalized.nextStep) normalized.nextStep = nextStep;
    if (details && !normalized.details) normalized.details = details;
    output(toErrorPayload(normalized));
}

/** Adds common options (--token-id and --rpc) to a command */
export function addSharedOptions(cmd: Command, requireTokenId = true): Command {
    if (requireTokenId) {
        cmd.requiredOption("-k, --token-id <number>", "Agent NFA Token ID");
    }
    cmd.option("-r, --rpc <url>", "BSC RPC URL", DEFAULT_RPC);
    return cmd;
}
