#!/bin/bash

# MongoDB Restore Script for Chickenloop
# This script restores a backup to your local MongoDB database

set -e

# Configuration
DB_NAME="chickenloop"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 MongoDB Restore Script${NC}"
echo "================================"
echo ""

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: No backup file specified${NC}"
    echo ""
    echo "Usage: ./scripts/restore-mongodb.sh <backup-file.tar.gz>"
    echo ""
    echo "Example:"
    echo "  ./scripts/restore-mongodb.sh ./backups/chickenloop_backup_20240101_120000.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Check if mongorestore is installed
if ! command -v mongorestore &> /dev/null; then
    echo -e "${RED}❌ Error: mongorestore is not installed${NC}"
    echo ""
    echo "Install MongoDB Database Tools:"
    echo "  macOS:   brew install mongodb-database-tools"
    echo "  Linux:   sudo apt-get install mongodb-database-tools"
    exit 1
fi

# Extract backup
TEMP_DIR=$(mktemp -d)
echo "📦 Extracting backup..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Find the extracted backup directory
EXTRACTED_DIR=$(find "$TEMP_DIR" -type d -name "chickenloop_backup_*" | head -n 1)
if [ -z "$EXTRACTED_DIR" ]; then
    EXTRACTED_DIR="$TEMP_DIR/$(ls "$TEMP_DIR" | head -n 1)"
fi

echo ""
echo -e "${YELLOW}⚠️  WARNING: This will replace all data in the '$DB_NAME' database!${NC}"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    rm -rf "$TEMP_DIR"
    exit 0
fi

echo ""
echo "🔄 Restoring backup..."
echo "   Database: $DB_NAME"
echo ""

# Restore the backup
mongorestore \
    --db="$DB_NAME" \
    --drop \
    "$EXTRACTED_DIR/$DB_NAME"

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}✅ Restore completed successfully!${NC}"










