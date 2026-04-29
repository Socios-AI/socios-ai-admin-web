// Plan K.1 · Partner domain helpers (pure, no I/O).
//
// NOTE on the state ladder:
// In K.1, a `partners` row only exists from `pending_kyc` onward (the row is
// created when `checkout.session.completed` fires AND a matching auth.users row
// exists). The earlier states `pending_contract` and `pending_payment` live on
// `partner_invitations.status` instead, not on `partners.status`.
//
// As a result, `nextStatusOnContractSigned` and `nextStatusOnLicensePaid`
// are reserved for K.2+ flows where the partners-web panel may need to drive
// partner-row transitions before payment (e.g. partner self-cancels mid-onboarding).
// In K.1 they are exercised only by unit tests; production paths use
// `nextStatusOnKycCompleted` exclusively (via stripe-connect/route.ts).

export type PartnerStatus =
  | "pending_contract"
  | "pending_payment"
  | "pending_kyc"
  | "active"
  | "suspended"
  | "terminated";

const TERMINAL: ReadonlySet<PartnerStatus> = new Set(["terminated"]);

export function isTerminalStatus(s: PartnerStatus): boolean {
  return TERMINAL.has(s);
}

const ORDER: ReadonlyArray<PartnerStatus> = [
  "pending_contract", "pending_payment", "pending_kyc", "active",
];

function rank(s: PartnerStatus): number {
  return ORDER.indexOf(s);
}

function ensureNotTerminal(s: PartnerStatus, action: string): void {
  if (isTerminalStatus(s)) {
    throw new Error(`${action}: cannot apply to terminal status '${s}'`);
  }
}

export function nextStatusOnContractSigned(current: PartnerStatus): PartnerStatus {
  ensureNotTerminal(current, "contract_signed");
  if (current === "suspended") return "suspended";
  if (rank(current) >= rank("pending_payment")) return current;
  return "pending_payment";
}

export function nextStatusOnLicensePaid(current: PartnerStatus): PartnerStatus {
  ensureNotTerminal(current, "license_paid");
  if (current === "suspended") return "suspended";
  if (rank(current) < rank("pending_payment")) {
    throw new Error(
      `license_paid: out of order, expected at least 'pending_payment', got '${current}'`,
    );
  }
  if (rank(current) >= rank("pending_kyc")) return current;
  return "pending_kyc";
}

export function nextStatusOnKycCompleted(current: PartnerStatus): PartnerStatus {
  ensureNotTerminal(current, "kyc_completed");
  if (current === "suspended") return "suspended";
  if (rank(current) < rank("pending_kyc")) {
    throw new Error(
      `kyc_completed: out of order, expected at least 'pending_kyc', got '${current}'`,
    );
  }
  return "active";
}

export type BadgeVariant = "default" | "warning" | "success" | "destructive" | "muted";

export function partnerStatusBadgeVariant(s: PartnerStatus): BadgeVariant {
  switch (s) {
    case "active":           return "success";
    case "pending_contract":
    case "pending_payment":
    case "pending_kyc":      return "warning";
    case "suspended":        return "muted";
    case "terminated":       return "destructive";
  }
}
