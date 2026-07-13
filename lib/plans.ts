export const SELECTABLE_PLANS = [
  "free",
  "starter",
  "creator",
  "unlimited",
] as const;

export type SelectablePlan =
  (typeof SELECTABLE_PLANS)[number];

export type ActivePlan =
  | "free"
  | "flow"
  | "flow_sync"
  | "lifetime";

export interface PlanConfiguration {
  priceCents: number;
  currency: "CHF";
  activePlan: ActivePlan;
}

export const PLAN_CATALOG: Record<
  SelectablePlan,
  PlanConfiguration
> = {
  free: {
    priceCents: 0,
    currency: "CHF",
    activePlan: "free",
  },

  starter: {
    priceCents: 490,
    currency: "CHF",
    activePlan: "flow",
  },

  creator: {
    priceCents: 790,
    currency: "CHF",
    activePlan: "flow_sync",
  },

  unlimited: {
    priceCents: 1500,
    currency: "CHF",
    activePlan: "lifetime",
  },
};

export function isSelectablePlan(
  value: unknown
): value is SelectablePlan {
  return (
    typeof value === "string" &&
    (SELECTABLE_PLANS as readonly string[]).includes(value)
  );
}

export function formatChf(cents: number): string {
  const normalizedCents = Math.max(
    0,
    Math.round(cents)
  );

  const amount = normalizedCents / 100;

  const decimals =
    normalizedCents % 100 === 0 ? 0 : 2;

  return `${amount
    .toFixed(decimals)
    .replace(".", ",")} CHF`;
}