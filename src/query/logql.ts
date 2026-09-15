import type { Json, JsonObject } from "../core/node.ts"
import type { Datasource, Target } from "./datasource.ts"

export type LogqlOptions = {
  ref?: string
  /** `range` (default) for lines and series over the time range; `instant` for one value per series. */
  type?: "range" | "instant"
  legend?: string
  /** For a log query on a `<Logs>` panel: how many lines at most. */
  limit?: number
  /** For a metric query: the bucket, e.g. `1m`; unset follows the panel interval. */
  step?: string
}

/** A LogQL query against a Loki datasource. A log query is a stream selector with filters
 * (`{namespace="app"} |= "error"`), a metric query wraps it (`sum by (pod) (count_over_time({…}[$__auto]))`).
 * A dashboard variable in a selector is a regex match on its values: `{namespace=~"$namespace"}`. */
export const logql = (
  datasource: Datasource,
  expr: string,
  { ref = "A", type = "range", legend, limit, step }: LogqlOptions = {},
): Target => {
  const json: Record<string, Json> = { refId: ref, datasource, expr, queryType: type, editorMode: "code" }
  if (legend !== undefined) json.legendFormat = legend
  if (limit !== undefined) json.maxLines = limit
  if (step !== undefined) json.step = step
  return { datasource, json }
}

/** The values of a label as a dashboard variable on a Loki datasource (`queryVariable({ query:
 * labelValues("namespace") })`); `stream` narrows which streams are looked at (`{namespace="$namespace"}`). */
export const labelValues = (label: string, stream?: string): JsonObject => ({
  refId: "LokiVariableQueryEditor-VariableQuery",
  type: 1,
  label,
  ...(stream === undefined ? {} : { stream }),
})
