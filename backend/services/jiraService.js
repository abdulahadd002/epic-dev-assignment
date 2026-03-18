import fetch from 'node-fetch';

function getAuthHeaders() {
  const { JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
  const token = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  return {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function jiraFetch(path, options = {}) {
  const { JIRA_DOMAIN } = process.env;
  if (!JIRA_DOMAIN) {
    throw new Error('Jira not configured — set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN in backend/.env');
  }
  const url = `https://${JIRA_DOMAIN}${path}`;
  return fetch(url, { ...options, headers: { ...getAuthHeaders(), ...(options.headers || {}) } });
}

export async function getSprints(boardId) {
  const id = boardId || process.env.JIRA_BOARD_ID;
  const res = await jiraFetch(`/rest/agile/1.0/board/${id}/sprint?maxResults=50`);
  if (!res.ok) throw new Error(`Jira API error: ${res.status}`);
  const data = await res.json();
  return (data.values || []).map((s) => ({
    id: s.id,
    name: s.name,
    state: s.state,
    startDate: s.startDate,
    endDate: s.endDate,
    goal: s.goal,
  }));
}

export async function getSprintDetails(sprintId) {
  const res = await jiraFetch(`/rest/agile/1.0/sprint/${sprintId}`);
  if (!res.ok) throw new Error(`Jira API error: ${res.status}`);
  const s = await res.json();
  return { id: s.id, name: s.name, state: s.state, startDate: s.startDate, endDate: s.endDate, goal: s.goal };
}

export async function getSprintIssues(sprintId) {
  const res = await jiraFetch(
    `/rest/agile/1.0/sprint/${sprintId}/issue?maxResults=200&fields=summary,status,issuetype,priority,assignee,story_points,customfield_10016,customfield_10028,labels,created,updated,resolutiondate,statuscategorychangedate`
  );
  if (!res.ok) throw new Error(`Jira API error: ${res.status}`);
  const data = await res.json();
  return (data.issues || []).map((issue) => {
    const f = issue.fields;
    return {
      id: issue.id,
      key: issue.key,
      summary: f.summary,
      status: f.status?.name || 'To Do',
      statusCategory: f.status?.statusCategory?.name || 'To Do',
      issueType: f.issuetype?.name || 'Story',
      priority: f.priority?.name || 'Medium',
      assignee: f.assignee
        ? { name: f.assignee.displayName, avatarUrl: f.assignee.avatarUrls?.['48x48'] }
        : null,
      storyPoints: f.customfield_10016 || f.story_points || f.customfield_10028 || null,
      labels: f.labels || [],
      created: f.created,
      updated: f.updated,
      resolutionDate: f.resolutiondate || null,
      statusCategoryChangeDate: f.statuscategorychangedate || null,
    };
  });
}

export async function getBurndownData(sprintId) {
  const [sprint, issues] = await Promise.all([getSprintDetails(sprintId), getSprintIssues(sprintId)]);

  if (!sprint.startDate || !sprint.endDate) return [];

  const start = new Date(sprint.startDate);
  const end = new Date(sprint.endDate);
  const now = new Date();
  const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

  // Count story points — if custom fields are null, fall back to counting issues as 1 point each
  let totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
  const hasStoryPoints = totalPoints > 0;
  if (!hasStoryPoints) {
    // No story points set — use issue count as proxy (1 point per issue)
    totalPoints = issues.filter(i => (i.issueType || '').toLowerCase() !== 'epic').length;
  }

  // Determine when each issue was completed
  // Use statusCategory === 'Done' to identify completed items
  const completionDates = issues
    .filter(i => i.statusCategory === 'Done')
    .map(i => ({
      points: hasStoryPoints ? (i.storyPoints || 0) : ((i.issueType || '').toLowerCase() !== 'epic' ? 1 : 0),
      completedAt: new Date(i.resolutionDate || i.statusCategoryChangeDate || i.updated),
    }));

  // Also count currently-done items without dates (for live "now" point)
  const currentDonePoints = issues
    .filter(i => i.statusCategory === 'Done')
    .reduce((sum, i) => sum + (hasStoryPoints ? (i.storyPoints || 0) : ((i.issueType || '').toLowerCase() !== 'epic' ? 1 : 0)), 0);

  const points = [];

  // Generate historical day-by-day points
  for (let d = 0; d <= totalDays; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    if (date > now) break;

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const dateStr = date.toISOString().split('T')[0];
    const ideal = totalPoints - (totalPoints / totalDays) * d;
    const completedPoints = completionDates
      .filter(c => c.completedAt <= endOfDay)
      .reduce((sum, c) => sum + c.points, 0);

    points.push({
      day: `Day ${d + 1}`,
      date: dateStr,
      ideal: Math.max(0, Math.round(ideal)),
      actual: Math.max(0, totalPoints - completedPoints),
    });
  }

  // Add a live "Now" point if we only have 1 historical point (same day as start)
  // This ensures the chart always has at least 2 points to draw a line
  if (points.length === 1) {
    const elapsed = (now - start) / (1000 * 60 * 60 * 24);
    const idealNow = totalPoints - (totalPoints / totalDays) * elapsed;
    points.push({
      day: 'Now',
      date: now.toISOString().split('T')[0],
      ideal: Math.max(0, Math.round(idealNow)),
      actual: Math.max(0, totalPoints - currentDonePoints),
    });
  }

  console.log(`[Burndown] Sprint ${sprintId}: ${issues.length} issues, ${totalPoints} points (${hasStoryPoints ? 'SP' : 'count'}), ${currentDonePoints} done, ${points.length} data points`);

  return points;
}

export async function getProjectIssues(projectKey) {
  const jql = encodeURIComponent(`project = "${projectKey}" AND issuetype != Epic ORDER BY status ASC, key ASC`);
  const fields = 'summary,status,issuetype,priority,assignee,story_points,customfield_10016,customfield_10028,labels,created,updated,resolutiondate,statuscategorychangedate';
  const res = await jiraFetch(`/rest/api/3/search?jql=${jql}&maxResults=200&fields=${fields}`);
  if (!res.ok) throw new Error(`Jira API error: ${res.status}`);
  const data = await res.json();
  return (data.issues || []).map((issue) => {
    const f = issue.fields;
    return {
      id: issue.id,
      key: issue.key,
      summary: f.summary,
      status: f.status?.name || 'To Do',
      statusCategory: f.status?.statusCategory?.name || 'To Do',
      issueType: f.issuetype?.name || 'Story',
      priority: f.priority?.name || 'Medium',
      assignee: f.assignee
        ? { name: f.assignee.displayName, avatarUrl: f.assignee.avatarUrls?.['48x48'] }
        : null,
      storyPoints: f.customfield_10016 || f.story_points || f.customfield_10028 || null,
      labels: f.labels || [],
      created: f.created,
      updated: f.updated,
      resolutionDate: f.resolutiondate || null,
      statusCategoryChangeDate: f.statuscategorychangedate || null,
    };
  });
}

export async function getIssueTransitions(issueKey) {
  const res = await jiraFetch(`/rest/api/3/issue/${issueKey}/transitions`);
  if (!res.ok) throw new Error(`Jira API error: ${res.status}`);
  const data = await res.json();
  return (data.transitions || []).map((t) => ({ id: t.id, name: t.name, to: t.to?.name }));
}

export async function transitionIssue(issueKey, transitionId) {
  const res = await jiraFetch(`/rest/api/3/issue/${issueKey}/transitions`, {
    method: 'POST',
    body: JSON.stringify({ transition: { id: transitionId } }),
  });
  if (!res.ok) throw new Error(`Jira API error: ${res.status}`);
}

export async function createEpic(projectKey, title, description) {
  const res = await jiraFetch('/rest/api/3/issue', {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        summary: title,
        description: {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }],
        },
        issuetype: { name: 'Epic' },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.errorMessages?.[0] || `Jira API error: ${res.status}`);
  }
  return res.json();
}

export async function createStory(projectKey, title, description, acceptanceCriteria, epicKey, testCases) {
  // Build ADF content blocks for the issue description
  const contentBlocks = [];

  if (description) {
    contentBlocks.push({ type: 'paragraph', content: [{ type: 'text', text: description }] });
  }

  if (acceptanceCriteria) {
    contentBlocks.push(
      { type: 'paragraph', content: [{ type: 'text', text: '\nAcceptance Criteria:', marks: [{ type: 'strong' }] }] },
      { type: 'paragraph', content: [{ type: 'text', text: acceptanceCriteria }] }
    );
  }

  if (testCases && testCases.length > 0) {
    for (const tc of testCases) {
      const tcParts = [];
      if (tc.id) tcParts.push(`[${tc.id}]`);
      tcParts.push(tc.description || 'Test Case');
      contentBlocks.push(
        { type: 'paragraph', content: [{ type: 'text', text: `\nTest Case: ${tcParts.join(' ')}`, marks: [{ type: 'strong' }] }] }
      );
      if (tc.preconditions) {
        contentBlocks.push({ type: 'paragraph', content: [{ type: 'text', text: `Preconditions: ${tc.preconditions}` }] });
      }
      if (tc.testData) {
        contentBlocks.push({ type: 'paragraph', content: [{ type: 'text', text: `Test Data: ${tc.testData}` }] });
      }
      if (tc.userAction) {
        contentBlocks.push({ type: 'paragraph', content: [{ type: 'text', text: `Steps: ${tc.userAction}` }] });
      }
      if (tc.expectedResults && tc.expectedResults.length > 0) {
        contentBlocks.push({ type: 'paragraph', content: [{ type: 'text', text: 'Expected Results:' }] });
        contentBlocks.push({
          type: 'orderedList',
          content: tc.expectedResults.map((r) => ({
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: r }] }],
          })),
        });
      }
    }
  }

  // Fallback: ensure at least one content block
  if (contentBlocks.length === 0) {
    contentBlocks.push({ type: 'paragraph', content: [{ type: 'text', text: title }] });
  }

  const body = {
    fields: {
      project: { key: projectKey },
      summary: title,
      description: {
        type: 'doc',
        version: 1,
        content: contentBlocks,
      },
      issuetype: { name: 'Story' },
    },
  };
  if (epicKey) body.fields['customfield_10014'] = epicKey;

  const res = await jiraFetch('/rest/api/3/issue', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.errorMessages?.[0] || `Jira API error: ${res.status}`);
  }
  return res.json();
}

