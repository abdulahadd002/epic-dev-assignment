import express from 'express';
import { analyzeDeveloper } from '../services/githubService.js';

const router = express.Router();

// POST /api/analyze-developers - Analyze multiple developers
router.post('/analyze-developers', async (req, res) => {
  try {
    const { developers } = req.body;

    if (!developers || !Array.isArray(developers)) {
      return res.status(400).json({
        success: false,
        error: 'Developers array is required'
      });
    }

    const results = [];

    for (const dev of developers) {
      try {
        const analysis = await analyzeDeveloper(
          dev.username,
          dev.owner || dev.username,
          dev.repo
        );
        results.push(analysis);
      } catch (error) {
        console.error(`Error analyzing ${dev.username}:`, error);
        results.push({
          username: dev.username,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      developers: results.filter(r => !r.error)
    });
  } catch (error) {
    console.error('Error analyzing developers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze developers'
    });
  }
});

export default router;
