import mongoose from 'mongoose';

// Import all models to ensure they are registered
// This prevents "Schema hasn't been registered" errors in serverless environments
import '@/models/User';
import '@/models/Job';
import '@/models/Company';
import '@/models/CV';
import '@/models/AuditLog';
import '@/models/CareerAdvice';
import '@/models/Application';
import '@/models/SavedSearch';
import '@/models/StripeEvent';

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

const MONGODB_URI = process.env.MONGODB_URI.trim();

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

// Cache the connection across hot reloads in dev.
global.mongoose = global.mongoose || { conn: null, promise: null };
const cached = global.mongoose;

async function connectDB(_isRetry = false) {
  // Check if connection string is available
  const uri = process.env.MONGODB_URI?.trim() || MONGODB_URI;
  if (!uri) {
    console.error('[connectDB] MONGODB_URI not found in process.env or module scope');
    throw new Error('MONGODB_URI is not defined. Please check your .env.local file.');
  }

  if (cached.conn) {
    console.log('[connectDB] Reusing existing MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    // Detect if we're using local MongoDB or Atlas
    const isLocal = uri.includes('localhost') || uri.includes('127.0.0.1');

    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: isLocal ? 5000 : 10000,
      socketTimeoutMS: isLocal ? 30000 : 60000,
      connectTimeoutMS: isLocal ? 5000 : 10000,
      maxPoolSize: isLocal ? 15 : 5,
      minPoolSize: isLocal ? 3 : 1,
      maxIdleTimeMS: isLocal ? 30000 : 10000,
      retryWrites: true,
      retryReads: true,
      directConnection: isLocal ? true : false,
      compressors: ['zlib' as const],
    };

    console.log('[connectDB] Creating new MongoDB connection');
    cached.promise = mongoose.connect(uri, opts).catch((error) => {
      cached.promise = null;
      console.error('[connectDB] MongoDB connection error:', error?.message || error);
      throw error;
    });
  } else {
    console.log('[connectDB] Reusing pending MongoDB connection promise');
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;

