jest.mock('../config/db', () => ({ getDb: () => require('./helpers/fakeDb').db }));
const { ObjectId } = require('mongodb');
const fake = require('./helpers/fakeDb');
const { api, as } = require('./helpers/testApp');

let alice, bob, admin, aliceRecipe, alicePlan;
const plan = (recipeId, extra = {}) => ({
  title: 'Week 1', startDate: '2026-10-12', endDate: '2026-10-18',
  meals: [{ date: '2026-10-12', mealType: 'dinner', recipeId: String(recipeId) }], ...extra
});

beforeEach(async () => {
  fake.reset();
  alice = { _id: String(new ObjectId()), role: 'user' };
  bob = { _id: String(new ObjectId()), role: 'user' };
  admin = { _id: String(new ObjectId()), role: 'admin' };
  aliceRecipe = await fake.seed('recipes', { title: 'Pasta' });
  alicePlan = String(await fake.seed('mealPlans', { title: 'Alice plan', userId: new ObjectId(alice._id) }));
  await fake.seed('mealPlans', { title: 'Bob plan', userId: new ObjectId(bob._id) });
});

describe('GET /meal-plans (private)', () => {
  test('401 when not logged in', async () => {
    expect((await api().get('/meal-plans')).status).toBe(401);
  });
  test('200 returns only the logged-in user’s plans', async () => {
    const res = await api().get('/meal-plans').set('x-test-user', as(alice));
    expect(res.status).toBe(200);
    expect(res.body.map((p) => p.title)).toEqual(['Alice plan']);
  });
  test('200 admin sees every plan', async () => {
    const res = await api().get('/meal-plans').set('x-test-user', as(admin));
    expect(res.body).toHaveLength(2);
  });
  test('GET one: 200 for the owner', async () => {
    const res = await api().get(`/meal-plans/${alicePlan}`).set('x-test-user', as(alice));
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Alice plan');
  });
  test('GET one: 403 for another user, 404 unknown, 400 invalid id', async () => {
    expect((await api().get(`/meal-plans/${alicePlan}`).set('x-test-user', as(bob))).status).toBe(403);
    expect((await api().get(`/meal-plans/${new ObjectId()}`).set('x-test-user', as(alice))).status).toBe(404);
    expect((await api().get('/meal-plans/nope').set('x-test-user', as(alice))).status).toBe(400);
  });
});

describe('write routes', () => {
  test('POST 401 when logged out', async () => {
    expect((await api().post('/meal-plans').send(plan(aliceRecipe))).status).toBe(401);
  });
  test('POST 201 with valid data', async () => {
    const res = await api().post('/meal-plans').set('x-test-user', as(alice)).send(plan(aliceRecipe));
    expect(res.status).toBe(201);
  });
  test('POST 400: missing fields, bad dates, end before start, bad mealType, unknown recipe', async () => {
    const a = as(alice);
    const post = (b) => api().post('/meal-plans').set('x-test-user', a).send(b);
    expect((await post({})).status).toBe(400);
    expect((await post(plan(aliceRecipe, { startDate: 'tomorrow' }))).status).toBe(400);
    expect((await post(plan(aliceRecipe, { endDate: '2026-10-01' }))).status).toBe(400);
    expect((await post(plan(aliceRecipe, { meals: [{ date: '2026-10-12', mealType: 'brunch', recipeId: String(aliceRecipe) }] }))).status).toBe(400);
    expect((await post(plan(new ObjectId()))).status).toBe(400);
  });
  test('PUT: owner 200, other 403, bad data 400', async () => {
    expect((await api().put(`/meal-plans/${alicePlan}`).set('x-test-user', as(alice)).send(plan(aliceRecipe, { title: 'New' }))).status).toBe(200);
    expect((await api().put(`/meal-plans/${alicePlan}`).set('x-test-user', as(bob)).send(plan(aliceRecipe))).status).toBe(403);
    expect((await api().put(`/meal-plans/${alicePlan}`).set('x-test-user', as(alice)).send({})).status).toBe(400);
  });
  test('DELETE: other 403, owner 200, then 404', async () => {
    expect((await api().delete(`/meal-plans/${alicePlan}`).set('x-test-user', as(bob))).status).toBe(403);
    expect((await api().delete(`/meal-plans/${alicePlan}`).set('x-test-user', as(alice))).status).toBe(200);
    expect((await api().delete(`/meal-plans/${alicePlan}`).set('x-test-user', as(alice))).status).toBe(404);
  });
});
