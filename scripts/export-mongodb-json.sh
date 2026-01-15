#!/bin/bash

# MongoDB JSON Export Script for Chickenloop
# This script exports the database to JSON files (human-readable, smaller size)

set -e

# Configuration
DB_NAME="chickenloop"
EXPORT_DIR="./exports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPORT_NAME="chickenloop_export_${TIMESTAMP}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}📄 MongoDB JSON Export Script${NC}"
echo "===================================="
echo ""

# Check if mongoexport is installed
if ! command -v mongoexport &> /dev/null; then
    echo -e "${RED}❌ Error: mongoexport is not installed${NC}"
    echo ""
    echo "Install MongoDB Database Tools:"
    echo "  macOS:   brew install mongodb-database-tools"
    echo "  Linux:   sudo apt-get install mongodb-database-tools"
    exit 1
fi

# Create export directory if it doesn't exist
mkdir -p "$EXPORT_DIR/$EXPORT_NAME"

echo "📄 Exporting collections to JSON..."
echo "   Database: $DB_NAME"
echo "   Output: $EXPORT_DIR/$EXPORT_NAME"
echo ""

# Collections to export
COLLECTIONS=("users" "jobs" "companies" "cvs" "auditlogs")

for COLLECTION in "${COLLECTIONS[@]}"; do
    echo "   Exporting $COLLECTION..."
    mongoexport \
        --db="$DB_NAME" \
        --collection="$COLLECTION" \
        --out="$EXPORT_DIR/$EXPORT_NAME/${COLLECTION}.json" \
        --jsonArray \
        --quiet || echo "   ⚠️  Collection '$COLLECTION' not found or empty (skipping)"
done

# Compress the export
echo ""
echo "📦 Compressing export..."
cd "$EXPORT_DIR"
tar -czf "${EXPORT_NAME}.tar.gz" "$EXPORT_NAME"
rm -rf "$EXPORT_NAME"
cd ..

EXPORT_SIZE=$(du -h "$EXPORT_DIR/${EXPORT_NAME}.tar.gz" | cut -f1)

echo ""
echo -e "${GREEN}✅ Export completed successfully!${NC}"
echo "   Location: $EXPORT_DIR/${EXPORT_NAME}.tar.gz"
echo "   Size: $EXPORT_SIZE"
echo ""
echo "💡 Note: JSON exports are human-readable and smaller than BSON dumps."
echo "   However, they may lose some data types (e.g., ObjectId, Date)."










