import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ageFromDate,
  validateRegistration,
  rewardTotals,
  isConfigured,
  safeExternalUrl,
  completion,
} from '../src/utils.js';
test('age uses the birthday, not only the birth year', () => {
  const now = new Date(2026, 9, 5);
  assert.equal(ageFromDate('2008-10-05', now), 18);
  assert.equal(ageFromDate('2008-10-06', now), 17);
  assert.ok(Number.isNaN(ageFromDate('invalid', now)));
});
test('registration rejects minors, invalid phones, and missing consent', () => {
  const f = {
    email: 'person@example.com',
    phone: '+8801712345678',
    birth_date: '1998-04-20',
    password: 'long-private-password',
    terms_accepted: true,
    adult_confirmed: true,
    gender: 'male',
  };
  assert.equal(validateRegistration(f), '');
  assert.match(validateRegistration({ ...f, birth_date: '2020-01-01' }), /18/);
  assert.match(
    validateRegistration({ ...f, phone: '01712345678' }),
    /Bangladesh/,
  );
  assert.match(validateRegistration({ ...f, terms_accepted: false }), /Terms/);
  assert.match(validateRegistration({ ...f, email: 'broken' }), /email/);
});
test('financial totals preserve separate statuses', () => {
  assert.deepEqual(
    rewardTotals([
      { status: 'pending', amount: 200 },
      { status: 'paid', amount: 200 },
      { status: 'approved', amount: 350 },
    ]),
    { pending: 200, approved: 350, paid: 200, rejected: 0 },
  );
});
test('missing credentials never activate a fake backend', () => {
  assert.equal(
    isConfigured('https://YOUR_PROJECT.supabase.co', 'YOUR_KEY'),
    false,
  );
  assert.equal(isConfigured('', ''), false);
  assert.equal(isConfigured('https://abc.supabase.co', 'x'.repeat(40)), true);
  assert.equal(safeExternalUrl('javascript:alert(1)'), '');
  assert.equal(
    safeExternalUrl('https://forms.gle/example'),
    'https://forms.gle/example',
  );
});
test('optional photo is included in completion, not forced at signup', () => {
  assert.equal(completion(null), 0);
  assert.equal(
    completion({
      display_name: 'A',
      district: 'Dhaka',
      bio: 'Hello',
      interests: ['Books'],
      area: 'Uttara',
    }),
    83,
  );
});
