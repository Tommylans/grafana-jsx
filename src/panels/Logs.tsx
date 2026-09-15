import type { Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import { type Common, datasourceOf, described, head, panel } from "./fieldConfig.ts"

export type LogsProps = Common & {
  queries: Target[]
  /** Newest first by default. */
  oldestFirst?: boolean
  showTime?: boolean
  /** Show the stream labels next to each line, and the labels all lines share above them. */
  labels?: boolean
  wrap?: boolean
  /** Pretty-print JSON lines. */
  prettify?: boolean
  /** Fold identical lines: `exact` on the whole line, `numbers` ignoring digits, `signature` ignoring everything but punctuation. */
  dedup?: "none" | "exact" | "numbers" | "signature"
}

/** Log lines, with the details view per line and infinite scrolling. */
export const Logs = ({
  title,
  description,
  w = 24,
  h = 12,
  queries,
  oldestFirst = false,
  showTime = true,
  labels = false,
  wrap = true,
  prettify = false,
  dedup = "none",
}: LogsProps): Node =>
  panel(w, h, (id, x, y) =>
    described(
      {
        ...head("logs", title, id, x, y, w, h, datasourceOf(queries)),
        fieldConfig: { defaults: {}, overrides: [] },
        options: {
          showTime,
          showLabels: labels,
          showCommonLabels: labels,
          wrapLogMessage: wrap,
          prettifyLogMessage: prettify,
          enableLogDetails: true,
          enableInfiniteScrolling: true,
          dedupStrategy: dedup,
          sortOrder: oldestFirst ? "Ascending" : "Descending",
        },
        targets: queries.map((query) => query.json),
      },
      description,
    ),
  )
