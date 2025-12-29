/* eslint-disable @typescript-eslint/no-require-imports */
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://chickenloop3845_db_user:msLBG6d6lscrfQYf@cluster042369.iggtazi.mongodb.net/chickenloop?appName=Cluster042369';

const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String,
  name: String,
  createdAt: Date,
  updatedAt: Date,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function readUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const users = await User.find().select('-password').sort({ createdAt: -1 });

    console.log(`Found ${users.length} user(s):\n`);
    console.log('='.repeat(80));

    users.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log(`  ID: ${user._id}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Created: ${user.createdAt}`);
      console.log(`  Updated: ${user.updatedAt}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\nTotal: ${users.length} user(s)`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

readUsers();

