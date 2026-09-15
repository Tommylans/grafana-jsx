import type { Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import { byName, type Colors, type Common, described, head, panel } from "./fieldConfig.ts"

export type BarChartProps = Common & {
  /** A table query; `xField` names its category column. */
  query: Target
  unit: string
  colors?: Colors
  xField?: string
}

/** Horizontal bars, one group per category row of the query. */
export const BarChart = ({
  title,
  description,
  display,
  w = 8,
  h = 8,
  query,
  unit,
  colors = [],
  xField = "category",
}: BarChartProps): Node =>
  panel(w, h, (id, x, y) =>
    described(
      {
        ...head("barchart", title, id, x, y, w, h, query.datasource),
        fieldConfig: {
          defaults: {
            unit,
            color: { mode: "palette-classic" },
            custom: { lineWidth: 0, fillOpacity: 80, axisSoftMin: 0 },
          },
          overrides: byName(colors),
        },
        options: {
          orientation: "horizontal",
          xField,
          groupWidth: 0.7,
          barWidth: 0.8,
          showValue: "always",
          stacking: "none",
          legend: { displayMode: "list", placement: "bottom", showLegend: true },
          tooltip: { mode: "multi", sort: "none" },
        },
        targets: [query.json],
      },
      description,
      display,
    ),
  )
