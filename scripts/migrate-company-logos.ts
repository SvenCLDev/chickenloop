/**
 * Migration script to convert base64-encoded company logos to Vercel Blob Storage URLs.
 * This reduces the API payload from ~10MB to ~100KB for the companies list.
 * 
 * Run with: npx tsx scripts/migrate-company-logos.ts
 */

import mongoose from 'mongoose';
import { put } from '@vercel/blob';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface Company {
    _id: mongoose.Types.ObjectId;
    name: string;
    logo?: string;
}

async function migrateCompanyLogos() {
    const mongoUri = process.env.MONGODB_URI;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (!mongoUri) {
        console.error('MONGODB_URI is not set');
        process.exit(1);
    }

    if (!blobToken) {
        console.error('BLOB_READ_WRITE_TOKEN is not set');
        console.log('Please set this in your .env.local file or run: npx vercel env pull');
        process.exit(1);
    }

    console.log('🚀 Starting company logo migration...');
    console.log('Connecting to MongoDB...');

    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;

    if (!db) {
        console.error('Database connection failed');
        process.exit(1);
    }

    const companiesCollection = db.collection('companies');
    const companies = await companiesCollection.find({}).toArray() as unknown as Company[];

    console.log(`Found ${companies.length} companies`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const company of companies) {
        const logo = company.logo || '';

        // Skip if no logo or already a URL
        if (!logo || logo.startsWith('http')) {
            skippedCount++;
            continue;
        }

        // Check if it's base64
        if (!logo.startsWith('data:')) {
            skippedCount++;
            continue;
        }

        try {
            console.log(`\n📸 Migrating logo for: ${company.name}`);

            // Extract the base64 data and content type
            const matches = logo.match(/^data:([^;]+);base64,(.+)$/);
            if (!matches) {
                console.log(`  ⚠️ Invalid base64 format, skipping`);
                skippedCount++;
                continue;
            }

            const contentType = matches[1];
            const base64Data = matches[2];

            // Determine file extension from content type
            const extensionMap: Record<string, string> = {
                'image/jpeg': 'jpg',
                'image/jpg': 'jpg',
                'image/png': 'png',
                'image/gif': 'gif',
                'image/webp': 'webp',
                'image/svg+xml': 'svg',
            };
            const extension = extensionMap[contentType] || 'png';

            // Create a safe filename
            const safeCompanyName = company.name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .substring(0, 50);
            const filename = `company-logos/${safeCompanyName}-${company._id.toString().slice(-6)}.${extension}`;

            // Convert base64 to Buffer
            const buffer = Buffer.from(base64Data, 'base64');

            console.log(`  📤 Uploading ${(buffer.length / 1024).toFixed(1)} KB to: ${filename}`);

            // Upload to Vercel Blob
            const blob = await put(filename, buffer, {
                access: 'public',
                contentType,
                token: blobToken,
                addRandomSuffix: false,
                allowOverwrite: true,
            });

            console.log(`  ✅ Uploaded to: ${blob.url}`);

            // Update the company record with the new URL
            await companiesCollection.updateOne(
                { _id: company._id },
                { $set: { logo: blob.url } }
            );

            console.log(`  💾 Updated database record`);
            migratedCount++;

        } catch (error) {
            console.error(`  ❌ Error migrating logo for ${company.name}:`, error);
            errorCount++;
        }
    }

    await mongoose.disconnect();

    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Migrated: ${migratedCount}`);
    console.log(`  ⏭️ Skipped: ${skippedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log('\n🎉 Migration complete!');
}

migrateCompanyLogos().catch(console.error);
