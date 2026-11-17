import type {
  AccessLogEntry,
  ApiKeyInfo,
  ConsentChange,
  CustomerRequest,
  FeedField,
  FeedRun,
  FollowUp,
  Opportunity,
  OpportunityType,
  Product,
} from "./types";

/** The moment the mock treats as now, so nothing in the demo or the tests depends on the clock. */
export const MOCK_NOW = "2026-11-17T09:00:00Z";

// ---- The data feed -----------------------------------------------------------------------------------------------

export const FEED_FIELDS: FeedField[] = [
  { key: "customerRef", label: "Customer number", hint: "The number your core banking system uses for the customer.", required: true },
  { key: "customerName", label: "Customer name", hint: "The full name on the account. Staff only ever see it shortened.", required: true },
  { key: "accountNumber", label: "Account number", hint: "Kept masked. Only the last 4 digits are ever shown.", required: true },
  { key: "accountType", label: "Account type", hint: "Savings, current, fixed deposit, recurring deposit or a kind of loan.", required: true },
  { key: "balance", label: "Balance or amount outstanding", hint: "The balance of a deposit, or what is still owed on a loan.", required: true },
  { key: "emi", label: "Monthly instalment", hint: "For loans.", required: false },
  { key: "interestRate", label: "Interest rate", hint: "Per year, as a number such as 9.4.", required: false },
  { key: "nextDue", label: "Next due date", hint: "The next instalment, for loans.", required: false },
  { key: "maturity", label: "Maturity date", hint: "For fixed and recurring deposits.", required: false },
  { key: "branch", label: "Branch", hint: "The branch code or name, so branch staff see their own customers.", required: false },
];

/** The column headings of the bank's sample file. Columns that aren't matched, such as PHONE, are never read. */
export const FEED_COLUMNS = ["CUST_NO", "CUST_NAME", "ACCT_NO", "ACCT_TYPE", "BAL_AMT", "EMI_AMT", "ROI", "NEXT_DUE_DT", "MAT_DT", "BR_CODE", "PHONE"];

export const FEED_MAPPING_DONE: Record<string, string> = {
  customerRef: "CUST_NO",
  customerName: "CUST_NAME",
  accountNumber: "ACCT_NO",
  accountType: "ACCT_TYPE",
  balance: "BAL_AMT",
  emi: "EMI_AMT",
  interestRate: "ROI",
  nextDue: "NEXT_DUE_DT",
  maturity: "MAT_DT",
  branch: "BR_CODE",
};

/** Test customers, not real people. The fourth has no balance, so a dry run has something to reject. */
export const FEED_SAMPLE: Record<string, string>[] = [
  { CUST_NO: "T-0001", CUST_NAME: "Rohit Kulkarni", ACCT_NO: "004512398812", ACCT_TYPE: "HOME_LOAN", BAL_AMT: "2850000", EMI_AMT: "32400", ROI: "9.4", NEXT_DUE_DT: "2026-12-05", MAT_DT: "", BR_CODE: "MAIN", PHONE: "9000000001" },
  { CUST_NO: "T-0002", CUST_NAME: "Sunita Deshmukh", ACCT_NO: "004512100245", ACCT_TYPE: "SAVINGS", BAL_AMT: "184500", EMI_AMT: "", ROI: "3.0", NEXT_DUE_DT: "", MAT_DT: "", BR_CODE: "MKTRD", PHONE: "9000000002" },
  { CUST_NO: "T-0003", CUST_NAME: "Amit Jadhav", ACCT_NO: "004512770031", ACCT_TYPE: "FIXED_DEPOSIT", BAL_AMT: "500000", EMI_AMT: "", ROI: "7.0", NEXT_DUE_DT: "", MAT_DT: "2026-12-18", BR_CODE: "MAIN", PHONE: "9000000003" },
  { CUST_NO: "T-0004", CUST_NAME: "Priya Shinde", ACCT_NO: "004512555510", ACCT_TYPE: "SAVINGS", BAL_AMT: "", EMI_AMT: "", ROI: "3.0", NEXT_DUE_DT: "", MAT_DT: "", BR_CODE: "STN", PHONE: "9000000004" },
  { CUST_NO: "T-0005", CUST_NAME: "Vikram Pawar", ACCT_NO: "004512909977", ACCT_TYPE: "PERSONAL_LOAN", BAL_AMT: "420000", EMI_AMT: "11800", ROI: "13.5", NEXT_DUE_DT: "2026-12-10", MAT_DT: "", BR_CODE: "MAIN", PHONE: "9000000005" },
];

