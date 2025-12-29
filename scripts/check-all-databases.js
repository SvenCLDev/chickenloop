/* eslint-disable @typescript-eslint/no-require-imports */
const mongoose = require('mongoose');

// Connection strings to test
const CONNECTION_STRINGS = [
  {
    name: 'Expected (from scripts)',
    uri: 'mongodb+srv://chickenloop3845_db_user:msLBG6d6lscrfQYf@cluster042369.iggtazi.mongodb.net/chickenloop?appName=Cluster042369',
  },
  {
    name: 'Alternative (different database name)',
    uri: 'mongodb+srv://chickenloop3845_db_user:msLBG6d6lscrfQYf@cluster042369.iggtazi.mongodb.net/chickenloop-dev?appName=Cluster042369',
  },
  {
    name: 'Alternative (without appName)',
    uri: 'mongodb+srv://chickenloop3845_db_user:msLBG6d6lscrfQYf@cluster042369.iggtazi.mongodb.net/chickenloop',
  },
];

const schemas = {
  User: new mongoose.Schema({
    email: String,
    password: String,
    role: String,
    name: String,
  }, { timestamps: true }),

  Job: new mongoose.Schema({
    title: String,
    description: String,
    company: String,
    location: String,
    salary: String,
    type: String,
    recruiter: mongoose.Schema.Types.ObjectId,
  }, { timestamps: true }),

  Company: new mongoose.Schema({
    name: String,
    description: String,
    address: Object,
    coordinates: Object,
    website: String,
    owner: mongoose.Schema.Types.ObjectId,
  }, { timestamps: true }),
};

async function checkDatabase(connectionString, name) {
  try {
    // Create fresh connection
    const conn = await mongoose.createConnection(connectionString).asPromise();

    const User = conn.model('User', schemas.User);
    const Job = conn.model('Job', schemas.Job);
    const Company = conn.model('Company', schemas.Company);

    const users = await User.find().select('-password').limit(5);
    const jobs = await Job.find().limit(5);
    const companies = await Company.find().limit(5);

    await conn.close();

    return {
      name,
      uri: connectionString.replace(/:[^:@]+@/, ':****@'), // Hide password
      users: users.length,
      jobs: jobs.length,
      companies: companies.length,
      success: true,
    };
  } catch (error) {
    return {
      name,
      uri: connectionString.replace(/:[^:@]+@/, ':****@'),
      error: error.message,
      success: false,
    };
  }
}

async function checkAllDatabases() {
  console.log('🔍 Checking all possible database connections...\n');
  console.log('='.repeat(80));

  const results = [];

  for (const conn of CONNECTION_STRINGS) {
    console.log(`\nChecking: ${conn.name}...`);
    const result = await checkDatabase(conn.uri, conn.name);
    results.push(result);

    if (result.success) {
      console.log(`  ✅ Connected!`);
      console.log(`  - Users: ${result.users}`);
      console.log(`  - Jobs: ${result.jobs}`);
      console.log(`  - Companies: ${result.companies}`);
    } else {
      console.log(`  ❌ Failed: ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY:\n');

  results.forEach((result) => {
    if (result.success) {
      console.log(`✅ ${result.name}`);
      console.log(`   URI: ${result.uri}`);
      console.log(`   Users: ${result.users} | Jobs: ${result.jobs} | Companies: ${result.companies}`);
      console.log('');
    }
  });

  // Find database with most data
  const withData = results.filter(r => r.success && (r.jobs > 0 || r.companies > 0));

  if (withData.length > 0) {
    const bestMatch = withData.reduce((a, b) =>
      (a.jobs + a.companies) > (b.jobs + b.companies) ? a : b
    );

    console.log('🎯 Database with jobs/companies:');
    console.log(`   ${bestMatch.name}`);
    console.log(`   URI: ${bestMatch.uri}`);
    console.log(`   Jobs: ${bestMatch.jobs} | Companies: ${bestMatch.companies}`);
    console.log('\n💡 This is likely the database your dev server is using!');
  } else {
    console.log('⚠️  No databases found with jobs or companies.');
    console.log('   All checked databases only have users.');
  }
}

checkAllDatabases()
  .then(() => {
    console.log('\n✅ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });


