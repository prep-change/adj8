onmessage = function(event) {
  const { input, baseTargets, denominations } = event.data;

  const knapsackCache = new Map();

  function findOptimalAdjustment(input, baseTargets, excludeSet, maxTry = 13) {
    for (let t = 0; t <= maxTry; t++) {
      const patterns = generateAdjustmentPatterns(baseTargets, t, excludeSet);
      for (let newTargets of patterns) {
        const shortage = {};
        let shortageTotal = 0;

        for (let denom of denominations) {
          const need = newTargets[denom] || 0;
          const lack = Math.max(0, need - input[denom]);
          if (lack > 0) {
            shortage[denom] = lack;
            shortageTotal += denom * lack;
          }
        }

        const usableCoins = denominations.map(denom => {
          const adjustedInput = input[denom] + (shortage[denom] || 0);
          const usable = adjustedInput - (newTargets[denom] || 0);
          return [denom, usable];
        }).filter(([_, count]) => count > 0);

        const combo = knapsack(usableCoins, shortageTotal);
        if (combo) {
          return { newTargets, shortage, shortageTotal, combo };
        }
      }
    }
    return null;
  }

  function generateAdjustmentPatterns(baseTargets, extraCount, excludeSet) {
    if (extraCount === 0) return [Object.assign({}, baseTargets)];
    const patterns = [];
    const denoms = Object.keys(baseTargets).map(Number);

    function backtrack(i, remaining, current) {
      if (i === denoms.length) {
        if (remaining === 0) patterns.push({ ...current });
        return;
      }
      const denom = denoms[i];
      const limit = excludeSet.has(denom) ? 0 : ((denom === 5000) ? Math.min(1, remaining) : remaining);
      for (let add = 0; add <= limit; add++) {
        current[denom] = baseTargets[denom] + add;
        backtrack(i + 1, remaining - add, current);
      }
    }

    backtrack(0, extraCount, {});
    return patterns;
  }

  function knapsack(usableCoins, targetAmount) {
    const key = JSON.stringify(usableCoins) + "|" + targetAmount;
    if (knapsackCache.has(key)) return knapsackCache.get(key);

    const dp = Array(targetAmount + 1).fill(null);
    dp[0] = {};

    for (let [denom, count] of usableCoins) {
      for (let a = targetAmount; a >= 0; a--) {
        if (dp[a] !== null) {
          for (let k = 1; k <= count; k++) {
            const newAmount = a + denom * k;
            if (newAmount > targetAmount) break;
            const newCombo = { ...dp[a] };
            newCombo[denom] = (newCombo[denom] || 0) + k;

            if (
              dp[newAmount] === null ||
              totalCoins(newCombo) < totalCoins(dp[newAmount])
            ) {
              dp[newAmount] = newCombo;
            }
          }
        }
      }
    }

    knapsackCache.set(key, dp[targetAmount]);
    return dp[targetAmount];
  }

  function totalCoins(combo) {
    return Object.values(combo).reduce((sum, c) => sum + c, 0);
  }

  // 自動固定候補（目標達成済みの金種）
  const autoFixed = new Set(
    denominations.filter(denom =>
      input[denom] >= baseTargets[denom]
    )
  );

  // 調整処理の実行
  let excluded = autoFixed;
  let best = findOptimalAdjustment(input, baseTargets, excluded);

  if (!best && autoFixed.size > 0) {
    excluded = new Set();
    best = findOptimalAdjustment(input, baseTargets, excluded);
  }

  if (!best) {
    postMessage({
      shortageResultText: "※ 補填できませんでした。",
      combinedResultText: ""
    });
    return;
  }

  const { shortage, shortageTotal, combo, newTargets } = best;

  let shortageResultText = `【調整後不足金種】 以下を封筒に書く\n`;
  for (let denom of denominations) {
    if (shortage[denom]) {
      shortageResultText += `${denom}円×${shortage[denom]}枚 = ${denom * shortage[denom]}円\n`;
    }
  }
  shortageResultText += `合計　${shortageTotal.toLocaleString()}円`;

  let combinedResultText = `【釣銭回収】\n 袋/ケースに入れるもの \n`;
  let totalCollected = 0;
  for (let denom of denominations) {
    const collected = (baseTargets[denom] || 0) - (shortage[denom] || 0);
    if (collected > 0) {
      const amount = denom * collected;
      combinedResultText += `${denom}円×${collected}枚 = ${amount.toLocaleString()}円\n`;
      totalCollected += amount;
    }
  }
  combinedResultText += `合計　${totalCollected.toLocaleString()}円\n\n`;
  combinedResultText += `封筒に入れるもの\n`;
  let 補填合計 = 0;
  for (let denom of denominations) {
    if (combo[denom]) {
      const amount = denom * combo[denom];
      補填合計 += amount;
      combinedResultText += `${denom}円×${combo[denom]}枚 = ${amount.toLocaleString()}円\n`;
    }
  }
  combinedResultText += `合計　${補填合計.toLocaleString()}円`;

  postMessage({ shortageResultText, combinedResultText });
};
