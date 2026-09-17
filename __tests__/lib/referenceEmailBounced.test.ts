import { referenceEmailBouncedEmail } from '@/lib/email/templates/referenceEmailBounced';

describe('referenceEmailBouncedEmail', () => {
  it('asks the job seeker to enter a different manager email', () => {
    const email = referenceEmailBouncedEmail({
      jobSeekerName: 'Alex',
      schoolName: 'Ion Club',
      seasonLabel: 'Summer 2024',
      managerEmail: 'bad@example.com',
      profileUrl: 'https://chickenloop.com/job-seeker',
    });

    expect(email.subject).toContain('Ion Club');
    expect(email.text).toContain('bad@example.com');
    expect(email.text).toContain('different manager email');
    expect(email.html).toContain('https://chickenloop.com/job-seeker');
  });
});
