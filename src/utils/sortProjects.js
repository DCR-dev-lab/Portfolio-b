/**
 * Sorts projects by hierarchy:
 * 1. Featured projects first
 * 2. Explicit positive `order` (1, 2, 3...) ascending; unordered (0 / null / undefined) after
 * 3. Newest `createdAt` first as tie-breaker
 */
function sortProjects(projects) {
  return [...projects].sort((a, b) => {
    if (Boolean(a.featured) !== Boolean(b.featured)) {
      return a.featured ? -1 : 1;
    }

    const orderA = Number(a.order) > 0 ? Number(a.order) : Number.MAX_SAFE_INTEGER;
    const orderB = Number(b.order) > 0 ? Number(b.order) : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

module.exports = { sortProjects };
