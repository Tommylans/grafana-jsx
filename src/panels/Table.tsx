import type { Json, JsonObject, Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import { type Common, datasourceOf, head, panel, withCommon } from "./fieldConfig.ts"

export type TableProps = Common & {
  queries: Target[]
  /** Overrides per column name; see `col`. */
  columns?: Json[]
  sort?: { by: string; desc?: boolean }
  filterable?: boolean
  /** Row height. A `sparkline` cell needs `md` or `lg`: in a small row the line is a few pixels tall
   * and says nothing. */
  rowHeight?: "sm" | "md" | "lg"
  /** Replaces the default cell formatting entirely. */
  defaults?: JsonObject
}

export const Table = ({
  title,
  description,
  display,
  repeat,
  links,
  transformations,
  w = 12,
  h = 9,
  queries,
  columns = [],
  sort,
  filterable = false,
  rowHeight = "sm",
  defaults,
}: TableProps): Node =>
  panel(w, h, (id, x, y) =>
    withCommon(
      {
        ...head("table", title, id, x, y, w, h, datasourceOf(queries)),
        fieldConfig: {
          defaults: defaults ?? { custom: { align: "auto", cellOptions: { type: "auto" }, filterable } },
          overrides: [...columns],
        },
        options: {
          showHeader: true,
          cellHeight: rowHeight,
          footer: { show: false },
          sortBy: sort ? [{ displayName: sort.by, desc: sort.desc ?? false }] : [],
        },
        targets: queries.map((query) => query.json),
      },
      { description, display, repeat, links, transformations, w },
    ),
  )
