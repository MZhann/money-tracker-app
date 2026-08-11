import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, time: Date.now() }));
app.use('/auth', authRoutes);
app.use('/sync', syncRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
});

const { MONGODB_URI, PORT = 3000 } = process.env;
if (!MONGODB_URI) { console.error('MONGODB_URI missing'); process.exit(1); }
await mongoose.connect(MONGODB_URI);
app.listen(PORT, () => console.log(`Flow server on :${PORT}`));
