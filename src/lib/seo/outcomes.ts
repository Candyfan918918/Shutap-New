// Legacy data shape for /what-happens/$slug. The route stays live for
// indexed URLs but renders a short noindex page pointing to the joke
// generator. Nothing populates this list.

import type { PillarSlug } from "./hubs";

export const MIN_OUTCOMES = 12;

export interface OutcomeClaim {
  /** Stable id for the underlying confirmed outcome. */
  id: string;
  /** ISO date of the confirmed outcome. */
  date: string;
  /** Pseudonymous author handle (no PII). */
  by: string;
  /** Short, factual statement of what happened. */
  claim: string;
}

export interface OutcomeAggregate {
  slug: string;
  pillar: PillarSlug;
  /** Verbatim question matching the parent situation hub. */
  question: string;
  /** Headline line for the page. */
  headline: string;
  /** Methodology blurb — how aggregation was computed. */
  method: string;
  /** Sample size (confirmed outcomes counted). */
  sampleSize: number;
  /** Last recomputed. */
  updatedAt: string;
  /** Numbered, dated, attributed claims. */
  claims: OutcomeClaim[];
}

// Intentionally empty.
export const OUTCOMES: OutcomeAggregate[] = [];

export function getOutcome(slug: string): OutcomeAggregate | undefined {
  return OUTCOMES.find((o) => o.slug === slug);
}

export function isOutcomeIndexable(o: OutcomeAggregate | undefined): boolean {
  return !!o && o.claims.length >= MIN_OUTCOMES;
}
