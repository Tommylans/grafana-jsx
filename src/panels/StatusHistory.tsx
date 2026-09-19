import type { Node } from "../core/node.ts"
import { datasourceOf, head, LEGEND_BOTTOM, panel, TOOLTIP_SINGLE, withCommon } from "./fieldConfig.ts"
import { type StateProps, stateDefaults } from "./StateTimeline.tsx"

/** One lane per series, a colored cell per sample: the same data as a state timeline, bucketed. */
export const StatusHistory = ({
  title,
  description,
  display,
  repeat,
  links,
  transformations,
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
    withCommon(
      {
        ...head("status-history", title, id, x, y, w, h, datasourceOf(queries)),
        fieldConfig: { defaults: stateDefaults(values, steps, unit), overrides: [] },
        options: { showValue, rowHeight, colWidth: 0.9, legend: LEGEND_BOTTOM, tooltip: TOOLTIP_SINGLE },
        targets: queries.map((query) => query.json),
      },
      { description, display, repeat, links, transformations, w },
    ),
  )
