import { encodeFunctionData, type Address } from "viem";
import type { Action } from "shll-policy-sdk";
import {
    ERC20_ABI,
    FOUR_MEME_HELPER_ABI,
    FOUR_MEME_HELPER_V3,
    FOUR_MEME_V1_ABI,
    FOUR_MEME_V2_ABI,
    createClients,
    createReadOnlyClient,
    parseAmount,
} from "../shared/index.js";
import { SkillError } from "../shared/errors.js";
import {
    assertPositiveAmount,
    ensureAccess,
    executeActions,
    parseTokenId,
    validateActionsOrThrow,
} from "./common.js";

type FourMemeTokenInfoTuple = [
    bigint,
    Address,
    Address,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    boolean,
];

export async function getFourMemeInfo(token: string) {
    const publicClient = createReadOnlyClient();
    const tokenAddr = token as Address;
    const info = await publicClient.readContract({
        address: FOUR_MEME_HELPER_V3,
        abi: FOUR_MEME_HELPER_ABI,
        functionName: "getTokenInfo",
        args: [tokenAddr],
    }) as FourMemeTokenInfoTuple;

    const [version, tokenManager, quote, lastPrice, tradingFeeRate, minTradingFee,
        launchTime, offers, maxOffers, funds, maxFunds, liquidityAdded] = info;
    const progressPct = maxFunds > 0n ? Number((funds * 10000n) / maxFunds) / 100 : 0;
    const offersPct = maxOffers > 0n ? Number(((maxOffers - offers) * 10000n) / maxOffers) / 100 : 0;

    return {
        token: tokenAddr,
        version: Number(version),
        tokenManager,
        quoteToken: quote === "0x0000000000000000000000000000000000000000" ? "BNB" : quote,
        lastPrice: lastPrice.toString(),
        lastPriceHuman: (Number(lastPrice) / 1e18).toExponential(4),
        tradingFeeRate: `${Number(tradingFeeRate) / 100}%`,
        tradingFeePct: `${Number(tradingFeeRate) / 100}%`,
        minTradingFee: minTradingFee.toString(),
        launchTime: new Date(Number(launchTime) * 1000).toISOString(),
        tokensSoldPct: `${offersPct.toFixed(2)}%`,
        fundsRaisedBNB: (Number(funds) / 1e18).toFixed(4),
        maxFundsBNB: (Number(maxFunds) / 1e18).toFixed(4),
        bondingCurveProgress: `${progressPct.toFixed(2)}%`,
        liquidityAdded,
        tradingPhase: liquidityAdded ? "DEX (PancakeSwap)" : "Internal (Bonding Curve)",
    };
}

export async function buyFourMeme(
    tokenIdRaw: string,
    token: string,
    amount: string,
    slippage: number,
    rpcUrl?: string,
) {
    const tokenId = parseTokenId(tokenIdRaw);
    const { publicClient, policyClient } = createClients(rpcUrl);
    await ensureAccess(tokenId, rpcUrl, publicClient);

    const tokenAddr = token as Address;
    const bnbAmount = parseAmount(amount, 18);
    assertPositiveAmount(bnbAmount);

    const vault = await policyClient.getVault(tokenId);
    const info = await publicClient.readContract({
        address: FOUR_MEME_HELPER_V3,
        abi: FOUR_MEME_HELPER_ABI,
        functionName: "getTokenInfo",
        args: [tokenAddr],
    }) as FourMemeTokenInfoTuple;
    const [version, tokenManager, , , , minTradingFee, , , , , , liquidityAdded] = info;

    if (liquidityAdded) {
        throw new SkillError("NOT_SUPPORTED", "Token migrated to DEX. Use swap instead.");
    }
    if (bnbAmount < minTradingFee) {
        throw new SkillError("INVALID_INPUT", "Amount below Four.meme min fee threshold.");
    }

    const tryBuyResult = await publicClient.readContract({
        address: FOUR_MEME_HELPER_V3,
        abi: FOUR_MEME_HELPER_ABI,
        functionName: "tryBuy",
        args: [tokenAddr, 0n, bnbAmount],
    }) as unknown as readonly [Address, Address, bigint, bigint, bigint, bigint, bigint, bigint];
    const [, , estimatedAmount, , estimatedFee, amountMsgValue] = tryBuyResult;

    if (amountMsgValue < minTradingFee || estimatedAmount <= 0n) {
        throw new SkillError("INVALID_INPUT", "Buy quote blocked or amount too small.");
    }

    const vaultBnbBalance = await publicClient.getBalance({ address: vault });
    if (amountMsgValue > vaultBnbBalance) {
        throw new SkillError("INVALID_INPUT", "Vault BNB balance insufficient");
    }

    const minAmount = applySlippage(estimatedAmount, slippage);
    const alignedMinAmount = alignGwei(minAmount);
    const data = Number(version) === 1
        ? encodeFunctionData({
            abi: FOUR_MEME_V1_ABI,
            functionName: "purchaseTokenAMAP",
            args: [tokenAddr, bnbAmount, alignedMinAmount],
        })
        : encodeFunctionData({
            abi: FOUR_MEME_V2_ABI,
            functionName: "buyTokenAMAP",
            args: [tokenAddr, bnbAmount, alignedMinAmount],
        });

    const action: Action = { target: tokenManager, value: amountMsgValue, data };
    await validateActionsOrThrow(policyClient, tokenId, [action]);
    const result = await executeActions(policyClient, tokenId, [action]);

    return {
        status: "success",
        hash: result.hash,
        protocol: "four.meme",
        action: "buy",
        amount,
        estimatedTokensRaw: estimatedAmount.toString(),
        estimatedTokens: (Number(estimatedAmount) / 1e18).toFixed(4),
        estimatedFee: estimatedFee.toString(),
        amountMsgValue: amountMsgValue.toString(),
        minAcceptableTokensRaw: alignedMinAmount.toString(),
        minAcceptableTokens: (Number(alignedMinAmount) / 1e18).toFixed(4),
    };
}

