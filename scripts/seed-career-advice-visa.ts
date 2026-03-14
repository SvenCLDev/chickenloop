/**
 * One-off seed: Create the "Working Abroad: A Guide to Visas and Work Permits for Watersports Instructors" career advice article.
 * Run from chickenloop directory: npx tsx scripts/seed-career-advice-visa.ts
 * Ensure an admin user exists and place visa.jpg in public/ before running.
 */
import 'dotenv/config';
import './loadEnvLocal';
import connectDB from '../lib/db';
import User from '../models/User';
import CareerAdvice from '../models/CareerAdvice';

const TITLE = 'Working Abroad: A Guide to Visas and Work Permits for Watersports Instructors';
const PICTURE = '/visa.jpg';

const CONTENT_HTML = `
<p>Working as a watersports instructor is one of the few careers that allows you to "follow the wind" across borders. However, the legal side of moving between seasons can be a maze of bureaucracy.</p>
<p>While your employer should always be your primary source of truth, here is a clear summary of the most common visa pathways and work permits for international instructors.</p>

<h2>1. The "Home Turf" Advantage</h2>
<p>The easiest way to work abroad is to stay within your own economic or political zone.</p>
<p><strong>EU/EEA Citizens:</strong> You have the "Right to Work" in any EU country (plus Norway, Iceland, and Switzerland). No visa or permit is required. If you are a French kiter wanting to work in Tarifa or a German sailor heading to Greece, you just show up and register with the local town hall.</p>
<p><strong>The Commonwealth (Youth Mobility):</strong> Citizens of countries like Australia, New Zealand, and Canada often have reciprocal agreements with the UK and each other for "Working Holiday Visas" (WHV).</p>

<h2>2. Working Holiday Visas (WHV)</h2>
<p>This is the "Golden Ticket" for instructors under 30 or 35. It allows you to enter a country for 12–24 months and work for any employer.</p>
<ul>
  <li><strong>Top Destinations:</strong> Australia, New Zealand, Canada, and Japan.</li>
  <li><strong>Who can get it:</strong> Usually citizens of countries that have a reciprocal treaty. For example, a British instructor can easily get a WHV for Australia to teach in Perth or Exmouth.</li>
  <li><strong>Constraint:</strong> You usually only get one in your lifetime per country, and there is an age cap (often 30, sometimes extended to 35).</li>
</ul>

<h2>3. Employer-Sponsored Work Permits</h2>
<p>If you are over the age limit for a WHV or want to work in a country like the USA, Egypt, or Mauritius, you generally need a Sponsor.</p>
<p><strong>The Process:</strong> You apply for the job on a board like Chickenloop. Once hired, the center applies for a work permit on your behalf.</p>
<ul>
  <li><strong>USA (J-1 or H-2B):</strong> Most instructors in the US are on a J-1 Trainee/Intern visa or an H-2B Temporary Non-Agricultural Worker visa. These are strictly tied to one employer.</li>
  <li><strong>Egypt/Turkey/Cape Verde:</strong> Most centers in these hubs will handle the "Work Permit" locally once you arrive on a business entry visa. You cannot usually do this on your own; the school must prove they need your specific language skills or qualifications.</li>
</ul>

<h2>4. Digital Nomad Visas (The "Grey Area")</h2>
<p>A new trend in 2026 is the Digital Nomad Visa (offered by Portugal, Brazil, Greece, etc.).</p>
<p><strong>The Catch:</strong> These visas are designed for people working for foreign companies.</p>
<p><strong>Instructor Use Case:</strong> You generally cannot use a Nomad Visa to work for a local surf school in that country. However, if you are a "Pro Coach" running your own international clinics and getting paid by clients in your home country, this can be a legal way to stay in a windy destination for 12 months.</p>

<table class="w-full border-collapse border border-gray-300 my-6">
  <thead>
    <tr class="bg-gray-100">
      <th class="border border-gray-300 px-4 py-2 text-left font-semibold">Destination</th>
      <th class="border border-gray-300 px-4 py-2 text-left font-semibold">Ease of Access</th>
      <th class="border border-gray-300 px-4 py-2 text-left font-semibold">Most Common Visa</th>
      <th class="border border-gray-300 px-4 py-2 text-left font-semibold">Typical Duration</th>
    </tr>
  </thead>
  <tbody>
    <tr><td class="border border-gray-300 px-4 py-2">European Union</td><td class="border border-gray-300 px-4 py-2">Easy (for EU/EEA)</td><td class="border border-gray-300 px-4 py-2">None / Freedom of Movement</td><td class="border border-gray-300 px-4 py-2">Indefinite</td></tr>
    <tr class="bg-gray-50"><td class="border border-gray-300 px-4 py-2">Australia</td><td class="border border-gray-300 px-4 py-2">Medium</td><td class="border border-gray-300 px-4 py-2">Working Holiday (Subclass 417/462)</td><td class="border border-gray-300 px-4 py-2">1–3 Years</td></tr>
    <tr><td class="border border-gray-300 px-4 py-2">USA</td><td class="border border-gray-300 px-4 py-2">Hard</td><td class="border border-gray-300 px-4 py-2">J-1 (Exchange) or H-2B</td><td class="border border-gray-300 px-4 py-2">4–10 Months</td></tr>
    <tr class="bg-gray-50"><td class="border border-gray-300 px-4 py-2">Egypt / Morocco</td><td class="border border-gray-300 px-4 py-2">Medium</td><td class="border border-gray-300 px-4 py-2">Sponsored Work Permit</td><td class="border border-gray-300 px-4 py-2">Season-based</td></tr>
    <tr><td class="border border-gray-300 px-4 py-2">Brazil</td><td class="border border-gray-300 px-4 py-2">Medium</td><td class="border border-gray-300 px-4 py-2">VITEM V (Work Visa)</td><td class="border border-gray-300 px-4 py-2">1–2 Years</td></tr>
  </tbody>
</table>

<h2>Three Things to Check Before You Travel</h2>
<p><strong>Passport Validity:</strong> Most countries require your passport to be valid for at least 6 months beyond your intended stay.</p>
<p><strong>Degree/Qualification Requirements:</strong> Some work permits (like in the UAE or parts of Asia) require your instructor certificate (IKO/RYA) to be "Apostilled" or legally notarized.</p>
<p><strong>The "Lurking" Tourist Visa:</strong> Never work on a pure tourist visa in a country with strict labor laws. If you get injured, your insurance will be void, and you risk a multi-year ban from the country.</p>
`.trim();

async function main() {
  await connectDB();

  const admin = await User.findOne({ role: 'admin' }).lean();
  if (!admin) {
    console.error('No admin user found. Create an admin first.');
    process.exit(1);
  }

  const existing = await CareerAdvice.findOne({ title: TITLE });
  if (existing) {
    existing.content = CONTENT_HTML;
    await existing.save();
    console.log('Updated existing article with table:', existing._id.toString());
    console.log('View at: /career-advice/' + existing._id.toString());
    process.exit(0);
  }

  const article = await CareerAdvice.create({
    title: TITLE,
    picture: PICTURE,
    content: CONTENT_HTML,
    author: admin._id,
    published: true,
  });

  console.log('Created career advice article:', article._id.toString());
  console.log('View at: /career-advice/' + article._id.toString());
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
