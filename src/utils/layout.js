/**
 * Choose a column count that spreads `count` items across as few rows as
 * possible while keeping rows balanced, so the grid fills the row width
 * without leaving large gaps in the last row.
 *
 * Examples (maxCols = 4): 4→4, 5→3 (3+2), 6→3 (3+3), 7→4 (4+3), 8→4 (4+4).
 */
export function balancedColumns(count, maxCols) {
  if (!count || count < 1) return 1
  const rows = Math.ceil(count / maxCols)
  return Math.ceil(count / rows)
}

/** Inline grid-template-columns value for `n` equal-width columns. */
export function gridColumnsStyle(n) {
  return `repeat(${n}, minmax(0, 1fr))`
}
