/**
 * Script to delete job(s) with a specific category
 * 
 * Usage: npx tsx scripts/deleteJobWithCategory.ts "Teaching"
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^['"]|['"]$/g, '');
          process.env[key] = value;
        }
      });
    }
  } catch {
    console.warn('⚠️ Could not load .env.local');
  }
}

loadEnv();

// Import Job model schema
import '../models/Job';

async function deleteJobWithCategory(category: string) {
  console.log('='.repeat(80));
  console.log(`Delete Jobs with Category: "${category}"`);
  console.log('='.repeat(80));
  console.log('');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ Error: MONGODB_URI environment variable is not set');
    process.exit(1);
  }

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
    const JobModel = mongoose.model('Job');
    
    // Find jobs with this category
    console.log(`🔍 Searching for jobs with category "${category}"...`);
    const jobs = await JobModel.find({ occupationalAreas: category }).lean();
    
    console.log(`   Found ${jobs.length} job(s) with category "${category}"`);
    console.log('');

    if (jobs.length === 0) {
      console.log('ℹ️  No jobs found with this category.');
      await mongoose.disconnect();
      return;
    }

    // Display jobs to be deleted
    console.log('Jobs to be deleted:');
    jobs.forEach((job: any, index: number) => {
      console.log(`  ${index + 1}. ID: ${job._id}`);
      console.log(`     Title: ${job.title}`);
      console.log(`     Company: ${job.company}`);
      console.log(`     Categories: ${(job.occupationalAreas || []).join(', ')}`);
      console.log('');
    });

    // Delete the jobs
    console.log('🗑️  Deleting jobs...');
    const result = await JobModel.deleteMany({ occupationalAreas: category });
    
    console.log(`✅ Deleted ${result.deletedCount} job(s)`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Get category from command line argument or use "Teaching" as default
const category = process.argv[2] || 'Teaching';

deleteJobWithCategory(category)
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });




