#!/bin/bash

# MongoDB Backup Script for Chickenloop
# This script creates a backup of your local MongoDB database

set -e

# Configuration
DB_NAME="chickenloop"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="chickenloop_backup_${TIMESTAMP}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🗄️  MongoDB Backup Script${NC}"
echo "================================"
echo ""

# Check if mongodump is installed
if ! command -v mongodump &> /dev/null; then
    echo -e "${RED}❌ Error: mongodump is not installed${NC}"
    echo ""
    echo "Install MongoDB Database Tools:"
    echo "  macOS:   brew install mongodb-database-tools"
    echo "  Linux:   sudo apt-get install mongodb-database-tools"
    echo "  Windows: Download from https://www.mongodb.com/try/download/database-tools"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup..."
echo "   Database: $DB_NAME"
echo "   Output: $BACKUP_DIR/$BACKUP_NAME"
echo ""

# Create backup using mongodump
mongodump \
    --db="$DB_NAME" \
    --out="$BACKUP_DIR/$BACKUP_NAME" \
    --quiet

if [ $? -eq 0 ]; then
    # Compress the backup
    echo "📦 Compressing backup..."
    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    rm -rf "$BACKUP_NAME"
    cd ..
    
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)
    
    echo ""
    echo -e "${GREEN}✅ Backup created successfully!${NC}"
    echo "   Location: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
    echo "   Size: $BACKUP_SIZE"
    echo ""
    echo "💡 To restore this backup, run:"
    echo "   ./scripts/restore-mongodb.sh $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
fi







