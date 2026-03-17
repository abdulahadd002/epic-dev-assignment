import express from 'express';
import {
  createEpic, createStory, createSprint, moveIssueToSprint,
  assignIssue, updateStoryPoints, searchUser,
  generateProjectKey, getMyself, createProject, getProjectBoards,
} from '../services/jiraService.js';

const router = express.Router();

/**
 * Distribute stories evenly across sprints by story points.
 * Uses a greedy bin-packing approach: assign each story to the sprint with the lowest load.
 */
function distributeStoriesAcrossSprints(allStories, sprintCount) {
  if (sprintCount <= 1) return [allStories];

  const bins = Array.from({ length: sprintCount }, () => ({ stories: [], points: 0 }));

  // Sort stories by points descending for better distribution
  const sorted = [...allStories].sort((a, b) => (b.storyPoints || 5) - (a.storyPoints || 5));

  for (const story of sorted) {
    // Find the bin with the lowest total points
    let minIdx = 0;
    for (let i = 1; i < bins.length; i++) {
      if (bins[i].points < bins[minIdx].points) minIdx = i;
    }
    bins[minIdx].stories.push(story);
    bins[minIdx].points += story.storyPoints || 5;
  }

  return bins.map(b => b.stories);
}

router.post('/ai/sync-jira', async (req, res) => {
  const {
    epics = [],
    assignments = [],
    deadline = null,
    projectName = 'Sprint',
    sprintCount: requestedSprintCount = 1,
    developerJiraMap = {},
  } = req.body;

  const approvedEpics = epics.filter((e) => e.status === 'approved');
  if (approvedEpics.length < 2) {
    return res.status(400).json({ error: 'At least 2 approved epics are required to sync.' });
  }

  try {
    // Step 0: Auto-create Jira project and discover its board
    let projectKey;
    let jiraBoardId = process.env.JIRA_BOARD_ID || null;

    const myself = await getMyself();
    const leadAccountId = myself.accountId;
    console.log(`[Sync] Authenticated as: ${myself.displayName}`);

    let baseKey = generateProjectKey(projectName);
    let created = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidateKey = attempt === 0 ? baseKey : `${baseKey}${attempt + 1}`;
      try {
        const proj = await createProject(projectName, candidateKey, leadAccountId);
        projectKey = proj.key || candidateKey;
        console.log(`[Sync] Created Jira project: ${projectKey}`);
        created = true;
        break;
      } catch (err) {
        if (err.status === 400 && err.message.toLowerCase().includes('key')) {
          console.warn(`[Sync] Project key "${candidateKey}" taken, trying next...`);
          continue;
        }
        throw err;
      }
    }
    if (!created) {
      throw new Error(`Could not create Jira project — all key variants for "${baseKey}" are taken`);
    }

    // Discover the auto-created board for this project
    if (!jiraBoardId) {
      await new Promise((r) => setTimeout(r, 2000));
      const boards = await getProjectBoards(projectKey);
      if (boards.length > 0) {
        jiraBoardId = boards[0].id;
        console.log(`[Sync] Found board: ${boards[0].name} (ID: ${jiraBoardId})`);
      } else {
        console.warn('[Sync] No board found for project — sprint creation will be skipped');
      }
    }

    // Step 1: Calculate total project duration
    const startDate = new Date();
    const endDate = new Date();
    if (deadline && deadline.value) {
      const v = parseInt(deadline.value) || 2;
      switch (deadline.unit) {
        case 'hours':  endDate.setHours(endDate.getHours() + v); break;
        case 'days':   endDate.setDate(endDate.getDate() + v); break;
        case 'months': endDate.setMonth(endDate.getMonth() + v); break;
        case 'weeks':
        default:       endDate.setDate(endDate.getDate() + v * 7); break;
      }
    } else {
      endDate.setDate(endDate.getDate() + 14);
    }

    const numSprints = Math.max(1, Math.min(10, parseInt(requestedSprintCount) || 1));
    const totalMs = endDate.getTime() - startDate.getTime();
    const sprintMs = totalMs / numSprints;

    // Step 2: Create sprints on the Jira board
    const sprints = [];
    if (jiraBoardId) {
      for (let i = 0; i < numSprints; i++) {
        try {
          const sStart = new Date(startDate.getTime() + sprintMs * i);
          const sEnd = new Date(startDate.getTime() + sprintMs * (i + 1));
          const sprintName = numSprints > 1
            ? `${projectName} - Sprint ${i + 1}`
            : `${projectName} - Sprint`;
          const sprint = await createSprint(jiraBoardId, sprintName, sStart.toISOString(), sEnd.toISOString());
          sprints.push(sprint);
          console.log(`[Sync] Created sprint: ${sprint.name} (ID: ${sprint.id})`);
        } catch (err) {
          console.warn(`[Sync] Sprint ${i + 1} creation failed: ${err.message}`);
        }
      }
    }

    // Step 3: Build story-level assignment lookup { story_id -> github_username }
    // Supports both story-level and legacy epic-level assignments
    const storyAssignmentMap = {};
    const epicAssignmentMap = {};
    for (const a of assignments) {
      if (a.story_id && a.assigned_developer) {
        storyAssignmentMap[a.story_id] = a.assigned_developer;
      }
      if (a.epic_id && a.assigned_developer) {
        epicAssignmentMap[a.epic_id] = a.assigned_developer;
      }
    }

    // Step 4: Resolve Jira accountIds from developer usernames
    const allDevUsernames = new Set([...Object.values(storyAssignmentMap), ...Object.values(epicAssignmentMap)]);
    const accountIdCache = {};
    for (const username of allDevUsernames) {
      if (!username) continue;
      const jiraQuery = developerJiraMap[username] || username;
      try {
        const users = await searchUser(jiraQuery);
        if (users.length > 0) {
          accountIdCache[username] = users[0].accountId;
          console.log(`[Sync] Resolved Jira user: ${username} → ${users[0].displayName}`);
        } else {
          console.warn(`[Sync] No Jira user found for "${jiraQuery}"`);
        }
      } catch (err) {
        console.warn(`[Sync] Could not find Jira user for "${jiraQuery}": ${err.message}`);
      }
    }

    // Step 5: Create epics and stories, assign devs, set story points
    const results = [];
    const allCreatedStories = []; // { key, storyPoints, epicIdx }

    for (let eIdx = 0; eIdx < approvedEpics.length; eIdx++) {
      const epic = approvedEpics[eIdx];
      const createdEpic = await createEpic(projectKey, epic.title, epic.description || '');
      const epicKey = createdEpic.key;
      console.log(`[Sync] Created epic: ${epicKey} - ${epic.title}`);

      // Assign developer to epic (use epic-level fallback if no story-level assignments)
      const epicDevUsername = epicAssignmentMap[epic.id];
      if (epicDevUsername && accountIdCache[epicDevUsername]) {
        try { await assignIssue(epicKey, accountIdCache[epicDevUsername]); } catch (err) {
          console.warn(`[Sync] Could not assign ${epicKey} to ${epicDevUsername}: ${err.message}`);
        }
      }

      const storyResults = [];
      const approvedStories = (epic.stories || []).filter((s) => s.status === 'approved');

      for (const story of approvedStories) {
        const createdStory = await createStory(
          projectKey, story.title,
          story.description || '', story.acceptanceCriteria || '',
          epicKey
        );
        console.log(`[Sync] Created story: ${createdStory.key} - ${story.title}`);

        // Set story points
        const sp = parseInt(story.storyPoints || 5);
        if (sp) {
          try { await updateStoryPoints(createdStory.key, sp); } catch (err) {
            console.warn(`[Sync] Could not set story points on ${createdStory.key}: ${err.message}`);
          }
        }

        // Assign developer — story-level first, fall back to epic-level
        const storyDevUsername = storyAssignmentMap[story.id] || epicDevUsername;
        if (storyDevUsername && accountIdCache[storyDevUsername]) {
          try { await assignIssue(createdStory.key, accountIdCache[storyDevUsername]); } catch (err) {
            console.warn(`[Sync] Could not assign ${createdStory.key}: ${err.message}`);
          }
        }

        storyResults.push({ storyId: story.id, storyKey: createdStory.key });
        allCreatedStories.push({ key: createdStory.key, storyPoints: sp, epicIdx: eIdx });
      }

      results.push({ epicId: epic.id, epicKey, stories: storyResults });
    }

    // Step 6: Distribute stories across sprints and move them
    if (sprints.length > 0 && allCreatedStories.length > 0) {
      if (sprints.length === 1) {
        // Single sprint: move all stories + epic keys
        const allKeys = [
          ...results.map(r => r.epicKey),
          ...allCreatedStories.map(s => s.key),
        ];
        try {
          await moveIssueToSprint(sprints[0].id, allKeys);
          console.log(`[Sync] Moved ${allKeys.length} issues to sprint ${sprints[0].id}`);
        } catch (err) {
          console.warn(`[Sync] Could not move issues to sprint: ${err.message}`);
        }
      } else {
        // Multi-sprint: distribute stories by points, epics go to first sprint
        const storyBins = distributeStoriesAcrossSprints(allCreatedStories, sprints.length);

        // Move all epic keys to first sprint
        const epicKeys = results.map(r => r.epicKey);
        if (epicKeys.length > 0) {
          try {
            await moveIssueToSprint(sprints[0].id, epicKeys);
            console.log(`[Sync] Moved ${epicKeys.length} epics to sprint 1`);
          } catch (err) {
            console.warn(`[Sync] Could not move epics to sprint 1: ${err.message}`);
          }
        }

        // Move story batches to their sprints
        for (let i = 0; i < sprints.length; i++) {
          const storyKeys = storyBins[i]?.map(s => s.key) || [];
          if (storyKeys.length === 0) continue;
          try {
            await moveIssueToSprint(sprints[i].id, storyKeys);
            console.log(`[Sync] Moved ${storyKeys.length} stories to sprint ${i + 1} (ID: ${sprints[i].id})`);
          } catch (err) {
            console.warn(`[Sync] Could not move stories to sprint ${i + 1}: ${err.message}`);
          }
        }
      }
    }

    res.json({
      results,
      sprintId: sprints[0]?.id || null,
      sprintName: sprints[0]?.name || null,
      sprintCount: sprints.length,
      sprints: sprints.map(s => ({ id: s.id, name: s.name })),
      totalIssues: results.reduce((s, r) => s + 1 + r.stories.length, 0),
      jiraProjectKey: projectKey,
      jiraBoardId: jiraBoardId,
    });
  } catch (err) {
    console.error('[Sync] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
