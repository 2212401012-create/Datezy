# Verification and pre-launch checklist

## Verified locally in this delivery

- `npm run build`: production Vite compilation.
- `npm test`: input/date-of-birth validation, safe configuration detection, monetary status totals, and a PostgreSQL/PGlite integration test of the shipped migration.
- PostgreSQL tests exercise server-side minor rejection, duplicate phone rejection, private-row RLS, forbidden role/status/payment/reward writes, admin-only helpers/notes, required-payment/profile separation, pending reference status, fraud-review gating, paid reward idempotency, sanitized public projections, referral identity privacy, reciprocal blocks, date consent/withdrawal, approval invalidation after profile edits, refunds/unlisting, deletion completion and RLS enabled on every application table.
- Local Chromium UI checks cover the requested routes at desktop (1440 px) and phone (390 px), mobile menu, connected account pages/admin modules with isolated **HTTP test fixtures**, signup age errors/confirmation metadata, nonadmin access denial and pending-only payment references. Fixture accounts are QA-only; no fake users are in the production app.
- Layouts have visible focus and reduced-motion support; no automated audit constitutes full accessibility certification.

**Not tested without your configuration:** real Supabase Auth delivery and redirects, SMTP/phone ownership, real hosted Storage processing, your live project’s permission configuration, actual merchant verification, transfer/refund/payout execution, Vercel deployment, legal clearance and production abuse handling. Run the checklist below against your own staging environment before launch.

## Hosted end-to-end checklist

### Setup & privacy

- [ ] New project migration finishes without errors; all tables show RLS enabled.
- [ ] Only browser-safe project URL/key appears in the production bundle; no passwords, service-role key, real identity documents or hardcoded merchant credentials.
- [ ] Official business identity, monitored support channel, final legal terms, privacy/retention policy, community/referral/refund/cancellation rules published.
- [ ] Provider approval and official account instructions documented before collecting money.
- [ ] CAPTCHA/anti-bot and Auth rate-limit launch plan configured/tested; signup phone ownership checks planned or implemented as required by your risk assessment.

### Accounts

- [ ] Men and women can register with the same required fields and clear fee information.
- [ ] Under-18 DOB fails both form and direct Auth/signup API attempt.
- [ ] Missing terms/adult confirmation, invalid phone/email, invalid referral code and duplicate email/phone cannot create a usable duplicate account.
- [ ] Email confirmation link returns to correct domain; account remains pending; login and logout work.
- [ ] Existing-account/signup error avoids exposing another person’s email ownership.
- [ ] Forgotten-password email, recovery session and password update work; minimum 12 enforced in Auth settings.
- [ ] Public detail edits return approved profile to review; private protected columns cannot be changed via API.
- [ ] Optional JPEG/PNG/WebP photo, 5 MB cap and owner-only path restrictions work; inspect metadata after frontend processing; review media before approval.

### Payments

- [ ] New account stores the correct snapshotted fee; settings changes affect future accounts, not historic ones.
- [ ] No enabled method / incomplete policies prevent accepting a reference; no invented success UI.
- [ ] Valid reference submission creates Pending Verification, not Verified.
- [ ] Duplicate normalized reference and a second pending submission are rejected.
- [ ] A user cannot modify status/amount/method/reference directly.
- [ ] Admin independently checks provider evidence, verifies/rejects, and audit entry appears.
- [ ] Profile approval remains separate and blocked without payment, email confirmation, consent and eligibility.
- [ ] Real refund processed outside app, then recorded with amount/reference; account unlists and unpaid rewards invalidate. Reconcile paid rewards separately.

### Referrals

- [ ] Unique share code/link is copied; `/register?ref=CODE` saves the immutable relationship on registration.
- [ ] Referral code cannot be changed post-registration; self/duplicate relationships and duplicate rewards cannot be created by the client.
- [ ] Referrer sees anonymous history/totals, not a friend’s private identity or payment data.
- [ ] An ineligible, unapproved or unpaid account cannot generate an approved reward.
- [ ] Documented manual fraud check is mandatory; unique contact/age checks are not described as identity verification.
- [ ] Reward amounts use registration-time snapshot; fee-disabled cases still require profile/fraud approval.
- [ ] Only admin can approve/reject; record Paid only after real transfer with reference; second payout transition fails.

### Discovery, consent and safety

- [ ] Public projections omit private phone/email/DOB/payment/referral payout/internal notes.
- [ ] No unapproved, unpaid-if-required, unconsented, suspended or deleting profile appears.
- [ ] Discovery filters gender/age/district/interest/duration and pages correctly.
- [ ] Only approved adults can propose invitations; dates are future/within a year and places public.
- [ ] Recipient can accept/decline and either participant can withdraw. No forced acceptance or payment-based consent.
- [ ] Reciprocal block hides discovery, prevents requests and cancels active invitations; unblock works.
- [ ] Report reaches admin queue privately; resolve/suspend and internal-note actions create admin-only audit records.

### Roles, deployment and deletion

- [ ] Ordinary member visits `/admin`: denied; calls admin RPC directly: denied.
- [ ] User cannot assign roles with metadata or table writes; demoted admin loses RPC authorization immediately.
- [ ] Admin users/payments/referral/reports/settings modules load actual data and no truncated API-first-page totals.
- [ ] Deletion immediately hides listing/cancels dates; operator completes photo + Auth deletion securely; minimal completion record is retained under final policy.
- [ ] Vercel HTTPS and direct route refreshes work; Supabase email redirect allowlist is precise.
- [ ] Desktop/tablet/390 px, keyboard focus, modal scroll/close, errors and empty states checked.
- [ ] Starter mode without credentials says disconnected; configured Google Forms registration opens only the real published form, with no pretend built-in login/admin/rewards.

## Launch decision

Do not launch public payments or reward advertising as guaranteed income. Have a person responsible for moderation, financial reconciliation, support/deletion, provider compliance and incident response. Add identity/phone/CAPTCHA controls appropriate to your actual risk, and have the final terms reviewed by qualified local counsel.
