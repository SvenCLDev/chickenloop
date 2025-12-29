
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local manually
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

async function listAllJobs() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI not found in .env.local');
        process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`✅ Connected successfully`);

        const db = mongoose.connection.db;
        if (!db) throw new Error('Database handle missing');

        const jobsCount = await db.collection('jobs').countDocuments();
        console.log(`\n📊 Total Jobs Found: ${jobsCount}`);

        // Fetch 5 jobs
        const jobs = await db.collection('jobs').find({}).limit(5).toArray();

        console.log('\n📋 LIST OF ALL JOBS:');
        console.log('================================================');

        jobs.forEach((job, index) => {
            console.log(`\n[Job #${index + 1}]`);
            console.log(`ID: ${job._id}`);
            console.log(`Title: ${job.title}`);
            console.log(`Company: ${job.company}`);
            console.log(`Location: ${job.location}`);
            console.log(`Pictures: ${JSON.stringify(job.pictures || [])}`);
            console.log(`Created: ${job.createdAt}`);
        });
        console.log('\n================================================');

        await mongoose.disconnect();
        console.log('\n👋 Disconnected.');
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error('❌ Error:', (error as any).message);
    }
}

listAllJobs();
