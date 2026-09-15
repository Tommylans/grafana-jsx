import type { Json } from "../core/node.ts"
import type { Datasource, Target } from "./datasource.ts"

export type PromqlOptions = { legend?: string; ref?: string; instant?: boolean; format?: "table" }

/** A PromQL query against `datasource`. `instant` asks for one value (tables, stats); `format: "table"`
 * shapes the result as columns for transformations. */
export const promql = (
  datasource: Datasource,
  expr: string | { toString(): string },
  { legend = "__auto", ref = "A", instant = false, format }: PromqlOptions = {},
): Target => {
  const json: Record<string, Json> = {
    refId: ref,
    datasource,
    expr: String(expr),
    legendFormat: legend,
    instant,
    range: !instant,
    editorMode: "code",
  }
  if (format) json.format = format
  return { datasource, json }
}

/** Letters A, B, C, … for the targets of one panel. */
export const refId = (i: number) => (i < 26 ? String.fromCharCode(65 + i) : `R${i}`)
/** Grafana's rate window variable, for `rate(...[$__rate_interval])`. */
export const RATE = "[$__rate_interval]"
