/**
 * Migration script to update Application status values from old to new lifecycle
 * 
 * Old values -> New values:
 * - 'new' -> 'applied'
 * - 'contacted' -> 'viewed'
 * - 'interviewed' -> 'viewed'
 * - 'offered' -> 'accepted'
 * - 'rejected' -> 'rejected' (no change)
 * - 'withdrawn' -> 'withdrawn' (no change)
 * 
 * Run with: npx ts-node scripts/migrateApplicationStatus.ts
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually (matches pattern used in other migration scripts)
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // Remove quotes
          process.env[key] = value;
        }
      });
    }
  } catch {
    console.warn('⚠️ Could not load .env.local');
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in environment variables');
  process.exit(1);
}

// Status migration mapping
const statusMigrationMap: { [key: string]: string } = {
  'new': 'applied',
  'contacted': 'viewed',
  'interviewed': 'viewed',
  'offered': 'accepted',
  'rejected': 'rejected', // Already correct
  'withdrawn': 'withdrawn', // Already correct
};

async function migrateApplicationStatuses() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    const applicationsCollection = db.collection('applications');

    // Find all applications with old status values
    const oldStatuses = Object.keys(statusMigrationMap).filter(
      (oldStatus) => oldStatus !== statusMigrationMap[oldStatus]
    );

    console.log(`\nFinding applications with old status values: ${oldStatuses.join(', ')}...`);
    const applicationsToMigrate = await applicationsCollection.find({
      status: { $in: oldStatuses },
    }).toArray();

    console.log(`Found ${applicationsToMigrate.length} applications to migrate`);

    if (applicationsToMigrate.length === 0) {
      console.log('No applications need migration. Exiting.');
      await mongoose.disconnect();
      return;
    }

    // Migrate each application
    let migratedCount = 0;
    let errorCount = 0;

    for (const app of applicationsToMigrate) {
      const oldStatus = app.status;
      const newStatus = statusMigrationMap[oldStatus];

      if (!newStatus) {
        console.error(`No migration mapping found for status: ${oldStatus} (Application ID: ${app._id})`);
        errorCount++;
        continue;
      }

      try {
        await applicationsCollection.updateOne(
          { _id: app._id },
          {
            $set: {
              status: newStatus,
              updatedAt: new Date(),
            },
          }
        );
        migratedCount++;
        console.log(`✓ Migrated Application ${app._id}: "${oldStatus}" -> "${newStatus}"`);
      } catch (error: any) {
        console.error(`✗ Failed to migrate Application ${app._id}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n=== Migration Summary ===`);
    console.log(`Total applications found: ${applicationsToMigrate.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Errors: ${errorCount}`);

    // Verify migration
    console.log('\nVerifying migration...');
    const remainingOldStatuses = await applicationsCollection.countDocuments({
      status: { $in: oldStatuses },
    });

    if (remainingOldStatuses === 0) {
      console.log('✓ All applications have been migrated successfully!');
    } else {
      console.log(`⚠ Warning: ${remainingOldStatuses} applications still have old status values`);
    }

    await mongoose.disconnect();
    console.log('\nMigration completed. Disconnected from MongoDB.');
  } catch (error: any) {
    console.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrateApplicationStatuses();

