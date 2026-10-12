# Security and privacy operations

## Trust boundaries

The browser is untrusted. Clients cannot grant roles, change approval/payment/reward statuses, change snapshotted fee values, insert referral rewards, or assign themselves an admin role. PostgreSQL grants and RLS enforce this in addition to UI route guards. Every sensitive admin RPC checks `public.is_admin()`; functions use a fixed empty search path and fully qualified relations. Internal helper execution is revoked from clients. Moderation notes live in the admin-only audit log, not users’ private profile rows.

`public.profiles` includes private name/email/phone/birth date. `public.public_profiles` is a separate public-safe projection, populated only by approval/consent/payment conditions. Never replace discovery with `profiles.select('*')`. A separate projection prevents column disclosure that ordinary RLS would not prevent. Directly listed public profiles are intentionally available to visitors; the discovery RPC requires approved adult membership and verified required payment.

## Signup and abuse

- Auth trigger validates 18+ date of birth, adult/terms acceptance, allowed gender, valid Bangladesh phone, unique email/phone, and referral code.
- Keep email confirmation enabled. Database profile approval also checks confirmed email.
- Date-of-birth validation is not proof of identity. Manual review cannot eliminate impersonation; age assurance and appeals need operational planning.
- Secure SQL bootstrap is the only initial admin assignment path. Use strong administrator passwords, limited accounts, Supabase account MFA, and frequent audit review. In-app step-up/MFA is a future hardening task.
- Configure Auth provider rate limits and production email delivery. The per-user database hourly counters supplement—not replace—Auth throttling. Automated account creation using different contact details still needs manual detection and a CAPTCHA/phone-verification extension before an open public launch.
- To add Turnstile/hCaptcha, configure it in Supabase Auth, render the approved widget, supply `captchaToken` to signup/login/reset where appropriate, rotate token per attempt, test expiry/retries, and permit only exact widget hosts in CSP. It is **not** enabled in this package without your site key/provider configuration.
- No NID data is requested or stored. Never add NID photos to the public photo bucket.

## Referrals and finances

One referral per referred account, one reward per referral, unique normalized method/reference, one pending reference per account, and immutable paid transitions prevent repeat claims. The account fee and referral amount are snapshotted at registration. Administrators must independently verify provider records and perform/document fraud checks. A checkbox and unique contact constraints are not a substitute for identity/abuse investigation.

No payout or refund API is implemented: admins record **already completed** real-world financial actions. Reconcile paid rewards associated with later refunds or deletion under your published policy. Keep evidence in restricted operator records with retention deadlines. Do not place payment secrets into `site_settings`—it is publicly readable.

## Photos

Private Supabase bucket, 5 MB/type limits, owner upload paths, approved-public/owner/admin reads, short-lived signed URLs (900 seconds). Frontend re-encoding removes normal EXIF/GPS metadata; treat uploaded bytes as untrusted because a malicious client can bypass the frontend. Review/scan images before approving. Signed URLs already issued cannot be recalled immediately; disclose this short expiry window. Remove orphaned files regularly. Only the default logo or approved Supabase image-hosted custom logo is permitted by default CSP.

## Deletion runbook

1. A user requests deletion; listing is hidden immediately, active invitations cancelled, unpaid related rewards rejected.
2. Admin sees a private deletion queue. Authenticate the request and determine any lawful financial/dispute retention. Communicate the real retention schedule; do not invent a fixed legal window.
3. If retaining financial evidence is required, export only necessary fields to restricted storage with a specific deletion deadline. App rows cascade away after Auth deletion.
4. In Supabase Storage, remove all files under that account UUID prefix, including orphaned prior uploads. Do this **before** deleting its Auth user.
5. In Supabase Auth, delete the user securely. The trigger marks the deletion request completed; FK actions remove private profile/payment/invitation/report links as configured. Requests and audit rows become minimally identifying/anonymized where FKs use SET NULL.
6. Review backups, support inbox copies, fraud case files and exports according to the final retention policy. Handle shared records without disclosing another person’s data.

Never expose a service-role key to implement a deletion button. If later automating deletion, use a tightly scoped server-only function with verified role/request, audit trail and storage cleanup.

## Maintenance

- Run `npm audit` and update dependencies deliberately; re-run tests and review advisories. Keep the lockfile.
- Owner-only periodic cleanup: `delete from public.rate_limits where bucket < now() - interval '7 days';` It is operational data, not a fraud ledger. Optional scheduling via your provider is not included.
- Review support/report queues daily during launch; this software does not replace moderation staffing.
- Protect owner/admin accounts, backups and production env configuration. Rotate secrets on incidents, suspend accounts, and review Auth sessions and logs.
- Test the real Supabase project grants/RLS after any migration, not only local mocks.
- Policy versioning, in-app admin MFA, webhook processing, machine fraud scoring, phone OTP and server image scanning are sensible later extensions, not promised functionality.
