/**
 * Convert Base64 Images to Server Files
 * 
 * This script:
 * 1. Finds all jobs with Base64 images in the `pictures` field
 * 2. Decodes and saves them as actual files to public/uploads/jobs/
 * 3. Inserts into job_images collection with file path
 * 4. Removes the pictures field from the job
 * 
 * Run with: npx tsx scripts/convert-base64-to-files.ts
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

// Extract extension and data from Base64 string
function parseBase64(base64String: string): { extension: string; data: Buffer } | null {
    // Format: data:image/png;base64,/9j/4AAQ...
    const match = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return null;

    let extension = match[1];
    // Normalize extensions
    if (extension === 'jpeg') extension = 'jpg';

    const data = Buffer.from(match[2], 'base64');
    return { extension, data };
}

async function convert() {
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

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'jobs');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Get job IDs with Base64 pictures
    console.log('\n📋 Finding jobs with Base64 pictures...');
    const jobIds = await jobsCollection.find(
        { pictures: { $exists: true, $ne: [] } },
        { projection: { _id: 1 } }
    ).toArray();

    console.log(`Found ${jobIds.length} jobs to process`);

    let convertedCount = 0;
    let filesCreated = 0;
    let skippedCount = 0;

    for (let i = 0; i < jobIds.length; i++) {
        const jobId = jobIds[i]._id;
        console.log(`Processing job ${i + 1}/${jobIds.length} (${jobId})...`);

        try {
            const job = await jobsCollection.findOne(
                { _id: jobId },
                { maxTimeMS: 120000 }
            );

            if (!job || !job.pictures) continue;

            const pictures = job.pictures as string[];
            let hasBase64 = false;
            let allConverted = true;

            for (let j = 0; j < pictures.length; j++) {
                const pic = pictures[j];

                // Check if it's a Base64 string
                if (!pic.startsWith('data:')) {
                    // Already a file path - skip
                    continue;
                }

                hasBase64 = true;

                // Parse Base64
                const parsed = parseBase64(pic);
                if (!parsed) {
                    console.log(`   ⚠️ Could not parse image ${j + 1}`);
                    allConverted = false;
                    continue;
                }

                // Generate filename
                const timestamp = Date.now();
                const randomStr = Math.random().toString(36).substring(2, 10);
                const filename = `job-${timestamp}-${randomStr}.${parsed.extension}`;
                const filepath = path.join(uploadsDir, filename);
                const urlPath = `/uploads/jobs/${filename}`;

                // Write file
                fs.writeFileSync(filepath, parsed.data);
                filesCreated++;

                // Insert into job_images collection
                await jobImagesCollection.insertOne({
                    jobId: jobId,
                    imageUrl: urlPath,
                    order: j,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                console.log(`   ✅ Saved image ${j + 1}: ${filename} (${(parsed.data.length / 1024).toFixed(1)} KB)`);
            }

            // Remove pictures field if all were converted
            if (hasBase64 && allConverted) {
                await jobsCollection.updateOne(
                    { _id: jobId },
                    { $unset: { pictures: '' } }
                );
                convertedCount++;
                console.log(`   ✅ Cleaned job`);
            } else if (!hasBase64) {
                skippedCount++;
                console.log(`   ⏭️ Already migrated`);
            }

        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.log(`   ❌ Error: ${(error as any).message}`);
        }
    }

    console.log('\n✅ Conversion Complete!');
    console.log(`   Jobs processed: ${jobIds.length}`);
    console.log(`   Jobs converted: ${convertedCount}`);
    console.log(`   Jobs skipped (already done): ${skippedCount}`);
    console.log(`   Files created: ${filesCreated}`);

    await mongoose.disconnect();
    console.log('\n👋 Disconnected');
}

convert().catch(console.error);
