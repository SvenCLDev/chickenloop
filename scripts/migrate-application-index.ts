import mongoose from 'mongoose';
import connectDB from '../lib/db';
import Application from '../models/Application';

/**
 * Migration script to update the Application model index
 * Changes the unique index on { recruiterId: 1, candidateId: 1 } to a partial index
 * that only enforces uniqueness when jobId is null.
 * 
 * This allows multiple applications from the same recruiter to the same candidate
 * for different jobs, while still preventing duplicate general contacts.
 */
async function migrateApplicationIndex() {
  try {
    console.log('Starting Application index migration...');
    
    // Connect to database
    await connectDB();
    console.log('✓ Connected to database');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    const collection = db.collection('applications');
    
    // List existing indexes
    console.log('\nChecking existing indexes...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map((idx: any) => ({
      name: idx.name,
      key: idx.key,
      unique: idx.unique,
      partialFilterExpression: idx.partialFilterExpression,
    })));

    // Find and drop the old recruiterId + candidateId index
    const oldIndexName = 'recruiterId_1_candidateId_1';
    const oldIndex = indexes.find((idx: any) => idx.name === oldIndexName);
    
    if (oldIndex) {
      console.log(`\nFound old index: ${oldIndexName}`);
      console.log('Dropping old index...');
      
      try {
        await collection.dropIndex(oldIndexName);
        console.log('✓ Successfully dropped old index');
      } catch (error: any) {
        if (error.codeName === 'IndexNotFound') {
          console.log('⚠ Old index not found (may have been already dropped)');
        } else {
          throw error;
        }
      }
    } else {
      console.log(`\n⚠ Old index ${oldIndexName} not found (may have been already dropped or never existed)`);
    }

    // Create the new partial index
    console.log('\nCreating new partial index...');
    console.log('Index: { recruiterId: 1, candidateId: 1 }');
    console.log('Options: { unique: true, partialFilterExpression: { jobId: null } }');
    
    try {
      await collection.createIndex(
        { recruiterId: 1, candidateId: 1 },
        { 
          unique: true, 
          partialFilterExpression: { jobId: null },
          name: 'recruiterId_1_candidateId_1' // Keep the same name for consistency
        }
      );
      console.log('✓ Successfully created new partial index');
    } catch (error: any) {
      if (error.codeName === 'IndexOptionsConflict' || error.message.includes('already exists')) {
        console.log('⚠ Index already exists, verifying...');
        // Verify the index has the correct options
        const newIndexes = await collection.indexes();
        const newIndex = newIndexes.find((idx: any) => 
          idx.name === 'recruiterId_1_candidateId_1' || 
          (idx.key?.recruiterId === 1 && idx.key?.candidateId === 1)
        );
        
        if (newIndex) {
          console.log('Index details:', {
            name: newIndex.name,
            key: newIndex.key,
            unique: newIndex.unique,
            partialFilterExpression: newIndex.partialFilterExpression,
          });
          
          if (newIndex.partialFilterExpression?.jobId === null && newIndex.unique === true) {
            console.log('✓ Index already exists with correct configuration');
          } else {
            console.error('✗ Index exists but with incorrect configuration!');
            console.error('Expected partialFilterExpression: { jobId: null }, unique: true');
            throw new Error('Index configuration mismatch');
          }
        }
      } else {
        throw error;
      }
    }

    // Verify the new index
    console.log('\nVerifying new index...');
    const finalIndexes = await collection.indexes();
    const finalIndex = finalIndexes.find((idx: any) => 
      idx.name === 'recruiterId_1_candidateId_1' || 
      (idx.key?.recruiterId === 1 && idx.key?.candidateId === 1)
    );
    
    if (finalIndex) {
      console.log('✓ Final index configuration:');
      console.log('  Name:', finalIndex.name);
      console.log('  Key:', finalIndex.key);
      console.log('  Unique:', finalIndex.unique);
      console.log('  Partial Filter:', finalIndex.partialFilterExpression);
      
      if (finalIndex.partialFilterExpression?.jobId === null && finalIndex.unique === true) {
        console.log('\n✓ Migration completed successfully!');
        console.log('\nThe index now allows multiple applications from the same recruiter');
        console.log('to the same candidate for different jobs, while still preventing');
        console.log('duplicate general contacts (when jobId is null).');
      } else {
        console.error('\n✗ Migration verification failed - index configuration is incorrect');
        process.exit(1);
      }
    } else {
      console.error('\n✗ Could not find the new index after creation');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n✗ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

// Run the migration
migrateApplicationIndex();
