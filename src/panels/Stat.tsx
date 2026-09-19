import type { JsonObject, Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import { type Common, head, panel, type Step, thresholds, withCommon } from "./fieldConfig.ts"

export type StatProps = Common & {
  query: Target
  unit: string
  decimals?: number
  /** One fixed color, or `thresholds` to color by the value; not both. */
  color?: string
  thresholds?: Step[]
  /** Fill the whole panel with the color instead of only the number: for the few numbers that must be seen first. */
  background?: boolean
  /** A small area graph of the series behind the number; the query has to return a time series for it to draw. */
  sparkline?: boolean
}

/** One number, the last value of the query. */
export const Stat = ({
  title,
  description,
  display,
  repeat,
  links,
  transformations,
  w = 4,
  h = 4,
  query,
  unit,
  decimals,
  color,
  thresholds: steps,
  background = false,
  sparkline = false,
}: StatProps): Node =>
  panel(w, h, (id, x, y) => {
    if (steps && color) throw new Error(`${title}: choose thresholds or color, a fixed color disables the thresholds`)
    const defaults: JsonObject = {
      unit,
      color: { mode: "thresholds" },
      thresholds: thresholds(steps ?? [{ color: color ?? "text", value: null }]),
    }
    if (decimals !== undefined) defaults.decimals = decimals
    return withCommon(
      {
        ...head("stat", title, id, x, y, w, h, query.datasource),
        fieldConfig: { defaults, overrides: [] },
        options: {
          reduceOptions: { calcs: ["lastNotNull"], fields: "", values: false },
          graphMode: sparkline ? "area" : "none",
          textMode: "value",
          colorMode: background ? "background" : "value",
          justifyMode: "auto",
        },
        targets: [query.json],
      },
      { description, display, repeat, links, transformations, w },
    )
  })
