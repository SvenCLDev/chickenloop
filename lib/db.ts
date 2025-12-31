/**
 * MongoDB database connection module for Next.js serverless environment
 * 
 * This module provides a cached MongoDB connection using Mongoose that's optimized
 * for serverless environments like Vercel. It maintains a connection pool across
 * function invocations to improve performance and reduce connection overhead.
 * 
 * Key features:
 * - Connection pooling and reuse across serverless function calls
 * - Automatic model registration to prevent registration errors
 * - Different connection strategies for local vs. cloud MongoDB instances
 * - Stale connection detection and cleanup
 * - Automatic retry logic for failed connections
 */

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

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

const MONGODB_URI = process.env.MONGODB_URI.trim();

/**
 * Cache structure for storing MongoDB connection across serverless invocations.
 * Stored in global scope to persist between function calls.
 */
interface MongooseCache {
  /** Active Mongoose connection instance, or null if not connected */
  conn: typeof mongoose | null;
  /** Promise representing a pending connection attempt, or null if none */
  promise: Promise<typeof mongoose> | null;
}

/**
 * Global declaration to store the connection cache.
 * In serverless environments, the global object persists between invocations
 * in the same container, allowing connection reuse.
 */
declare global {
  var mongoose: MongooseCache | undefined;
}

/** The cached connection object, stored globally */
let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

/**
 * Establishes and manages a connection to MongoDB.
 * 
 * This function implements connection pooling optimized for serverless environments:
 * - Reuses existing connections when available
 * - Automatically detects and cleans up stale connections
 * - Configures different timeouts for local vs. cloud databases
 * - Maintains connection pools to improve performance
 * 
 * Connection is cached globally to persist across serverless function invocations
 * within the same container, significantly improving performance.
 * 
 * @returns Promise resolving to the Mongoose instance
 * @throws Error if MONGODB_URI is not defined
 * @throws Error if connection fails after retries
 * 
 * @example
 * ```typescript
 * // In an API route
 * import connectDB from '@/lib/db';
 * 
 * export async function GET() {
 *   await connectDB();
 *   // Now you can use Mongoose models
 *   const users = await User.find();
 *   return NextResponse.json(users);
 * }
 * ```
 */
async function connectDB() {
  // Check if connection string is available
  const uri = process.env.MONGODB_URI?.trim() || MONGODB_URI;
  if (!uri) {
    console.error('[connectDB] MONGODB_URI not found in process.env or module scope');
    throw new Error('MONGODB_URI is not defined. Please check your .env.local file.');
  }
  
  console.log('[connectDB] Starting connection, readyState:', mongoose.connection.readyState);

  // Check if we have an existing connection that's actually ready
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If connection exists but is not ready, close it and reconnect
  if (cached.conn && mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connection.close();
    } catch (e) {
      // Ignore errors when closing
    }
    cached.conn = null;
    cached.promise = null;
  }

  // If there's a pending promise that's taking too long, cancel it
  if (cached.promise) {
    // Check if the promise has been pending for more than 5 seconds
    // This is a safety check for stuck connections
    const promiseAge = Date.now() - (cached.promise as any)._startTime || 0;
    if (promiseAge > 5000) {
      console.warn('Clearing stale connection promise');
      cached.promise = null;
      cached.conn = null;
      // Force disconnect mongoose
      try {
        await mongoose.disconnect();
      } catch (e) {
        // Ignore
      }
    }
  }

  if (!cached.promise) {
    // Detect if we're using local MongoDB or Atlas
    const isLocal = uri.includes('localhost') || uri.includes('127.0.0.1');
    
    /**
     * Connection options optimized for serverless environments.
     * Different settings are used for local vs. cloud MongoDB instances.
     */
    const opts = {
      bufferCommands: false, // Disable buffering in serverless to fail fast
      serverSelectionTimeoutMS: isLocal ? 5000 : 10000, // Faster for local
      socketTimeoutMS: isLocal ? 30000 : 60000, // Shorter for local
      connectTimeoutMS: isLocal ? 5000 : 10000, // Faster for local
      maxPoolSize: isLocal ? 15 : 10, // More connections for local (increased from 10)
      minPoolSize: isLocal ? 3 : 1, // Maintain more connections for local (increased from 2)
      maxIdleTimeMS: isLocal ? 30000 : 10000, // Longer for local
      retryWrites: true, // Automatically retry write operations
      retryReads: true, // Automatically retry read operations
      directConnection: isLocal ? true : false, // Use direct connection for local MongoDB
      compressors: ['zlib' as const], // Compression for better network performance
      // Note: maxTimeMS is a query option, not a connection option
      // It should be set on individual queries, not here
    };

    // Mark start time for the promise
    (cached.promise as any) = mongoose.connect(uri, opts).then((mongoose) => {
      return mongoose;
    }).catch((error) => {
      // Clear the promise on error so we can retry
      cached.promise = null;
      cached.conn = null;
      console.error('MongoDB connection error:', error.message);
      throw error;
    });
    (cached.promise as any)._startTime = Date.now();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;

