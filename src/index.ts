// The public surface of grafana-jsx.

export { type BuildOptions, buildDashboards } from "./build/build.ts"
export { configMap, configMapName, type Kubernetes } from "./build/kubernetes.ts"
export {
  type Bar,
  CARD_H,
  CARD_W,
  type Card,
  DARK,
  drawMap,
  type End,
  type Group,
  type Line,
  type MapOptions,
  type Palette,
  trafficFieldConfig,
} from "./canvas/map.ts"
export { OUT, type Point, route, type Segment, type Side } from "./canvas/route.ts"
export { GRID, layout, rowOf } from "./core/layout.ts"
export type { Children, DashboardNode, Json, JsonObject, Node, PanelJson, PanelNode, RowNode } from "./core/node.ts"
export { flatten } from "./core/node.ts"
export { renderDashboard } from "./core/render.ts"
export { h } from "./jsx.ts"
export { BarChart, type BarChartProps } from "./panels/bar-chart.tsx"
export { BarGauge, type BarGaugeProps, type Step } from "./panels/bar-gauge.tsx"
export { Canvas, type CanvasProps } from "./panels/canvas.tsx"
export { Dashboard, type DashboardProps, Row } from "./panels/dashboard.tsx"
export { NodeGraph, type NodeGraphProps } from "./panels/node-graph.tsx"
export {
  byName,
  type Colors,
  type ColProps,
  type Common,
  col,
  datasourceOf,
  described,
  head,
  linkTo,
  P50_P90,
  panel,
} from "./panels/shared.ts"
export { Stat, type StatProps } from "./panels/stat.tsx"
export { Table, type TableProps } from "./panels/table.tsx"
export { TimeSeries, type TimeSeriesProps } from "./panels/time-series.tsx"
export { type Datasource, postgres, prometheus, type Target } from "./query/datasource.ts"
export { type PromqlOptions, promql, RATE, refId } from "./query/promql.ts"
export { type SqlOptions, sql } from "./query/sql.ts"
