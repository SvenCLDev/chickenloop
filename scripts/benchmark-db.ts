
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
                    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
                    process.env[key] = value;
                }
            });
        }
    } catch { console.warn('⚠️ Could not load .env.local'); }
}

loadEnv();

async function benchmark() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI missing');
        return;
    }

    console.log('⏱️  Starting MongoDB Benchmark...');
    console.log(`📡 URL: ${uri.replace(/:([^:@]+)@/, ':****@')}`);

    const startConnect = Date.now();
    try {
        // 1. Connection Time
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 1, // Minimize pool for simple test
        });
        const connectTime = Date.now() - startConnect;
        console.log(`✅ Connected in: ${connectTime}ms`);

        // 2. Ping Time (Round Trip)
        const startPing = Date.now();
        await mongoose.connection.db?.admin().ping();
        const pingTime = Date.now() - startPing;
        console.log(`🏓 Ping (latency): ${pingTime}ms`);

        // 3. Query Time (1 doc)
        const startQuery = Date.now();
        await mongoose.connection.db?.collection('jobs').findOne({});
        const queryTime = Date.now() - startQuery;
        console.log(`🔍 Simple Query (1 doc): ${queryTime}ms`);

        // 4. Heavy Query Time (100 docs, no projection)
        const startHeavy = Date.now();
        const docs = await mongoose.connection.db?.collection('jobs').find({}).limit(100).toArray();
        const heavyTime = Date.now() - startHeavy;
        console.log(`📦 Moderate Query (100 docs): ${heavyTime}ms (Size: ${JSON.stringify(docs).length} bytes)`);

        await mongoose.disconnect();

    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error('❌ Error:', (error as any).message);
    }
}

benchmark();
