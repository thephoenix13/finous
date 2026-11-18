# Finous database (Supabase)

The schema lives in `migrations/`. `schema.test.ts` runs it in Postgres inside the tests (no Docker needed) and tries to break it: reading,
changing or writing as another user, rewriting consent history, acting as an anonymous visitor.

## What the rules are

- Every table holding a person's data has a `user_id`, and row level security lets a signed-in person see and change only their own rows.
- Anonymous visitors can read and write nothing.
- App consents (`beta-trial`, `privacy-notice`) can be recorded and read, never edited or deleted by the person who gave them.
- `market_rates` is reference data: anyone signed in can read it; only the service role (our server functions) can write it.
- `export_my_data()` returns everything a person has as JSON; `delete_my_account()` removes the person and every row of theirs. Both take no
  argument, so they can only ever act on the caller.

## Banks (`migrations/20261118000000_banks.sql`, tested in `banks.test.ts`)

A bank is a row, found from the address a customer opens. One person has one Finous account and a separate choice for each bank.
Nothing changes for existing members: no bank exists until Finous adds one with the service role.

- **Branding is public, and only that.** `bank_public(subdomain)` returns a live bank's name, logo, colours, disclaimer, languages and advisor
  setting, and nothing else. A bank that isn't `live` returns nothing.
- **Nobody reads the bank tables directly.** `banks` and `bank_access_log` have no access for the API roles at all. A customer can read their
  own rows of `bank_members` and `bank_sharing_events`, and a staff member their own row of `bank_staff`. Every write goes through a function.
- **Customers** call `join_bank(bank)` and `set_bank_sharing(bank, on)`. Sharing starts off. Every real change is a new row in an append-only
  history, and the latest row is the choice. Stopping is always allowed; starting needs a live bank. None of these take a user as an argument.
- **Bank staff** are ordinary accounts with a row in `bank_staff` (a role, and a branch for the Branch role). They call `staff_shared_customers`,
  `staff_open_customer`, `staff_consent_ledger` and `staff_access_log`. Each checks the caller's role at that bank and that the bank is live.
  They see customers by a reference (`C-1001`) and a shortened name, only while the customer is sharing, and only the accounts that bank supplied.
  A Branch member sees only customers with an account at their branch, and with no branch they see nothing.
- **Every staff look is logged** in `bank_access_log`, which keeps the customer's reference and not their name, so a deleted customer stays deleted.
  The customer's own export lists who at which bank looked and when, without naming the staff member.
- **Accounts have a source.** A customer can write only `manual` accounts. `bank` accounts (and later `aa`) come from the supplier, so a customer
  can't forge what a bank appears to have said. A bank account must name its bank, and only a bank account may.
- **Adding a bank, its staff or its accounts is done by Finous with the service role.** There is no API for it yet.

## Setting up a project (once)

1. Create a project at supabase.com. **Choose the Mumbai region (ap-south-1)** so the data stays in India.
2. Authentication, Providers: turn on **Email**, and turn off every other provider. Under Email, keep "Confirm email" on and use the 6-digit
   code (OTP) template, not a link: a link opens the browser, not the installed app.
3. Authentication, SMTP: set up a custom SMTP sender (for example Resend). Supabase's built-in email sender allows only a few emails an hour,
   which will block a beta.
4. SQL editor: paste and run each file in `migrations/` in order. (Or `supabase link` then `supabase db push`.)
5. Project settings, API: copy the **Project URL** and the **anon public key**. Add them in Vercel (Settings, Environment Variables) as
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Production. The anon key is meant to be public; the rules above are what protect the data.
6. The **service role key** bypasses every rule. It goes only in a server-side Vercel variable (`SUPABASE_SERVICE_ROLE_KEY`, not prefixed with
   `VITE_`), only for the rates job, and never in the repo, the browser or a chat.

## Changing the schema

Add a new file to `migrations/` with a later timestamp; never edit one that has been applied. Add a test to `schema.test.ts` for any new table
(it already fails if a table in `public` has row level security switched off, because the list of tables is checked).
