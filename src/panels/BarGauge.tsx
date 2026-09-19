import type { JsonObject, Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import { type Common, described, head, panel, type Step, thresholds } from "./fieldConfig.ts"

export type { Step }
export type BarGaugeProps = Common & {
  query: Target
  unit: string
  min?: number
  max?: number
  /** Color by threshold, or one fixed `color`; not both. */
  thresholds?: Step[]
  color?: string
  nameOnTop?: boolean
}

/** A Loki instant query comes back as one frame with a row per series (a Prometheus instant vector as one
 * frame per series), so the reducer must keep every row or the panel shows a single bar. */
const rowPerSeries = (query: Target) => query.datasource.type === "loki" && query.json.queryType === "instant"

/** Horizontal gauges, one per series. */
export const BarGauge = ({
  title,
  description,
  display,
  repeat,
  w = 12,
  h = 9,
  query,
  unit,
  min = 0,
  max,
  thresholds: steps,
  color,
  nameOnTop = false,
}: BarGaugeProps): Node =>
  panel(w, h, (id, x, y) => {
    if (steps && color) throw new Error(`${title}: choose thresholds or color, a fixed color disables the thresholds`)
    const stepsOrColor = steps ?? [{ color: color ?? "blue", value: null }]
    const defaults: JsonObject = {
      unit,
      min,
      ...(max === undefined ? {} : { max }),
      color: color ? { mode: "fixed", fixedColor: color } : { mode: "thresholds" },
      thresholds: thresholds(stepsOrColor),
    }
    return described(
      {
        ...head("bargauge", title, id, x, y, w, h, query.datasource),
        fieldConfig: { defaults, overrides: [] },
        options: {
          orientation: "horizontal",
          displayMode: "gradient",
          showUnfilled: true,
          valueMode: "color",
          namePlacement: nameOnTop ? "top" : "left",
          sizing: "auto",
          reduceOptions: { calcs: ["lastNotNull"], fields: "", values: rowPerSeries(query) },
        },
        targets: [query.json],
      },
      description,
      display,
      repeat === undefined ? undefined : { variable: repeat, w },
    )
  })
