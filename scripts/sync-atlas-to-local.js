#!/usr/bin/env node

/**
 * Sync MongoDB Atlas (production) to Local MongoDB
 * Copies all data from Atlas to local MongoDB
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const mongoose = require('mongoose');

// MongoDB Atlas connection string (source)
const ATLAS_URI = 'mongodb+srv://chickenloop3845_db_user:msLBG6d6lscrfQYf@cluster042369.iggtazi.mongodb.net/chickenloop?appName=Cluster042369';

// Local MongoDB connection string (destination)
const LOCAL_URI = 'mongodb://localhost:27017/chickenloop';

const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}



async function getCollections(db) {
  const collections = await db.listCollections().toArray();
  return collections.map(c => c.name).filter(name => !name.startsWith('system.'));
}

async function copyCollection(sourceDb, targetDb, collectionName) {
  log(`\n   📦 Copying ${collectionName}...`, 'cyan');

  // Get all documents from source
  const sourceCollection = sourceDb.collection(collectionName);
  const documents = await sourceCollection.find({}).toArray();

  if (documents.length === 0) {
    log(`   ⚠️  ${collectionName}: No documents to copy`, 'yellow');
    return { collection: collectionName, count: 0, inserted: 0 };
  }

  // Clear existing data in target collection
  const targetCollection = targetDb.collection(collectionName);
  await targetCollection.deleteMany({});
  log(`   🗑️  Cleared existing ${collectionName} data`, 'yellow');

  // Insert all documents into target
  if (documents.length > 0) {
    await targetCollection.insertMany(documents, { ordered: false });
  }

  log(`   ✅ ${collectionName}: Copied ${documents.length} documents`, 'green');

  return { collection: collectionName, count: documents.length, inserted: documents.length };
}

async function main() {
  try {
    log('🔄 MongoDB Atlas to Local Sync', 'blue');
    log('================================\n');

    log('📡 Step 1: Connecting to databases...', 'blue');

    // Connect to both databases simultaneously
    const atlasConn = mongoose.createConnection(ATLAS_URI);
    const localConn = mongoose.createConnection(LOCAL_URI);

    await atlasConn.asPromise();
    log(`✅ Connected to MongoDB Atlas (source)`, 'green');

    await localConn.asPromise();
    log(`✅ Connected to Local MongoDB (destination)`, 'green');

    const atlasDb = atlasConn.db;
    const localDb = localConn.db;

    log('\n📋 Step 2: Getting collections from Atlas...', 'blue');
    const collections = await getCollections(atlasDb);
    log(`   Found ${collections.length} collections: ${collections.join(', ')}`, 'green');

    log('\n📥 Step 3: Copying data from Atlas to Local...', 'blue');
    log('   This will replace all existing data in local MongoDB!\n', 'yellow');

    const results = [];
    for (const collectionName of collections) {
      try {
        const result = await copyCollection(atlasDb, localDb, collectionName);
        results.push(result);
      } catch (error) {
        log(`   ❌ Error copying ${collectionName}: ${error.message}`, 'red');
        results.push({ collection: collectionName, count: 0, inserted: 0, error: error.message });
      }
    }

    // Summary
    log(`\n${'='.repeat(60)}`, 'blue');
    log('📊 SYNC SUMMARY', 'blue');
    log(`${'='.repeat(60)}`, 'blue');

    const totalDocuments = results.reduce((sum, r) => sum + (r.inserted || 0), 0);
    log(`\n✅ Total documents copied: ${totalDocuments}`, 'green');
    log(`\n📋 Collections synced:`, 'green');

    results.forEach(result => {
      if (result.error) {
        log(`   ❌ ${result.collection}: Error - ${result.error}`, 'red');
      } else {
        log(`   ✅ ${result.collection}: ${result.inserted} documents`, 'green');
      }
    });

    // Close both connections
    await atlasConn.close();
    await localConn.close();
    log('\n✅ Sync completed successfully!', 'green');
    log('\n💡 Your local site should now show the same data as production.', 'cyan');
    log('   Restart your dev server if it\'s running to see the changes.', 'yellow');

  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);

    // Try to close connections
    try {
      if (atlasConn) await atlasConn.close();
      if (localConn) await localConn.close();
    } catch {
      // Ignore
    }

    process.exit(1);
  }
}

main();

