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
  },
  plans: {
    tools: {
      emi: { title: "EMI calculator", subtitle: "Any loan, any rate" },
    },
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
