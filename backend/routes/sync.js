import express from 'express';
import {
  createEpic, createStory, createSprint, moveIssueToSprint,
  assignIssue, updateStoryPoints, searchUser,
  generateProjectKey, getMyself, createProject, getProjectBoards,
} from '../services/jiraService.js';

const router = express.Router();

router.post('/ai/sync-jira', async (req, res) => {
  const {
    epics = [],
    assignments = [],
    deadline = null,
    projectName = 'Sprint',
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

    // Generate project key and create project
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
      // Wait briefly for Jira to finish creating the board
      await new Promise((r) => setTimeout(r, 2000));
      const boards = await getProjectBoards(projectKey);
      if (boards.length > 0) {
        jiraBoardId = boards[0].id;
        console.log(`[Sync] Found board: ${boards[0].name} (ID: ${jiraBoardId})`);
      } else {
        console.warn('[Sync] No board found for project — sprint creation will be skipped');
      }
    }

    // Step 1: Calculate sprint dates from deadline
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
      endDate.setDate(endDate.getDate() + 14); // default 2 weeks
    }

    // Step 2: Create sprint on the Jira board
    let sprint = null;
    if (jiraBoardId) {
      try {
        const sprintName = `${projectName} - Sprint`;
        sprint = await createSprint(jiraBoardId, sprintName, startDate.toISOString(), endDate.toISOString());
        console.log(`[Sync] Created sprint: ${sprint.name} (ID: ${sprint.id})`);
      } catch (err) {
        console.warn(`[Sync] Sprint creation failed (continuing without sprint): ${err.message}`);
      }
    }

    // Step 3: Build assignment lookup { epic_id -> github_username }
    const assignmentMap = {};
    for (const a of assignments) {
      if (a.epic_id && a.assigned_developer) {
        assignmentMap[a.epic_id] = a.assigned_developer;
      }
    }

    // Step 4: Resolve Jira accountIds from developer usernames
    // Use developerJiraMap (jira username) if available, otherwise fall back to GitHub username
    const accountIdCache = {};
    for (const username of new Set(Object.values(assignmentMap))) {
      if (!username) continue;
      const jiraQuery = developerJiraMap[username] || username;
      try {
        const users = await searchUser(jiraQuery);
        if (users.length > 0) {
          accountIdCache[username] = users[0].accountId;
          console.log(`[Sync] Resolved Jira user: ${username} (query: ${jiraQuery}) → ${users[0].displayName}`);
        } else {
          console.warn(`[Sync] No Jira user found for "${jiraQuery}"`);
        }
      } catch (err) {
        console.warn(`[Sync] Could not find Jira user for "${jiraQuery}": ${err.message}`);
      }
    }

    // Step 5: Create epics and stories, assign devs, set story points
    const results = [];
    const allIssueKeys = [];

    for (const epic of approvedEpics) {
      const createdEpic = await createEpic(projectKey, epic.title, epic.description || '');
      const epicKey = createdEpic.key;
      allIssueKeys.push(epicKey);
      console.log(`[Sync] Created epic: ${epicKey} - ${epic.title}`);

      // Assign developer to epic
      const devUsername = assignmentMap[epic.id];
      if (devUsername && accountIdCache[devUsername]) {
        try { await assignIssue(epicKey, accountIdCache[devUsername]); } catch (err) {
          console.warn(`[Sync] Could not assign ${epicKey} to ${devUsername}: ${err.message}`);
        }
      }

      const storyResults = [];
      const approvedStories = (epic.stories || []).filter((s) => s.status === 'approved');

      for (const story of approvedStories) {
        const created = await createStory(
          projectKey, story.title,
          story.description || '', story.acceptanceCriteria || '',
          epicKey
        );
        allIssueKeys.push(created.key);
        console.log(`[Sync] Created story: ${created.key} - ${story.title}`);

        // Set story points
        if (story.storyPoints) {
          try { await updateStoryPoints(created.key, parseInt(story.storyPoints)); } catch (err) {
            console.warn(`[Sync] Could not set story points on ${created.key}: ${err.message}`);
          }
        }

        // Assign same developer as parent epic
        if (devUsername && accountIdCache[devUsername]) {
          try { await assignIssue(created.key, accountIdCache[devUsername]); } catch (err) {
            console.warn(`[Sync] Could not assign ${created.key}: ${err.message}`);
          }
        }

        storyResults.push({ storyId: story.id, storyKey: created.key });
      }

      results.push({ epicId: epic.id, epicKey, stories: storyResults });
    }

    // Step 6: Move all issues into the sprint
    if (sprint && allIssueKeys.length > 0) {
      try {
        await moveIssueToSprint(sprint.id, allIssueKeys);
        console.log(`[Sync] Moved ${allIssueKeys.length} issues to sprint ${sprint.id}`);
      } catch (err) {
        console.warn(`[Sync] Could not move issues to sprint: ${err.message}`);
      }
    }

    res.json({
      results,
      sprintId: sprint?.id || null,
      sprintName: sprint?.name || null,
      totalIssues: allIssueKeys.length,
      jiraProjectKey: projectKey,
      jiraBoardId: jiraBoardId,
    });
  } catch (err) {
    console.error('[Sync] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
