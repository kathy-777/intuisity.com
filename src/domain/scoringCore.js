const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function scoreDailyChallenge(challenges, answers) {
  const total = challenges.length;
  const correct = challenges.reduce((count, challenge) => {
    return count + (answers[challenge.id] === challenge.answer ? 1 : 0);
  }, 0);
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);

  return {
    correct,
    total,
    percent,
    points: correct * 20
  };
}

function scoreRemoteViewing(selection, target) {
  if (!selection) {
    return { hit: false, points: 0, confidenceBonus: 0 };
  }

  const baseHit = selection.imageId === target.imageId || selection.theme === target.theme;
  const confidenceBonus = baseHit ? clamp(selection.confidence, 1, 5) * 2 : 0;

  return {
    hit: baseHit,
    points: baseHit ? 40 + confidenceBonus : 5,
    confidenceBonus
  };
}

function calculateIntuitionScore(history) {
  if (history.length === 0) {
    return 0;
  }

  const weighted = history.reduce((sum, entry) => sum + entry.percent * entry.weight, 0);
  const weights = history.reduce((sum, entry) => sum + entry.weight, 0);

  return Math.round(weighted / weights);
}

module.exports = {
  calculateIntuitionScore,
  scoreDailyChallenge,
  scoreRemoteViewing
};
