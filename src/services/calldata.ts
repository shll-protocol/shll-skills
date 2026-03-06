import { type Address, type Hex } from "viem";
import type { Action } from "shll-policy-sdk";
import {
    checkActionRecipientSafety,
    createClients,
} from "../shared/index.js";
import {
    assertAddress,
    ensureAccess,
    ensureRecipientSafe,
    executeActions,
    parseTokenId,
    validateActionsOrThrow,
} from "./common.js";

export interface RawActionInput {
    target: string;
    data: string;
    value?: string;
}

export async function executeRawCalldata(
    tokenIdRaw: string,
    target: string,
    data: string,
    value = "0",
    rpcUrl?: string,
) {
    const tokenId = parseTokenId(tokenIdRaw);
    assertAddress(target, "target");
    const { publicClient, policyClient } = createClients(rpcUrl);
    await ensureAccess(tokenId, rpcUrl, publicClient);
    const vault = await policyClient.getVault(tokenId);

    const action: Action = {
        target: target as Address,
        data: data as Hex,
        value: BigInt(value),
    };

    ensureRecipientSafe(checkActionRecipientSafety(action, vault));
    await validateActionsOrThrow(policyClient, tokenId, [action]);
    const result = await executeActions(policyClient, tokenId, [action]);

    return {
        status: "success",
        hash: result.hash,
        action: "raw",
        note: "Calldata executed through PolicyGuard.",
    };
}

export async function executeRawCalldataBatch(
    tokenIdRaw: string,
    rawActions: RawActionInput[],
    rpcUrl?: string,
) {
    const tokenId = parseTokenId(tokenIdRaw);
    rawActions.forEach((action, index) => assertAddress(action.target, `actions[${index}].target`));
    const { publicClient, policyClient } = createClients(rpcUrl);
    await ensureAccess(tokenId, rpcUrl, publicClient);
    const vault = await policyClient.getVault(tokenId);

    const actions: Action[] = rawActions.map((action) => ({
        target: action.target as Address,
        data: action.data as Hex,
        value: BigInt(action.value || "0"),
    }));

    for (let i = 0; i < actions.length; i++) {
        try {
            ensureRecipientSafe(checkActionRecipientSafety(actions[i], vault));
        } catch (error) {
            if (error instanceof Error && "errorCode" in error) {
                const details = (error as Error & { details?: Record<string, unknown> }).details;
                throw Object.assign(error, {
                    details: {
                        ...details,
                        failedActionIndex: i,
                    },
                });
            }
            throw error;
        }
    }

    for (let i = 0; i < actions.length; i++) {
        try {
            await validateActionsOrThrow(policyClient, tokenId, [actions[i]]);
        } catch (error) {
            if (error instanceof Error && "errorCode" in error) {
                const details = (error as Error & { details?: Record<string, unknown> }).details;
                throw Object.assign(error, {
                    details: {
                        ...details,
                        failedActionIndex: i,
                    },
                });
            }
            throw error;
        }
    }

    const result = await executeActions(policyClient, tokenId, actions);
    return {
        status: "success",
        hash: result.hash,
        actionsExecuted: actions.length,
        note: "Calldata executed through PolicyGuard.",
    };
}
