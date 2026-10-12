# Datezy — Quick Dating Bangladesh

**Meet Someone New. Make Time for Connection.**

A mobile-first, adult-only dating/social-connection MVP for Bangladesh. React + Vite, Tailwind CSS v4, Supabase Auth/Postgres/private Storage, deployable on Vercel. English-first; BDT fees/rewards. No real members, merchant accounts, credentials, or passwords are included.

## What you receive

- 17 requested pages, plus password recovery and a 404 page.
- Separate men/women registration options with equivalent requirements; server-enforced 18+ eligibility; confirmed-email login; private optional photos.
- Payment-reference submission and **manual verification**, separate profile review, registration fee snapshots, refunds recorded after real processing.
- Unique referral links, pending/approved/paid/rejected reward workflow, documented admin fraud review, reward snapshots and duplicate payout prevention.
- Profile discovery, filters, consensual invitations, report/block/unblock, profile edits and deletion requests.
- A server-authorized admin panel with users, payments, referrals, reports, settings, activity and deletion queue.
- SQL migration, RLS, explicit column-level write grants, database behavioral tests and deployment checklist.
- A working static starter mode when Supabase is absent. If a real Google Forms URL is configured, Register opens that form. Otherwise the UI explains the missing setup. No fake backend, cash balance, seeded people, or mock payment success is included.

**This is a usable source-code MVP, not a deployed or legally cleared business.** Connect your own services, finish policies, perform hosted end-to-end testing, and review local legal/payment-provider requirements before accepting money or launching publicly.

## 1. Run locally

Install Node.js 22 LTS or later (Node 24 was used for build validation).

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:5173`. With untouched placeholders, the site runs in starter mode. To verify:

```bash
npm test
npm run build
npm run preview
```

`npm test` runs input/age/currency tests and a local PostgreSQL (PGlite) integration suite. Test Auth/Storage stand-ins and RNG shims are **only in tests**, not the production migration. Managed Supabase Auth delivery, Storage service, CAPTCHA, and gateway behavior still require hosted tests.

## 2. Configure Supabase (full application)

1. Create your own Supabase project. Select a region and disclose it in your final privacy policy.
2. In SQL Editor, run **`supabase/001_schema.sql` once in a NEW project** as the project owner. Do not rerun blindly: it creates objects, functions and triggers. Back up first if adapting an existing project. It includes a private `profile-photos` bucket.
3. Copy the Project URL and **browser-safe publishable or anon key** from project API settings:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
   VITE_SITE_URL=http://localhost:5173
   ```

   Supabase keys are not authentication secrets for users; access relies on Auth, RLS and protected RPCs. **Never use the service-role/secret key in Vite, client source, GitHub, or site settings.**

4. Enable the Email provider in Supabase Auth. Enable email confirmation. Set a password minimum of **12 characters** in Auth settings as well as the frontend. No plaintext passwords are stored by this app.
5. Auth URL Configuration: set Site URL to your canonical deployed origin, and add exact allowed redirects for `/dashboard` and `/reset-password`. Add localhost equivalents for development. Avoid broad wildcards on production. Set `VITE_SITE_URL` to the same canonical origin for referral and email links.
6. Configure production SMTP/email delivery under your own approved provider. Default email limits may be too low for public launch. Never put SMTP credentials in frontend environment variables.
7. Restart Vite after editing env variables. In Vercel, redeploy after env changes (Vite reads them at build time).
8. Register a real adult account and confirm its email. The Auth trigger creates its pending profile and user role. Duplicate email/phone and invalid age/gender/consent are rejected at the database layer. Auth error messages intentionally avoid confirming whether an email exists.

### Bootstrap your first administrator

Create and confirm an account through Datezy first. Find its immutable user UUID in Supabase Auth. Run in SQL Editor using a trusted owner session:

```sql
insert into public.user_roles(user_id, role)
values ('YOUR_CONFIRMED_AUTH_USER_UUID', 'admin')
on conflict (user_id) do update set role = excluded.role;
```

Log in at `/admin/login` with that account. The frontend checks `is_admin()` and every admin RPC checks the database role again. Do not put an admin email/password into the source. No client can assign admin roles. To remove access, update its role to `user` securely in SQL Editor and revoke active sessions if necessary.

## 3. Configure money, public listing and policies

The settings seed fees **৳299 for men / ৳299 for women**, and rewards **৳200 per eligible referral**. Payment methods are empty by default: the app will not invent a merchant number or gateway integration.

In Admin → Settings:

