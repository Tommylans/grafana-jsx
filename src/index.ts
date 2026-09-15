// The public surface of grafana-jsx.

export { type BuildOptions, buildDashboards } from "./build/build.ts"
export { configMap, configMapName, type Kubernetes } from "./build/kubernetes.ts"
export {
  type Box,
  type CardSpec,
  flexCol,
  flexGrid,
  flexRow,
  type Laid,
  type LayoutOptions,
  layoutMap,
  placeCards,
} from "./canvas/layout.ts"
export {
  type Bar,
  CARD_H,
  CARD_H_METRICS,
  CARD_W,
  type Card,
  cardHeightOf,
  DARK,
  drawMap,
  type End,
  type Group,
  groupAround,
  type Line,
  type MapOptions,
  METRIC_ROW,
  type Palette,
  trafficFieldConfig,
} from "./canvas/map.ts"
export { OUT, type Point, route, type Segment, type Side } from "./canvas/route.ts"
export { type StackProps, XStack, YStack } from "./canvas/stack.tsx"
export { GRID, layout, rowOf } from "./core/layout.ts"
export type {
  Children,
  DashboardNode,
  Json,
  JsonObject,
  Node,
  PanelJson,
  PanelNode,
  RowNode,
  StackNode,
} from "./core/node.ts"
export { flatten } from "./core/node.ts"
export { renderDashboard } from "./core/render.ts"
export { BUILT_IN_ANNOTATIONS, type PromqlAnnotation, promqlAnnotation } from "./dashboard/annotations.ts"
export { dashboardsByTag, type LinkOptions, link } from "./dashboard/links.ts"
export {
  type CustomVariable,
  customVariable,
  datasourceVariable,
  intervalVariable,
  type QueryVariable,
  queryVariable,
  ref,
  textboxVariable,
} from "./dashboard/variables.ts"
export { h } from "./jsx.ts"
export { BarChart, type BarChartProps } from "./panels/bar-chart.tsx"
export { BarGauge, type BarGaugeProps } from "./panels/bar-gauge.tsx"
export { Canvas, type CanvasProps } from "./panels/canvas.tsx"
export { Dashboard, type DashboardProps, Row } from "./panels/dashboard.tsx"
export { Gauge, type GaugeProps } from "./panels/gauge.tsx"
export { Heatmap, type HeatmapProps } from "./panels/heatmap.tsx"
export { Histogram, type HistogramProps } from "./panels/histogram.tsx"
export { Logs, type LogsProps } from "./panels/logs.tsx"
export { NodeGraph, type NodeGraphProps } from "./panels/node-graph.tsx"
export { PieChart, type PieChartProps } from "./panels/pie-chart.tsx"
export {
  byName,
  type Colors,
  type ColProps,
  type Common,
  col,
  datasourceOf,
  described,
  head,
  LAST,
  LEGEND_BOTTOM,
  linkTo,
  MIXED,
  P50_P90,
  panel,
  type Step,
  TOOLTIP_SINGLE,
  thresholds,
  type ValueMap,
  valueMap,
} from "./panels/shared.ts"
export { Stat, type StatProps } from "./panels/stat.tsx"
export { type StateProps, StateTimeline, StatusHistory } from "./panels/state-timeline.tsx"
export { Table, type TableProps } from "./panels/table.tsx"
export { Text, type TextProps } from "./panels/text.tsx"
export { TimeSeries, type TimeSeriesProps } from "./panels/time-series.tsx"
export { type Datasource, postgres, prometheus, type Target, victorialogs } from "./query/datasource.ts"
export { fieldNames, fieldValues, type LogsqlOptions, logsql } from "./query/logsql.ts"
export { type PromqlOptions, promql, RATE, refId } from "./query/promql.ts"
export { type SqlOptions, sql } from "./query/sql.ts"