export async function sellFourMeme(
    tokenIdRaw: string,
    token: string,
    amount: string,
    slippage: number,
    rpcUrl?: string,
) {
    const tokenId = parseTokenId(tokenIdRaw);
    const { publicClient, policyClient } = createClients(rpcUrl);
    await ensureAccess(tokenId, rpcUrl, publicClient);

    const tokenAddr = token as Address;
    const sellAmount = parseAmount(amount, 18);
    assertPositiveAmount(sellAmount);
    const alignedAmount = alignGwei(sellAmount);

    const info = await publicClient.readContract({
        address: FOUR_MEME_HELPER_V3,
        abi: FOUR_MEME_HELPER_ABI,
        functionName: "getTokenInfo",
        args: [tokenAddr],
    }) as FourMemeTokenInfoTuple;
    const [version, tokenManager, , , , , , , , , , liquidityAdded] = info;

    if (liquidityAdded) {
        throw new SkillError("NOT_SUPPORTED", "Token migrated to DEX. Use swap instead.");
    }

    const trySellResult = await publicClient.readContract({
        address: FOUR_MEME_HELPER_V3,
        abi: FOUR_MEME_HELPER_ABI,
        functionName: "trySell",
        args: [tokenAddr, alignedAmount],
    }) as unknown as readonly [Address, Address, bigint, bigint];
    const [, , estimatedFunds] = trySellResult;
    if (estimatedFunds <= 0n) {
        throw new SkillError("INVALID_INPUT", "Sell quote returned 0. Token may not be sellable.");
    }

    const minFunds = applySlippage(estimatedFunds, slippage);
    const actions: Action[] = [
        {
            target: tokenAddr,
            value: 0n,
            data: encodeFunctionData({
                abi: ERC20_ABI,
                functionName: "approve",
                args: [tokenManager, alignedAmount],
            }),
        },
        {
            target: tokenManager,
            value: 0n,
            data: Number(version) === 1
                ? encodeFunctionData({
                    abi: FOUR_MEME_V1_ABI,
                    functionName: "saleToken",
                    args: [tokenAddr, alignedAmount],
                })
                : encodeFunctionData({
                    abi: FOUR_MEME_V2_ABI,
                    functionName: "sellToken",
                    args: [tokenAddr, alignedAmount],
                }),
        },
    ];

    await validateActionsOrThrow(policyClient, tokenId, actions);
    const result = await executeActions(policyClient, tokenId, actions);

    return {
        status: "success",
        hash: result.hash,
        protocol: "four.meme",
        action: "sell",
        tokensSold: amount,
        estimatedBNBRaw: estimatedFunds.toString(),
        estimatedBNB: (Number(estimatedFunds) / 1e18).toFixed(6),
        minAcceptableBNBRaw: minFunds.toString(),
        minAcceptableBNB: (Number(minFunds) / 1e18).toFixed(6),
        note: "Four.meme bonding curve does not support on-chain slippage protection for sells.",
    };
}

function applySlippage(amountOut: bigint, slippagePct: number): bigint {
    if (!Number.isFinite(slippagePct) || slippagePct < 0 || slippagePct >= 100) {
        throw new SkillError("INVALID_INPUT", "Slippage must be between 0 and 100");
    }
    return (amountOut * BigInt(Math.floor((100 - slippagePct) * 100))) / 10000n;
}

function alignGwei(value: bigint): bigint {
    return (value / 1000000000n) * 1000000000n;
}
