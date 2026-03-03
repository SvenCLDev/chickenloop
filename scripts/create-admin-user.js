/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load .env.local so we use the same DB as the local app
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  // ignore
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://chickenloop3845_db_user:msLBG6d6lscrfQYf@cluster042369.iggtazi.mongodb.net/chickenloop?appName=Cluster042369';

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
    const password = 'Chicken!234';
    const role = 'admin';

    console.log('\n📝 User Details:');
    console.log(`   Name: ${name}`);
    console.log(`   Email: ${email}`);
    console.log(`   Role: ${role}`);
    const isLocal = MONGODB_URI.includes('localhost') || MONGODB_URI.includes('127.0.0.1');
    console.log('\nConnecting to MongoDB' + (isLocal ? ' (local)' : ' (Atlas)') + '...');

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected successfully!\n');

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    let user;

    if (existingUser) {
      console.log('📧 User already exists; updating password and details...');
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await User.findByIdAndUpdate(
        existingUser._id,
        { name, role, password: hashedPassword },
        { new: true }
      );
      console.log('✅ User updated successfully!\n');
    } else {
      // Hash the password
      console.log('🔒 Hashing password...');
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('✅ Password hashed successfully!\n');

      // Create the user
      console.log('👤 Creating user...');
      user = await User.create({
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role,
      });

      console.log('✅ User created successfully!\n');
    }
    console.log('='.repeat(80));
    console.log('\n📊 User:');
    console.log(`   ID: ${user._id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Admin user "Rooster" is ready.');
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


