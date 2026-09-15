import type { Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import { byName, type Colors, type Common, datasourceOf, described, head, LAST, panel } from "./fieldConfig.ts"

export type PieChartProps = Common & {
  queries: Target[]
  unit?: string
  donut?: boolean
  /** What to print on the slices. */
  labels?: Array<"name" | "value" | "percent">
  colors?: Colors
  /** Legend to the right (default) or below. */
  legend?: "right" | "bottom"
}

/** Part of a whole at one moment; with more than five or six slices a bar chart reads better. */
export const PieChart = ({
  title,
  description,
  display,
  w = 8,
  h = 8,
  queries,
  unit = "short",
  donut = false,
  labels = ["percent"],
  colors = [],
  legend = "right",
}: PieChartProps): Node =>
  panel(w, h, (id, x, y) =>
    described(
      {
        ...head("piechart", title, id, x, y, w, h, datasourceOf(queries)),
        fieldConfig: { defaults: { unit, color: { mode: "palette-classic" } }, overrides: byName(colors) },
        options: {
          reduceOptions: LAST,
          pieType: donut ? "donut" : "pie",
          displayLabels: labels,
          legend: { displayMode: "list", placement: legend, showLegend: true, values: ["value"] },
          tooltip: { mode: "single", sort: "none" },
        },
        targets: queries.map((query) => query.json),
      },
      description,
      display,
    ),
  )
