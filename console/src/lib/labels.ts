import type { OpportunityStatus, OpportunityType, ProductKind } from "../api/types";

export const TYPE_LABEL: Record<OpportunityType, string> = {
  topup: "Top-up",
  refinance: "Refinance",
  maturing: "Maturing deposit",
  insurance: "Insurance gap",
};

export const STATUS_LABEL: Record<OpportunityStatus, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  closed: "Closed",
};

export const KIND_LABEL: Record<ProductKind, string> = { loan: "Loan", deposit: "Deposit" };

export const TYPES = Object.keys(TYPE_LABEL) as OpportunityType[];
export const STATUSES = Object.keys(STATUS_LABEL) as OpportunityStatus[];
