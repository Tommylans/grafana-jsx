import type { JsonObject, Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import {
  byName,
  type Colors,
  type Common,
  datasourceOf,
  described,
  head,
  panel,
  type Step,
  thresholds,
} from "./fieldConfig.ts"

/** What the legend can print per series; Grafana's reducer ids behind the short names. */
export type LegendValue = "last" | "min" | "max" | "mean" | "sum"
const CALC: Record<LegendValue, string> = { last: "lastNotNull", min: "min", max: "max", mean: "mean", sum: "sum" }

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
  /** Draw a dot on every point: for sparse series where a line alone hides that the points are few. */
  points?: boolean
  min?: number
  max?: number
  /** A list under the panel (default), a table with `legendValues` per series, or none. */
  legend?: "list" | "table" | "hidden"
  /** Numbers next to each series in the legend, in this order. */
  legendValues?: LegendValue[]
  /** Reference levels drawn on the panel (a limit, a target); `thresholdStyle` says how. The series keep their own colors. */
  thresholds?: Step[]
  thresholdStyle?: "line" | "dashed" | "area"
}

export const TimeSeries = ({
  title,
  description,
  display,
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
  points = false,
  min,
  max,
  legend = "list",
  legendValues = [],
  thresholds: steps,
  thresholdStyle = "dashed",
}: TimeSeriesProps): Node =>
  panel(w, h, (id, x, y) => {
    const custom: JsonObject = {
      lineWidth: lineWidth ?? (bars ? 0 : 2),
      fillOpacity: fill ?? (bars ? 80 : 0),
      pointSize: 4,
      showPoints: points ? "always" : "never",
      spanNulls: step,
      axisSoftMin: 0,
      drawStyle: bars ? "bars" : "line",
      lineInterpolation: step ? "stepAfter" : "linear",
      stacking: { mode: stack ? "normal" : "none", group: "A" },
      ...(steps ? { thresholdsStyle: { mode: thresholdStyle } } : {}),
    }
    const defaults: JsonObject = { unit, color: { mode: "palette-classic" }, custom }
    if (decimals !== undefined) defaults.decimals = decimals
    if (min !== undefined) defaults.min = min
    if (max !== undefined) defaults.max = max
    if (steps) defaults.thresholds = thresholds(steps)
    const json = described(
      {
        ...head("timeseries", title, id, x, y, w, h, datasourceOf(queries)),
        ...(interval ? { interval } : {}),
        fieldConfig: { defaults, overrides: [...byName(colors), ...overrides] },
        options: {
          legend: {
            displayMode: legend === "hidden" ? "list" : legend,
            placement: "bottom",
            showLegend: legend !== "hidden",
            calcs: legendValues.map((value) => CALC[value]),
          },
          tooltip: { mode: "multi", sort: "desc" },
        },
        targets: queries.map((query) => query.json),
      },
      description,
      display,
    )
    return repeat ? { ...json, repeat, repeatDirection: "h", maxPerRow: 3 } : json
  })
