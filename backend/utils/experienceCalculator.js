// Ported from github-commit-analyzer/src/GitHubCommitAnalyzer.jsx (lines 257-289)

export function calculateExperienceLevel(totalCommits, onTimePercentage, messageQuality, consistency) {
  let score = 0;

  // Commit volume (40 points max)
  if (totalCommits > 200) score += 40;
  else if (totalCommits > 150) score += 35;
  else if (totalCommits > 100) score += 30;
  else if (totalCommits > 50) score += 25;
  else score += 10;

  // Work pattern (15 points max)
  if (onTimePercentage >= 60) score += 15;
  else if (onTimePercentage >= 50) score += 10;
  else if (onTimePercentage >= 30) score += 5;
  else score += 2;

  // Message quality (25 points max)
  if (messageQuality >= 40) score += 25;
  else if (messageQuality >= 30) score += 20;
  else if (messageQuality >= 20) score += 15;
  else score += 5;

  // Consistency (20 points max)
  if (consistency >= 70 && totalCommits > 100) score += 20;
  else if (consistency >= 60 && totalCommits > 50) score += 15;
  else if (consistency >= 40 && totalCommits > 30) score += 10;
  else score += 5;

  if (score >= 80) return { level: "Senior", tone: "purple", score };
  if (score >= 60) return { level: "Mid-Level", tone: "blue", score };
  if (score >= 40) return { level: "Junior", tone: "green", score };
  return { level: "Beginner", tone: "yellow", score };
}
