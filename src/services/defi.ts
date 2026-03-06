import { encodeFunctionData, type Address } from "viem";
import type { Action } from "shll-policy-sdk";
import {
    createClients,
    resolveTokenAsync,
    parseAmount,
    ERC20_ABI,
    WBNB_ABI,
    SWAP_EXACT_ETH_ABI,
    SWAP_EXACT_TOKENS_ABI,
    SWAP_EXACT_TOKENS_FOR_ETH_ABI,
    V3_EXACT_INPUT_SINGLE_ABI,
    V3_QUOTE_ABI,
    PANCAKE_V2_ROUTER,
    PANCAKE_V3_SMART_ROUTER,
    V3_QUOTER,
    WBNB,
    GET_AMOUNTS_OUT_ABI,
} from "../shared/index.js";
import { SkillError } from "../shared/errors.js";
import {
    assertPositiveAmount,
    ensureAccess,
    executeActions,
    parseTokenId,
    validateActionsOrThrow,
} from "./common.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const V3_FEES = [500, 2500, 10000] as const;

export interface SwapInput {
    tokenId: string;
    fromToken: string;
    toToken: string;
    amount: string;
    version: "V2" | "V3";
    slippage: number;
    rpcUrl?: string;
}

export async function executeSwap(input: SwapInput) {
    const { publicClient, policyClient } = createClients(input.rpcUrl);
    const tokenId = parseTokenId(input.tokenId);
    await ensureAccess(tokenId, input.rpcUrl, publicClient);
    const vault = await policyClient.getVault(tokenId);

    const tokenIn = await resolveTokenAsync(publicClient, input.fromToken);
    const tokenOut = await resolveTokenAsync(publicClient, input.toToken);
    const amountIn = parseAmount(input.amount, tokenIn.decimals);
    assertPositiveAmount(amountIn);

    const slippage = Number(input.slippage);
    if (!Number.isFinite(slippage) || slippage <= 0 || slippage > 99.99) {
        throw new SkillError("INVALID_INPUT", "Slippage must be between 0 and 99.99");
    }

    const isNativeIn = tokenIn.address === ZERO_ADDRESS;
    const isNativeOut = tokenOut.address === ZERO_ADDRESS;
    const pathIn = isNativeIn ? WBNB : tokenIn.address;
    const pathOut = isNativeOut ? WBNB : tokenOut.address;
    const actions: Action[] = [];

    if (input.version === "V3") {
        const quote = await getBestV3Quote(publicClient, pathIn, pathOut, amountIn);
        if (!quote || quote.estimatedAmountOut === 0n) {
            throw new SkillError("NOT_SUPPORTED", "No V3 liquidity found for pair");
        }
        const minOut = applySlippage(quote.estimatedAmountOut, slippage);

        if (!isNativeIn) {
            actions.push({
                target: tokenIn.address,
                value: 0n,
                data: encodeFunctionData({
                    abi: ERC20_ABI,
                    functionName: "approve",
                    args: [PANCAKE_V3_SMART_ROUTER as Address, amountIn],
                }),
            });
        }

        actions.push({
            target: PANCAKE_V3_SMART_ROUTER as Address,
            value: isNativeIn ? amountIn : 0n,
            data: encodeFunctionData({
                abi: V3_EXACT_INPUT_SINGLE_ABI,
                functionName: "exactInputSingle",
                args: [{
                    tokenIn: pathIn,
                    tokenOut: pathOut,
                    fee: quote.fee,
                    recipient: vault,
                    amountIn,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0n,
                }],
            }),
        });
    } else {
        const v2Router = PANCAKE_V2_ROUTER as Address;
        const path = [pathIn as Address, pathOut as Address];
        const amountsOut = await publicClient.readContract({
            address: v2Router,
            abi: GET_AMOUNTS_OUT_ABI,
            functionName: "getAmountsOut",
            args: [amountIn, path],
        });
        const estimatedOut = (amountsOut as bigint[])[1];
        if (!estimatedOut || estimatedOut === 0n) {
            throw new SkillError("NOT_SUPPORTED", "No V2 liquidity found for pair");
        }
        const minOut = applySlippage(estimatedOut, slippage);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 180);

        if (isNativeIn) {
            actions.push({
                target: v2Router,
                value: amountIn,
                data: encodeFunctionData({
                    abi: SWAP_EXACT_ETH_ABI,
                    functionName: "swapExactETHForTokens",
                    args: [minOut, path, vault, deadline],
                }),
            });
        } else if (isNativeOut) {
            actions.push({
                target: tokenIn.address,
                value: 0n,
                data: encodeFunctionData({
                    abi: ERC20_ABI,
                    functionName: "approve",
                    args: [v2Router, amountIn],
                }),
            });
            actions.push({
                target: v2Router,
                value: 0n,
                data: encodeFunctionData({
                    abi: SWAP_EXACT_TOKENS_FOR_ETH_ABI,
                    functionName: "swapExactTokensForETH",
                    args: [amountIn, minOut, path, vault, deadline],
                }),
            });
        } else {
            actions.push({
                target: tokenIn.address,
                value: 0n,
                data: encodeFunctionData({
                    abi: ERC20_ABI,
                    functionName: "approve",
                    args: [v2Router, amountIn],
                }),
            });
            actions.push({
                target: v2Router,
                value: 0n,
                data: encodeFunctionData({
                    abi: SWAP_EXACT_TOKENS_ABI,
                    functionName: "swapExactTokensForTokens",
                    args: [amountIn, minOut, path, vault, deadline],
                }),
            });
        }
    }

    await validateActionsOrThrow(policyClient, tokenId, actions);
    const res = await executeActions(policyClient, tokenId, actions);
    const hasCustomRpc = !!input.rpcUrl || !!process.env.SHLL_RPC;

    return {
        status: "success",
        hash: res.hash,
        protocol: `PancakeSwap ${input.version}`,
        action: "swap",
        tokenIn: tokenIn.symbol,
        tokenOut: tokenOut.symbol,
        amountIn: input.amount,
        mev_protection: {
            slippage: `${slippage}%`,
            deadline: input.version === "V2" ? "3 min" : "none (V3)",
            rpc: hasCustomRpc ? "✅ custom RPC" : "✅ PancakeSwap MEV Guard (default)",
        },
    };
}