export const FEED_RUNS: FeedRun[] = [
  { at: "2026-11-17T02:00:00Z", ok: true, rowsRead: 1874, rowsRejected: 0, message: null },
  { at: "2026-11-16T02:00:00Z", ok: true, rowsRead: 1869, rowsRejected: 0, message: null },
  { at: "2026-11-15T02:00:00Z", ok: true, rowsRead: 1869, rowsRejected: 12, message: "12 rows had no balance and were left out." },
  { at: "2026-11-14T02:00:00Z", ok: true, rowsRead: 1861, rowsRejected: 0, message: null },
  { at: "2026-11-13T02:00:00Z", ok: false, rowsRead: 0, rowsRejected: 0, message: "The file was not at the agreed location." },
  { at: "2026-11-12T02:00:00Z", ok: true, rowsRead: 1858, rowsRejected: 0, message: null },
  { at: "2026-11-11T02:00:00Z", ok: true, rowsRead: 1852, rowsRejected: 0, message: null },
];

// ---- Integration: keys ---------------------------------------------------------------------------------------------

export const KEYS: ApiKeyInfo[] = [
  { id: "k1", name: "Branch app", prefix: "fk_live_8f3a", createdAt: "2026-10-02T10:00:00Z", lastUsed: "2026-11-16T18:20:00Z" },
  { id: "k2", name: "Reporting", prefix: "fk_live_c21d", createdAt: "2026-10-20T12:30:00Z", lastUsed: null },
];

// ---- Products ------------------------------------------------------------------------------------------------------

const DISCLOSURE_EN = "Offered by Demo Co-operative Bank. Rates and eligibility are set by the bank. Tap Learn more to talk to us.";
const DISCLOSURE_HI = "डेमो को-ऑपरेटिव बैंक की ओर से। दरें और पात्रता बैंक तय करता है। बात करने के लिए अधिक जानें पर टैप करें।";

export const PRODUCTS: Product[] = [
  { id: "p1", name: "Home loan", kind: "loan", rate: 8.75, tenureMin: 60, tenureMax: 240, eligibility: "Salaried or self-employed, age 21 to 60, with 2 years of income proof.", fees: "Processing fee 0.5% of the loan, up to ₹10,000.", disclosureEn: DISCLOSURE_EN, disclosureHi: DISCLOSURE_HI, live: true, changedAt: "2026-11-02T10:00:00Z" },
  { id: "p2", name: "Personal loan", kind: "loan", rate: 13.25, tenureMin: 12, tenureMax: 60, eligibility: "Salaried, age 23 to 58, with 1 year in the current job.", fees: "Processing fee 1% of the loan.", disclosureEn: DISCLOSURE_EN, disclosureHi: DISCLOSURE_HI, live: true, changedAt: "2026-10-28T15:10:00Z" },
  { id: "p3", name: "Vehicle loan", kind: "loan", rate: 9.5, tenureMin: 12, tenureMax: 84, eligibility: "Salaried or self-employed, age 21 to 65.", fees: "Processing fee 0.75% of the loan.", disclosureEn: DISCLOSURE_EN, disclosureHi: "", live: false, changedAt: "2026-11-09T09:40:00Z" },
  { id: "p4", name: "Fixed deposit", kind: "deposit", rate: 7.1, tenureMin: 12, tenureMax: 120, eligibility: "Open to individuals. Senior citizens earn 0.5% more.", fees: "No fee. Early withdrawal carries a penalty.", disclosureEn: DISCLOSURE_EN, disclosureHi: DISCLOSURE_HI, live: true, changedAt: "2026-10-15T11:25:00Z" },
  { id: "p5", name: "Recurring deposit", kind: "deposit", rate: 6.8, tenureMin: 6, tenureMax: 120, eligibility: "Open to individuals.", fees: "No fee.", disclosureEn: DISCLOSURE_EN, disclosureHi: "", live: false, changedAt: "2026-11-11T14:00:00Z" },
];

// ---- Opportunities -------------------------------------------------------------------------------------------------

