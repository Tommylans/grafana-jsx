// Template variables, in the JSON Grafana keeps under `templating.list`. Each helper returns one
// entry; pass them to `<Dashboard variables={[…]}>` and refer to them as `$name` in queries.
import type { Json, JsonObject } from "../core/node.ts"
import type { Datasource } from "../query/datasource.ts"

type Choice = {
  /** Allow several values at once; `includeAll` adds an "All" entry (`allValue` is what it expands to). */
  multi?: boolean
  includeAll?: boolean
  allValue?: string
}
const choice = ({ multi = false, includeAll = false, allValue }: Choice): JsonObject => ({
  multi,
  includeAll,
  ...(allValue === undefined ? {} : { allValue }),
})
const shown = (label: string | undefined): JsonObject => ({ hide: 0, ...(label === undefined ? {} : { label }) })

export type QueryVariable = Choice & {
  name: string
  label?: string
  datasource: Datasource
  /** `label_values(up, node)` on Prometheus, a `select … as __text/__value` on SQL, `fieldValues(…)` on
   * VictoriaLogs; a plugin that keeps its variable query as an object takes that object here. */
  query: string | JsonObject
  /** Keep only what matches, or capture a group: `/^prod-(.*)$/`. */
  regex?: string
  /** Re-run on dashboard load (default) or whenever the time range changes. */
  refresh?: "load" | "time"
  sort?: "none" | "alpha" | "alpha-desc" | "numeric" | "numeric-desc"
}
const SORT = { none: 0, alpha: 1, "alpha-desc": 2, numeric: 3, "numeric-desc": 4 } as const

/** A variable whose choices come from a query. */
export const queryVariable = ({
  name,
  label,
  datasource,
  query,
  regex,
  refresh = "load",
  sort = "alpha",
  ...rest
}: QueryVariable): JsonObject => ({
  type: "query",
  name,
  ...shown(label),
  datasource,
  definition: typeof query === "string" ? query : JSON.stringify(query),
  // Prometheus-style sources take an object, SQL sources the bare string, other plugins their own object.
  query: typeof query === "string" && datasource.type === "prometheus" ? { query, refId: `var-${name}` } : query,
  ...(regex === undefined ? {} : { regex }),
  refresh: refresh === "time" ? 2 : 1,
  sort: SORT[sort],
  ...choice(rest),
  current: {},
  options: [],
})

export type CustomVariable = Choice & { name: string; label?: string; values: string[]; current?: string }
/** A variable with a fixed list of choices. */
export const customVariable = ({ name, label, values, current, ...rest }: CustomVariable): JsonObject => {
  const selected = current ?? values[0] ?? ""
  return {
    type: "custom",
    name,
    ...shown(label),
    query: values.join(","),
    options: values.map((value) => ({ text: value, value, selected: value === selected })),
    current: { text: selected, value: selected },
    ...choice(rest),
  }
}

/** A step size the user picks (`$name` in queries); `auto` derives one from the time range. */
export const intervalVariable = ({
  name,
  label,
  values,
  auto = false,
}: {
  name: string
  label?: string
  values: string[]
  auto?: boolean
}): JsonObject => ({
  type: "interval",
  name,
  ...shown(label),
  query: values.join(","),
  options: values.map((value, i) => ({ text: value, value, selected: i === 0 })),
  current: { text: values[0] ?? "", value: values[0] ?? "" },
  auto,
  auto_count: 30,
  auto_min: "10s",
})

/** A free text field. */
export const textboxVariable = ({
  name,
  label,
  value = "",
}: {
  name: string
  label?: string
  value?: string
}): JsonObject => ({
  type: "textbox",
  name,
  ...shown(label),
  query: value,
  current: { text: value, value },
  options: [{ text: value, value, selected: true }],
})

/** Pick a datasource of one plugin type (`prometheus`, `grafana-postgresql-datasource`, …). */
export const datasourceVariable = ({
  name,
  label,
  type,
  regex,
}: {
  name: string
  label?: string
  type: string
  regex?: string
}): JsonObject => ({
  type: "datasource",
  name,
  ...shown(label),
  query: type,
  ...(regex === undefined ? {} : { regex }),
  refresh: 1,
  current: {},
  options: [],
})

/** The variable as it is written in a query: `$name`. */
export const ref = (name: string): string => `$${name}`

export type { Json }
