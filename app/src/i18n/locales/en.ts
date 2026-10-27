/**
 * English is the source of truth for the shape of every catalog: hi.ts is typed against it,
 * so a missing or extra key there fails the typecheck. Keep copy here in the prototype's voice.
 */
export const en = {
  nav: {
    label: "Main",
    home: "Home",
    advisor: "Advisor",
    plans: "Plans",
    you: "You",
  },
  offline: {
    title: "You're offline",
    body: "We don't show cached balances. When you're back online, we'll fetch fresh data.",
    retry: "Retry",
  },
  update: {
    ready: "A new version of Finous is ready.",
    later: "Later",
    reload: "Reload",
  },
  language: {
    label: "Language",
  },
  common: {
    back: "Back",
    loading: "Loading",
    loadError: "We couldn't load this. Check your connection and try again.",
    retry: "Try again",
    noHomeLoan: "We don't see a home loan in your linked accounts.",
  },
  plans: {
    tools: {
      prepay: { title: "Prepay home loan", subtitle: "What if I pay ₹50K extra" },
      refinance: { title: "Refinance check", subtitle: "Should I switch my home loan" },
      emi: { title: "EMI calculator", subtitle: "Any loan, any rate" },
    },
  },
  prepay: {
    title: "Prepay home loan",
    interestSaved: "Interest saved",
    monthsSaved: "Months saved",
    newClose: "New close",
    amount: "Prepay amount",
    whereTitle: "Where this sits",
    whereBody_one:
      "You have {{savings}} in savings in {{count}} bank. Using {{amount}} for prepayment leaves about {{months}} months of essential expenses (EMI, rent, food). The benchmark is {{benchmark}} months.",
    whereBody_other:
      "You have {{savings}} in savings across {{count}} banks. Using {{amount}} for prepayment leaves about {{months}} months of essential expenses (EMI, rent, food). The benchmark is {{benchmark}} months.",
  },
  refinance: {
    title: "Refinance check",
    monthlySaving: "Monthly saving",
    yourRate: "Your rate",
    market: "Market",
    breakEven: "Break-even",
    breakEvenValue: "{{months}} mo",
    involves: "What this involves",
    processingFee: "Processing fee",
    processingFeeNote: "About {{percent}} of outstanding",
    documentation: "Documentation",
    documentationNote: "Stamping, legal, valuation",
    totalUpfront: "Total upfront",
    recoveredIn_one: "Recovered in {{count}} month",
    recoveredIn_other: "Recovered in {{count}} months",
    noSaving: "Switching wouldn't save you anything right now: your rate is at or below what banks are offering.",
  },
  emi: {
    title: "EMI calculator",
    monthly: "Monthly EMI",
    principal: "Principal",
    interest: "Interest",
    total: "Total",
    loanAmount: "Loan amount",
    rate: "Interest rate",
    tenure: "Tenure",
    tenureValue_one: "{{count}} year",
    tenureValue_other: "{{count}} years",
  },
  pages: {
    home: {
      eyebrow: "Home",
      title: "Every account. One number.",
      note: "Net worth, cash flow and what to look at. Arrives in M4.",
    },
    advisor: {
      eyebrow: "Advisor",
      title: "Ask about any transaction.",
      note: "Chat, sources and voice. Arrives in M5 and M6.",
    },
    plans: {
      eyebrow: "Plans",
      title: "What do you want to figure out?",
      note: "Calculators, health score, goals and tax. More tools arrive in M2.",
    },
    you: {
      eyebrow: "You",
      title: "Profile and privacy.",
      note: "Linked accounts, consent manager and data controls. Arrive in M7.",
    },
  },
};

export type Messages = typeof en;
