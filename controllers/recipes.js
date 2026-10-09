const { ObjectId } = require('mongodb');
const { getDb } = require('../config/db');

const col = () => getDb().collection('recipes');

function build(body) {
  return {
    title: body.title,
    description: body.description ?? '',
    ingredients: body.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity !== undefined && i.quantity !== null ? Number(i.quantity) : null,
      unit: i.unit ?? null
    })),
    instructions: body.instructions,
    prepTimeMinutes: Number(body.prepTimeMinutes),
    cookTimeMinutes: Number(body.cookTimeMinutes),
    servings: Number(body.servings),
    cuisine: body.cuisine ?? null,
    difficulty: body.difficulty,
    tags: body.tags ?? []
  };
}

async function getAll(req, res) {
  try {
    const recipes = await col().find().toArray();
    res.status(200).json(recipes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve recipes' });
  }
}

async function getOne(req, res) {
  try {
    const recipe = await col().findOne({ _id: new ObjectId(req.params.recipeId) });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.status(200).json(recipe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve recipe' });
  }
}

async function create(req, res) {
  try {
    const now = new Date();
    // The owner always comes from the logged-in session, never from the request body.
    const result = await col().insertOne({
      ...build(req.body),
      createdBy: req.user._id,
      createdAt: now,
      updatedAt: now
    });
    res.status(201).json({ message: 'Recipe created', id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
}

async function update(req, res) {
  try {
    const result = await col().findOneAndUpdate(
      { _id: new ObjectId(req.params.recipeId) },
      { $set: { ...build(req.body), updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ error: 'Recipe not found' });
    res.status(200).json({ message: 'Recipe updated', recipe: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
}

async function remove(req, res) {
  try {
    const result = await col().deleteOne({ _id: new ObjectId(req.params.recipeId) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Recipe not found' });
    res.status(200).json({ message: 'Recipe deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
}

module.exports = { getAll, getOne, create, update, remove };
