export const money = (n) => `৳${Number(n || 0).toLocaleString('en-BD')}`;
export function isConfigured(url, key) {
  return (
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url || '') &&
    !!key &&
    key.length > 30 &&
    !/YOUR_|PLACEHOLDER/i.test(key)
  );
}
export function safeExternalUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' ? u.href : '';
  } catch {
    return '';
  }
}
export function ageFromDate(
  value,
  today = new Date(`${localDate()}T12:00:00`),
) {
  const dob = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return NaN;
  let a = today.getFullYear() - dob.getFullYear();
  if (
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
  )
    a--;
  return a;
}
export function validateRegistration(f) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email || ''))
    return 'Enter a valid email address.';
  if (!/^\+8801[3-9][0-9]{8}$/.test(f.phone || ''))
    return 'Use a Bangladesh mobile number, e.g. +8801712345678.';
  const age = ageFromDate(f.birth_date);
  if (!Number.isFinite(age) || age < 18 || age > 120)
    return 'You must be at least 18 years old, with a valid date of birth.';
  if (!f.terms_accepted || !f.adult_confirmed)
    return 'Accept the Terms and Privacy Policy and confirm you are 18+.';
  if ((f.password || '').length < 12)
    return 'Use a password with at least 12 characters.';
  if (!['male', 'female'].includes(f.gender))
    return 'Select a registration option.';
  return '';
}
export const interestsFromText = (s) =>
  [
    ...new Set(
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ].slice(0, 12);
export const localDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const completion = (p) =>
  !p
    ? 0
    : Math.round(
        ([
          'display_name',
          'district',
          'bio',
          'interests',
          'photo_path',
          'area',
        ].filter((k) => (Array.isArray(p[k]) ? p[k].length : !!p[k])).length /
          6) *
          100,
      );
export function rewardTotals(rows) {
  return rows.reduce(
    (a, r) => {
      a[r.status] = (a[r.status] || 0) + r.amount;
      return a;
    },
    { pending: 0, approved: 0, paid: 0, rejected: 0 },
  );
}
export function friendlyError(e) {
  const s = e?.message || String(e);
  if (/duplicate|unique constraint/i.test(s))
    return 'This email, mobile number, or payment reference is already registered or submitted.';
  if (/Database error saving new user/i.test(s))
    return 'Registration could not be saved. Check age, mobile number, referral code, and whether the email/mobile is already used. If it continues, contact support.';
  return s;
}
