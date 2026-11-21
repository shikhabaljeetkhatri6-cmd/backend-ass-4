const { MongoClient } = require("mongodb");

let client;
let database;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing in .env");

  client = new MongoClient(uri);
  await client.connect();
  database = client.db(process.env.DB_NAME || "secure_connect");

  await database.collection("users").createIndex({ email: 1 }, { unique: true });
  await database.collection("notes").createIndex({ ownerId: 1, createdAt: -1 });

  console.log(`MongoDB connected: ${database.databaseName}`);
  return database;
}

function getDB() {
  if (!database) throw new Error("Database is not connected");
  return database;
}

async function closeDB() {
  if (client) await client.close();
}

module.exports = { connectDB, getDB, closeDB };
