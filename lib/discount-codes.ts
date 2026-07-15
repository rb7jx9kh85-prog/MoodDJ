import type { SelectablePlan } from "@/lib/plans";

type DiscountCodeDefinition = {
  code: string;
  percent: number;
  /** "all" or a specific list of selectable plans this code applies to. */
  plans: "all" | SelectablePlan[];
};

/**
 * Centralised discount-code catalog. The server is the only party that ever
 * decides whether a code is valid and what it's worth. This module must stay
 * server-only in practice: the checkout UI submits a candidate without
 * importing the invitation catalog.
 */
const DISCOUNT_CODES: DiscountCodeDefinition[] = [
  { code: "AMBASSADEUR", percent: 100, plans: "all" },
  { code: "ADMIN", percent: 100, plans: "all" },
];

/** Trim, uppercase, and strip internal whitespace before matching. */
export function normalizeDiscountCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export type DiscountResolution = {
  valid: boolean;
  code: string | null;
  percent: number;
};

/** Resolves a raw user-typed code against the catalog for a given plan. */
export function resolveDiscountCode(
  rawCode: string | null | undefined,
  plan: SelectablePlan
): DiscountResolution {
  if (!rawCode) {
    return { valid: false, code: null, percent: 0 };
  }

  const normalized = normalizeDiscountCode(rawCode);
  if (!normalized) {
    return { valid: false, code: null, percent: 0 };
  }

  const match = DISCOUNT_CODES.find((entry) => entry.code === normalized);
  if (!match) {
    return { valid: false, code: null, percent: 0 };
  }

  if (match.plans !== "all" && !match.plans.includes(plan)) {
    return { valid: false, code: null, percent: 0 };
  }

  return { valid: true, code: match.code, percent: match.percent };
}