export async function wrapBnb(tokenIdRaw: string, amount: string, rpcUrl?: string) {
    const { publicClient, policyClient } = createClients(rpcUrl);
    const tokenId = parseTokenId(tokenIdRaw);
    await ensureAccess(tokenId, rpcUrl, publicClient);

    const amountWei = parseAmount(amount, 18);
    assertPositiveAmount(amountWei);

    const action: Action = {
        target: WBNB as Address,
        value: amountWei,
        data: encodeFunctionData({ abi: WBNB_ABI, functionName: "deposit" }),
    };
    await validateActionsOrThrow(policyClient, tokenId, [action]);
    const res = await executeActions(policyClient, tokenId, [action]);

    return {
        status: "success",
        hash: res.hash,
        action: "wrap",
        amount,
    };
}

export async function unwrapWbnb(tokenIdRaw: string, amount: string, rpcUrl?: string) {
    const { publicClient, policyClient } = createClients(rpcUrl);
    const tokenId = parseTokenId(tokenIdRaw);
    await ensureAccess(tokenId, rpcUrl, publicClient);

    const amountWei = parseAmount(amount, 18);
    assertPositiveAmount(amountWei);

    const action: Action = {
        target: WBNB as Address,
        value: 0n,
        data: encodeFunctionData({ abi: WBNB_ABI, functionName: "withdraw", args: [amountWei] }),
    };
    await validateActionsOrThrow(policyClient, tokenId, [action]);
    const res = await executeActions(policyClient, tokenId, [action]);

    return {
        status: "success",
        hash: res.hash,
        action: "unwrap",
        amount,
    };
}

async function getBestV3Quote(
    publicClient: any,
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
): Promise<{ fee: number; estimatedAmountOut: bigint } | null> {
    const quotes = await Promise.allSettled(V3_FEES.map((feeTier) =>
        publicClient.readContract({
            address: V3_QUOTER as Address,
            abi: V3_QUOTE_ABI,
            functionName: "quoteExactInputSingle",
            args: [{ tokenIn, tokenOut, amountIn, fee: feeTier, sqrtPriceLimitX96: 0n }],
        }),
    ));

    let bestFee = 0;
    let bestOut = 0n;
    for (let i = 0; i < V3_FEES.length; i++) {
        const result = quotes[i];
        if (result.status !== "fulfilled") continue;
        const [out] = result.value as unknown as [bigint];
        if (out > bestOut) {
            bestOut = out;
            bestFee = V3_FEES[i];
        }
    }

    if (bestOut === 0n || bestFee === 0) {
        return null;
    }
    return { fee: bestFee, estimatedAmountOut: bestOut };
}

function applySlippage(amountOut: bigint, slippagePct: number): bigint {
    return (amountOut * BigInt(Math.floor((100 - slippagePct) * 100))) / 10000n;
}
