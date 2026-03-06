/**
 * SHLL Skill Error Classification System
 * Standard error codes for both CLI and MCP outputs.
 */

export type ErrorCode =
    | "INVALID_INPUT"
    | "ACCESS_DENIED"
    | "POLICY_REJECTED"
    | "CONTRACT_REVERT"
    | "RPC_ERROR"
    | "NOT_SUPPORTED"
    | "NOT_FOUND"
    | "INTERNAL_ERROR";

export interface ErrorPayload {
    status: "error";
    errorCode: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    next_step?: string;
}

export class SkillError extends Error {
    constructor(
        public errorCode: ErrorCode,
        message: string,
        public details?: Record<string, unknown>,
        public nextStep?: string,
    ) {
        super(message);
        this.name = "SkillError";
        Object.setPrototypeOf(this, SkillError.prototype);
    }
}

export function toErrorPayload(error: unknown): ErrorPayload {
    const normalized = normalizeError(error);
    return {
        status: "error",
        errorCode: normalized.errorCode,
        message: normalized.message,
        details: normalized.details,
        next_step: normalized.nextStep,
    };
}

export function normalizeError(error: unknown): SkillError {
    if (error instanceof SkillError) {
        return error;
    }

    const message = error instanceof Error ? error.message : "Unknown error occurred";

    if (message.includes("execution reverted")) {
        return new SkillError("CONTRACT_REVERT", message);
    }
    if (
        message.includes("fetch failed")
        || message.includes("ECONNRESET")
        || message.includes("timeout")
        || message.includes("network")
    ) {
        return new SkillError("RPC_ERROR", message);
    }
    if (message.includes("Unknown token") || message.includes("invalid") || message.includes("Invalid")) {
        return new SkillError("INVALID_INPUT", message);
    }

    return new SkillError("INTERNAL_ERROR", message);
}

/** Helper to format errors for MCP tool responses */
export function formatMcpError(error: unknown) {
    return {
        isError: true,
        content: [{
            type: "text" as const,
            text: JSON.stringify(toErrorPayload(error)),
        }],
    };
}
