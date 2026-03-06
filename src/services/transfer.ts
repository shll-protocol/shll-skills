import { encodeFunctionData, type Address, type Hex } from "viem";
import type { Action } from "shll-policy-sdk";
import {
    ERC20_TRANSFER_ABI,
    createClients,
    parseAmount,
    resolveToken,
} from "../shared/index.js";
import { SkillError } from "../shared/errors.js";
import {
    assertAddress,
    assertPositiveAmount,
    ensureAccess,
    executeActions,
    parseTokenId,
    validateActionsOrThrow,
} from "./common.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export async function transferFromVault(
    tokenIdRaw: string,
    token: string,
    to: string,
    amount: string,
    rpcUrl?: string,
) {
    const tokenId = parseTokenId(tokenIdRaw);
    assertAddress(to, "to");
    const { publicClient, policyClient } = createClients(rpcUrl);
    await ensureAccess(tokenId, rpcUrl, publicClient);

    const tokenInfo = resolveToken(token);
    const parsedAmount = parseAmount(amount, tokenInfo.decimals);
    assertPositiveAmount(parsedAmount);

    const isBnb = tokenInfo.address === ZERO_ADDRESS;
    const action: Action = isBnb
        ? { target: to as Address, value: parsedAmount, data: "0x" as Hex }
        : {
            target: tokenInfo.address,
            value: 0n,
            data: encodeFunctionData({
                abi: ERC20_TRANSFER_ABI,
                functionName: "transfer",
                args: [to as Address, parsedAmount],
            }),
        };

    try {
        await validateActionsOrThrow(policyClient, tokenId, [action]);
    } catch (error) {
        const normalized = error instanceof SkillError ? error : null;
        if (normalized?.errorCode === "POLICY_REJECTED") {
            throw new SkillError(
                "POLICY_REJECTED",
                "Policy rejected transfer. ReceiverGuard may block outbound transfers.",
                {
                    note: "ReceiverGuardPolicy may restrict outbound transfers",
                    ...normalized.details,
                },
                normalized.nextStep,
            );
        }
        throw error;
    }

    const result = await executeActions(policyClient, tokenId, [action]);
    return {
        status: "success",
        hash: result.hash,
        action: "transfer",
        token: tokenInfo.symbol,
        amount,
        to,
    };
}
