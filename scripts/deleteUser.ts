/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Script to delete a user and all related content from the database
 * 
 * Usage: npx ts-node scripts/deleteUser.ts
 * Or: node scripts/deleteUser.js (after compiling)
 * 
 * This script will:
 * 1. Find user by email or name
 * 2. Delete all CVs (if job-seeker)
 * 3. Delete all applications (as candidate and recruiter)
 * 4. Delete all saved searches
 * 5. Delete email preferences
 * 6. Remove user from favouriteJobs/favouriteCandidates in other users
 * 7. Delete the user
 * 
 * Note: Jobs and Companies owned by the user are NOT deleted (they may be shared resources)
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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
  } catch (error) {
    console.warn('⚠️  Could not load .env.local:', error.message);
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://chickenloop3845_db_user:msLBG6d6lscrfQYf@cluster042369.iggtazi.mongodb.net/chickenloop?appName=Cluster042369';

// Define schemas (minimal for deletion script)
const UserSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const CVSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const ApplicationSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const SavedSearchSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const EmailPreferencesSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const JobSchema = new mongoose.Schema({}, { strict: false, timestamps: true });

const User = mongoose.model('User', UserSchema);
const CV = mongoose.model('CV', CVSchema);
const Application = mongoose.model('Application', ApplicationSchema);
const SavedSearch = mongoose.model('SavedSearch', SavedSearchSchema);
const EmailPreferences = mongoose.model('EmailPreferences', EmailPreferencesSchema);
const Job = mongoose.model('Job', JobSchema);

async function deleteUser(email: string, name?: string) {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    // Find user by email (primary) or name (fallback)
    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user && name) {
      user = await User.findOne({ name: { $regex: new RegExp(name, 'i') } });
    }

    if (!user) {
      console.error(`User not found with email: ${email}${name ? ` or name: ${name}` : ''}`);
      await mongoose.disconnect();
      process.exit(1);
    }

    const userId = user._id;
    console.log('='.repeat(80));
    console.log('USER TO DELETE:');
    console.log('='.repeat(80));
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`ID: ${userId}`);
    console.log(`Created: ${user.createdAt}`);
    console.log('='.repeat(80));

    // Confirm deletion
    console.log('\n⚠️  WARNING: This will permanently delete:');
    console.log(`  - User profile (${user.name})`);
    console.log(`  - All CVs (if job-seeker)`);
    console.log(`  - All applications (as candidate and recruiter)`);
    console.log(`  - All saved searches`);
    console.log(`  - Email preferences`);
    console.log(`  - References in other users' favourites`);
    console.log('\nNote: Jobs and Companies owned by the user will NOT be deleted.\n');

    // Count related data
    const cvCount = await CV.countDocuments({ jobSeeker: userId });
    const applicationsAsCandidate = await Application.countDocuments({ candidateId: userId });
    const applicationsAsRecruiter = await Application.countDocuments({ recruiterId: userId });
    const savedSearchesCount = await SavedSearch.countDocuments({ userId: userId });
    const emailPreferencesCount = await EmailPreferences.countDocuments({ userId: userId });
    const jobsCount = await Job.countDocuments({ recruiter: userId });

    console.log('Related data to be deleted:');
    console.log(`  - CVs: ${cvCount}`);
    console.log(`  - Applications (as candidate): ${applicationsAsCandidate}`);
    console.log(`  - Applications (as recruiter): ${applicationsAsRecruiter}`);
    console.log(`  - Saved searches: ${savedSearchesCount}`);
    console.log(`  - Email preferences: ${emailPreferencesCount}`);
    console.log(`\n⚠️  Jobs owned by user: ${jobsCount} (NOT deleted - may be shared resources)`);

    console.log('\n' + '='.repeat(80));
    console.log('Starting deletion...');
    console.log('='.repeat(80));

    // 1. Delete CVs (if job-seeker)
    if (cvCount > 0) {
      const cvResult = await CV.deleteMany({ jobSeeker: userId });
      console.log(`✓ Deleted ${cvResult.deletedCount} CV(s)`);
    }

    // 2. Delete applications as candidate
    if (applicationsAsCandidate > 0) {
      const candidateAppsResult = await Application.deleteMany({ candidateId: userId });
      console.log(`✓ Deleted ${candidateAppsResult.deletedCount} application(s) as candidate`);
    }

    // 3. Delete applications as recruiter
    if (applicationsAsRecruiter > 0) {
      const recruiterAppsResult = await Application.deleteMany({ recruiterId: userId });
      console.log(`✓ Deleted ${recruiterAppsResult.deletedCount} application(s) as recruiter`);
    }

    // 4. Delete saved searches
    if (savedSearchesCount > 0) {
      const searchesResult = await SavedSearch.deleteMany({ userId: userId });
      console.log(`✓ Deleted ${searchesResult.deletedCount} saved search(es)`);
    }

    // 5. Delete email preferences
    if (emailPreferencesCount > 0) {
      const preferencesResult = await EmailPreferences.deleteMany({ userId: userId });
      console.log(`✓ Deleted ${preferencesResult.deletedCount} email preference(s)`);
    }

    // 6. Remove user from other users' favouriteJobs and favouriteCandidates
    const favouriteJobsResult = await User.updateMany(
      { favouriteJobs: userId },
      { $pull: { favouriteJobs: userId } }
    );
    if (favouriteJobsResult.modifiedCount > 0) {
      console.log(`✓ Removed user from ${favouriteJobsResult.modifiedCount} users' favouriteJobs`);
    }

    const favouriteCandidatesResult = await User.updateMany(
      { favouriteCandidates: userId },
      { $pull: { favouriteCandidates: userId } }
    );
    if (favouriteCandidatesResult.modifiedCount > 0) {
      console.log(`✓ Removed user from ${favouriteCandidatesResult.modifiedCount} users' favouriteCandidates`);
    }

    // 7. Delete the user
    const userResult = await User.deleteOne({ _id: userId });
    if (userResult.deletedCount > 0) {
      console.log(`✓ Deleted user: ${user.name} (${user.email})`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('Deletion complete!');
    console.log('='.repeat(80));
    console.log(`\nTotal items deleted:`);
    console.log(`  - User: 1`);
    console.log(`  - CVs: ${cvCount}`);
    console.log(`  - Applications: ${applicationsAsCandidate + applicationsAsRecruiter}`);
    console.log(`  - Saved searches: ${savedSearchesCount}`);
    console.log(`  - Email preferences: ${emailPreferencesCount}`);
    console.log(`\n⚠️  Note: ${jobsCount} job(s) owned by this user were NOT deleted.`);
    console.log('    You may want to manually review and delete them if needed.\n');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
const email = 'sven.kelling@gmail.com';
const name = 'Sven Kelling';

deleteUser(email, name);
