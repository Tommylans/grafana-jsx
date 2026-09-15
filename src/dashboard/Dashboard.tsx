import { rowOf } from "../core/layout.ts"
import { type Children, type DashboardNode, flatten, type JsonObject, type Node } from "../core/node.ts"
import { BUILT_IN_ANNOTATIONS } from "./annotations.ts"

export type DashboardProps = {
  /** File name the dashboard is written to, e.g. `traffic.json`. */
  file: string
  title: string
  /** Grafana's stable identity of the dashboard; links and deeplinks use it, so keep it once chosen. */
  uid: string
  tags?: string[]
  description?: string
  /** Default time range, Grafana syntax (`now-7d`). */
  from?: string
  refresh?: string
  timezone?: string
  links?: JsonObject[]
  /** Template variables: `queryVariable`, `customVariable`, … from this package, or Grafana's own JSON. */
  variables?: JsonObject[]
  /** Marks on every time panel: `promqlAnnotation(…)`; Grafana's own annotations and alerts are always first. */
  annotations?: JsonObject[]
  children?: Children
}

/** The root of every dashboard. Children are stacked top to bottom; use `<Row>` to put panels side by side. */
export const Dashboard = ({
  file,
  title,
  uid,
  tags = [],
  description = "",
  from = "now-7d",
  refresh = "5m",
  timezone = "browser",
  links = [],
  variables = [],
  annotations = [],
  children,
}: DashboardProps): DashboardNode => ({
  kind: "dashboard",
  file,
  children: flatten(children).map((node) => {
    if (node.kind === "dashboard") throw new Error("a dashboard inside a dashboard")
    if (node.kind === "stack" || node.kind === "space")
      throw new Error("a stack belongs in layoutMap, not in a dashboard")
    return node
  }),
  render: (panels) => ({
    title,
    uid,
    tags,
    description,
    timezone,
    schemaVersion: 39,
    editable: false,
    refresh,
    graphTooltip: 1,
    time: { from, to: "now" },
    templating: { list: variables },
    annotations: { list: [BUILT_IN_ANNOTATIONS, ...annotations] },
    links,
    panels,
  }),
})

/** Panels side by side, each on its own `w`; the widths add up to at most 24. */
export const Row = ({ children }: { children?: Children }): Node => rowOf(children)
