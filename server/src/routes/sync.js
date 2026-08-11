import { Router } from 'express';
import { models, COLLECTIONS } from '../models.js';
import { requireAuth } from './auth.js';

const r = Router();
r.use(requireAuth);

// GET /sync?since=<ms> — all rows changed since cursor
r.get('/', async (req, res) => {
  const since = Number(req.query.since || 0);
  const out = { serverTime: Date.now() };
  for (const c of COLLECTIONS) {
    const rows = await models[c].find({ userId: req.uid, updatedAt: { $gt: since } }).lean();
    out[c] = rows.map(({ id, data, updatedAt, deleted }) => ({ id, data, updatedAt, deleted }));
  }
  res.json(out);
});

// POST /sync — push dirty rows; last-write-wins by updatedAt
r.post('/', async (req, res) => {
  let applied = 0, skipped = 0;
  for (const c of COLLECTIONS) {
    for (const row of req.body?.[c] || []) {
      if (!row.id || typeof row.updatedAt !== 'number') continue;
      const existing = await models[c].findOne({ userId: req.uid, id: row.id });
      if (existing && existing.updatedAt >= row.updatedAt) { skipped++; continue; }
      await models[c].updateOne(
        { userId: req.uid, id: row.id },
        { $set: { data: row.data || {}, updatedAt: row.updatedAt, deleted: !!row.deleted } },
        { upsert: true }
      );
      applied++;
    }
  }
  res.json({ applied, skipped, serverTime: Date.now() });
});

export default r;
