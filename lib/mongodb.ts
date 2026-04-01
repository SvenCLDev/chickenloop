import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI?.trim();
if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const client = new MongoClient(uri);

const clientPromise: Promise<MongoClient> =
  global._mongoClientPromise ?? client.connect();

if (process.env.NODE_ENV !== 'production') {
  global._mongoClientPromise = clientPromise;
}

export default clientPromise;

