jest.mock('../config/db', () => ({ getDb: () => require('./helpers/fakeDb').db }));
const { ObjectId } = require('mongodb');
const fake = require('./helpers/fakeDb');
const { api, as } = require('./helpers/testApp');

let admin, bob;
beforeEach(async () => {
  fake.reset();
  const adminId = await fake.seed('users', { githubId: '1', username: 'admin', email: 'a@x.com', role: 'admin' });
  const bobId = await fake.seed('users', { githubId: '2', username: 'bob', email: 'b@x.com', role: 'user' });
  admin = { _id: String(adminId), role: 'admin' };
  bob = { _id: String(bobId), role: 'user' };
});

describe('GET /users', () => {
  test('401 when not logged in', async () => {
    expect((await api().get('/users')).status).toBe(401);
  });
  test('403 for a regular user', async () => {
    expect((await api().get('/users').set('x-test-user', as(bob))).status).toBe(403);
  });
  test('200 with all users for an admin', async () => {
    const res = await api().get('/users').set('x-test-user', as(admin));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('GET /users/:userId', () => {
  test('200 when a user reads their own profile', async () => {
    const res = await api().get(`/users/${bob._id}`).set('x-test-user', as(bob));
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('bob');
  });
  test('403 when reading someone else', async () => {
    expect((await api().get(`/users/${admin._id}`).set('x-test-user', as(bob))).status).toBe(403);
  });
  test('200 when an admin reads anyone', async () => {
    expect((await api().get(`/users/${bob._id}`).set('x-test-user', as(admin))).status).toBe(200);
  });
  test('400 for an invalid id', async () => {
    expect((await api().get('/users/abc').set('x-test-user', as(admin))).status).toBe(400);
  });
  test('404 for an unknown id', async () => {
    const res = await api().get(`/users/${new ObjectId()}`).set('x-test-user', as(admin));
    expect(res.status).toBe(404);
  });
});

describe('write routes', () => {
  const body = { githubId: '3', username: 'carol', email: 'c@x.com' };
  test('POST 401 when logged out, 403 for non-admin, 201 for admin', async () => {
    expect((await api().post('/users').send(body)).status).toBe(401);
    expect((await api().post('/users').set('x-test-user', as(bob)).send(body)).status).toBe(403);
    expect((await api().post('/users').set('x-test-user', as(admin)).send(body)).status).toBe(201);
  });
  test('POST 400 on invalid data, 409 on duplicate', async () => {
    const a = as(admin);
    expect((await api().post('/users').set('x-test-user', a).send({ username: 'x' })).status).toBe(400);
    expect((await api().post('/users').set('x-test-user', a).send({ ...body, githubId: '2', username: 'bob' })).status).toBe(409);
  });
  test('PUT: user can edit self but cannot become admin', async () => {
    const res = await api().put(`/users/${bob._id}`).set('x-test-user', as(bob))
      .send({ githubId: '2', username: 'bob', email: 'b@x.com', displayName: 'Bob B', role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.user.displayName).toBe('Bob B');
    expect(res.body.user.role).toBe('user');
  });
  test('PUT 403 on someone else, 400 on bad data', async () => {
    expect((await api().put(`/users/${admin._id}`).set('x-test-user', as(bob)).send({})).status).toBe(403);
    expect((await api().put(`/users/${bob._id}`).set('x-test-user', as(bob)).send({ username: 'x' })).status).toBe(400);
  });
  test('DELETE: 403 for others, 200 for self, 404 afterwards (admin)', async () => {
    expect((await api().delete(`/users/${admin._id}`).set('x-test-user', as(bob))).status).toBe(403);
    expect((await api().delete(`/users/${bob._id}`).set('x-test-user', as(bob))).status).toBe(200);
    expect((await api().delete(`/users/${bob._id}`).set('x-test-user', as(admin))).status).toBe(404);
  });
});
