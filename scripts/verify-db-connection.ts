
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

async function verifyConnection() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI not found in .env.local');
        process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    console.log(`   URI: ${uri.replace(/:([^:@]+)@/, ':****@')}`); // Hide password

    try {
        const start = Date.now();
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        const connectionTime = Date.now() - start;
        console.log(`✅ Connected successfully in ${connectionTime}ms`);

        // Verify Jobs Collection
        console.log('\n📊 Checking "jobs" collection...');
        const db = mongoose.connection.db;
        if (!db) throw new Error('Database handle missing');

        const collections = await db.listCollections().toArray();
        console.log('   Collections found:', collections.map(c => c.name).join(', '));

        const jobsCount = await db.collection('jobs').countDocuments();
        console.log(`   Total Jobs: ${jobsCount}`);

        if (jobsCount > 0) {
            const firstJob = await db.collection('jobs').findOne({});
            console.log('   Sample Job:', JSON.stringify(firstJob, null, 2));
        } else {
            console.log('⚠️ The "jobs" collection is empty.');
        }

        await mongoose.disconnect();
        console.log('\n👋 Disconnected.');
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error('❌ Connection failed:', (error as any).message);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((error as any).cause) console.error('   Cause:', (error as any).cause);
    }
}

verifyConnection();
