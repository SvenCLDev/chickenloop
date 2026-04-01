import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { authOptions } from '@/lib/nextAuth';

export default async function PostLoginPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!session || !email) {
    redirect('/login');
  }

  await connectDB();
  const user = await User.findOne({ email }).select('role').lean();
  const role = user?.role ?? null;

  if (!role) {
    redirect('/onboarding/role');
  }

  if (role === 'recruiter') {
    redirect('/recruiter');
  }

  // job-seeker (or admin fallback to admin)
  if (role === 'admin') {
    redirect('/admin');
  }

  redirect('/job-seeker');
}

