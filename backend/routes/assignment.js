import express from 'express';
import { autoAssignEpics, reassignEpic } from '../services/assignmentService.js';

const router = express.Router();

// POST /api/auto-assign - Auto-assign epics to developers
router.post('/auto-assign', async (req, res) => {
  try {
    const { epics, developers } = req.body;

    if (!epics || !Array.isArray(epics)) {
      return res.status(400).json({
        success: false,
        error: 'Epics array is required'
      });
    }

    if (!developers || !Array.isArray(developers)) {
      return res.status(400).json({
        success: false,
        error: 'Developers array is required'
      });
    }

    if (epics.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No epics to assign'
      });
    }

    if (developers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No developers available'
      });
    }

    const result = await autoAssignEpics(epics, developers);

    res.json(result);
  } catch (error) {
    console.error('Error auto-assigning epics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to auto-assign epics'
    });
  }
});

// POST /api/reassign - Manually reassign an epic
router.post('/reassign', async (req, res) => {
  try {
    const { assignments, epicId, newDeveloperUsername, workloadDistribution } = req.body;

    if (!assignments || !epicId || !newDeveloperUsername || !workloadDistribution) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    const result = reassignEpic(
      assignments,
      epicId,
      newDeveloperUsername,
      workloadDistribution
    );

    res.json(result);
  } catch (error) {
    console.error('Error reassigning epic:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reassign epic'
    });
  }
});

export default router;
