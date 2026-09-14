import type { Datasource, Target } from "./datasource.ts"

export type SqlOptions = { format?: "time_series" | "table"; ref?: string }

/** A SQL query against `datasource`. `time_series` expects the columns `time`, `metric`, `value`;
 * `table` returns rows as they are. Grafana's macros (`$__timeFilter`, `$__timeGroupAlias`, …) are
 * expanded by Grafana, so they stay literal here. */
export const sql = (
  datasource: Datasource,
  text: string,
  { format = "time_series", ref = "A" }: SqlOptions = {},
): Target => ({
  datasource,
  json: { refId: ref, datasource, format, rawQuery: true, rawSql: text.trim() },
})
