const { MongoClient } = require('mongodb');

let client;
let db;

async function connectDb() {
  if (db) return db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(process.env.DB_NAME || 'meal_compass');
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

async function closeDb() {
  if (client) await client.close();
  client = undefined;
  db = undefined;
}

module.exports = { connectDb, getDb, closeDb };
