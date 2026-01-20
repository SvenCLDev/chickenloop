const fs = require('fs');
const path = require('path');

const envFilePath = path.join(__dirname, '..', '.env.local');

// Variables to set
const newVars = {
  RESEND_API_KEY: 're_Tr4zB7CP_KhT1mGDxpM6RQ4KLNxXx2BsM',
  RESEND_FROM_EMAIL: 'noreply@notifications.chickenloop.com',
  CONTACT_EMAIL: 'hello@chickenloop.com',
};

// Read existing .env.local if it exists
let existingContent = '';
let existingVars = {};

if (fs.existsSync(envFilePath)) {
  existingContent = fs.readFileSync(envFilePath, 'utf-8');
  
  // Parse existing variables
  existingContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('='); // Handle values with '=' in them
      existingVars[key.trim()] = value.trim();
    }
  });
}

// Merge: new vars override existing ones
const mergedVars = { ...existingVars, ...newVars };

// Build new .env.local content
const lines = [];

// Preserve comments and structure from existing file (if any important ones)
const commentLines = existingContent.split('\n').filter(line => {
  const trimmed = line.trim();
  return trimmed.startsWith('#') || trimmed === '';
});

// Add preserved comments first
if (commentLines.length > 0) {
  lines.push(...commentLines);
  lines.push(''); // Empty line after comments
}

// Add all variables
Object.entries(mergedVars).forEach(([key, value]) => {
  lines.push(`${key}=${value}`);
});

// Write the file
fs.writeFileSync(envFilePath, lines.join('\n') + '\n', 'utf-8');

console.log('✅ Updated .env.local with the following variables:');
Object.entries(newVars).forEach(([key]) => {
  console.log(`  - ${key}`);
});

console.log('\n📝 File location:', envFilePath);
console.log('\n⚠️  Remember to restart your dev server for changes to take effect!');
