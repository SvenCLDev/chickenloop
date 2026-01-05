# MongoDB Backup Guide for Chickenloop

This guide explains how to backup your local MongoDB database and why certain methods are better than others.

## ⚠️ Why NOT GitHub?

**GitHub is NOT recommended for database backups** for several reasons:

1. **File Size Limits**
   - GitHub has a 100MB file size limit per file
   - Repository size limits (1GB for free accounts)
   - MongoDB dumps can easily exceed these limits

2. **Binary Files**
   - MongoDB dumps are binary (BSON) files
   - Git is designed for text files
   - Binary files don't compress well in Git

3. **Security Concerns**
   - Database backups may contain sensitive user data
   - Committing backups to Git exposes them in version history
   - Even if deleted, they remain in Git history

4. **Version Control Purpose**
   - Git is for source code, not data backups
   - Database backups change frequently
   - Would create unnecessary repository bloat

## ✅ Recommended Backup Methods

### 1. **mongodump (Recommended for Full Backups)**

Creates a complete binary backup (BSON format) that preserves all data types.

**Usage:**
```bash
# Make script executable
chmod +x scripts/backup-mongodb.sh

# Run backup
./scripts/backup-mongodb.sh
```

**What it does:**
- Creates a compressed `.tar.gz` file in `./backups/` directory
- Preserves all data types (ObjectId, Date, etc.)
- Can be restored exactly as it was

**Restore:**
```bash
chmod +x scripts/restore-mongodb.sh
./scripts/restore-mongodb.sh ./backups/chickenloop_backup_YYYYMMDD_HHMMSS.tar.gz
```

### 2. **JSON Export (For Smaller, Human-Readable Backups)**

Exports data to JSON format (smaller, human-readable, but may lose some data types).

**Usage:**
```bash
chmod +x scripts/export-mongodb-json.sh
./scripts/export-mongodb-json.sh
```

**What it does:**
- Exports each collection to a separate JSON file
- Creates a compressed `.tar.gz` file in `./exports/` directory
- Smaller file size, human-readable
- Good for data inspection or migration

### 3. **Manual mongodump Command**

If you prefer to run commands directly:

```bash
# Create backup
mongodump --db=chickenloop --out=./backups/manual_backup

# Compress it
cd backups
tar -czf manual_backup.tar.gz manual_backup
rm -rf manual_backup
cd ..
```

### 4. **File System Copy (For Local MongoDB)**

If MongoDB is running locally and you know the data directory:

```bash
# Stop MongoDB first
brew services stop mongodb-community  # macOS
# or
sudo systemctl stop mongod  # Linux

# Copy data directory
cp -r /usr/local/var/mongodb ./backups/mongodb_data_$(date +%Y%m%d)

# Start MongoDB again
brew services start mongodb-community  # macOS
# or
sudo systemctl start mongod  # Linux
```

⚠️ **Warning:** Only do this when MongoDB is stopped to avoid corruption.

## 📦 Where to Store Backups

### ✅ Good Options:

1. **External Hard Drive / USB Drive**
   - Physical backup
   - No internet required
   - Secure (if encrypted)

2. **Cloud Storage Services**
   - **Google Drive** (15GB free)
   - **Dropbox** (2GB free)
   - **OneDrive** (5GB free)
   - **AWS S3** (pay per use)
   - **Backblaze B2** (cheap cloud storage)

3. **Dedicated Backup Services**
   - **Backblaze** (unlimited backup)
   - **Carbonite**
   - **Time Machine** (macOS built-in)

4. **Private Git Repository (GitLab/GitHub Private)**
   - Only if backups are small (< 100MB)
   - Use `.gitignore` to exclude from main repo
   - Create a separate private repository
   - Encrypt sensitive data first

### ❌ Bad Options:

- Public GitHub repositories
- Main code repository (even if private)
- Email attachments (size limits, security)

## 🔄 Automated Backups

### macOS/Linux Cron Job

Add to crontab to backup daily at 2 AM:

```bash
# Edit crontab
crontab -e

# Add this line (adjust path as needed)
0 2 * * * cd /path/to/chickenloop && ./scripts/backup-mongodb.sh >> /path/to/chickenloop/backups/backup.log 2>&1
```

### Manual Scheduled Backups

Set a reminder to run backups:
- **Daily**: For active development
- **Weekly**: For production data
- **Before major changes**: Always backup before migrations or large updates

## 🔐 Security Best Practices

1. **Encrypt Backups**
   ```bash
   # Encrypt backup before uploading
   gpg --symmetric --cipher-algo AES256 backup.tar.gz
   ```

2. **Exclude from Git**
   - Add to `.gitignore`:
     ```
     backups/
     exports/
     *.tar.gz
     *.bson
     ```

3. **Secure Storage**
   - Use encrypted cloud storage
   - Use strong passwords for backup files
   - Don't share backup files publicly

## 📊 Backup Size Estimates

Typical backup sizes for Chickenloop:
- **Small database** (< 1000 records): 1-10 MB
- **Medium database** (1000-10000 records): 10-100 MB
- **Large database** (> 10000 records): 100+ MB

JSON exports are typically 30-50% smaller than BSON dumps.

## 🚨 Disaster Recovery

If you need to restore from backup:

1. **Stop your application** (if running)
2. **Restore the backup** using restore script
3. **Verify the data** by checking a few records
4. **Restart your application**

## 📝 Quick Reference

```bash
# Full backup (BSON - recommended)
./scripts/backup-mongodb.sh

# JSON export (smaller, readable)
./scripts/export-mongodb-json.sh

# Restore from backup
./scripts/restore-mongodb.sh ./backups/chickenloop_backup_YYYYMMDD_HHMMSS.tar.gz

# Check backup size
du -h ./backups/*.tar.gz

# List all backups
ls -lh ./backups/
```

## 💡 Tips

1. **Test your backups**: Periodically restore a backup to verify it works
2. **Multiple locations**: Store backups in at least 2 different places
3. **Version naming**: Use timestamps in filenames for easy identification
4. **Cleanup old backups**: Remove backups older than 30-90 days to save space
5. **Document restore process**: Keep notes on how to restore in case of emergency







