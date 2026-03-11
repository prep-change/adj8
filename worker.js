// Web Worker: worker.js

onmessage = (event) => {
  const { action, input, baseTargets, denominations } = event.data;

  if (action === 'adjustShortage') {
    const result = adjustShortageInWorker(input, baseTargets, denominations);
    postMessage(result);
  }
};

function adjustShortageInWorker(input, baseTargets, denominations) {
  const maxTry = 6; // 計算回数を制限
  let best = null;

  for (let t = 0; t <= maxTry; t++) {
    const patterns = generateAdjustmentPatterns(baseTargets, t);

    for (let newTargets of patterns) {
      const shortage = {};
      let shortageTotal = 0;

      for (let denom of denominations) {
        const need = Math.min(baseTargets[denom], newTargets[denom] || 0);
        const lack = Math.max(0, need - input[denom]);
        if (lack > 0) {
          shortage[denom] = lack;
          shortageTotal += denom * lack;
        }
      }

      if (shortageTotal > 0) {
        best = { shortage, shortageTotal, newTargets };
        break;
      }
    }

    if (best) break;
  }

  if (!best) {
    return { success: false };
  }

  const { shortage, shortageTotal } = best;

  let shortageResultText = `【調整後不足金種】\n`;
  for (let denom of denominations) {
    if (shortage[denom]) {
      shortageResultText += `${denom}円×${shortage[denom]}枚 = ${denom * shortage[denom]}円\n`;
    }
  }

  let combinedResultText = `【釣銭回収】\n`;
  combinedResultText += `合計　${shortageTotal.toLocaleString()}円`;

  return {
    success: true,
    shortageResultText,
    combinedResultText,
  };
}

function generateAdjustmentPatterns(baseTargets, extraCount) {
  if (extraCount === 0) return [Object.assign({}, baseTargets)];
  const patterns = [];
  const denoms = Object.keys(baseTargets).map(Number);

  function backtrack(i, remaining, current) {
    if (i === denoms.length) {
      if (remaining === 0) patterns.push({ ...current });
      return;
    }
    const denom = denoms[i];
    const limit = remaining;
    for (let add = 0; add <= limit; add++) {
      current[denom] = baseTargets[denom] + add;
      backtrack(i + 1, remaining - add, current);
    }
  }

  backtrack(0, extraCount, {});
  return patterns;
}