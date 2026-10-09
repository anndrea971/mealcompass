jest.mock('../config/db', () => ({ getDb: () => require('./helpers/fakeDb').db }));
const { api, as } = require('./helpers/testApp');

describe('auth routes', () => {
  test('GET /auth/me is 401 when logged out', async () => {
    expect((await api().get('/auth/me')).status).toBe(401);
  });
  test('GET /auth/me is 200 with the user when logged in', async () => {
    const res = await api().get('/auth/me').set('x-test-user', as({ _id: '1', username: 'andrea' }));
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('andrea');
  });
  test('GET /auth/failure is 401', async () => {
    expect((await api().get('/auth/failure')).status).toBe(401);
  });
  test('unknown route is 404 and bad JSON is 400', async () => {
    expect((await api().get('/nope')).status).toBe(404);
    const res = await api().post('/recipes').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
  });
});
