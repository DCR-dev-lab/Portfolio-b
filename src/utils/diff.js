/**
 * Computes field-level diffs between two plain objects for audit logging.
 */
function formatDiffValue(val) {
  if (val === undefined || val === null || val === "") return "(empty)";
  if (Array.isArray(val)) return val.length ? val.join(", ") : "(empty)";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return String(val);
}

function valuesEqual(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  const normA = a === undefined || a === null ? "" : a;
  const normB = b === undefined || b === null ? "" : b;
  return normA === normB;
}

function computeDiff(before = {}, after = {}, fields = []) {
  const changes = [];
  for (const field of fields) {
    const prev = before?.[field];
    const next = after?.[field];
    if (!valuesEqual(prev, next)) {
      changes.push({
        field,
        from: formatDiffValue(prev),
        to: formatDiffValue(next),
      });
    }
  }
  return changes;
}

/**
 * Extracts raw previous values for each changed field so an update can be reverted losslessly.
 */
function extractPreviousValues(before = {}, changes = [], prefix = "") {
  const prev = {};
  for (const c of changes) {
    const key = prefix && c.field.startsWith(prefix) ? c.field.slice(prefix.length) : c.field;
    if (!prefix && c.field.includes(".")) continue;
    if (prefix && !c.field.startsWith(prefix)) continue;
    prev[key] = before?.[key] !== undefined ? before[key] : null;
  }
  return prev;
}

module.exports = { computeDiff, extractPreviousValues };
