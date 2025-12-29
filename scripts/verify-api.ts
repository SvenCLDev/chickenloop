


const BASE_URL = 'http://localhost:3000';

// Helper to generate random string
const randomString = () => Math.random().toString(36).substring(7);

async function runVerification() {
  console.log('🚀 Starting Verification Process...');

  // 1. Register Recruiter
  const recruiterEmail = `recruiter_${randomString()}@test.com`;
  const recruiterPassword = 'password123';
  console.log(`\n1. Registering Recruiter (${recruiterEmail})...`);

  let res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: recruiterEmail,
      password: recruiterPassword,
      name: 'Test Recruiter',
      role: 'recruiter'
    })
  });

  if (!res.ok) {
    console.error('Failed to register recruiter:', await res.text());
    return;
  }
  console.log('✅ Recruiter registered');

  // Login Recruiter to get cookie
  console.log('\n2. Logging in Recruiter...');
  res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: recruiterEmail,
      password: recruiterPassword
    })
  });

  if (!res.ok) {
    console.error('Failed to login recruiter:', await res.text());
    return;
  }

  const recruiterCookie = res.headers.get('set-cookie');
  if (!recruiterCookie) {
    console.error('No cookie received for recruiter');
    return;
  }
  console.log('✅ Recruiter logged in');

  // 3. Create Company
  console.log('\n3. Creating Company...');
  res = await fetch(`${BASE_URL}/api/company`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': recruiterCookie
    },
    body: JSON.stringify({
      name: `Test Company ${randomString()}`,
      description: 'A test company',
      coordinates: { latitude: 40.7128, longitude: -74.0060 }, // NYC
      address: {
        city: 'New York',
        country: 'US'
      }
    })
  });

  if (!res.ok) {
    console.error('Failed to create company:', await res.text());
    return;
  }
  console.log('✅ Company created');

  // 4. Post Job
  console.log('\n4. Posting Job...');
  const jobTitle = `Test Job ${randomString()}`;
  res = await fetch(`${BASE_URL}/api/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': recruiterCookie
    },
    body: JSON.stringify({
      title: jobTitle,
      description: 'This is a test job description',
      location: 'New York, NY',
      country: 'US',
      type: 'full-time',
      salary: '$100k',
      languages: ['English'],
      qualifications: ['Instructor'],
      sports: ['Kitesurfing'],
      occupationalAreas: ['Teaching'],
      published: true
    })
  });

  if (!res.ok) {
    console.error('Failed to post job:', await res.text());
    return;
  }
  const jobData = await res.json();
  console.log('✅ Job posted:', jobData.job.title);

  // 5. Register Job Seeker
  const seekerEmail = `seeker_${randomString()}@test.com`;
  const seekerPassword = 'password123';
  console.log(`\n5. Registering Job Seeker (${seekerEmail})...`);

  res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: seekerEmail,
      password: seekerPassword,
      name: 'Test Seeker',
      role: 'job-seeker'
    })
  });

  if (!res.ok) {
    console.error('Failed to register seeker:', await res.text());
    return;
  }
  console.log('✅ Job Seeker registered');

  // Login Seeker
  console.log('\n6. Logging in Job Seeker...');
  res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: seekerEmail,
      password: seekerPassword
    })
  });

  if (!res.ok) {
    console.error('Failed to login seeker:', await res.text());
    return;
  }
  const seekerCookie = res.headers.get('set-cookie');
  console.log('✅ Job Seeker logged in');

  // 7. Create CV
  console.log('\n7. Creating CV...');
  res = await fetch(`${BASE_URL}/api/cv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': seekerCookie || ''
    },
    body: JSON.stringify({
      fullName: 'Test Seeker',
      email: seekerEmail,
      phone: '1234567890',
      summary: 'I am a test seeker',
      skills: ['Kitesurfing', 'Teaching']
    })
  });

  if (!res.ok) {
    console.error('Failed to create CV:', await res.text());
    return;
  }
  console.log('✅ CV created');

  // 8. Get Jobs and verify visibility
  console.log('\n8. Verifying Job Visibility...');
  res = await fetch(`${BASE_URL}/api/jobs`, {
    method: 'GET',
    headers: {
      'Cookie': seekerCookie || ''
    }
  });

  if (!res.ok) {
    console.error('Failed to get jobs:', await res.text());
    return;
  }
  const jobsData = await res.json();
  const foundJob = jobsData.jobs.find((j: { title: string }) => j.title === jobTitle);

  if (foundJob) {
    console.log('✅ Found posted job in listings!');
  } else {
    console.error('❌ Could not find posted job in listings');
    console.log('Available jobs:', jobsData.jobs.map((j: { title: string }) => j.title));
  }

  console.log('\n🎉 Verification Complete!');
}

runVerification().catch(console.error);
