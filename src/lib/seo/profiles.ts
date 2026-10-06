// Pseudonym E-E-A-T profiles at /u/$pseudonym.
// No PII. Pseudonym is the only stable identifier.
// Indexable only when the author has accrued enough signal (§8 gate).

export const MIN_PROFILE_SIGNAL = 5; // minimum public activity before indexing

export interface PseudonymProfile {
  pseudonym: string;
  joinedAt: string; // ISO
  storiesShared: number;
  outcomesConfirmed: number;
  sameCount: number;
  hallsReached: string[];
  /** Short, author-written bio. No PII. */
  bio?: string;
}

// Empty until pseudonym profiles exist. The route renders a 404 for unknown
// handles and a noindex empty-state for handles below the signal gate.
export const PROFILES: PseudonymProfile[] = [];

export function getProfile(pseudonym: string): PseudonymProfile | undefined {
  return PROFILES.find((p) => p.pseudonym.toLowerCase() === pseudonym.toLowerCase());
}

export function profileSignal(p: PseudonymProfile): number {
  return p.storiesShared + p.outcomesConfirmed;
}

export function isProfileIndexable(p: PseudonymProfile | undefined): boolean {
  return !!p && profileSignal(p) >= MIN_PROFILE_SIGNAL;
}
