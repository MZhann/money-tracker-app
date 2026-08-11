import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models.js';

const r = Router();
const sign = (u) => jwt.sign({ uid: u._id.toString() }, process.env.JWT_SECRET, { expiresIn: '90d' });

r.post('/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || password.length < 6) return res.status(400).json({ error: 'Email and a 6+ char password required' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: 'Email already registered' });
  const user = await User.create({ email, passwordHash: await bcrypt.hash(password, 10) });
  res.json({ token: sign(user) });
});

r.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  res.json({ token: sign(user) });
});

export function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { req.uid = jwt.verify(token, process.env.JWT_SECRET).uid; next(); }
  catch { res.status(401).json({ error: 'Unauthorized' }); }
}

export default r;
