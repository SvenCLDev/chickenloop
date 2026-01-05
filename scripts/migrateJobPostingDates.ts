/**
 * Migration Script: Add system-managed posting dates for Google Jobs SEO
 * 
 * This script backfills `datePosted` and `validThrough` fields for existing Job documents.
 * 
 * Migration logic:
 * - Find all published jobs missing `datePosted` or `validThrough`
 * - Set `datePosted` to `createdAt` (or current date if createdAt is missing)
 * - Set `validThrough` to `datePosted + 90 days`
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
  jobsUpdated: number;
  jobsSkipped: number;
  errors: number;
}

async function migrateJobPostingDates() {
  console.log('='.repeat(80));
  console.log('Job Posting Dates Migration Script');
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
      jobsUpdated: 0,
      jobsSkipped: 0,
      errors: 0,
    };

    // Fetch all published jobs
    console.log('📊 Fetching published jobs...');
    const publishedJobs = await JobModel.find({ 
      published: true 
    }).lean();
    
    stats.totalJobs = publishedJobs.length;
    console.log(`   Found ${stats.totalJobs} published jobs`);
    console.log('');

    if (stats.totalJobs === 0) {
      console.log('ℹ️  No published jobs found. Migration complete.');
      await mongoose.disconnect();
      return;
    }

    console.log('🔄 Processing jobs...');
    console.log('');

    // Process each job
    for (const job of publishedJobs) {
      stats.jobsScanned++;
      const jobId = job._id.toString();
      const hasDatePosted = job.datePosted !== undefined && job.datePosted !== null;
      const hasValidThrough = job.validThrough !== undefined && job.validThrough !== null;

      // Skip if both fields already exist
      if (hasDatePosted && hasValidThrough) {
        stats.jobsSkipped++;
        continue;
      }

      // Determine datePosted: use existing value, or createdAt, or current date
      let datePosted: Date;
      if (hasDatePosted) {
        datePosted = new Date(job.datePosted);
      } else if (job.createdAt) {
        datePosted = new Date(job.createdAt);
      } else {
        datePosted = new Date();
      }

      // Calculate validThrough: datePosted + 90 days
      const validThrough = new Date(datePosted);
      validThrough.setDate(validThrough.getDate() + 90);

      // Update the job
      try {
        const updateData: any = {};
        
        if (!hasDatePosted) {
          updateData.datePosted = datePosted;
        }
        if (!hasValidThrough) {
          updateData.validThrough = validThrough;
        }

        await JobModel.updateOne(
          { _id: job._id },
          { $set: updateData }
        );
        
        stats.jobsUpdated++;
        const updates: string[] = [];
        if (!hasDatePosted) updates.push(`datePosted: ${datePosted.toISOString()}`);
        if (!hasValidThrough) updates.push(`validThrough: ${validThrough.toISOString()}`);
        console.log(`   ✓ Job ${jobId}: Updated ${updates.join(', ')}`);
      } catch (error) {
        stats.errors++;
        console.error(`   ❌ Error updating job ${jobId}:`, error);
      }
    }

    // Print migration summary
    console.log('');
    console.log('='.repeat(80));
    console.log('Migration Summary');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Total published jobs:        ${stats.totalJobs}`);
    console.log(`Jobs scanned:                ${stats.jobsScanned}`);
    console.log(`Jobs updated:                ${stats.jobsUpdated}`);
    console.log(`Jobs skipped (already set):  ${stats.jobsSkipped}`);
    console.log(`Errors:                      ${stats.errors}`);
    console.log('');

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
migrateJobPostingDates()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });



