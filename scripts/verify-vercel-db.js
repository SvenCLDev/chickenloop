/* eslint-disable @typescript-eslint/no-require-imports */
const mongoose = require('mongoose');

// Expected connection string
const EXPECTED_URI = 'mongodb+srv://chickenloop3845_db_user:msLBG6d6lscrfQYf@cluster042369.iggtazi.mongodb.net/chickenloop?appName=Cluster042369';

const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String,
  name: String,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying Database Connection...\n');
    console.log('Expected URI:');
    console.log(EXPECTED_URI.replace(/:[^:@]+@/, ':****@')); // Hide password
    console.log('\n' + '='.repeat(80));

    console.log('\nConnecting to MongoDB...');
    await mongoose.connect(EXPECTED_URI);
    console.log('✅ Connected successfully!\n');

    // Check users
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    console.log(`📊 Found ${users.length} user(s) in database:\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('\n✅ Verification Summary:');
    console.log(`   - Database: chickenloop`);
    console.log(`   - Cluster: cluster042369.iggtazi.mongodb.net`);
    console.log(`   - Users found: ${users.length}`);
    console.log('\n💡 To verify Vercel is using the same database:');
    console.log('   1. Visit https://cl1-ashen.vercel.app/login');
    console.log(`   2. Try logging in with one of the emails above`);
    console.log('   3. If login works, Vercel is connected to the same database ✅');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyDatabase();


