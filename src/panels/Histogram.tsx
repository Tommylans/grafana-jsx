import type { Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import {
  byName,
  type Colors,
  type Common,
  datasourceOf,
  head,
  LEGEND_BOTTOM,
  panel,
  TOOLTIP_SINGLE,
  withCommon,
} from "./fieldConfig.ts"

export type HistogramProps = Common & {
  queries: Target[]
  unit: string
  /** Width of one bucket in the unit of the values; unset lets Grafana pick. */
  bucketSize?: number
  /** Overlay all series in one histogram instead of one per series. */
  combine?: boolean
  colors?: Colors
}

/** How the values of a series are spread: bars per bucket, counted over the time range. */
export const Histogram = ({
  title,
  description,
  display,
  repeat,
  links,
  transformations,
  w = 12,
  h = 8,
  queries,
  unit,
  bucketSize,
  combine = false,
  colors = [],
}: HistogramProps): Node =>
  panel(w, h, (id, x, y) =>
    withCommon(
      {
        ...head("histogram", title, id, x, y, w, h, datasourceOf(queries)),
        fieldConfig: {
          defaults: {
            unit,
            color: { mode: "palette-classic" },
            custom: { lineWidth: 1, fillOpacity: 80, gradientMode: "none" },
          },
          overrides: byName(colors),
        },
        options: {
          ...(bucketSize === undefined ? {} : { bucketSize }),
          bucketOffset: 0,
          combine,
          legend: LEGEND_BOTTOM,
          tooltip: TOOLTIP_SINGLE,
        },
        targets: queries.map((query) => query.json),
      },
      { description, display, repeat, links, transformations, w },
    ),
  )
