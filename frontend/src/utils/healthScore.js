export function calculateHealthScore(burndown, issues, totalPoints, originalTotalPoints) {
  const factors = [];
  let score = 100;

  // Burndown deviation (40 points)
  if (burndown && burndown.length >= 2) {
    const latest = burndown[burndown.length - 1];
    const deviation = latest.actual - latest.ideal;
    const deviationPct = totalPoints > 0 ? (deviation / totalPoints) * 100 : 0;
    const burndownScore = Math.max(0, 40 - Math.abs(deviationPct) * 0.4);
    factors.push({ name: 'Burndown', score: Math.round(burndownScore), max: 40 });
    score -= 40 - burndownScore;
  } else {
    factors.push({ name: 'Burndown', score: 40, max: 40 });
  }

  // Blocker penalty (30 points)
  const blockers = (issues || []).filter(
    (i) => i.priority === 'Blocker' || i.priority === 'Critical'
  ).length;
  const blockerScore = Math.max(0, 30 - blockers * 10);
  factors.push({ name: 'Blockers', score: blockerScore, max: 30 });
  score -= 30 - blockerScore;

  // Bug penalty (20 points)
  const bugs = (issues || []).filter((i) => i.issueType === 'Bug').length;
  const bugScore = Math.max(0, 20 - bugs * 5);
  factors.push({ name: 'Bugs', score: bugScore, max: 20 });
  score -= 20 - bugScore;

  // Scope change (10 points)
  const scopeChange = originalTotalPoints && totalPoints > originalTotalPoints
    ? ((totalPoints - originalTotalPoints) / originalTotalPoints) * 100
    : 0;
  const scopeScore = Math.max(0, 10 - scopeChange * 0.1);
  factors.push({ name: 'Scope', score: Math.round(scopeScore), max: 10 });
  score -= 10 - scopeScore;

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const level = finalScore >= 75 ? 'healthy' : finalScore >= 50 ? 'at-risk' : 'critical';

  return { score: finalScore, level, factors };
}
