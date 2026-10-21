import express from 'express';
import path from 'path';
import { apiRouter } from './server/routes.ts';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'LabPulse AI API' }));
app.use('/api', apiRouter);

// Serve static build in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ApexLIS server running on port ${PORT}`);
});
