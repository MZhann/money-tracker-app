import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);

// One generic synced-document schema per collection. `id` is the CLIENT-generated
// UUID; `data` holds the row; last-write-wins by `updatedAt` (ms epoch, client clock).
const syncedSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, index: true, required: true },
  id: { type: String, required: true },
  data: { type: Object, default: {} },
  updatedAt: { type: Number, required: true },
  deleted: { type: Boolean, default: false },
}, { minimize: false });
syncedSchema.index({ userId: 1, id: 1 }, { unique: true });
syncedSchema.index({ userId: 1, updatedAt: 1 });

export const COLLECTIONS = ['accounts', 'categories', 'transactions', 'debts', 'assets', 'settings'];
export const models = Object.fromEntries(
  COLLECTIONS.map(c => [c, mongoose.model(c, syncedSchema)])
);
