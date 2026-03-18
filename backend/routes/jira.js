import express from 'express';
import {
  getBoards,
  getSprints,
  getSprintDetails,
  getSprintIssues,
  getBurndownData,
  getIssueTransitions,
  transitionIssue,
  testConnection,
} from '../services/jiraService.js';

const router = express.Router();

router.get('/jira/test', async (req, res) => {
  try {
    const user = await testConnection();
    res.json({ ok: true, user: { name: user.displayName, email: user.emailAddress } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/jira/boards', async (req, res) => {
  try {
    const boards = await getBoards();
    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/jira/sprints', async (req, res) => {
  try {
    const boardId = req.query.boardId || process.env.JIRA_BOARD_ID;
    const sprints = await getSprints(boardId);
    res.json(sprints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/jira/sprint/:sprintId', async (req, res) => {
  try {
    const sprint = await getSprintDetails(req.params.sprintId);
    res.json(sprint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/jira/sprint/:sprintId/issues', async (req, res) => {
  try {
    const issues = await getSprintIssues(req.params.sprintId);
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/jira/sprint/:sprintId/burndown', async (req, res) => {
  try {
    const data = await getBurndownData(req.params.sprintId);
    if (req.query.debug) {
      const issues = await getSprintIssues(req.params.sprintId);
      const sprint = await getSprintDetails(req.params.sprintId);
      res.json({
        burndown: data,
        debug: {
          sprintId: req.params.sprintId,
          sprintState: sprint.state,
          sprintStart: sprint.startDate,
          sprintEnd: sprint.endDate,
          issueCount: issues.length,
          issues: issues.map(i => ({
            key: i.key,
            summary: i.summary,
            status: i.status,
            statusCategory: i.statusCategory,
            storyPoints: i.storyPoints,
            issueType: i.issueType,
            resolutionDate: i.resolutionDate,
          })),
        },
      });
    } else {
      res.json(data);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/jira/issue/:issueKey', async (req, res) => {
  try {
    const transitions = await getIssueTransitions(req.params.issueKey);
    res.json({ transitions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/jira/issue/:issueKey', async (req, res) => {
  try {
    const { transitionId } = req.body;
    if (!transitionId) return res.status(400).json({ error: 'transitionId required' });
    await transitionIssue(req.params.issueKey, transitionId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
