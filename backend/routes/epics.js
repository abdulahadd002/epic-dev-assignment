import express from 'express';
import { generateEpics, regenerateComponent } from '../services/flaskProxy.js';
import { classifyEpics } from '../services/epicClassifier.js';

const router = express.Router();

// POST /api/generate - Generate epics from project description
router.post('/generate', async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Project description is required'
      });
    }

    // Proxy request to Flask service
    const result = await generateEpics(description);

    res.json(result);
  } catch (error) {
    console.error('Error generating epics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate epics'
    });
  }
});

// POST /api/regenerate - Regenerate a specific epic component
router.post('/regenerate', async (req, res) => {
  try {
    const { type, project_description, context } = req.body;

    if (!type || !project_description) {
      return res.status(400).json({
        success: false,
        error: 'type and project_description are required'
      });
    }

    const result = await regenerateComponent(type, project_description, context || {});

    res.json(result);
  } catch (error) {
    console.error('Error regenerating component:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to regenerate component'
    });
  }
});

// POST /api/classify-epics - Classify epic types
router.post('/classify-epics', async (req, res) => {
  try {
    const { epics } = req.body;

    if (!epics || !Array.isArray(epics)) {
      return res.status(400).json({
        success: false,
        error: 'Epics array is required'
      });
    }

    const classifications = await classifyEpics(epics);

    res.json({
      success: true,
      classifications
    });
  } catch (error) {
    console.error('Error classifying epics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to classify epics'
    });
  }
});

export default router;