export const OPPORTUNITIES: Opportunity[] = [
  { id: "o1", customer: "Rohit K.", ref: "C-1041", type: "topup", status: "new", branch: "Main branch", productId: "p1", detectedAt: "2026-11-16T02:10:00Z", assignee: null },
  { id: "o2", customer: "Sunita D.", ref: "C-1042", type: "maturing", status: "new", branch: "Market Road branch", productId: "p4", detectedAt: "2026-11-16T02:10:00Z", assignee: null },
  { id: "o3", customer: "Amit J.", ref: "C-1043", type: "refinance", status: "contacted", branch: "Main branch", productId: "p1", detectedAt: "2026-11-14T02:05:00Z", assignee: "Suresh Pawar" },
  { id: "o4", customer: "Priya S.", ref: "C-1044", type: "insurance", status: "new", branch: "Station branch", productId: null, detectedAt: "2026-11-14T02:05:00Z", assignee: null },
  { id: "o5", customer: "Vikram P.", ref: "C-1045", type: "topup", status: "interested", branch: "Main branch", productId: "p2", detectedAt: "2026-11-12T02:00:00Z", assignee: "Suresh Pawar" },
  { id: "o6", customer: "Anita M.", ref: "C-1051", type: "maturing", status: "contacted", branch: "Market Road branch", productId: "p4", detectedAt: "2026-11-11T02:00:00Z", assignee: "Neha Patil" },
  { id: "o7", customer: "Sanjay B.", ref: "C-1052", type: "refinance", status: "new", branch: "Station branch", productId: "p1", detectedAt: "2026-11-10T02:00:00Z", assignee: null },
  { id: "o8", customer: "Meena T.", ref: "C-1053", type: "topup", status: "closed", branch: "Main branch", productId: "p1", detectedAt: "2026-11-07T02:00:00Z", assignee: "Suresh Pawar" },
  { id: "o9", customer: "Rahul G.", ref: "C-1054", type: "insurance", status: "contacted", branch: "Market Road branch", productId: null, detectedAt: "2026-11-06T02:00:00Z", assignee: "Neha Patil" },
  { id: "o10", customer: "Kiran L.", ref: "C-1055", type: "maturing", status: "new", branch: "Main branch", productId: "p4", detectedAt: "2026-11-05T02:00:00Z", assignee: null },
  { id: "o11", customer: "Deepa N.", ref: "C-1056", type: "refinance", status: "interested", branch: "Station branch", productId: "p1", detectedAt: "2026-11-04T02:00:00Z", assignee: "Meera Joshi" },
  { id: "o12", customer: "Nitin W.", ref: "C-1057", type: "topup", status: "new", branch: "Market Road branch", productId: "p2", detectedAt: "2026-11-03T02:00:00Z", assignee: null },
];

/** What the customer shared that raised each kind of opportunity. The same wording for every customer of a kind. */
export const FIGURES: Record<OpportunityType, { label: string; value: string }[]> = {
  topup: [
    { label: "Home loan outstanding", value: "₹28,50,000" },
    { label: "Rate they pay", value: "9.4% a year" },
    { label: "Instalments paid on time", value: "38 of 38" },
    { label: "Goal they shared", value: "Home renovation, ₹6,00,000" },
  ],
  refinance: [
    { label: "Loan outstanding", value: "₹18,20,000" },
    { label: "Rate they pay", value: "9.9% a year" },
    { label: "Years left", value: "11" },
    { label: "Instalments paid on time", value: "24 of 24" },
  ],
  maturing: [
    { label: "Fixed deposit", value: "₹5,00,000" },
    { label: "Rate", value: "7.0% a year" },
    { label: "Matures", value: "18 Dec 2026" },
  ],
  insurance: [
    { label: "Life cover shared", value: "None" },
    { label: "Loan outstanding", value: "₹4,20,000" },
    { label: "People who depend on them", value: "3" },
  ],
};

export const FOLLOW_UPS: Record<string, FollowUp[]> = {
  o3: [{ id: "f1", at: "2026-11-15T10:15:00Z", by: "Suresh Pawar", status: "contacted", note: "Called. Asked to come to the branch on Friday to talk about a lower rate.", assignee: "Suresh Pawar" }],
  o5: [
    { id: "f2", at: "2026-11-13T11:00:00Z", by: "Suresh Pawar", status: "contacted", note: "Called about a top-up for the daughter's college fees.", assignee: "Suresh Pawar" },
    { id: "f3", at: "2026-11-15T16:30:00Z", by: "Suresh Pawar", status: "interested", note: "Wants figures for ₹3 lakh over 5 years. Sending them.", assignee: "Suresh Pawar" },
  ],
  o6: [{ id: "f4", at: "2026-11-14T09:20:00Z", by: "Neha Patil", status: "contacted", note: "Left a message about the deposit maturing next month.", assignee: "Neha Patil" }],
  o8: [{ id: "f5", at: "2026-11-09T12:45:00Z", by: "Suresh Pawar", status: "closed", note: "Took the top-up. Loan closed out.", assignee: "Suresh Pawar" }],
  o9: [{ id: "f6", at: "2026-11-10T14:10:00Z", by: "Neha Patil", status: "contacted", note: "Sent the family cover leaflet.", assignee: "Neha Patil" }],
  o11: [{ id: "f7", at: "2026-11-12T10:00:00Z", by: "Meera Joshi", status: "interested", note: "Asked what the new rate would save each month.", assignee: "Meera Joshi" }],
};

