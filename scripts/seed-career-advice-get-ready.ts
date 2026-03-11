/**
 * One-off seed: Create the "Signed Your Contract? Here's How to Prepare for the Season" career advice article.
 * Run from chickenloop directory: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-career-advice-get-ready.ts
 * Ensure an admin user exists and place get-ready.jpg in public/ before running.
 */
import 'dotenv/config';
import './loadEnvLocal';
import connectDB from '../lib/db';
import User from '../models/User';
import CareerAdvice from '../models/CareerAdvice';

const TITLE = "Signed Your Contract? Here's How to Prepare for the Season";
const PICTURE = '/get-ready.jpg';

const CONTENT_HTML = `
<p>Congratulations on landing your contract for the season! Before you start packing, there are a few practical details to handle. Taking care of the "admin" now means you can focus on the water and your students once you arrive.</p>
<p>Here is a checklist to help you get ready for your job abroad.</p>

<h2>1. Visas and Legalities</h2>
<p>Double-check the visa requirements for your destination immediately. If you are working outside of your home country or economic zone, you'll likely need more than a standard tourist visa.</p>
<ul>
  <li><strong>The Pro Move:</strong> Ask your center manager for an official "Letter of Invitation" or a copy of your contract. Having these documents ready makes the immigration process much smoother.</li>
</ul>

<h2>2. Insurance: Don't Skip the Details</h2>
<p>Standard travel insurance rarely covers you while you are actually working as an instructor. If a line snaps or you have an accident during a lesson, you need specific professional liability and medical coverage.</p>
<ul>
  <li><strong>What to look for:</strong> Seek out providers like SafetyWing or World Nomads that specifically offer "Adventure Sports" or "Professional Instructor" add-ons. It's worth the extra few dollars for the peace of mind.</li>
</ul>

<h2>3. Banking and Managing Money</h2>
<p>Using your local home bank abroad is usually a recipe for high exchange fees and ATM charges.</p>
<ul>
  <li><strong>Digital/International Accounts:</strong> Sign up for a multi-currency account like Wise or Revolut. You can hold different currencies, get much better exchange rates, and manage everything from a mobile app.</li>
  <li><strong>Local Accounts:</strong> In most cases, you won't need a local bank account unless you are staying for more than six months or your employer specifically requires a local IBAN for your paycheck.</li>
</ul>

<h2>4. Staying Connected</h2>
<p>To avoid a massive roaming bill when you land, plan your phone situation in advance.</p>
<ul>
  <li><strong>eSIMs:</strong> If your phone supports them, apps like Airalo or Holafly allow you to buy a data plan before you even leave the airport.</li>
  <li><strong>Local SIMs:</strong> For a full summer, a local SIM card is usually the cheapest option. Just ensure your phone is "unlocked" and compatible with international carriers before you depart.</li>
</ul>

<h2>5. Sorting Your Accommodation</h2>
<p>Living situations vary wildly between centers.</p>
<ul>
  <li><strong>Research:</strong> If housing isn't provided, join local community Facebook groups for the town you'll be in. These are often much better for finding seasonal rentals than sites like Airbnb.</li>
  <li><strong>Expectations:</strong> Staff housing is a big part of the experience. It's a great way to meet the rest of the team, but bringing a pair of noise-canceling headphones or earplugs is never a bad idea.</li>
</ul>

<h2>6. Packing: Prioritize the Essentials</h2>
<p>You don't need as much as you think, but the items you do bring should be high quality.</p>
<ul>
  <li><strong>Sun Protection:</strong> Invest in two pairs of high-quality polarized sunglasses (and a floating strap), a durable rash guard, and plenty of reef-safe sunscreen.</li>
  <li><strong>The "Save the Day" Kit:</strong> Pack a small medical kit with antiseptic and waterproof bandages. Also, bring a few spare gear parts—fins, screws, or a specific tool for your setup—as these can be surprisingly hard to find in remote spots.</li>
</ul>

<h2>7. Final Practical Prep</h2>
<ul>
  <li><strong>Refresh Your Theory:</strong> If it's been a few months since you last taught, spend an evening reviewing your IKO, VDWS, or RYA syllabus. Being sharp on the terminology makes your first few days on the job much more relaxed.</li>
  <li><strong>Manage Your Energy:</strong> Season life is rewarding but tiring. The first two weeks are usually the hardest as you adjust to the heat and the schedule. Stay hydrated and take the time to settle in.</li>
</ul>

<p>Safe travels, and have a great season!</p>
`.trim();

async function main() {
  await connectDB();

  const admin = await User.findOne({ role: 'admin' }).lean();
  if (!admin) {
    console.error('No admin user found. Create an admin first.');
    process.exit(1);
  }

  const existing = await CareerAdvice.findOne({ title: TITLE }).lean();
  if (existing) {
    console.log('Article already exists:', existing._id);
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
