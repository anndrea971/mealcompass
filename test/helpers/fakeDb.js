// Tiny in-memory stand-in for the MongoDB driver so tests need no database.
const { ObjectId } = require('mongodb');

const store = {};
const same = (a, b) => String(a) === String(b);

function match(doc, q) {
  return Object.entries(q).every(([k, v]) => {
    if (k === '$or') return v.some((s) => match(doc, s));
    if (v && typeof v === 'object' && !(v instanceof ObjectId)) {
      if ('$ne' in v) return !same(doc[k], v.$ne);
      if ('$in' in v) return v.$in.some((x) => same(doc[k], x));
    }
    return same(doc[k], v);
  });
}

const db = {
  collection(name) {
    const docs = (store[name] ||= []);
    return {
      find: (q = {}) => ({ toArray: async () => docs.filter((d) => match(d, q)).map((d) => ({ ...d })) }),
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

module.exports = {
  db,
  reset: () => Object.keys(store).forEach((k) => delete store[k]),
  seed: async (name, doc) => (await db.collection(name).insertOne(doc)).insertedId
};