// ---- Compliance records ----------------------------------------------------------------------------------------------

export const CONSENT_CHANGES: ConsentChange[] = [
  { id: "cc1", customer: "Rohit K.", ref: "C-1041", sharing: true, at: "2026-11-16T08:42:00Z" },
  { id: "cc2", customer: "Nitin W.", ref: "C-1057", sharing: true, at: "2026-11-15T19:05:00Z" },
  { id: "cc3", customer: "Bhavna R.", ref: "C-1060", sharing: false, at: "2026-11-15T11:30:00Z" },
  { id: "cc4", customer: "Sunita D.", ref: "C-1042", sharing: true, at: "2026-11-14T17:12:00Z" },
  { id: "cc5", customer: "Girish A.", ref: "C-1061", sharing: true, at: "2026-11-14T09:50:00Z" },
  { id: "cc6", customer: "Kiran L.", ref: "C-1055", sharing: true, at: "2026-11-13T21:28:00Z" },
  { id: "cc7", customer: "Hema V.", ref: "C-1062", sharing: false, at: "2026-11-13T10:02:00Z" },
  { id: "cc8", customer: "Priya S.", ref: "C-1044", sharing: true, at: "2026-11-12T15:44:00Z" },
  { id: "cc9", customer: "Sanjay B.", ref: "C-1052", sharing: true, at: "2026-11-11T12:10:00Z" },
  { id: "cc10", customer: "Anita M.", ref: "C-1051", sharing: true, at: "2026-11-10T18:35:00Z" },
  { id: "cc11", customer: "Dinesh P.", ref: "C-1063", sharing: false, at: "2026-11-09T09:15:00Z" },
  { id: "cc12", customer: "Meena T.", ref: "C-1053", sharing: true, at: "2026-11-08T14:20:00Z" },
];

export const ACCESS_LOG: AccessLogEntry[] = [
  { id: "a1", at: "2026-11-16T10:12:00Z", staff: "Suresh Pawar", customer: "Rohit K.", ref: "C-1041", reason: "Viewed opportunity" },
  { id: "a2", at: "2026-11-16T10:05:00Z", staff: "Suresh Pawar", customer: "Sunita D.", ref: "C-1042", reason: "Viewed opportunity" },
  { id: "a3", at: "2026-11-15T16:28:00Z", staff: "Suresh Pawar", customer: "Vikram P.", ref: "C-1045", reason: "Viewed opportunity" },
  { id: "a4", at: "2026-11-15T09:50:00Z", staff: "Neha Patil", customer: "12 customers", ref: "—", reason: "Exported opportunity list" },
  { id: "a5", at: "2026-11-14T09:18:00Z", staff: "Neha Patil", customer: "Anita M.", ref: "C-1051", reason: "Viewed opportunity" },
  { id: "a6", at: "2026-11-12T09:58:00Z", staff: "Meera Joshi", customer: "Deepa N.", ref: "C-1056", reason: "Viewed opportunity" },
  { id: "a7", at: "2026-11-10T14:08:00Z", staff: "Neha Patil", customer: "Rahul G.", ref: "C-1054", reason: "Viewed opportunity" },
  { id: "a8", at: "2026-11-09T12:40:00Z", staff: "Suresh Pawar", customer: "Meena T.", ref: "C-1053", reason: "Viewed opportunity" },
];

export const REQUESTS: CustomerRequest[] = [
  { id: "r1", ref: "C-1041", kind: "export", receivedOn: "2026-11-10", dueOn: "2026-11-24", status: "open" },
  { id: "r2", ref: "C-1044", kind: "delete", receivedOn: "2026-11-14", dueOn: "2026-11-28", status: "open" },
  { id: "r3", ref: "C-1050", kind: "export", receivedOn: "2026-11-03", dueOn: "2026-11-17", status: "done" },
  { id: "r4", ref: "C-1047", kind: "delete", receivedOn: "2026-10-28", dueOn: "2026-11-11", status: "done" },
];
