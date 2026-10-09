// Run with: node --test test/
// Uses an in-memory stand-in for MongoDB so no database is needed.
const test = require('node:test');
const assert = require('node:assert');
const { ObjectId } = require('mongodb');
const dbModule = require('../config/db');

function makeFakeDb() {
  const store = {};
  const eq = (a, b) => (a instanceof ObjectId || b instanceof ObjectId ? String(a) === String(b) : a === b);
  const match = (doc, q) =>
    Object.entries(q).every(([k, v]) => {
      if (k === '$or') return v.some((s) => match(doc, s));
      if (v && typeof v === 'object' && !(v instanceof ObjectId) && '$ne' in v) return !eq(doc[k], v.$ne);
      return eq(doc[k], v);
    });
  return {
    collection(name) {
      const docs = (store[name] ||= []);
      return {
        find: () => ({ toArray: async () => docs.map((d) => ({ ...d })) }),
        findOne: async (q) => { const d = docs.find((x) => match(x, q)); return d ? { ...d } : null; },
        insertOne: async (d) => { const _id = new ObjectId(); docs.push({ _id, ...d }); return { insertedId: _id }; },
        findOneAndUpdate: async (q, u) => {
          const d = docs.find((x) => match(x, q));
          if (!d) return null;
          Object.assign(d, u.$set);
          return { ...d };
        },
        deleteOne: async (q) => {
          const i = docs.findIndex((x) => match(x, q));
          if (i >= 0) docs.splice(i, 1);
          return { deletedCount: i >= 0 ? 1 : 0 };
        }
      };
    }
  };
}
const fake = makeFakeDb();
dbModule.getDb = () => fake; // must happen before controllers load
const app = require('../server');

let server, base;
test.before(async () => { server = app.listen(0); base = `http://localhost:${server.address().port}`; });
test.after(() => server.close());

const call = async (method, path, body, raw) => {
  const r = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json' },
    body: raw ?? (body ? JSON.stringify(body) : undefined)
  });
  return { status: r.status, body: await r.json().catch(() => null) };
};

const user = { githubId: '111', username: 'andrea', email: 'a@example.com' };
const recipe = {
  title: 'Pasta', ingredients: [{ name: 'pasta', quantity: 200, unit: 'g' }],
  instructions: ['Boil'], prepTimeMinutes: 5, cookTimeMinutes: 10, servings: 2, difficulty: 'easy'
};

test('users CRUD + errors', async () => {
  let r = await call('POST', '/users', user);
  assert.equal(r.status, 201); const id = r.body.id;
  assert.equal((await call('POST', '/users', user)).status, 409);
  assert.equal((await call('POST', '/users', { ...user, email: 'bad', githubId: '2', username: 'x' })).status, 400);
  assert.equal((await call('POST', '/users', { ...user, username: { $ne: null } })).status, 400);
  r = await call('GET', '/users'); assert.equal(r.status, 200); assert.equal(r.body.length, 1);
  assert.equal((await call('GET', `/users/${id}`)).status, 200);
  assert.equal((await call('GET', '/users/abc')).status, 400);
  assert.equal((await call('GET', `/users/${new ObjectId()}`)).status, 404);
  r = await call('PUT', `/users/${id}`, { ...user, displayName: 'Andrea G' });
  assert.equal(r.status, 200); assert.equal(r.body.user.displayName, 'Andrea G');
  assert.equal((await call('PUT', `/users/${new ObjectId()}`, user)).status, 404);
  assert.equal((await call('PUT', `/users/${id}`, { username: 'x' })).status, 400);
  assert.equal((await call('DELETE', `/users/${id}`)).status, 200);
  assert.equal((await call('DELETE', `/users/${id}`)).status, 404);
});

test('recipes CRUD + errors', async () => {
  let r = await call('POST', '/recipes', recipe);
  assert.equal(r.status, 201); const id = r.body.id;
  assert.equal((await call('POST', '/recipes', { ...recipe, difficulty: 'insane' })).status, 400);
  assert.equal((await call('POST', '/recipes', { ...recipe, ingredients: [] })).status, 400);
  assert.equal((await call('POST', '/recipes', { ...recipe, servings: 'x' })).status, 400);
  assert.equal((await call('POST', '/recipes', { ...recipe, createdBy: new ObjectId().toString() })).status, 400);
  assert.equal((await call('POST', '/recipes', {})).status, 400);
  assert.equal((await call('GET', '/recipes')).body.length, 1);
  assert.equal((await call('GET', `/recipes/${id}`)).status, 200);
  assert.equal((await call('GET', '/recipes/123')).status, 400);
  assert.equal((await call('GET', `/recipes/${new ObjectId()}`)).status, 404);
  r = await call('PUT', `/recipes/${id}`, { ...recipe, title: 'Better Pasta' });
  assert.equal(r.status, 200); assert.equal(r.body.recipe.title, 'Better Pasta');
  assert.equal((await call('PUT', `/recipes/${new ObjectId()}`, recipe)).status, 404);
  assert.equal((await call('DELETE', `/recipes/${id}`)).status, 200);
  assert.equal((await call('DELETE', `/recipes/${id}`)).status, 404);
});

test('recipe with real creator works', async () => {
  const u = await call('POST', '/users', { ...user, githubId: '9', username: 'z' });
  assert.equal((await call('POST', '/recipes', { ...recipe, createdBy: u.body.id })).status, 201);
});

test('malformed JSON -> 400, unknown route -> 404, docs served', async () => {
  assert.equal((await call('POST', '/users', null, '{bad json')).status, 400);
  assert.equal((await call('GET', '/nope')).status, 404);
  const r = await fetch(base + '/api-docs/'); assert.equal(r.status, 200);
});

test('database failure -> 500 without leaking details', async () => {
  const orig = dbModule.getDb;
  const broken = { collection: () => ({ find: () => { throw new Error('secret host mongodb://u:p@x'); } }) };
  // controllers captured the original getDb, so swap the collection method on the fake instead
  const realCollection = fake.collection;
  fake.collection = () => broken.collection();
  const r = await call('GET', '/users');
  fake.collection = realCollection;
  assert.equal(r.status, 500);
  assert.ok(!JSON.stringify(r.body).includes('secret'));
  dbModule.getDb = orig;
});
