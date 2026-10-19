/**
 * Dispatch scoring. See README → "Dispatch Algorithm".
 * Eligibility filtering (service type, service area, active/verified) happens in SQL;
 * this module ranks the candidates that survive the filter.
 */

export interface Candidate {
  businessId: string;
  /** Distance from the job to the business, in meters. */
  distanceMeters: number;
  /** Average rating on a 0–5 scale. */
  rating: number;
  /** Share of capacity still free on or before the due date, 0–1. */
  capacityAvailable: number;
  /** Share of past offers accepted, 0–1. */
  acceptanceRate: number;
}

export interface Weights {
  distance: number;
  rating: number;
  capacity: number;
  acceptance: number;
}

export const DEFAULT_WEIGHTS: Weights = { distance: 0.4, rating: 0.25, capacity: 0.2, acceptance: 0.15 };

export const DEFAULT_MAX_RADIUS_METERS = 40_000;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function score(
  c: Candidate,
  weights: Weights = DEFAULT_WEIGHTS,
  maxRadiusMeters = DEFAULT_MAX_RADIUS_METERS,
): number {
  return (
    weights.distance * clamp01(1 - c.distanceMeters / maxRadiusMeters) +
    weights.rating * clamp01(c.rating / 5) +
    weights.capacity * clamp01(c.capacityAvailable) +
    weights.acceptance * clamp01(c.acceptanceRate)
  );
}

export interface RankedCandidate extends Candidate {
  score: number;
}

/**
 * Highest score first. Candidates outside the radius or with no capacity are dropped.
 * Ties break on distance, then businessId, so the order is deterministic.
 */
export function rankCandidates(
  candidates: readonly Candidate[],
  weights: Weights = DEFAULT_WEIGHTS,
  maxRadiusMeters = DEFAULT_MAX_RADIUS_METERS,
): RankedCandidate[] {
  return candidates
    .filter((c) => c.distanceMeters <= maxRadiusMeters && c.capacityAvailable > 0)
    .map((c) => ({ ...c, score: score(c, weights, maxRadiusMeters) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.distanceMeters - b.distanceMeters ||
        a.businessId.localeCompare(b.businessId),
    );
}
