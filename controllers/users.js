const { ObjectId } = require('mongodb');
const { getDb } = require('../config/db');

const col = () => getDb().collection('users');

// Pick only known fields so clients can't inject arbitrary data.
function build(body) {
  return {
    githubId: body.githubId,
    username: body.username,
    displayName: body.displayName ?? body.username,
    email: body.email,
    avatarUrl: body.avatarUrl ?? null,
    role: body.role ?? 'user'
  };
}

async function getAll(req, res) {
  try {
    const users = await col().find().toArray();
    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
}

async function getOne(req, res) {
  try {
    const user = await col().findOne({ _id: new ObjectId(req.params.userId) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
}

async function create(req, res) {
  try {
    const data = build(req.body);
    const dup = await col().findOne({ $or: [{ githubId: data.githubId }, { username: data.username }] });
    if (dup) return res.status(409).json({ error: 'A user with that githubId or username already exists' });
    const now = new Date();
    const result = await col().insertOne({ ...data, createdAt: now, lastLoginAt: null });
    res.status(201).json({ message: 'User created', id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

async function update(req, res) {
  try {
    const _id = new ObjectId(req.params.userId);
    const data = build(req.body);
    if (!(await col().findOne({ _id }))) return res.status(404).json({ error: 'User not found' });
    const dup = await col().findOne({
      _id: { $ne: _id },
      $or: [{ githubId: data.githubId }, { username: data.username }]
    });
    if (dup) return res.status(409).json({ error: 'Another user already has that githubId or username' });
    const result = await col().findOneAndUpdate(
      { _id },
      { $set: data },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ message: 'User updated', user: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

async function remove(req, res) {
  try {
    const result = await col().deleteOne({ _id: new ObjectId(req.params.userId) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

module.exports = { getAll, getOne, create, update, remove };
