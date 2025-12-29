#!/usr/bin/env node

/**
 * Backup Local MongoDB to Archive Directory
 * Creates a backup of the local MongoDB database (localhost:27017)
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const mongoose = require('mongoose');

const DB_NAME = 'chickenloop';
const ARCHIVE_DIR = path.join(__dirname, '../../archive');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const BACKUP_NAME = `local_chickenloop_backup_${TIMESTAMP}`;
const BACKUP_PATH = path.join(ARCHIVE_DIR, BACKUP_NAME);

// Local MongoDB connection
const LOCAL_URI = 'mongodb://localhost:27017/chickenloop';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function connectDB() {
  await mongoose.connect(LOCAL_URI);
  log('✅ Connected to local MongoDB', 'green');
  return mongoose.connection.db;
}

async function getCollections(db) {
  const collections = await db.listCollections().toArray();
  return collections.map(c => c.name).filter(name => !name.startsWith('system.'));
}

async function backupCollection(db, collectionName, backupPath) {
  const collection = db.collection(collectionName);
  const documents = await collection.find({}).toArray();

  const filePath = path.join(backupPath, `${collectionName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));

  return documents.length;
}

async function main() {
  try {
    log('🗄️  Local MongoDB Backup to Archive', 'cyan');
    log('===================================\n');

    // Create archive directory
    if (!fs.existsSync(ARCHIVE_DIR)) {
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }

    if (!fs.existsSync(BACKUP_PATH)) {
      fs.mkdirSync(BACKUP_PATH, { recursive: true });
    }

    log('📦 Creating backup of local MongoDB...', 'cyan');
    log(`   Database: ${DB_NAME}`);
    log(`   Source: localhost:27017`);
    log(`   Output: ${BACKUP_PATH}\n`);

    // Connect to local database
    const db = await connectDB();

    // Get all collections
    const collections = await getCollections(db);
    log(`   Found ${collections.length} collections: ${collections.join(', ')}\n`);

    // Backup each collection
    const backupInfo = {
      timestamp: new Date().toISOString(),
      database: DB_NAME,
      source: 'localhost:27017',
      collections: {},
    };

    for (const collectionName of collections) {
      log(`   Exporting ${collectionName}...`, 'cyan');
      const count = await backupCollection(db, collectionName, BACKUP_PATH);
      backupInfo.collections[collectionName] = count;
      log(`   ✅ ${collectionName}: ${count} documents`, 'green');
    }

    // Save backup metadata
    const metadataPath = path.join(BACKUP_PATH, 'backup-info.json');
    fs.writeFileSync(metadataPath, JSON.stringify(backupInfo, null, 2));

    // Compress the backup
    log('\n📦 Compressing backup...', 'cyan');
    const tarPath = `${BACKUP_PATH}.tar.gz`;

    try {
      // Use tar command to compress
      execSync(`cd "${ARCHIVE_DIR}" && tar -czf "${path.basename(tarPath)}" "${BACKUP_NAME}"`, {
        stdio: 'inherit',
      });

      // Remove uncompressed directory
      fs.rmSync(BACKUP_PATH, { recursive: true, force: true });

      const stats = fs.statSync(tarPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      log('\n✅ Backup created successfully!', 'green');
      log(`   Location: ${tarPath}`);
      log(`   Size: ${sizeMB} MB`);
    } catch {
      // If tar fails, keep uncompressed backup
      log('\n⚠️  Could not compress backup', 'yellow');
      log('   Backup saved as uncompressed directory:', 'yellow');
      log(`   ${BACKUP_PATH}`);
    }

    await mongoose.connection.close();
    log('\n✅ Backup completed!', 'green');
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();






