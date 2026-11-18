# Bank sharing: wording and data flows for legal review

Draft for a lawyer's reading before any real bank goes live. Prepared 19 Nov 2026 from what the product actually does (migration `20261118000000_banks.sql`, screens `BankSharing`, `SignIn`, `BankArrival`). Nothing here is legal advice; the questions at the end are the ones I could not answer.

## What the product does

A bank has its own web address (for example `seva.app.finous.site`). A person who opens it signs in to Finous with their email and a one-time code, the same account they would have anywhere else on Finous. One Finous account per email; the bank does not create or own it.

1. **Arrival.** Opening a bank's address while signed in records that this person is a customer of that bank (`bank_members`: person, bank, a reference such as `C-1001`, date). The bank cannot see this record.
2. **The question.** Once, at the front door, the person is asked whether the bank may see the accounts it supplied. The switch starts **off**. "Not now" records nothing in the database (it is remembered on the device only).
3. **Turning it on or off.** Every change is a new row in an append-only history (`bank_sharing_events`: person, bank, on or off, time). The latest row is the current choice. Turning it off takes effect at once. The person can see their own history on screen and in the file they can download.
4. **What bank staff can see, and only while sharing is on:** the person's first name and last initial (or the reference if there is no name), and the accounts the **bank itself supplied** to Finous (type, branch, details). Staff cannot read any table directly; they call named functions that return only customers who are sharing right now, and **every call is written to an access log** (who, which customer reference, why, when). The person can see each look in the downloaded file.
   Admin and compliance staff also see a **consent ledger**: for each recent change, the customer reference, short name, on or off and the time, plus counts of customers sharing and stopped. The ledger names people who have **stopped** sharing as well, for audit. The screen does not currently say this to the person.
5. **What staff never see:** anything the person typed in themselves, transactions, goals, monthly figures, tax details, the person's email address, other banks they use, Advisor questions.
6. **Your data.** The downloadable file includes the banks joined, each sharing choice, and each time bank staff looked at the person.

## The exact words shown to the person (English; Hindi is in `app/HINDI_REVIEW.csv`)

**Screen title:** Sharing with {bank}

**Intro:** {bank} supplied some of the accounts in this app. You decide whether {bank} can see them here. It stays off until you turn it on.

**What {bank} would see:**
- Your first name and the first letter of your last name.
- The accounts {bank} itself supplied: their type, branch and details.

**What {bank} never sees:** Anything you added yourself, your transactions, goals, monthly figures and tax details, your email address, or what you ask the Advisor.

**Looks are recorded:** Each time someone at {bank} looks at your details, it is recorded. You can see those records in the file you download from Your data.

**The switch:** Let {bank} see these accounts

**Status when on:** Sharing is on. {bank} can see the accounts described above.
**Status when off:** Sharing is off. {bank} cannot see anything from your Finous.
**Stopping:** You can stop at any time. It takes effect straight away.

**Sign-in screen on a bank's address:** Already use Finous? Sign in with the same email and it is the same account. Nothing new is created. / Each bank's app has an address of its own, so you sign in once on each. You may be asked here even if you are signed in somewhere else.

**Your data screen:** ... If you use a bank's app, it also lists the banks you joined, what you chose to share, and each time a bank looked at your details.

## Questions for the lawyer

1. **Roles under the DPDP Act.** Who is the data fiduciary for the accounts the bank supplies, for the sharing choice, and for the access log: the bank, Finous, or both? Does the wording need to name Finous or the bank as the party the person is consenting to?
2. **Is this a valid consent?** It is a clear affirmative act (a switch the person turns on), specific to one bank and one purpose, and withdrawable at any time. Is a switch enough, or is a separate notice in the form the Act requires needed, in English and Hindi?
3. **Purpose wording.** The screen says what the bank can see but not what the bank may do with it (service, marketing, offers). Should the purpose be stated on the screen, and should it be a closed list?
4. **Recording arrival without asking.** Opening the bank's address records that the person is a customer of that bank, before they choose anything. The bank cannot see it, and it appears in the person's downloaded data. Does that need its own notice or consent?
5. **Proof of consent.** The history stores person, bank, on or off and time, but not the exact wording version shown. Should each row carry the version of the text agreed to (the app does this already for the beta terms)?
6. **Withdrawal and retention.** Turning sharing off stops staff seeing the person at once. It does not delete the history rows or the access log, which stay for the person's own record and for audit. Is that acceptable, and for how long?
7. **Deleting an account** removes the person's rows. The access log keeps the customer reference but not the name, so a deleted customer stays deleted. Confirm that is the right balance.
8. **Children and shared accounts.** Nothing in the product checks age or whether an account is joint. Does the wording or flow need to?
9. **Language.** Is the Hindi acceptable as a notice, or must it be reviewed by a qualified translator for legal text?
10. **The consent ledger** shows staff the reference and short name of people who turned sharing off, and when. Should the screen say that, and is keeping that visible after someone stops acceptable?
11. **The bank's own disclaimer** is shown on every screen with "Powered by Finous". Who owns the wording of that disclaimer?
