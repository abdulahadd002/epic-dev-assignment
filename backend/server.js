import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import epicsRouter from './routes/epics.js';
import developersRouter from './routes/developers.js';
import assignmentRouter from './routes/assignment.js';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api', epicsRouter);
app.use('/api', developersRouter);
app.use('/api', assignmentRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'running',
    service: 'Epic Dev Assignment Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
});
