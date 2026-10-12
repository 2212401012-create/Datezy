# Datezy product and architecture

## First usable release

A respectful adult community for Bangladesh, not a marketplace for consent. Brand: deep plum, pink–apricot accent, clean vector mark, privacy-forward copy and no fabricated member imagery/statistics. English default; Bangla can be added through an i18n layer without schema changes. BDT is the only fee/reward currency in the initial release.

Registration → email confirmation → required payment reference → manual payment verification → independent profile/consent review → approved public profile → discovery/invitations. Zero-fee accounts skip payment, not profile review. Profile details edited after approval return to review. Account suspension and deletion remove public listing.

Referrals: immutable signup relationship → pending reward snapshot → eligible referred profile and payment → documented fraud review → approval → actual payout and recorded reference. A cash transfer is never faked by a status label.

## Routes

| Route             | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `/`               | Premium responsive landing page                                |
| `/how-it-works`   | Transparent registration/review/consent process                |
| `/explore`        | Server-gated discovery and invitation planning                 |
| `/register`       | Equal-requirement men/women registration, referral query       |
| `/login`          | Auth password login/recovery                                   |
| `/dashboard`      | Profile, payment, referrals, invitations, account settings     |
| `/edit-profile`   | Allowlisted fields and optional private photo                  |
| `/referrals`      | Share code/link, totals, private referral history and rules    |
| `/payment`        | Official methods, pending references, history and refund rules |
| `/about`          | Mission and adult-only positioning                             |
| `/contact`        | Real configured support channel; no fake send form             |
| `/terms`          | Reviewed configurable terms or clearly labeled starter draft   |
| `/privacy`        | Reviewed configurable privacy policy or starter draft          |
| `/community`      | Consent/safety/moderation rules                                |
| `/admin/login`    | Admin-specific authentication entry                            |
| `/admin`          | Server-role-protected modules and audits                       |
| `/faq`            | Eligibility, money, privacy, consent and starter questions     |
| `/reset-password` | Auth recovery session password update                          |

## Data lifecycle

Auth owns passwords/session/email confirmation. `profiles` is private, `public_profiles` a minimized derived listing. RLS guards every application table. Admin-only status mutations use dedicated security-definer functions and transaction locks on affected records. Referral and fee snapshots make later settings changes predictable. No service role is required in the browser.

Public-card statuses say “Approved,” not “identity verified.” Admin review is not proof of identity. Public fields include gender/duration/place preferences in addition to name/age/district/bio/interests; no private area, DOB, emails, phone, payment, referral payout, or moderation notes appear.

## Future extensions (not active)

1. Bangla translation and policy localization.
2. Phone-ownership OTP/age-assurance safeguards and CAPTCHA launch hardening.
3. Server-side media scanning and privacy-safe consent revocation.
4. In-app reporting case management, policy versions, appeals, retention automation, admin MFA.
5. SQL aggregates, paginated admin search, notifications and participant-only conversation tools.
6. Official payment-provider integration with verified webhooks and reconciliation.

Paid companionship/host booking remains disabled and has no feature route, price or database table. Any future proposal requires local legal assessment, provider approval, explicit mutual consent, transparent rules, independent safety review and safeguards against coercion/exploitation.
