jest.mock('../config/db', () => ({ getDb: () => require('./helpers/fakeDb').db }));
const { ObjectId } = require('mongodb');
const fake = require('./helpers/fakeDb');
const { api, as } = require('./helpers/testApp');

let alice, bob, admin, aliceList, alicePlan;
const list = (extra = {}) => ({
  title: 'Weekly shop', items: [{ name: 'pasta', quantity: 2, unit: 'kg' }], ...extra
});

beforeEach(async () => {
  fake.reset();
  alice = { _id: String(new ObjectId()), role: 'user' };
  bob = { _id: String(new ObjectId()), role: 'user' };
  admin = { _id: String(new ObjectId()), role: 'admin' };
  alicePlan = String(await fake.seed('mealPlans', { title: 'P', userId: new ObjectId(alice._id) }));
  aliceList = String(await fake.seed('groceryLists', { title: 'Alice list', userId: new ObjectId(alice._id) }));
  await fake.seed('groceryLists', { title: 'Bob list', userId: new ObjectId(bob._id) });
});

describe('GET /grocery-lists (private)', () => {
  test('401 when not logged in', async () => {
    expect((await api().get('/grocery-lists')).status).toBe(401);
  });
  test('200 returns only the logged-in user’s lists', async () => {
    const res = await api().get('/grocery-lists').set('x-test-user', as(alice));
    expect(res.status).toBe(200);
    expect(res.body.map((l) => l.title)).toEqual(['Alice list']);
  });
  test('200 admin sees every list', async () => {
    expect((await api().get('/grocery-lists').set('x-test-user', as(admin))).body).toHaveLength(2);
  });
  test('GET one: 200 for the owner', async () => {
    const res = await api().get(`/grocery-lists/${aliceList}`).set('x-test-user', as(alice));
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Alice list');
  });
  test('GET one: 403 for another user, 404 unknown, 400 invalid id', async () => {
    expect((await api().get(`/grocery-lists/${aliceList}`).set('x-test-user', as(bob))).status).toBe(403);
    expect((await api().get(`/grocery-lists/${new ObjectId()}`).set('x-test-user', as(alice))).status).toBe(404);
    expect((await api().get('/grocery-lists/zzz').set('x-test-user', as(alice))).status).toBe(400);
  });
});

describe('write routes', () => {
  test('POST 401 when logged out, 201 when logged in (with a linked plan)', async () => {
    expect((await api().post('/grocery-lists').send(list())).status).toBe(401);
    expect((await api().post('/grocery-lists').set('x-test-user', as(alice)).send(list({ mealPlanId: alicePlan }))).status).toBe(201);
  });
  test('POST 400: missing items, bad status, bad quantity, plan not yours', async () => {
    const post = (b, u = alice) => api().post('/grocery-lists').set('x-test-user', as(u)).send(b);
    expect((await post({ title: 'x' })).status).toBe(400);
    expect((await post(list({ status: 'done' }))).status).toBe(400);
    expect((await post(list({ items: [{ name: 'a', quantity: -1 }] }))).status).toBe(400);
    expect((await post(list({ mealPlanId: alicePlan }), bob)).status).toBe(400);
  });
  test('PUT: owner 200, other 403, bad data 400', async () => {
    expect((await api().put(`/grocery-lists/${aliceList}`).set('x-test-user', as(alice)).send(list({ status: 'completed' }))).status).toBe(200);
    expect((await api().put(`/grocery-lists/${aliceList}`).set('x-test-user', as(bob)).send(list())).status).toBe(403);
    expect((await api().put(`/grocery-lists/${aliceList}`).set('x-test-user', as(alice)).send({})).status).toBe(400);
  });
  test('DELETE: other 403, owner 200, then 404', async () => {
    expect((await api().delete(`/grocery-lists/${aliceList}`).set('x-test-user', as(bob))).status).toBe(403);
    expect((await api().delete(`/grocery-lists/${aliceList}`).set('x-test-user', as(alice))).status).toBe(200);
    expect((await api().delete(`/grocery-lists/${aliceList}`).set('x-test-user', as(alice))).status).toBe(404);
  });
});
