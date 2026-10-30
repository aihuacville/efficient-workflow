import type { ActionResult } from "./transition";

/** The HTTP status code for each reason an action can be refused. */
export const REFUSAL_STATUS: Record<Extract<ActionResult, { ok: false }>["reason"], number> = {
  input: 400, // a detail is missing or wrong
  person: 403, // this person isn't allowed
  not_found: 404,
  status: 409, // not possible at this stage
  conflict: 409, // someone else changed the job first
};
