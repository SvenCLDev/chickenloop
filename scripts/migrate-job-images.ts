/**
 * Migration Script: Separate Job Images (Optimized)
 * 
 * This script processes jobs one-by-one to avoid timeout from large Base64 documents.
 * 
 * Run with: npx tsx scripts/migrate-job-images.ts
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
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
    } catch {
        console.warn('⚠️ Could not load .env.local');
    }
}

loadEnv();

async function migrate() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI not found');
        process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri, { socketTimeoutMS: 120000 });
    console.log('✅ Connected');

    const db = mongoose.connection.db;
    if (!db) {
        console.error('❌ Database not available');
        process.exit(1);
    }

    const jobsCollection = db.collection('jobs');
    const jobImagesCollection = db.collection('job_images');

    // Step 1: Get only the IDs of jobs with pictures (fast)
    console.log('\n📋 Finding job IDs with pictures...');
    const jobIds = await jobsCollection.find(
        { pictures: { $exists: true, $ne: [] } },
        { projection: { _id: 1 } }
    ).toArray();

    console.log(`Found ${jobIds.length} jobs with pictures`);

    let migratedCount = 0;
    let skippedBase64Count = 0;
    let imageCount = 0;

    // Step 2: Process each job one-by-one
    for (let i = 0; i < jobIds.length; i++) {
        const jobId = jobIds[i]._id;
        console.log(`Processing job ${i + 1}/${jobIds.length} (${jobId})...`);

        try {
            // Fetch this single job
            const job = await jobsCollection.findOne(
                { _id: jobId },
                { maxTimeMS: 60000 } // 60 second timeout per job
            );

            if (!job || !job.pictures) continue;

            const pictures = job.pictures as string[];
            let hasBase64 = false;

            for (let j = 0; j < pictures.length; j++) {
                const pic = pictures[j];

                // Check if it's a Base64 string
                if (pic.startsWith('data:')) {
                    console.log(`   ⚠️ Skipping Base64 image ${j + 1}`);
                    skippedBase64Count++;
                    hasBase64 = true;
                    continue;
                }

                // Insert into job_images collection
                await jobImagesCollection.insertOne({
                    jobId: jobId,
                    imageUrl: pic,
                    order: j,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                imageCount++;
            }

            // Remove pictures field only if no Base64 images
            if (!hasBase64) {
                await jobsCollection.updateOne(
                    { _id: jobId },
                    { $unset: { pictures: '' } }
                );
                migratedCount++;
                console.log(`   ✅ Migrated`);
            } else {
                console.log(`   ⚠️ Kept (has Base64)`);
            }
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.log(`   ❌ Error: ${(error as any).message}`);
        }
    }

    console.log('\n✅ Migration Complete!');
    console.log(`   Jobs processed: ${jobIds.length}`);
    console.log(`   Jobs fully migrated: ${migratedCount}`);
    console.log(`   Images migrated: ${imageCount}`);
    console.log(`   Base64 images skipped: ${skippedBase64Count}`);

    await mongoose.disconnect();
    console.log('\n👋 Disconnected');
}

migrate().catch(console.error);
