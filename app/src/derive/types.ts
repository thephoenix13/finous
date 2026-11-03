import type { IsoDate, LoanType, MonthString, Profile, Rupees } from "../api";

/**
 * What a member has told us, in the shapes the derivation works from. The database holds these as rows (see supabase/migrations);
 * `rows.ts` checks and converts them. Money is whole rupees.
 */
export type MemberAccount =
  | { kind: "bank"; id: string; name: string; last4: string; balance: Rupees }
  | {
      kind: "loan";
      id: string;
      name: string;
      loanType: LoanType;
      outstanding: Rupees;
      ratePercent: number;
      monthsLeft: number;
      /** The instalment, if they know it; otherwise it is worked out from the other three. */
      emi?: Rupees;
      startedOn?: MonthString;
      originalAmount?: Rupees;
    }
  | {
      kind: "card";
      id: string;
      name: string;
      last4: string;
      outstanding: Rupees;
      limit: Rupees;
      statementDay: number;
      dueDay: number;
      autoPay: boolean;
      minimumDue?: Rupees;
    }
  | {
      kind: "investment";
      id: string;
      name: string;
      instrument: "mutual-funds" | "stocks" | "ppf";
      value: Rupees;
      institution?: string;
      activeSips?: number;
      holdings?: number;
      openedYear?: number;
    }
  | { kind: "other"; id: string; name: string; assetKind: OtherAssetKind; value: Rupees };

export type OtherAssetKind = "property" | "gold" | "fixed-deposit" | "other";

/** One month of what the person earns and spends, stated once. EMIs are not here: they come from the loans. */
export type MonthlyFigures = {
  month: MonthString;
  income: Rupees;
  rent: Rupees;
  food: Rupees;
  other: Rupees;
  sips: Rupees;
};

export type MemberGoal = {
  id: string;
  name: string;
  targetAmount: Rupees;
  fundedAmount: Rupees;
  targetDate: MonthString;
  assumedReturnPercent: number;
};

/** What the person states for the financial year about the things Account Aggregator will not tell us. */
export type TaxInputs = {
  /** Their income-tax slab, as a percent. 0 means they have not said. */
  slabPercent: number;
  ppf: number;
  elss: number;
  lifeInsurance: number;
  health80D: number;
  homeLoanInterestPaid: number;
};

/** Rates read from the market_rates table, in percent. A missing rate means the insight that needs it is not shown, never guessed. */
export type MarketRates = {
  homeLoan?: number;
  fixedDeposit12m?: number;
  savings?: number;
  /** The date the rates are as of, shown to the person. */
  asOf?: IsoDate;
};

export type Snapshot = { takenOn: IsoDate; value: Rupees };

export type MemberInput = {
  asOf: IsoDate;
  profile: Profile;
  accounts: MemberAccount[];
  /** Oldest first or any order; the latest month is the current one. */
  monthly: MonthlyFigures[];
  goals: MemberGoal[];
  tax?: TaxInputs;
  rates: MarketRates;
  snapshots: Snapshot[];
};
