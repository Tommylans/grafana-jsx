import type { JsonObject, Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import {
  type Common,
  datasourceOf,
  described,
  head,
  LEGEND_BOTTOM,
  panel,
  type Step,
  TOOLTIP_SINGLE,
  thresholds,
  type ValueMap,
  valueMap,
} from "./fieldConfig.ts"

export type StateProps = Common & {
  queries: Target[]
  /** Text and color per value (`{ "0": { text: "down", color: "red" }, "1": { text: "up", color: "green" } }`). */
  values?: ValueMap
  /** Color by threshold when the value is a number rather than a state. */
  thresholds?: Step[]
  unit?: string
  showValue?: "auto" | "always" | "never"
  /** Height of a row as a fraction of the space it gets. */
  rowHeight?: number
}

export const stateDefaults = (
  values: ValueMap | undefined,
  steps: Step[] | undefined,
  unit: string | undefined,
): JsonObject => ({
  ...(unit === undefined ? {} : { unit }),
  color: { mode: steps ? "thresholds" : "palette-classic" },
  thresholds: thresholds(steps ?? [{ color: "text", value: null }]),
  mappings: values ? valueMap(values) : [],
  custom: { lineWidth: 0, fillOpacity: 70 },
})

/** One lane per series, a colored band per state and how long it lasted. */
export const StateTimeline = ({
  title,
  description,
  display,
  w = 24,
  h = 8,
  queries,
  values,
  thresholds: steps,
  unit,
  showValue = "auto",
  rowHeight = 0.9,
}: StateProps): Node =>
  panel(w, h, (id, x, y) =>
    described(
      {
        ...head("state-timeline", title, id, x, y, w, h, datasourceOf(queries)),
        fieldConfig: { defaults: stateDefaults(values, steps, unit), overrides: [] },
        options: {
          mergeValues: true,
          showValue,
          alignValue: "left",
          rowHeight,
          legend: LEGEND_BOTTOM,
          tooltip: TOOLTIP_SINGLE,
        },
        targets: queries.map((query) => query.json),
      },
      description,
      display,
    ),
  )
