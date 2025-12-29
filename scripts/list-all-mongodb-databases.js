/* eslint-disable @typescript-eslint/no-require-imports */
const mongoose = require('mongoose');

// Base connection string (without database name)
const BASE_URI = 'mongodb+srv://chickenloop3845_db_user:msLBG6d6lscrfQYf@cluster042369.iggtazi.mongodb.net';

async function listAllDatabases() {
  try {
    console.log('🔍 Connecting to MongoDB Atlas cluster...\n');

    // Connect to admin database to list all databases
    const adminUri = `${BASE_URI}/admin?appName=Cluster042369`;
    const conn = await mongoose.createConnection(adminUri).asPromise();

    // Use adminCommand to list databases
    const admin = conn.db.admin();
    const { databases } = await admin.listDatabases();

    console.log('📊 Found databases on this cluster:\n');
    console.log('='.repeat(80));

    const schemas = {
      User: new mongoose.Schema({ email: String, name: String, role: String }, { timestamps: true }),
      Job: new mongoose.Schema({ title: String, company: String }, { timestamps: true }),
      Company: new mongoose.Schema({ name: String, description: String }, { timestamps: true }),
    };

    for (const dbInfo of databases) {
      const dbName = dbInfo.name;

      // Skip system databases
      if (['admin', 'local', 'config'].includes(dbName)) {
        continue;
      }

      console.log(`\n📁 Database: ${dbName}`);
      console.log(`   Size: ${(dbInfo.sizeOnDisk / 1024 / 1024).toFixed(2)} MB`);

      try {
        // Try to connect to this database
        const dbUri = `${BASE_URI}/${dbName}?appName=Cluster042369`;
        const dbConn = await mongoose.createConnection(dbUri).asPromise();

        const User = dbConn.model('User', schemas.User);
        const Job = dbConn.model('Job', schemas.Job);
        const Company = dbConn.model('Company', schemas.Company);

        const users = await User.countDocuments();
        const jobs = await Job.countDocuments();
        const companies = await Company.countDocuments();

        console.log(`   👥 Users: ${users}`);
        console.log(`   💼 Jobs: ${jobs}`);
        console.log(`   🏢 Companies: ${companies}`);

        if (jobs > 0 || companies > 0) {
          console.log(`   ⭐ THIS DATABASE HAS JOBS/COMPANIES!`);
        }

        await dbConn.close();
      } catch (err) {
        console.log(`   ⚠️  Could not access: ${err.message}`);
      }
    }

    await conn.close();

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Scan complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Alternative: Check MongoDB Atlas dashboard directly');
    console.log('   https://cloud.mongodb.com/');
    process.exit(1);
  }
}

listAllDatabases();


