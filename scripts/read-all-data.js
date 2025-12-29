/* eslint-disable @typescript-eslint/no-require-imports */
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://chickenloop3845_db_user:msLBG6d6lscrfQYf@cluster042369.iggtazi.mongodb.net/chickenloop?appName=Cluster042369';

const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String,
  name: String,
}, { timestamps: true });

const JobSchema = new mongoose.Schema({
  title: String,
  description: String,
  company: String,
  location: String,
  salary: String,
  type: String,
  recruiter: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const CVSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  phone: String,
  address: String,
  summary: String,
  experience: Array,
  education: Array,
  skills: Array,
  certifications: Array,
  jobSeeker: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Job = mongoose.model('Job', JobSchema);
const CV = mongoose.model('CV', CVSchema);

async function readAllData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const users = await User.find().select('-password').sort({ createdAt: -1 });
    const jobs = await Job.find().populate('recruiter', 'name email').sort({ createdAt: -1 });
    const cvs = await CV.find().populate('jobSeeker', 'name email').sort({ createdAt: -1 });

    console.log('='.repeat(80));
    console.log('DATABASE SUMMARY');
    console.log('='.repeat(80));
    console.log(`\nUsers: ${users.length}`);
    console.log(`Jobs: ${jobs.length}`);
    console.log(`CVs: ${cvs.length}`);

    if (users.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('USERS:');
      console.log('='.repeat(80));
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.name} (${user.email})`);
        console.log(`   Role: ${user.role}`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Created: ${user.createdAt}`);
      });
    }

    if (jobs.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('JOBS:');
      console.log('='.repeat(80));
      jobs.forEach((job, index) => {
        console.log(`\n${index + 1}. ${job.title} at ${job.company}`);
        console.log(`   Location: ${job.location}`);
        console.log(`   Type: ${job.type}`);
        if (job.salary) console.log(`   Salary: ${job.salary}`);
        console.log(`   Posted by: ${job.recruiter?.name || 'Unknown'} (${job.recruiter?.email || 'Unknown'})`);
        console.log(`   ID: ${job._id}`);
        console.log(`   Created: ${job.createdAt}`);
      });
    }

    if (cvs.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('CVs:');
      console.log('='.repeat(80));
      cvs.forEach((cv, index) => {
        console.log(`\n${index + 1}. ${cv.fullName} (${cv.email})`);
        console.log(`   Job Seeker: ${cv.jobSeeker?.name || 'Unknown'} (${cv.jobSeeker?.email || 'Unknown'})`);
        console.log(`   Skills: ${cv.skills?.length || 0}`);
        console.log(`   Experience: ${cv.experience?.length || 0} entries`);
        console.log(`   Education: ${cv.education?.length || 0} entries`);
        console.log(`   ID: ${cv._id}`);
        console.log(`   Created: ${cv.createdAt}`);
      });
    }

    console.log('\n' + '='.repeat(80));

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

readAllData();

