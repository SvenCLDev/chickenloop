
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            content.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
                }
            });
        }
    } catch { }
}

loadEnv();

async function inspectMonster() {
    const uri = process.env.MONGODB_URI;
    if (!uri) process.exit(1);

    try {
        await mongoose.connect(uri);
        const db = mongoose.connection.db;

        // Fetch the monster doc
        const doc = await db?.collection('jobs').findOne({ _id: new mongoose.Types.ObjectId("692ade8feee1a037d085d84c") });

        if (doc) {
            console.log('🦖 Monster Document Analysis:');
            console.log(`ID: ${doc._id}`);

            Object.keys(doc).forEach(key => {
                const val = doc[key];
                const size = Buffer.byteLength(JSON.stringify(val));
                console.log(`- Field "${key}": ${(size / 1024).toFixed(2)} KB`);

                if (size > 1000) {
                    console.log(`  👉 This field is HUGE! First 100 chars:`);
                    console.log(`  "${String(val).substring(0, 100)}..."`);
                }
            });
        }

        await mongoose.disconnect();
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error('Error:', (error as any).message);
    }
}

inspectMonster();
