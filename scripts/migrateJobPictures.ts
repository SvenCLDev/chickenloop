import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import mongoose from "mongoose";
import { parse } from "csv-parse/sync";
import sharp from "sharp";
import { put } from "@vercel/blob";
import Job from "../models/Job";

const DRY_RUN = process.argv.includes("--dry");
const MAX_IMAGES_PER_JOB = 3;
const MAX_WIDTH = 1600;
const JPEG_QUALITY = 82;

const CSV_PATH = "data/drupal_export/jobs_pictures_full.csv";
const DRUPAL_BASE_URL = "https://www.chickenloop.com/system/files/";

async function main() {
  console.log("Starting Job Picture Migration");
  if (DRY_RUN) console.log("Running in DRY MODE");

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI not found in environment.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const csvContent = fs.readFileSync(CSV_PATH);
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const grouped: Record<string, any[]> = {};

  for (const row of records) {
    const nid = row.nid?.trim() || row.entity_id?.trim();
    if (!nid) continue;

    if (!grouped[nid]) grouped[nid] = [];
    grouped[nid].push(row);
  }

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const nid of Object.keys(grouped)) {
    const job = await Job.findOne({
      "legacy.drupalNid": String(nid),
    });

    if (!job) continue;

    if (job.pictures?.length > 0) {
      console.log(`Skipping job ${nid} (already has pictures)`);
      skipped++;
      continue;
    }

    const uniqueImages = Array.from(
      new Map(
        grouped[nid]
          .filter((img) => img.filename)
          .map((img) => [img.filename.trim(), img])
      ).values()
    );

    const images = uniqueImages.slice(0, MAX_IMAGES_PER_JOB);
    const uploadedUrls: string[] = [];

    for (const image of images) {
      const filename = image.filename?.trim();
      const filesize = Number(image.filesize);
      const filemime = image.filemime;

      if (!filename) continue;
      if (!filemime?.startsWith("image/")) continue;
      if (filesize > 10 * 1024 * 1024) continue;

      const downloadUrl = DRUPAL_BASE_URL + filename;

      try {
        console.log(`Downloading ${downloadUrl}`);

        const response = await fetch(downloadUrl);
        if (!response.ok) {
          console.log(`404 for ${filename}`);
          continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        const resized = await sharp(buffer)
          .rotate()
          .resize({
            width: MAX_WIDTH,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: JPEG_QUALITY })
          .toBuffer();

        if (DRY_RUN) {
          console.log(`Dry: Would upload ${filename}`);
          continue;
        }

        const safeFilename = filename
          .replace(/\s+/g, "_")
          .replace(/[^\w.-]/g, "");

        const blobPath = `jobs/${job._id}/${Date.now()}-${safeFilename}.jpg`;

        const blob = await put(blobPath, resized, {
          access: "public",
          contentType: "image/jpeg",
        });

        uploadedUrls.push(blob.url);
      } catch (err) {
        console.error(`Error processing ${filename}`, err);
        errors++;
      }
    }

    if (!DRY_RUN && uploadedUrls.length > 0) {
      job.pictures = uploadedUrls;
      await job.save();
      console.log(`Saved ${uploadedUrls.length} images for job ${nid}`);
    }

    processed++;
  }

  console.log("------------");
  console.log(`Processed: ${processed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log("Done");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("Migration failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