1. Set the real legal operator/business details within reviewed Terms and Privacy Policy. Replace draft copy, establish retention/deletion windows, payout timing/limits, support response process and appeal procedure. Get local legal and financial advice. Sample text is not legal advice.
2. Set a monitored support contact. Set reviewed refund/cancellation/payment policy. Publish profile approval and referral terms, including eligibility and non-guaranteed rewards.
3. Add only officially approved payment methods with exact identifiers, e.g.:

   ```json
   [
     {
       "name": "bKash",
       "account": "YOUR_APPROVED_OFFICIAL_ACCOUNT",
       "enabled": false,
       "instructions": "Replace with provider-approved instructions. Never share OTPs or passwords."
     }
   ]
   ```

   Enable a method only when the account and collection instructions have provider approval. The database requires support, Terms, Privacy and a refund policy before methods can be enabled. This guard is not proof of legal compliance.

4. Adjust fees/rewards without code edits. Changes apply to **new registrations**; existing profile `required_fee` and referral reward `amount` are preserved. Disabling fees does not silently erase an existing unpaid obligation—resolve existing cases explicitly according to policy.
5. Require consent before listing. An account may exist privately without listing consent; discovery eligibility requires profile approval, which requires listing consent, confirmed email and verified required payment.

### Manual financial workflows

- A reference is saved with `pending` status. It is not financial confirmation.
- Admin → Payments: verify the actual official account statement, amount, reference and method before selecting Verify. Reject invalid/duplicate/unreceived claims.
- Admin → Users: independently review the profile; Approve is blocked until required payment is verified and listing consent is present.
- Approved members can discover profiles and send invitations. Fees do not purchase affection, consent, availability or acceptance.
- Refund outside Datezy using your payment provider, then **Record refund** with actual amount and reference. This removes verified status, returns profile to review and rejects unpaid related rewards. Any already-paid referral reward requires a separate real-world reconciliation; the system does not silently reverse cash.
- Admin → Referrals: check the referred account is unique and eligible, then document the fraud review before approval. Transfer any real payout separately, then record its reference. Mark Paid is blocked without continued eligibility/reference and cannot be repeated.

No bKash/Nagad/SSLCommerz API is called. Future legitimate gateways should use a **server-only Edge Function**, provider credentials in server secrets, authenticated initiation, verified webhook signatures, idempotent transaction identifiers, amount/account validation, and reconciliation. Never accept a frontend `success=true` as payment evidence. The payment table/RPC separation is the foundation; gateway work itself is not implemented.

## 4. Static Google Forms starter

No Supabase project yet? Leave the Supabase placeholders unchanged.

1. Create a Google Form you own. Include adult eligibility, display name, private contact details, district/interests, consent and a referral-code field. Avoid NID collection. Publish the privacy/refund terms before collecting money.
2. Configure validation and your own manual review process. **Google Forms does not provide this app’s database age constraint or verified Datezy Auth.** Date input/validation alone is not identity verification. Review responses for eligibility and duplicates.
3. Restrict response-sheet access, disable public response summaries, and publish a retention/deletion process. Disclose Google’s processing in the starter privacy policy.
4. Copy the real published HTTPS responder URL, not the editor URL:

   ```dotenv
   VITE_GOOGLE_FORM_URL=https://forms.gle/YOUR_ACTUAL_PUBLISHED_FORM
   VITE_SUPPORT_EMAIL=YOUR_MONITORED_SUPPORT_EMAIL
   ```

5. Build/deploy. Register buttons now open the form in a new tab. `/register`, Login, Explore, Dashboard and Admin clearly state that built-in accounts are unavailable.
6. Google Forms does **not** automatically integrate referrals, approve profiles, collect gateway payments, or create Datezy logins. No browser impersonation of those features is used. URL `?ref=` is **not automatically prefilled into Google Forms**; ask respondents for their code or deliberately configure a published prefilled-form mapping. Move validated records through a planned migration if you later adopt Supabase—do not expose response sheets publicly.

## 5. Upload to GitHub

Create an empty repository on GitHub in your own account. From the project folder:

