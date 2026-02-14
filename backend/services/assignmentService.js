import { classifyEpic } from './epicClassifier.js';

/**
 * Auto-assign epics to developers using multi-factor scoring algorithm
 * @param {Array} epics - Approved epics with user stories
 * @param {Array} developers - Analyzed developers with expertise and experience
 * @returns {Object} Assignment results with workload distribution
 */
export async function autoAssignEpics(epics, developers) {
  const assignments = [];
  const devWorkloads = {};

  // Initialize workloads
  developers.forEach(dev => {
    devWorkloads[dev.username] = 0;
  });

  // Classify and assign each epic
  for (const epic of epics) {
    // Classify epic if not already classified
    if (!epic.classification) {
      epic.classification = await classifyEpic(epic);
    }

    const epicType = epic.classification.primary;

    // Calculate total story points for this epic
    const totalStoryPoints = epic.user_stories?.reduce((sum, story) =>
      sum + parseInt(story.story_points || 5, 10), 0
    ) || 10;

    // Score each developer for this epic
    const devScores = developers.map(dev => {
      let score = 0;
      const breakdown = {
        expertiseMatch: 0,
        experienceLevel: 0,
        workloadBalance: 0
      };

      // Factor 1: Expertise Match (50 points max)
      const expertiseMatch = dev.analysis?.expertise?.all?.find(e => e.name === epicType);
      if (expertiseMatch) {
        const expertisePoints = Math.min(50, expertiseMatch.score / 2);
        score += expertisePoints;
        breakdown.expertiseMatch = expertisePoints;
      } else if (dev.analysis?.expertise?.primary === "Full Stack") {
        score += 25; // Full stack bonus
        breakdown.expertiseMatch = 25;
      }

      // Factor 2: Experience Level (30 points max)
      const experiencePoints = {
        "Senior": 30,
        "Mid-Level": 20,
        "Junior": 10,
        "Beginner": 5
      };
      const expPoints = experiencePoints[dev.analysis?.experienceLevel?.level] || 5;
      score += expPoints;
      breakdown.experienceLevel = expPoints;

      // Factor 3: Workload Balance (20 points max - inverse)
      const avgWorkload = Object.values(devWorkloads).reduce((a, b) => a + b, 0) /
                          developers.length;
      const workloadDiff = avgWorkload - devWorkloads[dev.username];
      const workloadPoints = Math.min(20, Math.max(0, workloadDiff / 5));
      score += workloadPoints;
      breakdown.workloadBalance = workloadPoints;

      return { dev, score, breakdown };
    });

    // Sort by score (descending)
    devScores.sort((a, b) => b.score - a.score);

    // Assign to top developer
    const assigned = devScores[0];
    const confidence = getConfidence(assigned.score);

    assignments.push({
      epic: {
        epic_id: epic.epic_id,
        epic_title: epic.epic_title,
        epic_description: epic.epic_description,
        classification: epic.classification,
        totalStoryPoints,
        userStoriesCount: epic.user_stories?.length || 0
      },
      developer: {
        username: assigned.dev.username,
        expertise: assigned.dev.analysis.expertise.primary,
        experienceLevel: assigned.dev.analysis.experienceLevel.level,
        avatar: assigned.dev.avatar
      },
      score: Math.round(assigned.score),
      confidence,
      breakdown: assigned.breakdown,
      alternatives: devScores.slice(1, 3).map(ds => ({
        username: ds.dev.username,
        score: Math.round(ds.score),
        expertise: ds.dev.analysis.expertise.primary
      }))
    });

    // Update workload
    devWorkloads[assigned.dev.username] += totalStoryPoints;
  }

  return {
    success: true,
    assignments,
    workloadDistribution: devWorkloads,
    summary: {
      totalEpics: epics.length,
      totalStoryPoints: Object.values(devWorkloads).reduce((a, b) => a + b, 0),
      avgStoryPointsPerDev: Object.values(devWorkloads).reduce((a, b) => a + b, 0) / developers.length,
      highConfidenceAssignments: assignments.filter(a => a.confidence === "high").length,
      mediumConfidenceAssignments: assignments.filter(a => a.confidence === "medium").length,
      lowConfidenceAssignments: assignments.filter(a => a.confidence === "low").length
    }
  };
}

function getConfidence(score) {
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

/**
 * Manually reassign an epic to a different developer
 * @param {Array} assignments - Current assignments
 * @param {string} epicId - Epic ID to reassign
 * @param {string} newDeveloperUsername - New developer username
 * @param {Object} workloadDistribution - Current workload distribution
 * @returns {Object} Updated assignments and workload
 */
export function reassignEpic(assignments, epicId, newDeveloperUsername, workloadDistribution) {
  const assignmentIndex = assignments.findIndex(a => a.epic.epic_id === epicId);

  if (assignmentIndex === -1) {
    throw new Error(`Epic ${epicId} not found in assignments`);
  }

  const assignment = assignments[assignmentIndex];
  const oldDeveloper = assignment.developer.username;
  const storyPoints = assignment.epic.totalStoryPoints;

  // Update workload
  workloadDistribution[oldDeveloper] -= storyPoints;
  workloadDistribution[newDeveloperUsername] += storyPoints;

  // Update assignment (keep same epic, change developer)
  // Note: This is simplified - in real implementation, would look up new developer details
  assignments[assignmentIndex].developer.username = newDeveloperUsername;
  assignments[assignmentIndex].confidence = "manual";

  return {
    success: true,
    assignments,
    workloadDistribution
  };
}
