jest.mock('../config/db', () => ({ getDb: () => require('./helpers/fakeDb').db }));
const { ObjectId } = require('mongodb');
const fake = require('./helpers/fakeDb');
const { api, as } = require('./helpers/testApp');

const recipe = {
  title: 'Pasta', ingredients: [{ name: 'pasta', quantity: 200, unit: 'g' }],
  instructions: ['Boil'], prepTimeMinutes: 5, cookTimeMinutes: 10, servings: 2, difficulty: 'easy'
};
let alice, bob, recipeId;
beforeEach(async () => {
  fake.reset();
  alice = { _id: String(new ObjectId()), role: 'user' };
  bob = { _id: String(new ObjectId()), role: 'user' };
  recipeId = String(await fake.seed('recipes', { ...recipe, createdBy: new ObjectId(alice._id) }));
});

describe('GET /recipes (public)', () => {
  test('200 returns all recipes without logging in', async () => {
    const res = await api().get('/recipes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
  test('200 returns an empty list when there are none', async () => {
    fake.reset();
    const res = await api().get('/recipes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
  test('GET one: 200 with the recipe', async () => {
    const res = await api().get(`/recipes/${recipeId}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Pasta');
  });
  test('GET one: 404 for an unknown id', async () => {
    expect((await api().get(`/recipes/${new ObjectId()}`)).status).toBe(404);
  });
  test('GET one: 400 for an invalid id', async () => {
    expect((await api().get('/recipes/123')).status).toBe(400);
  });
});

describe('write routes', () => {
  test('POST 401 when logged out', async () => {
    expect((await api().post('/recipes').send(recipe)).status).toBe(401);
  });
  test('POST 201 when logged in; owner comes from the session', async () => {
    const res = await api().post('/recipes').set('x-test-user', as(bob)).send({ ...recipe, createdBy: alice._id });
    expect(res.status).toBe(201);
    const saved = await api().get(`/recipes/${res.body.id}`);
    expect(String(saved.body.createdBy)).toBe(bob._id);
  });
  test('POST 400 on invalid data', async () => {
    const a = as(bob);
    expect((await api().post('/recipes').set('x-test-user', a).send({})).status).toBe(400);
    expect((await api().post('/recipes').set('x-test-user', a).send({ ...recipe, difficulty: 'insane' })).status).toBe(400);
    expect((await api().post('/recipes').set('x-test-user', a).send({ ...recipe, servings: 'x' })).status).toBe(400);
  });
  test('PUT: owner 200, other user 403, bad data 400, unknown 404', async () => {
    expect((await api().put(`/recipes/${recipeId}`).set('x-test-user', as(alice)).send({ ...recipe, title: 'Better' })).status).toBe(200);
    expect((await api().put(`/recipes/${recipeId}`).set('x-test-user', as(bob)).send(recipe)).status).toBe(403);
    expect((await api().put(`/recipes/${recipeId}`).set('x-test-user', as(alice)).send({})).status).toBe(400);
    expect((await api().put(`/recipes/${new ObjectId()}`).set('x-test-user', as(alice)).send(recipe)).status).toBe(404);
  });
  test('DELETE: other user 403, owner 200, then 404', async () => {
    expect((await api().delete(`/recipes/${recipeId}`).set('x-test-user', as(bob))).status).toBe(403);
    expect((await api().delete(`/recipes/${recipeId}`).set('x-test-user', as(alice))).status).toBe(200);
    expect((await api().delete(`/recipes/${recipeId}`).set('x-test-user', as(alice))).status).toBe(404);
  });
});