```bash
git init
git add .
git commit -m "Build Datezy MVP"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

Check that `.env.local`, credentials and `node_modules` are excluded. Commit `.env.example` with placeholders only and `package-lock.json`. Prefer a private repository during setup. No repository is created or uploaded by this deliverable.

## 6. Deploy on Vercel

1. Import your GitHub repository into your own Vercel account.
2. Framework: Vite. Build: `npm run build`. Output: `dist`. Install: `npm ci`.
3. Add required `VITE_` variables for the correct environment; set `VITE_SITE_URL` to the canonical HTTPS domain.
4. Deploy. `vercel.json` provides SPA rewrites and security headers. Direct visits to `/dashboard`, `/admin`, etc. must render the SPA, not 404.
5. Update Supabase Auth URLs for the deployed domain; only allow trusted redirects. Connect a custom domain and verify HTTPS. Use a stable domain for referral links.
6. Test email confirmation, login, recovery, uploads, fees, review, roles, referral eligibility and deletion against **this deployed environment**. Do not accept live payments until the test checklist and legal/provider setup pass.

Default CSP permits only same-origin scripts, Supabase connections/images and inline style declarations required by the UI. No HTML policy content is rendered unsafely. A custom Supabase domain, custom logo host or CAPTCHA requires an explicit CSP update. Do not remove CSP wholesale to make third-party scripts work.

Free tiers may be available for GitHub, Vercel and Supabase; availability, commercial-use permissions, regions, quotas, email delivery and prices can change. Check current provider terms. A public dating platform may need paid services and active human moderation. This package does not create hosting accounts or represent a live website URL.

## Security model

See [docs/SECURITY.md](docs/SECURITY.md), [docs/TESTING.md](docs/TESTING.md) and [docs/PRODUCT.md](docs/PRODUCT.md).

| Table             | Client read scope                                                  | Client writes                                                                       |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| profiles          | Own private row; admins can read all                               | Own allowlisted public fields only; no status, DOB, fee, code, email or phone edits |
| public_profiles   | Approved, paid-if-required, consented listings; public fields only | None; trigger-generated projection                                                  |
| user_roles        | Own role; admins                                                   | None; owner SQL bootstrap only                                                      |
| payments          | Own; admins                                                        | Protected reference-submit/admin-review RPCs only                                   |
| referrals         | Referred user’s own relation; admins                               | Auth signup trigger only                                                            |
| referral_rewards  | Referrer’s reward rows; admins                                     | Signup trigger/admin RPC only                                                       |
| date_requests     | Participants; admins                                               | Consent/eligibility-checked RPCs                                                    |
| reports           | Reporter; admins                                                   | Protected report/resolve RPCs                                                       |
| blocks            | Blocker; admins                                                    | Protected block/unblock RPC                                                         |
| site_settings     | Published settings                                                 | Admin RPC only                                                                      |
| admin_activity    | Admins only                                                        | Private server logging function                                                     |
| deletion_requests | Own request; admins                                                | Protected deletion RPC/Auth deletion trigger                                        |
| rate_limits       | No client reads                                                    | Private rate-check function                                                         |

Only minimal public profile fields are exposed; RLS alone is not used to hide private columns. Approved public listings may be reachable directly by visitors with links. The Explore workflow itself is server-gated for approved adult members. Blocking filters reciprocal discovery, cancels invitations and prevents new date requests; it cannot make already-public information secret or revoke a photo link before its expiry.

## Known scope and operational requirements

- Manual verification and documented fraud review, **not government identity verification**. Unique email/phone reduces obvious duplication but cannot establish that a person owns only one contact. There is no automated phone OTP, device fingerprinting, KYC or money transfer.
- Email password authentication/recovery; no social auth, real-time chat, push notification, paid companionship or host booking. Date invitations appear in dashboard; automatic email notification is not included.
- Frontend uploads re-encode images to strip EXIF/GPS. The storage bucket restricts type/size, but a malicious client can bypass frontend processing. For stricter photo security, add a server image-processing/scan pipeline and moderate media before approving listings.
- Database rate limits apply to payment submissions, invitations/responses, reports, blocks, deletion and profile edits. Supabase Auth has separate configurable limits. CAPTCHA/phone verification is an important **pre-public-launch extension**, not silently claimed as implemented.
- Admin read utilities paginate 500-row batches rather than silently showing only the API’s first page. For scale, replace full admin reads with SQL aggregate/search pagination and virtualized tables; this is a simple small-launch MVP.
- User-requested deletion immediately unlists the profile; operator completes Auth/Storage deletion securely in Supabase. There is no browser service-role access. Minimal anonymized deletion-completion/audit records remain; define lawful retention and backup expiry.
- Profile detail edits invalidate approval. Removing listing consent hides the public projection immediately; already-issued photo links can remain usable for up to 15 minutes.
- Final Terms/Privacy/Community copy is operator-configurable plain text. Bangla is planned; no misleading language toggle is included.

## Project layout

```text
src/App.jsx                 Routes and user/admin workflows
src/lib.js                  Supabase client, RPC, pagination, private photo processing
src/utils.js                Validation, eligibility and monetary helpers
src/styles.css              Tailwind import and premium responsive design
supabase/001_schema.sql     Tables, indexes, triggers, RLS, privileges, server RPCs
public/logo.svg             Editable Datezy vector mark
.env.example                Browser-safe placeholders only
vercel.json                 SPA routing and security headers
tests/                      Local validation and PostgreSQL behavioral tests
docs/                       Security, testing and product/launch guidance
```
