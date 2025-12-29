/* eslint-disable @typescript-eslint/no-require-imports */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://chickenloop3845_db_user:msLBG6d6lscrfQYf@cluster042369.iggtazi.mongodb.net/chickenloop?appName=Cluster042369';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['recruiter', 'job-seeker', 'admin'],
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function createAdminUser() {
  try {
    console.log('🔐 Creating Admin User...\n');
    console.log('='.repeat(80));

    const name = 'Rooster';
    const email = 'rooster@chickenloop.com';
    const password = 'Chicken!123';
    const role = 'admin';

    console.log('\n📝 User Details:');
    console.log(`   Name: ${name}`);
    console.log(`   Email: ${email}`);
    console.log(`   Role: ${role}`);
    console.log('\nConnecting to MongoDB...');

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected successfully!\n');

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      console.log('❌ User already exists with this email!');
      console.log(`   Existing user: ${existingUser.name} (${existingUser.email})`);
      console.log(`   Role: ${existingUser.role}`);
      await mongoose.disconnect();
      process.exit(1);
    }

    // Hash the password
    console.log('🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed successfully!\n');

    // Create the user
    console.log('👤 Creating user...');
    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
    });

    console.log('✅ User created successfully!\n');
    console.log('='.repeat(80));
    console.log('\n📊 User Created:');
    console.log(`   ID: ${user._id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Admin user "Rooster" has been created successfully!');
    console.log('\n💡 You can now login with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.log('\n💡 This email is already in use. User may already exist.');
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdminUser();


