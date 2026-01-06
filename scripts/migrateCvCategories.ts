/**
 * Migration Script: Normalize CV Work Area Categories
 * 
 * This script migrates existing CV work area values from legacy formats
 * to the new canonical format defined in src/constants/jobCategories.ts
 * 
 * Mapping:
 * - "Instructor / Coach" → "Instruction"
 * - "Customer Support" → "Support"
 * - "Repair / Maintenance" → "Maintenance"
 * - "Creative / Media" → "Creative"
 * - "Sales / Retail" → "Sales"
 * - Others map 1:1 (Hospitality, Events, Management, Operations, Marketing)
 * 
 * The script is idempotent and safe to re-run.
 * 
 * Usage:
 *   npx tsx scripts/migrateCvCategories.ts
 * 
 * Or with node (if compiled):
 *   node scripts/migrateCvCategories.ts
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually (matches pattern used in other migration scripts)
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

// Import CV model schema (needs to be imported to register)
import '../models/CV';

// Import constants
import { JOB_CATEGORIES } from '../src/constants/jobCategories';

// Category mapping: old value → new value
const CATEGORY_MAPPING: Record<string, string> = {
  // Old format → New format
  "Instructor / Coach": "Instruction",
  "Customer Support": "Support",
  "Repair / Maintenance": "Maintenance",
  "Creative / Media": "Creative",
  "Sales / Retail": "Sales",
  
  // Categories that already match (1:1 mapping) - for idempotency
  "Hospitality": "Hospitality",
  "Events": "Events",
  "Management": "Management",
  "Operations": "Operations",
  "Marketing": "Marketing",
  "Instruction": "Instruction",
  "Support": "Support",
  "Maintenance": "Maintenance",
  "Creative": "Creative",
  "Sales": "Sales",
  
  // Case variations (for safety)
  "instruction": "Instruction",
  "support": "Support",
  "hospitality": "Hospitality",
  "events": "Events",
  "management": "Management",
  "operations": "Operations",
  "maintenance": "Maintenance",
  "marketing": "Marketing",
  "creative": "Creative",
  "sales": "Sales",
};

// Valid new categories (for validation)
const VALID_CATEGORIES = new Set(JOB_CATEGORIES);

interface MigrationStats {
  totalCvs: number;
  cvsProcessed: number;
  cvsUpdated: number;
  cvsUnchanged: number;
  cvsWithUnknownCategories: number;
  categoryUpdates: Record<string, number>;
  unknownCategories: Set<string>;
}

async function migrateCvCategories() {
  console.log('='.repeat(80));
  console.log('CV Work Area Category Migration Script');
  console.log('='.repeat(80));
  console.log('');

  // Validate environment
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ Error: MONGODB_URI environment variable is not set');
    console.error('   Please ensure .env.local file exists with MONGODB_URI');
    process.exit(1);
  }

  // Connect to MongoDB
  console.log('🔌 Connecting to MongoDB...');
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }

  try {
    // Import CV model (need to ensure it's registered)
    const CVModel = mongoose.model('CV');
    
    // Initialize statistics
    const stats: MigrationStats = {
      totalCvs: 0,
      cvsProcessed: 0,
      cvsUpdated: 0,
      cvsUnchanged: 0,
      cvsWithUnknownCategories: 0,
      categoryUpdates: {},
      unknownCategories: new Set<string>(),
    };

    // Fetch all CVs
    console.log('📊 Fetching all CVs from database...');
    const cvs = await CVModel.find({}).lean();
    stats.totalCvs = cvs.length;
    console.log(`   Found ${stats.totalCvs} CVs`);
    console.log('');

    if (stats.totalCvs === 0) {
      console.log('ℹ️  No CVs found. Migration complete.');
      await mongoose.disconnect();
      return;
    }

    console.log('🔄 Processing CVs...');
    console.log('');

    // Process each CV
    for (const cv of cvs) {
      stats.cvsProcessed++;
      const cvId = cv._id.toString();
      const currentCategories = cv.lookingForWorkInAreas || [];
      
      if (currentCategories.length === 0) {
        // CV has no work areas - skip
        continue;
      }

      // Check if migration is needed
      let needsUpdate = false;
      const newCategories: string[] = [];
      const unknownCategories: string[] = [];

      for (const category of currentCategories) {
        if (category in CATEGORY_MAPPING) {
          const mappedCategory = CATEGORY_MAPPING[category];
          newCategories.push(mappedCategory);
          
          // Track if category actually changed
          if (category !== mappedCategory) {
            needsUpdate = true;
            // Track updates per category
            const key = `${category} → ${mappedCategory}`;
            stats.categoryUpdates[key] = (stats.categoryUpdates[key] || 0) + 1;
          }
        } else {
          // Unknown category - preserve it but log it
          newCategories.push(category);
          unknownCategories.push(category);
          stats.unknownCategories.add(category);
        }
      }

      // Remove duplicates (in case migration creates duplicates)
      const uniqueCategories = Array.from(new Set(newCategories));
      
      // Check if arrays are different (ignoring order)
      const currentSet = new Set(currentCategories);
      const newSet = new Set(uniqueCategories);
      const arraysDifferent = 
        currentSet.size !== newSet.size ||
        !Array.from(currentSet).every(cat => newSet.has(cat));

      if (arraysDifferent || needsUpdate) {
        // Update the CV
        try {
          await CVModel.updateOne(
            { _id: cv._id },
            { $set: { lookingForWorkInAreas: uniqueCategories } }
          );
          stats.cvsUpdated++;

          if (unknownCategories.length > 0) {
            stats.cvsWithUnknownCategories++;
            console.log(`   ⚠️  CV ${cvId}: Updated with unknown categories preserved: ${unknownCategories.join(', ')}`);
          } else {
            console.log(`   ✓ CV ${cvId}: Updated ${currentCategories.join(', ')} → ${uniqueCategories.join(', ')}`);
          }
        } catch (error) {
          console.error(`   ❌ Error updating CV ${cvId}:`, error);
        }
      } else {
        stats.cvsUnchanged++;
      }
    }

    // Print migration summary
    console.log('');
    console.log('='.repeat(80));
    console.log('Migration Summary');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Total CVs in database:        ${stats.totalCvs}`);
    console.log(`CVs processed:               ${stats.cvsProcessed}`);
    console.log(`CVs updated:                 ${stats.cvsUpdated}`);
    console.log(`CVs unchanged:               ${stats.cvsUnchanged}`);
    console.log(`CVs with unknown categories: ${stats.cvsWithUnknownCategories}`);
    console.log('');

    if (Object.keys(stats.categoryUpdates).length > 0) {
      console.log('Category Updates:');
      for (const [mapping, count] of Object.entries(stats.categoryUpdates)) {
        console.log(`  ${mapping}: ${count} update(s)`);
      }
      console.log('');
    }

    if (stats.unknownCategories.size > 0) {
      console.log('⚠️  Unknown Categories (preserved, not modified):');
      for (const category of Array.from(stats.unknownCategories).sort()) {
        console.log(`  - "${category}"`);
      }
      console.log('');
      console.log('Note: CVs with unknown categories had them preserved.');
      console.log('      Please review these categories and update the mapping if needed.');
      console.log('');
    }

    console.log('✅ Migration complete!');
    console.log('');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrateCvCategories()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

