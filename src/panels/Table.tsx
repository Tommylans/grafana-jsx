import type { Json, JsonObject, Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import { type Common, datasourceOf, described, head, panel } from "./fieldConfig.ts"

export type TableProps = Common & {
  queries: Target[]
  /** Overrides per column name; see `col`. */
  columns?: Json[]
  sort?: { by: string; desc?: boolean }
  filterable?: boolean
  transformations?: Json[]
  /** Replaces the default cell formatting entirely. */
  defaults?: JsonObject
}

export const Table = ({
  title,
  description,
  w = 12,
  h = 9,
  queries,
  columns = [],
  sort,
  filterable = false,
  transformations,
  defaults,
}: TableProps): Node =>
  panel(w, h, (id, x, y) => {
    const json = described(
      {
        ...head("table", title, id, x, y, w, h, datasourceOf(queries)),
        fieldConfig: {
          defaults: defaults ?? { custom: { align: "auto", cellOptions: { type: "auto" }, filterable } },
          overrides: [...columns],
        },
        options: {
          showHeader: true,
          cellHeight: "sm",
          footer: { show: false },
          sortBy: sort ? [{ displayName: sort.by, desc: sort.desc ?? false }] : [],
        },
        targets: queries.map((query) => query.json),
      },
      description,
    )
    return transformations ? { ...json, transformations } : json
  })
