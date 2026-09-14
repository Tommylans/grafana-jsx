// Annotations mark moments on every time panel of a dashboard: a deploy, a restart, an alert.
import type { JsonObject } from "../core/node.ts"
import type { Datasource } from "../query/datasource.ts"

export type PromqlAnnotation = {
  name: string
  datasource: Datasource
  /** A PromQL expression; every non-zero sample is a mark. `changes(kube_pod_created[5m]) > 0` and the like. */
  expr: string
  color?: string
  /** Title and text per mark; `{{label}}` reads a label of the series. */
  title?: string
  text?: string
  /** Start hidden; the user can switch it on in the dashboard settings. */
  hidden?: boolean
}

/** Marks from a Prometheus-compatible query. */
export const promqlAnnotation = ({
  name,
  datasource,
  expr,
  color = "orange",
  title = "",
  text = "",
  hidden = false,
}: PromqlAnnotation): JsonObject => ({
  name,
  datasource,
  enable: !hidden,
  hide: false,
  iconColor: color,
  expr,
  step: "",
  titleFormat: title,
  textFormat: text,
  useValueForTime: false,
})

/** Grafana's own annotations and alert marks; every dashboard carries this one first. */
export const BUILT_IN_ANNOTATIONS: JsonObject = {
  builtIn: 1,
  datasource: { type: "grafana", uid: "-- Grafana --" },
  enable: true,
  hide: true,
  iconColor: "rgba(0, 211, 255, 1)",
  name: "Annotations & Alerts",
  type: "dashboard",
}
