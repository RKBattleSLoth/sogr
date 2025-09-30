# Development Scripts

This directory contains scripts for development workflows and utilities.

## Available Scripts

### Database Management
- `cleanup-test-data.ts` - Remove test data from database
- `seed-database.js` - Populate database with sample data (if needed)

### Server Management
- `manage-server.sh` - Start/stop/restart development server

## Usage

All scripts should be run from the project root directory.

```bash
# Example: Run cleanup script
npx tsx scripts/development/cleanup-test-data.ts
```