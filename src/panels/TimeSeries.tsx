import type { JsonObject, Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import { byName, type Colors, type Common, datasourceOf, described, head, panel } from "./fieldConfig.ts"

export type TimeSeriesProps = Common & {
  queries: Target[]
  unit: string
  /** Bars instead of lines; combine with `stack` for part-of-whole over time. */
  bars?: boolean
  stack?: boolean
  colors?: Colors
  overrides?: JsonObject[]
  /** Minimum bucket, e.g. `1h` or `1d`; leave unset to follow the zoom level. */
  interval?: string
  decimals?: number
  fill?: number
  lineWidth?: number
  /** Repeat the panel per value of this dashboard variable (horizontally, three per row). */
  repeat?: string
  /** Step shape, drawn through gaps: for series that only get a point when something changes. */
  step?: boolean
  min?: number
  max?: number
}

export const TimeSeries = ({
  title,
  description,
  w = 12,
  h = 8,
  queries,
  unit,
  bars = false,
  stack = false,
  colors = [],
  overrides = [],
  interval,
  decimals,
  fill,
  lineWidth,
  repeat,
  step = false,
  min,
  max,
}: TimeSeriesProps): Node =>
  panel(w, h, (id, x, y) => {
    const custom: JsonObject = {
      lineWidth: lineWidth ?? (bars ? 0 : 2),
      fillOpacity: fill ?? (bars ? 80 : 0),
      pointSize: 4,
      showPoints: "never",
      spanNulls: step,
      axisSoftMin: 0,
      drawStyle: bars ? "bars" : "line",
      lineInterpolation: step ? "stepAfter" : "linear",
      stacking: { mode: stack ? "normal" : "none", group: "A" },
    }
    const defaults: JsonObject = { unit, color: { mode: "palette-classic" }, custom }
    if (decimals !== undefined) defaults.decimals = decimals
    if (min !== undefined) defaults.min = min
    if (max !== undefined) defaults.max = max
    const json = described(
      {
        ...head("timeseries", title, id, x, y, w, h, datasourceOf(queries)),
        ...(interval ? { interval } : {}),
        fieldConfig: { defaults, overrides: [...byName(colors), ...overrides] },
        options: {
          legend: { displayMode: "list", placement: "bottom", showLegend: true },
          tooltip: { mode: "multi", sort: "desc" },
        },
        targets: queries.map((query) => query.json),
      },
      description,
    )
    return repeat ? { ...json, repeat, repeatDirection: "h", maxPerRow: 3 } : json
  })
