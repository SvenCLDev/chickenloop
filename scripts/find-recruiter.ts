import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

// Parse .env.local manually
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            content.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
                    process.env[key] = value;
                }
            });
        }
    } catch {
        console.warn('⚠️ Could not load .env.local');
    }
}

loadEnv();

async function findOrCreateRecruiter() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI not found');
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB');

        if (!mongoose.connection.db) {
            throw new Error('❌ Database connection failed');
        }
        const User = mongoose.connection.db.collection('users');

        // Find existing recruiter
        const recruiter = await User.findOne({ role: 'recruiter' }) as { email: string } | null;

        if (recruiter) {
            console.log('\nFOUND_RECRUITER_EMAIL=' + recruiter.email);
            // We don't know the password, so we might need to reset it or create a new user
            // But let's see if we find one first
        } else {
            console.log('No recruiter found. Creating one...');
            const hashedPassword = await bcrypt.hash('password123', 10);
            const newUser = {
                email: 'auto-recruiter@test.com',
                password: hashedPassword,
                name: 'Auto Recruiter',
                role: 'recruiter',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            try {
                await User.insertOne(newUser);
                console.log('\nCREATED_RECRUITER_EMAIL=auto-recruiter@test.com');
                console.log('PASSWORD=password123');
            } catch (e) {
                const err = e as { code?: number };
                if (err.code === 11000) {
                    // Collided, try to find it
                    console.log('\nFOUND_RECRUITER_EMAIL=auto-recruiter@test.com');
                    console.log('PASSWORD=password123 (assumed)');
                } else {
                    throw e;
                }
            }
        }

        // Also check for company
        if (recruiter || process.env.CREATED_RECRUITER_EMAIL) {
            const email = recruiter ? recruiter.email : 'auto-recruiter@test.com';
            const user = await User.findOne({ email }) as { _id: mongoose.Types.ObjectId } | null;
            if (user) {
                const Company = mongoose.connection.db.collection('companies');
                const company = await Company.findOne({ owner: user._id });
                if (company) {
                    console.log('HAS_COMPANY=true');
                } else {
                    console.log('HAS_COMPANY=false');
                }
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

findOrCreateRecruiter();
