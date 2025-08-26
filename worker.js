onmessage = function(event) {
  const { input, baseTargets } = event.data;
  const denominations = [10000, 5000, 2000, 1000, 500, 100, 50, 10, 5, 1];

  let shortageResultText = `【調整後不足金種】\n`;
  let combinedResultText = `【釣銭回収】\n`;

  let totalShortage = 0;
  for (let denom of denominations) {
    const shortage = Math.max(0, baseTargets[denom] - input[denom]);
    if (shortage > 0) {
      shortageResultText += `${denom}円×${shortage}枚 = ${denom * shortage}円\n`;
      totalShortage += denom * shortage;
    }
  }
  shortageResultText += `合計　${totalShortage.toLocaleString()}円\n`;

  let totalCollected = 0;
  for (let denom of denominations) {
    const collected = Math.min(input[denom], baseTargets[denom]);
    combinedResultText += `${denom}円×${collected}枚 = ${denom * collected}円\n`;
    totalCollected += denom * collected;
  }
  combinedResultText += `合計　${totalCollected.toLocaleString()}円`;

  postMessage({ shortageResultText, combinedResultText });
};
