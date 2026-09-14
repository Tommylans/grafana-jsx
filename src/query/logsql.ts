import type { Json } from "../core/node.ts"
import type { Datasource, Target } from "./datasource.ts"

export type LogsqlOptions = {
  ref?: string
  /** `raw` lines for a `<Logs>` panel; `range` a `| stats by (_time:…)` series for time panels; `instant`
   * one `| stats` value; `hits` the plugin's own line count over time (what a log volume panel wants). */
  type?: "raw" | "range" | "instant" | "hits"
  legend?: string
}
const QUERY_TYPE = { raw: "instant", range: "statsRange", instant: "stats", hits: "hits" } as const

/** A LogsQL query against a VictoriaLogs datasource. The stream filter goes first:
 * `{kubernetes.pod_namespace="kombu"} error | stats by (_time:1m) count() rows`. */
export const logsql = (
  datasource: Datasource,
  expr: string,
  { ref = "A", type = "raw", legend }: LogsqlOptions = {},
): Target => {
  const json: Record<string, Json> = { refId: ref, datasource, expr, queryType: QUERY_TYPE[type], editorMode: "code" }
  if (legend !== undefined) json.legendFormat = legend
  return { datasource, json }
}
