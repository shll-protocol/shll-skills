import { encodeFunctionData } from "viem";
import type { Action } from "shll-policy-sdk";
import {
    createClients,
    resolveToken,
    parseAmount,
    ERC20_ABI,
    VTOKEN_ABI,
    VBNB_MINT_ABI,
    VENUS_VTOKENS,
} from "../shared/index.js";
import { SkillError } from "../shared/errors.js";
import {
    assertPositiveAmount,
    ensureAccess,
    executeActions,
    parseTokenId,
    validateActionsOrThrow,
} from "./common.js";

export async function lendToken(tokenIdRaw: string, token: string, amount: string, rpcUrl?: string) {
    const { publicClient, policyClient } = createClients(rpcUrl);
    const tokenId = parseTokenId(tokenIdRaw);
    await ensureAccess(tokenId, rpcUrl, publicClient);

    const upper = token.toUpperCase();
    const vTokenAddr = VENUS_VTOKENS[upper];
    if (!vTokenAddr) {
        throw new SkillError("NOT_SUPPORTED", `Venus lending not supported for ${upper}`);
    }

    const isBNB = upper === "BNB";
    const tokenInfo = resolveToken(isBNB ? "BNB" : token);
    const parsedAmount = parseAmount(amount, tokenInfo.decimals);
    assertPositiveAmount(parsedAmount);

    const actions: Action[] = [];
    if (isBNB) {
        actions.push({
            target: vTokenAddr,
            value: parsedAmount,
            data: encodeFunctionData({ abi: VBNB_MINT_ABI, functionName: "mint" }),
        });
    } else {
        actions.push({
            target: tokenInfo.address,
            value: 0n,
            data: encodeFunctionData({ abi: ERC20_ABI, functionName: "approve", args: [vTokenAddr, parsedAmount] }),
        });
        actions.push({
            target: vTokenAddr,
            value: 0n,
            data: encodeFunctionData({ abi: VTOKEN_ABI, functionName: "mint", args: [parsedAmount] }),
        });
    }

    await validateActionsOrThrow(policyClient, tokenId, actions);
    const res = await executeActions(policyClient, tokenId, actions);

    return {
        status: "success",
        hash: res.hash,
        protocol: "Venus",
        action: "supply",
        token: upper,
        amount,
    };
}

export async function redeemToken(tokenIdRaw: string, token: string, amount: string, rpcUrl?: string) {
    const { publicClient, policyClient } = createClients(rpcUrl);
    const tokenId = parseTokenId(tokenIdRaw);
    await ensureAccess(tokenId, rpcUrl, publicClient);

    const upper = token.toUpperCase();
    const vTokenAddr = VENUS_VTOKENS[upper];
    if (!vTokenAddr) {
        throw new SkillError("NOT_SUPPORTED", `Venus redemption not supported for ${upper}`);
    }

    const tokenInfo = resolveToken(upper === "BNB" ? "BNB" : token);
    const parsedAmount = parseAmount(amount, tokenInfo.decimals);
    assertPositiveAmount(parsedAmount);

    const action: Action = {
        target: vTokenAddr,
        value: 0n,
        data: encodeFunctionData({ abi: VTOKEN_ABI, functionName: "redeemUnderlying", args: [parsedAmount] }),
    };

    await validateActionsOrThrow(policyClient, tokenId, [action]);
    const res = await executeActions(policyClient, tokenId, [action]);

    return {
        status: "success",
        hash: res.hash,
        protocol: "Venus",
        action: "redeem",
        token: upper,
        amount,
    };
}
