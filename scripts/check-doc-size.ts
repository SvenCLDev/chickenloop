
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

async function checkSize() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        const db = mongoose.connection.db;
        if (!db) throw new Error('No DB');

        // Get 5 random documents
        const docs = await db.collection('jobs').find({}).limit(5).toArray();

        console.log('📊 Document Size Analysis (5 samples):');

        let totalBytes = 0;
        docs.forEach((doc, i) => {
            const json = JSON.stringify(doc);
            const bytes = Buffer.byteLength(json, 'utf8');
            totalBytes += bytes;
            console.log(`Job #${i + 1}: ${(bytes / 1024).toFixed(2)} KB`);

            // Quick check for huge fields
            if (bytes > 10000) { // If > 10KB
                console.log('   ⚠️ Large fields:');
                Object.keys(doc).forEach(key => {
                    const len = JSON.stringify(doc[key]).length;
                    if (len > 1000) {
                        console.log(`   - ${key}: ${(len / 1024).toFixed(2)} KB`);
                    }
                });
            }
        });

        const avg = totalBytes / docs.length;
        console.log(`\nAverage Size: ${(avg / 1024).toFixed(2)} KB`);
        console.log(`Estimated 100 docs: ${((avg * 100) / 1024 / 1024).toFixed(2)} MB`);

        await mongoose.disconnect();
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error('Error:', (error as any).message);
    }
}

checkSize();
