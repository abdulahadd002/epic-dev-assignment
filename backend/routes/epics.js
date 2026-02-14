import express from 'express';
import { generateEpics } from '../services/flaskProxy.js';
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
