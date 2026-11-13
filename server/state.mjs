// Validation for the tournament state. Nothing is stored unless it passes these checks.

const KEY = /^[A-Za-z0-9]{1,4}$/;
const MAX_KEYS = 200;

const isSet = (n) => n === null || (Number.isInteger(n) && n >= 0 && n <= 9);

const validators = {
  // [sets for player 1, sets for player 2]; either side may still be empty (null)
  scores: (v) => (Array.isArray(v) && v.length === 2 && v.every(isSet) && !(v[0] === null && v[1] === null) ? [v[0], v[1]] : undefined),
  ko: (v) => validators.scores(v),
  // renamed players
  names: (v) => (typeof v === "string" && v.trim().length > 0 && v.trim().length <= 60 ? v.trim() : undefined),
  // manual final rank in a group: 1 or 2
  rank: (v) => (v === 1 || v === 2 ? v : undefined),
};

export const emptyState = () => ({ scores: {}, ko: {}, names: {}, rank: {} });

// Returns a safe copy of any input, dropping everything that is not valid.
export function cleanState(input) {
  const out = emptyState();
  if (!input || typeof input !== "object") return out;
  for (const store of Object.keys(validators)) {
    const src = input[store];
    if (!src || typeof src !== "object" || Array.isArray(src)) continue;
    for (const key of Object.keys(src).slice(0, MAX_KEYS)) {
      if (!KEY.test(key)) continue;
      const v = validators[store](src[key]);
      if (v !== undefined) out[store][key] = v;
    }
  }
  return out;
}

// Applies a list of small changes: { store, key, value }. A null value removes the entry.
export function applyOps(state, ops) {
  if (!Array.isArray(ops) || ops.length === 0 || ops.length > 50) throw new Error("Bad change list");
  const next = cleanState(state);
  for (const op of ops) {
    if (!op || !Object.hasOwn(validators, op.store) || typeof op.key !== "string" || !KEY.test(op.key)) throw new Error("Bad change");
    if (op.value === null || op.value === undefined) {
      delete next[op.store][op.key];
      continue;
    }
    const v = validators[op.store](op.value);
    if (v === undefined) throw new Error("Bad value");
    next[op.store][op.key] = v;
  }
  return next;
}
