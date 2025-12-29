#!/usr/bin/env node

/**
 * MongoDB Restore Script (Node.js version)
 * Restores a backup created with backup-mongodb-node.js
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
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI not found in .env.local');
  }

  const dbUri = uri.includes('/chickenloop') ? uri : `${uri}/chickenloop`;
  await mongoose.connect(dbUri);
  log('✅ Connected to MongoDB', 'green');
  return mongoose.connection.db;
}

async function restoreCollection(db, collectionName, filePath) {
  const collection = db.collection(collectionName);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (data.length === 0) {
    log(`   ⚠️  ${collectionName}: No documents to restore (skipping)`);
    return 0;
  }

  // Drop existing collection
  await collection.drop().catch(() => {
    // Collection might not exist, that's okay
  });

  // Insert documents
  if (data.length > 0) {
    await collection.insertMany(data);
  }

  return data.length;
}

async function main() {
  try {
    const backupFile = process.argv[2];

    if (!backupFile) {
      log('❌ Error: No backup file specified', 'red');
      log('\nUsage: node scripts/restore-mongodb-node.js <backup-file>');
      log('\nExample:');
      log('  node scripts/restore-mongodb-node.js ./backups/chickenloop_backup_2024-01-01T12-00-00.tar.gz');
      process.exit(1);
    }

    if (!fs.existsSync(backupFile)) {
      log(`❌ Error: Backup file not found: ${backupFile}`, 'red');
      process.exit(1);
    }

    log('🔄 MongoDB Restore Script (Node.js)', 'green');
    log('=====================================\n');

    // Extract backup if it's compressed
    let backupPath;
    const tempDir = fs.mkdtempSync(path.join(__dirname, '../temp-restore-'));

    try {
      if (backupFile.endsWith('.tar.gz')) {
        log('📦 Extracting backup...');
        execSync(`tar -xzf "${backupFile}" -C "${tempDir}"`, { stdio: 'inherit' });
        // Find the extracted directory
        const extracted = fs.readdirSync(tempDir);
        backupPath = path.join(tempDir, extracted[0]);
      } else {
        backupPath = backupFile;
      }

      log(`\n⚠️  WARNING: This will replace all data in the '${DB_NAME}' database!`, 'yellow');
      log('Press Ctrl+C to cancel, or Enter to continue...\n');

      // Wait for user input (simple timeout approach)
      await new Promise(resolve => {

        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        readline.question('', () => {
          readline.close();
          resolve();
        });
      });

      // Connect to database
      const db = await connectDB();

      log('\n🔄 Restoring backup...');
      log(`   Database: ${DB_NAME}\n`);

      // Read backup info
      const infoPath = path.join(backupPath, 'backup-info.json');
      let backupInfo = {};
      if (fs.existsSync(infoPath)) {
        backupInfo = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
        log(`   Backup created: ${backupInfo.timestamp}`);
        log(`   Collections: ${Object.keys(backupInfo.collections).join(', ')}\n`);
      }

      // Restore each collection
      const files = fs.readdirSync(backupPath).filter(f => f.endsWith('.json') && f !== 'backup-info.json');

      for (const file of files) {
        const collectionName = path.basename(file, '.json');
        log(`   Restoring ${collectionName}...`);
        const count = await restoreCollection(db, collectionName, path.join(backupPath, file));
        log(`   ✅ ${collectionName}: ${count} documents restored`, 'green');
      }

      // Cleanup
      if (tempDir !== backupPath) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      await mongoose.connection.close();
      log('\n✅ Restore completed successfully!', 'green');
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      throw error;
    }
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();

