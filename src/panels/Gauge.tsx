import type { Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import { type Common, described, head, LAST, panel, type Step, thresholds } from "./fieldConfig.ts"

export type GaugeProps = Common & {
  query: Target
  unit: string
  min?: number
  max: number
  /** Color by threshold; the base step colors the arc below the first value. */
  thresholds: Step[]
  decimals?: number
  /** Print the threshold values around the arc. */
  labels?: boolean
}

/** One value on an arc between `min` and `max`, colored by its threshold. */
export const Gauge = ({
  title,
  description,
  display,
  w = 4,
  h = 5,
  query,
  unit,
  min = 0,
  max,
  thresholds: steps,
  decimals,
  labels = false,
}: GaugeProps): Node =>
  panel(w, h, (id, x, y) =>
    described(
      {
        ...head("gauge", title, id, x, y, w, h, query.datasource),
        fieldConfig: {
          defaults: {
            unit,
            min,
            max,
            ...(decimals === undefined ? {} : { decimals }),
            color: { mode: "thresholds" },
            thresholds: thresholds(steps),
          },
          overrides: [],
        },
        options: {
          reduceOptions: LAST,
          orientation: "auto",
          showThresholdLabels: labels,
          showThresholdMarkers: true,
          sizing: "auto",
        },
        targets: [query.json],
      },
      description,
      display,
    ),
  )
