import type { JsonObject, Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import { type Common, described, head, panel } from "./fieldConfig.ts"

export type StatProps = Common & { query: Target; unit: string; decimals?: number; color?: string }

/** One number, the last value of the query. */
export const Stat = ({
  title,
  description,
  display,
  w = 4,
  h = 4,
  query,
  unit,
  decimals,
  color = "text",
}: StatProps): Node =>
  panel(w, h, (id, x, y) => {
    const defaults: JsonObject = {
      unit,
      color: { mode: "thresholds" },
      thresholds: { mode: "absolute", steps: [{ color, value: null }] },
    }
    if (decimals !== undefined) defaults.decimals = decimals
    return described(
      {
        ...head("stat", title, id, x, y, w, h, query.datasource),
        fieldConfig: { defaults, overrides: [] },
        options: {
          reduceOptions: { calcs: ["lastNotNull"], fields: "", values: false },
          graphMode: "none",
          textMode: "value",
          colorMode: "value",
          justifyMode: "auto",
        },
        targets: [query.json],
      },
      description,
      display,
    )
  })
