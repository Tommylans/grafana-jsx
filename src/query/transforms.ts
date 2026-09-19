// Grafana's transformations: what a panel does to the query result before it draws it. Each helper
// returns the exact `{ id, options }` the UI writes, so a panel says what it reshapes instead of
// carrying a block of hand-written JSON.
import type { JsonObject } from "../core/node.ts"

/** One entry of a panel's `transformations`. */
export type Transformation = { id: string; options: JsonObject }

/** Grafana's reducer ids: what a transformation (or a legend) calculates over a series. */
export type Reducer = "lastNotNull" | "last" | "first" | "min" | "max" | "mean" | "sum" | "count" | "range" | "diff"

/** Every frame joined on one field, so series that share a timestamp or a name land on one row.
 * `outer` keeps every row of every frame, `inner` only the rows all frames have. */
export const joinByField = (field: string, mode: "outer" | "inner" | "outerTabular" = "outer"): Transformation => ({
  id: "joinByField",
  options: { byField: field, mode },
})

/** Columns hidden, renamed and reordered in one step; `order` lists the columns that get a fixed
 * place, the rest keep theirs. This is the one that turns raw label names into a readable table. */
export const organize = ({
  exclude = [],
  rename = {},
  order = [],
}: {
  exclude?: string[]
  rename?: Record<string, string>
  order?: string[]
}): Transformation => ({
  id: "organize",
  options: {
    excludeByName: Object.fromEntries(exclude.map((name) => [name, true])),
    renameByName: rename,
    indexByName: Object.fromEntries(order.map((name, index) => [name, index])),
  },
})

/** A column name, or a constant when it is a number. */
export type Operand = string | number
// Grafana keeps both sides of a binary operation as an object: a field matcher or a fixed value.
const operand = (value: Operand): JsonObject =>
  typeof value === "number" ? { fixed: String(value) } : { matcher: { id: "byName", options: value } }

/** What a calculated column is: a reduction across the columns of a row, or two operands combined. */
export type Calculation =
  | { reduce: Reducer; of?: string[] }
  | { left: Operand; operator: "+" | "-" | "*" | "/"; right: Operand }

/** A column calculated from the others: `calculateField("busy", { left: "used", operator: "/", right: "total" })`
 * or `calculateField("total", { reduce: "sum", of: ["a", "b"] })`. `replace` drops the columns it read. */
export const calculateField = (
  alias: string,
  how: Calculation,
  { replace = false }: { replace?: boolean } = {},
): Transformation => ({
  id: "calculateField",
  options: {
    alias,
    replaceFields: replace,
    ...("reduce" in how
      ? { mode: "reduceRow", reduce: { reducer: how.reduce, ...(how.of === undefined ? {} : { include: how.of }) } }
      : { mode: "binary", binary: { left: operand(how.left), operator: how.operator, right: operand(how.right) } }),
  },
})

/** Sorts the rows by one column. Grafana keeps a list but reads only the first entry. */
export const sortBy = (field: string, desc = false): Transformation => ({
  id: "sortBy",
  options: { sort: [{ field, desc }] },
})

/** One row per series instead of one column per series: every series of a query becomes a row with its
 * labels as columns, its whole shape in a `Trend` column a `sparkline` cell draws, and `stat` reduced
 * to one number. The key is the query's `ref` (`A` unless the target says otherwise). */
export const timeSeriesTable = (stats: Record<string, Reducer>): Transformation => ({
  id: "timeSeriesTable",
  options: Object.fromEntries(Object.entries(stats).map(([ref, stat]) => [ref, { stat }])),
})

/** The column `timeSeriesTable` puts a query's shape in, to give it a `sparkline` cell with `col()`. */
export const trend = (ref: string): string => `Trend #${ref}`