export async function testConnection() {
  const res = await jiraFetch('/rest/api/3/myself');
  if (!res.ok) throw new Error(`Jira API error: ${res.status}`);
  return res.json();
}

export async function getBoards() {
  const res = await jiraFetch('/rest/agile/1.0/board?maxResults=50');
  if (!res.ok) throw new Error(`Jira API error: ${res.status}`);
  const data = await res.json();
  return (data.values || []).map((b) => ({ id: b.id, name: b.name, type: b.type }));
}

export async function createSprint(boardId, name, startDate, endDate) {
  const res = await jiraFetch('/rest/agile/1.0/sprint', {
    method: 'POST',
    body: JSON.stringify({
      name,
      startDate,
      endDate,
      originBoardId: parseInt(boardId),
      goal: `Auto-created sprint for ${name}`,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.errorMessages?.[0] || `Sprint creation failed: ${res.status}`);
  }
  return res.json();
}

export async function startSprint(sprintId, startDate, endDate, boardId) {
  // If there's already an active sprint on this board, close it first
  if (boardId) {
    try {
      const existingSprints = await getSprints(boardId);
      const activeSprint = existingSprints.find(s => s.state === 'active');
      if (activeSprint && activeSprint.id !== sprintId) {
        console.log(`[Jira] Closing existing active sprint ${activeSprint.id} (${activeSprint.name}) to activate new one`);
        await jiraFetch(`/rest/agile/1.0/sprint/${activeSprint.id}`, {
          method: 'PUT',
          body: JSON.stringify({ state: 'closed' }),
        });
      }
    } catch (err) {
      console.warn(`[Jira] Could not check/close existing active sprint: ${err.message}`);
    }
  }

  // Jira requires startDate + endDate when activating a sprint
  const body = { state: 'active' };
  if (startDate) body.startDate = startDate;
  if (endDate) body.endDate = endDate;
  const res = await jiraFetch(`/rest/agile/1.0/sprint/${sprintId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.errorMessages?.[0] || err.errors?.state || `Sprint start failed: ${res.status}`);
  }
  return res.json();
}

export async function moveIssueToSprint(sprintId, issueKeys) {
  const res = await jiraFetch(`/rest/agile/1.0/sprint/${sprintId}/issue`, {
    method: 'POST',
    body: JSON.stringify({ issues: issueKeys }),
  });
  if (!res.ok) throw new Error(`Failed to move issues to sprint: ${res.status}`);
}

export async function assignIssue(issueKey, accountId) {
  const res = await jiraFetch(`/rest/api/3/issue/${issueKey}/assignee`, {
    method: 'PUT',
    body: JSON.stringify({ accountId }),
  });
  if (!res.ok) throw new Error(`Failed to assign ${issueKey}: ${res.status}`);
}

export async function updateStoryPoints(issueKey, points) {
  const res = await jiraFetch(`/rest/api/3/issue/${issueKey}`, {
    method: 'PUT',
    body: JSON.stringify({ fields: { customfield_10016: points } }),
  });
  if (!res.ok) throw new Error(`Failed to set story points on ${issueKey}: ${res.status}`);
}

export async function searchUser(query) {
  const res = await jiraFetch(`/rest/api/3/user/search?query=${encodeURIComponent(query)}&maxResults=5`);
  if (!res.ok) throw new Error(`User search failed: ${res.status}`);
  return res.json();
}

export function generateProjectKey(name) {
  const words = name.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/).filter(Boolean);
  let key;
  if (words.length >= 2) {
    key = words.map((w) => w[0]).join('').toUpperCase().slice(0, 10);
  } else {
    key = (words[0] || 'PROJ').toUpperCase().slice(0, 10);
  }
  if (key.length < 2) key = key + 'X';
  return key;
}

export async function getMyself() {
  const res = await jiraFetch('/rest/api/3/myself');
  if (!res.ok) throw new Error(`Jira API error: ${res.status}`);
  return res.json();
}

export async function createProject(name, key, leadAccountId) {
  const res = await jiraFetch('/rest/api/3/project', {
    method: 'POST',
    body: JSON.stringify({
      key,
      name,
      projectTypeKey: 'software',
      projectTemplateKey: 'com.pyxis.greenhopper.jira:gh-simplified-scrum-classic',
      leadAccountId,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.errors ? Object.values(err.errors).join(', ') : (err.errorMessages?.[0] || `Project creation failed: ${res.status}`);
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function getProjectBoards(projectKey) {
  const res = await jiraFetch(`/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(projectKey)}&maxResults=10`);
  if (!res.ok) throw new Error(`Failed to fetch boards for project ${projectKey}: ${res.status}`);
  const data = await res.json();
  return (data.values || []).map((b) => ({ id: b.id, name: b.name, type: b.type }));
}

/**
 * Get all roles for a project. Returns { roleName: roleId } map.
 */
export async function getProjectRoles(projectKey) {
  const res = await jiraFetch(`/rest/api/3/project/${encodeURIComponent(projectKey)}/role`);
  if (!res.ok) throw new Error(`Failed to get project roles: ${res.status}`);
  const data = await res.json();
  // data is { "RoleName": "https://.../{roleId}", ... }
  const roles = {};
  for (const [name, url] of Object.entries(data)) {
    const match = url.match(/\/(\d+)$/);
    if (match) roles[name] = match[1];
  }
  return roles;
}

/**
 * Add a user (by accountId) to a project role.
 */
export async function addUserToProjectRole(projectKey, roleId, accountId) {
  const res = await jiraFetch(`/rest/api/3/project/${encodeURIComponent(projectKey)}/role/${roleId}`, {
    method: 'POST',
    body: JSON.stringify({ user: [accountId] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.errorMessages?.[0] || `Failed to add user to project role: ${res.status}`);
  }
  return res.json();
}
