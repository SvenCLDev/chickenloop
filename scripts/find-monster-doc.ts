
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

async function findMonster() {
    const uri = process.env.MONGODB_URI;
    if (!uri) process.exit(1);

    try {
        await mongoose.connect(uri);
        const db = mongoose.connection.db;

        // Use aggregation to find size
        // $bsonSize is available in MongoDB 4.4+
        const stats = await db?.collection('jobs').aggregate([
            {
                $project: {
                    _id: 1,
                    size: { $bsonSize: "$$ROOT" }
                }
            },
            { $sort: { size: -1 } },
            { $limit: 3 }
        ]).toArray();

        if (stats) {
            console.log('🦖 Largest Documents Findings:');
            stats.forEach(doc => {
                console.log(`- ID: ${doc._id} | Size: ${(doc.size / 1024).toFixed(2)} KB`);
            });
        }

        await mongoose.disconnect();
    } catch (error) {
        // Fallback if $bsonSize is not supported (unlikely on Atlas)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error('Error:', (error as any).message);
    }
}

findMonster();
