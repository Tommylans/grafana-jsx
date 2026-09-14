import type { JsonObject, Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import { type Common, described, head, panel } from "./shared.ts"

export type Step = { color: string; value: number | null }
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

/** Horizontal gauges, one per series. */
export const BarGauge = ({
  title,
  description,
  w = 12,
  h = 9,
  query,
  unit,
  min = 0,
  max,
  thresholds,
  color,
  nameOnTop = false,
}: BarGaugeProps): Node =>
  panel(w, h, (id, x, y) => {
    if (thresholds && color)
      throw new Error(`${title}: choose thresholds or color, a fixed color disables the thresholds`)
    const steps = thresholds ?? [{ color: color ?? "blue", value: null }]
    const defaults: JsonObject = {
      unit,
      min,
      ...(max === undefined ? {} : { max }),
      color: color ? { mode: "fixed", fixedColor: color } : { mode: "thresholds" },
      thresholds: { mode: "absolute", steps },
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
          reduceOptions: { calcs: ["lastNotNull"], fields: "", values: false },
        },
        targets: [query.json],
      },
      description,
    )
  })
