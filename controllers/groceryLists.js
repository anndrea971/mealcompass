const { ObjectId } = require('mongodb');
const { getDb } = require('../config/db');
const { isAdmin } = require('../middleware/auth');

const col = () => getDb().collection('groceryLists');

function build(body) {
  return {
    mealPlanId: body.mealPlanId ? new ObjectId(body.mealPlanId) : null,
    title: body.title,
    items: body.items.map((i) => ({
      name: i.name,
      quantity: i.quantity !== undefined && i.quantity !== null ? Number(i.quantity) : null,
      unit: i.unit ?? null,
      checked: i.checked ?? false
    })),
    status: body.status ?? 'active'
  };
}

// A linked meal plan must exist and belong to the user (admins may link any plan).
async function mealPlanOk(mealPlanId, user) {
  if (!mealPlanId) return true;
  const plan = await getDb().collection('mealPlans').findOne({ _id: new ObjectId(mealPlanId) });
  if (!plan) return false;
  return isAdmin(user) || String(plan.userId) === String(user._id);
}

const BAD_PLAN = { error: 'mealPlanId does not match one of your meal plans' };

async function getAll(req, res) {
  try {
    const filter = isAdmin(req.user) ? {} : { userId: req.user._id };
    const lists = await col().find(filter).toArray();
    res.status(200).json(lists);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve grocery lists' });
  }
}

async function getOne(req, res) {
  try {
    const list = await col().findOne({ _id: new ObjectId(req.params.groceryListId) });
    if (!list) return res.status(404).json({ error: 'Grocery list not found' });
    res.status(200).json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve grocery list' });
  }
}

async function create(req, res) {
  try {
    if (!(await mealPlanOk(req.body.mealPlanId, req.user))) return res.status(400).json(BAD_PLAN);
    const now = new Date();
    const result = await col().insertOne({
      ...build(req.body),
      userId: req.user._id,
      createdAt: now,
      updatedAt: now
    });
    res.status(201).json({ message: 'Grocery list created', id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create grocery list' });
  }
}

async function update(req, res) {
  try {
    if (!(await mealPlanOk(req.body.mealPlanId, req.user))) return res.status(400).json(BAD_PLAN);
    const result = await col().findOneAndUpdate(
      { _id: new ObjectId(req.params.groceryListId) },
      { $set: { ...build(req.body), updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ error: 'Grocery list not found' });
    res.status(200).json({ message: 'Grocery list updated', groceryList: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update grocery list' });
  }
}

async function remove(req, res) {
  try {
    const result = await col().deleteOne({ _id: new ObjectId(req.params.groceryListId) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Grocery list not found' });
    res.status(200).json({ message: 'Grocery list deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete grocery list' });
  }
}

module.exports = { getAll, getOne, create, update, remove };
