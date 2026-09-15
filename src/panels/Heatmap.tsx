import type { Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import { type Common, datasourceOf, described, head, panel } from "./fieldConfig.ts"

export type HeatmapProps = Common & {
  queries: Target[]
  /** Bucket raw values here (`calculate`) instead of reading pre-bucketed series (a Prometheus histogram). */
  calculate?: boolean
  /** Bucket size on the time axis when calculating, e.g. `1h`. */
  xBucket?: string
  /** Number of buckets on the value axis when calculating. */
  yBuckets?: number
  /** A single-hue scheme, e.g. `Blues`, `Oranges`, `Greens`. */
  scheme?: string
  /** Unit of the value axis. */
  unit?: string
  /** Unit of the cell values (counts by default). */
  cellUnit?: string
}

/** Magnitude on a grid of time × value, one hue from light to dark. */
export const Heatmap = ({
  title,
  description,
  display,
  w = 12,
  h = 8,
  queries,
  calculate = false,
  xBucket,
  yBuckets,
  scheme = "Blues",
  unit,
  cellUnit = "short",
}: HeatmapProps): Node =>
  panel(w, h, (id, x, y) =>
    described(
      {
        ...head("heatmap", title, id, x, y, w, h, datasourceOf(queries)),
        fieldConfig: {
          defaults: {
            custom: { scaleDistribution: { type: "linear" }, hideFrom: { tooltip: false, viz: false, legend: false } },
          },
          overrides: [],
        },
        options: {
          calculate,
          ...(calculate
            ? {
                calculation: {
                  ...(xBucket ? { xBuckets: { mode: "size", value: xBucket } } : {}),
                  ...(yBuckets ? { yBuckets: { mode: "count", value: String(yBuckets) } } : {}),
                },
              }
            : {}),
          color: { mode: "scheme", scheme, steps: 64, reverse: false, fill: "dark-orange", exponent: 0.5 },
          cellGap: 1,
          cellValues: { unit: cellUnit },
          yAxis: { axisPlacement: "left", reverse: false, ...(unit ? { unit } : {}) },
          rowsFrame: { layout: "auto" },
          showValue: "never",
          filterValues: { le: 1e-9 },
          legend: { show: true },
          tooltip: { mode: "single", yHistogram: false, showColorScale: false },
          exemplars: { color: "rgba(255,0,255,0.7)" },
        },
        targets: queries.map((query) => query.json),
      },
      description,
      display,
    ),
  )
