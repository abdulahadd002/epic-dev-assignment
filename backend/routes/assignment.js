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
// Accepts either:
//   Full form: { assignments, epicId, newDeveloperUsername, workloadDistribution, developers }
//   Simple form: { epic_id, new_developer, developers } (from project Assign page)
router.post('/reassign', async (req, res) => {
  try {
    const {
      assignments, workloadDistribution, developers,
      // Accept both naming conventions
      epicId: _epicId, epic_id: _epic_id,
      newDeveloperUsername: _newDev, new_developer: _new_dev,
    } = req.body;

    const epicId = _epicId || _epic_id;
    const newDeveloperUsername = _newDev || _new_dev;

    if (!epicId || !newDeveloperUsername) {
      return res.status(400).json({
        success: false,
        error: 'epicId (or epic_id) and newDeveloperUsername (or new_developer) are required'
      });
    }

    // Full form: use reassignEpic service
    if (assignments && workloadDistribution) {
      const result = reassignEpic(assignments, epicId, newDeveloperUsername, workloadDistribution, developers);
      return res.json(result);
    }

    // Simple form: return the new assignment fields directly
    const dev = (developers || []).find(d => (d.login || d.username) === newDeveloperUsername);
    res.json({
      success: true,
      epic_id: epicId,
      assigned_developer: newDeveloperUsername,
      developer: {
        username: newDeveloperUsername,
        expertise: dev?.primary_expertise || dev?.analysis?.expertise?.primary || 'Full Stack',
        experienceLevel: dev?.experience_level || dev?.analysis?.experienceLevel?.level || 'Junior',
      },
      confidence: 'manual',
    });
  } catch (error) {
    console.error('Error reassigning epic:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reassign epic'
    });
  }
});

export default router;
