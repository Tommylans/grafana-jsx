import type { Json, JsonObject } from "../core/node.ts"
import type { Datasource, Target } from "./datasource.ts"

export type LogsqlOptions = {
  ref?: string
  /** `raw` lines for a `<Logs>` panel; `range` a `| stats by (_time:…)` series for time panels; `instant`
   * one `| stats` value; `hits` the plugin's own line count over time (what a log volume panel wants). */
  type?: "raw" | "range" | "instant" | "hits"
  legend?: string
  /** For `hits`: count per value of these fields (the expression stays a plain filter, no `| stats`). */
  fields?: string[]
  /** For `raw`: how many lines at most. */
  limit?: number
  /** For `range` and `hits`: the bucket, e.g. `1m`; unset follows the panel interval. */
  step?: string
}
const QUERY_TYPE = { raw: "instant", range: "statsRange", instant: "stats", hits: "hits" } as const

/** A LogsQL query against a VictoriaLogs datasource. The stream filter goes first:
 * `{kubernetes.pod_namespace="app"} error | stats by (_time:1m) count() rows`. A dashboard
 * variable in a filter (`{kubernetes.pod_namespace=$namespace}`) is expanded by the plugin to an
 * `in(…)` list, and "All" to `in(*)`; do not wrap it in a regex. */
export const logsql = (
  datasource: Datasource,
  expr: string,
  { ref = "A", type = "raw", legend, fields, limit, step }: LogsqlOptions = {},
): Target => {
  const json: Record<string, Json> = { refId: ref, datasource, expr, queryType: QUERY_TYPE[type], editorMode: "code" }
  if (legend !== undefined) json.legendFormat = legend
  if (fields !== undefined) json.fields = fields
  if (limit !== undefined) json.maxLines = limit
  if (step !== undefined) json.step = step
  return { datasource, json }
}

/** The values of a field as a dashboard variable on a VictoriaLogs datasource (`queryVariable({ query:
 * fieldValues("kubernetes.pod_namespace") })`); `filter` narrows which lines are looked at. */
export const fieldValues = (field: string, filter = "*"): JsonObject => ({ type: "fieldValue", field, query: filter })
/** The names of all fields as a dashboard variable on a VictoriaLogs datasource. */
export const fieldNames = (filter = "*"): JsonObject => ({ type: "fieldName", query: filter })
