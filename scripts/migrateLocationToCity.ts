/**
 * Migration Script: Rename Job field from `location` to `city`
 * 
 * This script migrates existing Job documents to rename the `location` field to `city`.
 * 
 * Migration logic:
 * - Find documents where `location` exists AND `city` does NOT exist
 * - For each document:
 *   - Set `city = location`
 *   - Remove `location` field
 * - Do NOT overwrite `city` if it already exists
 * 
 * The script is idempotent and safe to re-run multiple times.
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

// Import Job model schema (needs to be imported to register)
import '../models/Job';

interface MigrationStats {
  totalJobs: number;
  jobsScanned: number;
  jobsMigrated: number;
  jobsSkipped: number;
  jobsWithBothFields: number;
  errors: number;
}

async function migrateLocationToCity() {
  console.log('='.repeat(80));
  console.log('Job Location → City Migration Script');
  console.log('='.repeat(80));
  console.log('');

  // Validate environment
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ Error: MONGODB_URI environment variable is not set');
    console.error('   Please ensure .env.local file exists with MONGODB_URI');
    process.exit(1);
  }

  // Connect to MongoDB
  console.log('🔌 Connecting to MongoDB...');
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }

  try {
    // Import Job model (need to ensure it's registered)
    const JobModel = mongoose.model('Job');
    
    // Initialize statistics
    const stats: MigrationStats = {
      totalJobs: 0,
      jobsScanned: 0,
      jobsMigrated: 0,
      jobsSkipped: 0,
      jobsWithBothFields: 0,
      errors: 0,
    };

    // Fetch all jobs that have `location` field
    console.log('📊 Fetching jobs with `location` field...');
    const jobsWithLocation = await JobModel.find({ 
      location: { $exists: true, $ne: null } 
    }).lean();
    
    stats.totalJobs = jobsWithLocation.length;
    console.log(`   Found ${stats.totalJobs} jobs with \`location\` field`);
    console.log('');

    if (stats.totalJobs === 0) {
      console.log('ℹ️  No jobs with `location` field found. Migration complete.');
      await mongoose.disconnect();
      return;
    }

    console.log('🔄 Processing jobs...');
    console.log('');

    // Process each job
    for (const job of jobsWithLocation) {
      stats.jobsScanned++;
      const jobId = job._id.toString();
      const hasLocation = job.location !== undefined && job.location !== null;
      const hasCity = job.city !== undefined && job.city !== null;

      // Skip if job doesn't have location (shouldn't happen due to query, but safety check)
      if (!hasLocation) {
        stats.jobsSkipped++;
        continue;
      }

      // If both fields exist, skip (do not overwrite city)
      if (hasLocation && hasCity) {
        stats.jobsWithBothFields++;
        console.log(`   ⚠️  Job ${jobId}: Both \`location\` and \`city\` exist. Skipping to preserve \`city\`.`);
        continue;
      }

      // If city already exists (but location doesn't), skip
      if (hasCity && !hasLocation) {
        stats.jobsSkipped++;
        continue;
      }

      // Migrate: set city = location, remove location
      try {
        const locationValue = job.location;
        
        await JobModel.updateOne(
          { _id: job._id },
          { 
            $set: { city: locationValue },
            $unset: { location: '' }
          }
        );
        
        stats.jobsMigrated++;
        console.log(`   ✓ Job ${jobId}: Migrated \`location\` ("${locationValue}") → \`city\``);
      } catch (error) {
        stats.errors++;
        console.error(`   ❌ Error migrating job ${jobId}:`, error);
      }
    }

    // Print migration summary
    console.log('');
    console.log('='.repeat(80));
    console.log('Migration Summary');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Total jobs scanned:         ${stats.jobsScanned}`);
    console.log(`Jobs migrated:               ${stats.jobsMigrated}`);
    console.log(`Jobs skipped:               ${stats.jobsSkipped}`);
    console.log(`Jobs with both fields:      ${stats.jobsWithBothFields}`);
    console.log(`Errors:                     ${stats.errors}`);
    console.log('');

    if (stats.jobsWithBothFields > 0) {
      console.log('ℹ️  Note: Some jobs had both `location` and `city` fields.');
      console.log('          These were skipped to preserve existing `city` values.');
      console.log('          You may want to manually review these jobs.');
      console.log('');
    }

    if (stats.errors > 0) {
      console.log('⚠️  Warning: Some jobs could not be migrated due to errors.');
      console.log('            Please review the error messages above.');
      console.log('');
    }

    console.log('✅ Migration complete!');
    console.log('');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrateLocationToCity()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

