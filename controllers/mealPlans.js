const { ObjectId } = require('mongodb');
const { getDb } = require('../config/db');
const { isAdmin } = require('../middleware/auth');

const col = () => getDb().collection('mealPlans');

function build(body) {
  return {
    title: body.title,
    startDate: new Date(body.startDate),
    endDate: new Date(body.endDate),
    meals: (body.meals ?? []).map((m) => ({
      date: new Date(m.date),
      mealType: m.mealType,
      recipeId: new ObjectId(m.recipeId)
    })),
    notes: body.notes ?? ''
  };
}

// Returns true when every recipeId in the plan exists.
async function recipesExist(meals) {
  const ids = [...new Set((meals ?? []).map((m) => m.recipeId))].map((id) => new ObjectId(id));
  if (ids.length === 0) return true;
  const found = await getDb().collection('recipes').find({ _id: { $in: ids } }).toArray();
  return found.length === ids.length;
}

async function getAll(req, res) {
  try {
    // Regular users only see their own plans; admins see all.
    const filter = isAdmin(req.user) ? {} : { userId: req.user._id };
    const plans = await col().find(filter).toArray();
    res.status(200).json(plans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve meal plans' });
  }
}

async function getOne(req, res) {
  try {
    const plan = await col().findOne({ _id: new ObjectId(req.params.mealPlanId) });
    if (!plan) return res.status(404).json({ error: 'Meal plan not found' });
    res.status(200).json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve meal plan' });
  }
}

async function create(req, res) {
  try {
    if (!(await recipesExist(req.body.meals))) {
      return res.status(400).json({ error: 'One or more meals reference a recipe that does not exist' });
    }
    const now = new Date();
    const result = await col().insertOne({
      ...build(req.body),
      userId: req.user._id,
      createdAt: now,
      updatedAt: now
    });
    res.status(201).json({ message: 'Meal plan created', id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create meal plan' });
  }
}

async function update(req, res) {
  try {
    if (!(await recipesExist(req.body.meals))) {
      return res.status(400).json({ error: 'One or more meals reference a recipe that does not exist' });
    }
    const result = await col().findOneAndUpdate(
      { _id: new ObjectId(req.params.mealPlanId) },
      { $set: { ...build(req.body), updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ error: 'Meal plan not found' });
    res.status(200).json({ message: 'Meal plan updated', mealPlan: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update meal plan' });
  }
}

async function remove(req, res) {
  try {
    const result = await col().deleteOne({ _id: new ObjectId(req.params.mealPlanId) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Meal plan not found' });
    res.status(200).json({ message: 'Meal plan deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete meal plan' });
  }
}

module.exports = { getAll, getOne, create, update, remove };
