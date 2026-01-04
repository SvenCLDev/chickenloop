/**
 * Migration Script: Normalize Job Categories
 * 
 * This script migrates existing job category values from the old format
 * to the new canonical format defined in src/constants/jobCategories.ts
 * 
 * Mapping:
 * - "Instructor / Coach" → "Instruction"
 * - "Customer Support" → "Support"
 * - "Repair / Maintenance" → "Maintenance"
 * - "Creative / Media" → "Creative"
 * - "Sales / Retail" → "Sales"
 * - Others map 1:1 (Hospitality, Events, Management, Operations, Marketing)
 * 
 * The script is idempotent and safe to re-run.
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

// Import constants
import { JOB_CATEGORIES } from '../src/constants/jobCategories';

// Category mapping: old value → new value
const CATEGORY_MAPPING: Record<string, string> = {
  // Old format → New format
  "Instructor / Coach": "Instruction",
  "Customer Support": "Support",
  "Repair / Maintenance": "Maintenance",
  "Creative / Media": "Creative",
  "Sales / Retail": "Sales",
  
  // Categories that already match (1:1 mapping) - for idempotency
  "Hospitality": "Hospitality",
  "Events": "Events",
  "Management": "Management",
  "Operations": "Operations",
  "Marketing": "Marketing",
  "Instruction": "Instruction",
  "Support": "Support",
  "Maintenance": "Maintenance",
  "Creative": "Creative",
  "Sales": "Sales",
  
  // Case variations (for safety)
  "instruction": "Instruction",
  "support": "Support",
  "hospitality": "Hospitality",
  "events": "Events",
  "management": "Management",
  "operations": "Operations",
  "maintenance": "Maintenance",
  "marketing": "Marketing",
  "creative": "Creative",
  "sales": "Sales",
};

// Valid new categories (for validation)
const VALID_CATEGORIES = new Set(JOB_CATEGORIES);

interface MigrationStats {
  totalJobs: number;
  jobsProcessed: number;
  jobsUpdated: number;
  jobsUnchanged: number;
  jobsWithUnknownCategories: number;
  categoryUpdates: Record<string, number>;
  unknownCategories: Set<string>;
}

async function migrateJobCategories() {
  console.log('='.repeat(80));
  console.log('Job Category Migration Script');
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
      jobsProcessed: 0,
      jobsUpdated: 0,
      jobsUnchanged: 0,
      jobsWithUnknownCategories: 0,
      categoryUpdates: {},
      unknownCategories: new Set<string>(),
    };

    // Fetch all jobs
    console.log('📊 Fetching all jobs from database...');
    const jobs = await JobModel.find({}).lean();
    stats.totalJobs = jobs.length;
    console.log(`   Found ${stats.totalJobs} jobs`);
    console.log('');

    if (stats.totalJobs === 0) {
      console.log('ℹ️  No jobs found. Migration complete.');
      await mongoose.disconnect();
      return;
    }

    console.log('🔄 Processing jobs...');
    console.log('');

    // Process each job
    for (const job of jobs) {
      stats.jobsProcessed++;
      const jobId = job._id.toString();
      const currentCategories = job.occupationalAreas || [];
      
      if (currentCategories.length === 0) {
        // Job has no categories - skip
        continue;
      }

      // Check if migration is needed
      let needsUpdate = false;
      const newCategories: string[] = [];
      const unknownCategories: string[] = [];

      for (const category of currentCategories) {
        if (category in CATEGORY_MAPPING) {
          const mappedCategory = CATEGORY_MAPPING[category];
          newCategories.push(mappedCategory);
          
          // Track if category actually changed
          if (category !== mappedCategory) {
            needsUpdate = true;
            // Track updates per category
            const key = `${category} → ${mappedCategory}`;
            stats.categoryUpdates[key] = (stats.categoryUpdates[key] || 0) + 1;
          }
        } else {
          // Unknown category - don't modify it
          newCategories.push(category);
          unknownCategories.push(category);
          stats.unknownCategories.add(category);
        }
      }

      // Remove duplicates (in case migration creates duplicates)
      const uniqueCategories = Array.from(new Set(newCategories));
      
      // Check if arrays are different (ignoring order)
      const currentSet = new Set(currentCategories);
      const newSet = new Set(uniqueCategories);
      const arraysDifferent = 
        currentSet.size !== newSet.size ||
        !Array.from(currentSet).every(cat => newSet.has(cat));

      if (arraysDifferent || needsUpdate) {
        // Update the job
        try {
          await JobModel.updateOne(
            { _id: job._id },
            { $set: { occupationalAreas: uniqueCategories } }
          );
          stats.jobsUpdated++;

          if (unknownCategories.length > 0) {
            stats.jobsWithUnknownCategories++;
            console.log(`   ⚠️  Job ${jobId}: Updated with unknown categories preserved: ${unknownCategories.join(', ')}`);
          } else {
            console.log(`   ✓ Job ${jobId}: Updated ${currentCategories.join(', ')} → ${uniqueCategories.join(', ')}`);
          }
        } catch (error) {
          console.error(`   ❌ Error updating job ${jobId}:`, error);
        }
      } else {
        stats.jobsUnchanged++;
      }
    }

    // Print migration summary
    console.log('');
    console.log('='.repeat(80));
    console.log('Migration Summary');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Total jobs in database:     ${stats.totalJobs}`);
    console.log(`Jobs processed:             ${stats.jobsProcessed}`);
    console.log(`Jobs updated:               ${stats.jobsUpdated}`);
    console.log(`Jobs unchanged:             ${stats.jobsUnchanged}`);
    console.log(`Jobs with unknown categories: ${stats.jobsWithUnknownCategories}`);
    console.log('');

    if (Object.keys(stats.categoryUpdates).length > 0) {
      console.log('Category Updates:');
      for (const [mapping, count] of Object.entries(stats.categoryUpdates)) {
        console.log(`  ${mapping}: ${count} update(s)`);
      }
      console.log('');
    }

    if (stats.unknownCategories.size > 0) {
      console.log('⚠️  Unknown Categories (not modified):');
      for (const category of Array.from(stats.unknownCategories).sort()) {
        console.log(`  - "${category}"`);
      }
      console.log('');
      console.log('Note: Jobs with unknown categories were not modified.');
      console.log('      Please review these categories and update the mapping if needed.');
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
migrateJobCategories()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

