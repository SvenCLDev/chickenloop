#!/usr/bin/env node

/**
 * MongoDB Backup Script (Node.js version)
 * Creates a backup of the Chickenloop database without requiring mongodump
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const mongoose = require('mongoose');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !match[1].startsWith('#')) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const DB_NAME = 'chickenloop';
const BACKUP_DIR = path.join(__dirname, '../../archive');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const BACKUP_NAME = `chickenloop_backup_${TIMESTAMP}`;
const BACKUP_PATH = path.join(BACKUP_DIR, BACKUP_NAME);

// Colors for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function connectDB() {
  // Use MONGODB_URI from .env.local, but if it's localhost, use Atlas instead
  // (since the site uses Atlas, not localhost)
  let uri = process.env.MONGODB_URI;

  // If MONGODB_URI points to localhost, use Atlas instead (this is what the site uses)
  if (!uri || uri.includes('localhost') || uri.includes('127.0.0.1')) {
    // Use MongoDB Atlas connection string (this is what the production site uses)
    uri = 'mongodb+srv://chickenloop3845_db_user:msLBG6d6lscrfQYf@cluster042369.iggtazi.mongodb.net/chickenloop?appName=Cluster042369';
    if (process.env.MONGODB_URI && (process.env.MONGODB_URI.includes('localhost') || process.env.MONGODB_URI.includes('127.0.0.1'))) {
      log('⚠️  .env.local points to localhost, using Atlas connection instead (this matches the site)', 'yellow');
    } else {
      log('⚠️  MONGODB_URI not found, using Atlas connection from scripts', 'yellow');
    }
  }

  // Extract database name from URI or use default
  uri = uri.includes('/chickenloop') ? uri : `${uri}/chickenloop`;

  await mongoose.connect(uri);
  log('✅ Connected to MongoDB Atlas (production database)', 'green');

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
    log('🗄️  MongoDB Backup Script (Node.js)', 'green');
    log('=====================================\n');

    // Create backup directory
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    if (!fs.existsSync(BACKUP_PATH)) {
      fs.mkdirSync(BACKUP_PATH, { recursive: true });
    }

    log('📦 Creating backup...', 'green');
    log(`   Database: ${DB_NAME}`);
    log(`   Output: ${BACKUP_PATH}\n`);

    // Connect to database
    const db = await connectDB();

    // Get all collections
    const collections = await getCollections(db);
    log(`   Found ${collections.length} collections: ${collections.join(', ')}\n`);

    // Backup each collection
    const backupInfo = {
      timestamp: new Date().toISOString(),
      database: DB_NAME,
      collections: {},
    };

    for (const collectionName of collections) {
      log(`   Exporting ${collectionName}...`);
      const count = await backupCollection(db, collectionName, BACKUP_PATH);
      backupInfo.collections[collectionName] = count;
      log(`   ✅ ${collectionName}: ${count} documents`, 'green');
    }

    // Save backup metadata
    const metadataPath = path.join(BACKUP_PATH, 'backup-info.json');
    fs.writeFileSync(metadataPath, JSON.stringify(backupInfo, null, 2));

    // Compress the backup
    log('\n📦 Compressing backup...');
    const tarPath = `${BACKUP_PATH}.tar.gz`;

    try {
      // Use tar command if available
      execSync(`cd "${BACKUP_DIR}" && tar -czf "${path.basename(tarPath)}" "${BACKUP_NAME}"`, {
        stdio: 'inherit',
      });

      // Remove uncompressed directory
      fs.rmSync(BACKUP_PATH, { recursive: true, force: true });

      const stats = fs.statSync(tarPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      log('\n✅ Backup created successfully!', 'green');
      log(`   Location: ${tarPath}`);
      log(`   Size: ${sizeMB} MB`);
      log(`\n💡 To restore this backup, use:`, 'yellow');
      log(`   node scripts/restore-mongodb-node.js ${tarPath}`);
    } catch {
      // If tar is not available, keep uncompressed backup
      log('\n⚠️  Could not compress backup (tar not available)', 'yellow');
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

