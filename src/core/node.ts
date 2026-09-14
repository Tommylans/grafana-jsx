// The node types every component produces and the renderer consumes.

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }
export type JsonObject = { [key: string]: Json }

/** The shape of a Grafana panel. What differs per panel type lives in `fieldConfig`, `options` and
 * `targets`; everything else is the same for all of them. */
export type PanelJson = {
  type: string
  title: string
  id: number
  gridPos: { h: number; w: number; x: number; y: number }
  /** Absent on a panel without queries (text). */
  datasource?: { type: string; uid: string }
  interval?: string
  fieldConfig: { defaults: JsonObject; overrides: Json[] }
  options?: JsonObject
  targets?: Json[]
  transformations?: Json[]
  description?: string
}

/** A panel without `id` and without `x`/`y`: the layout assigns those. */
export type PanelNode = {
  kind: "panel"
  w: number
  h: number
  panel: (id: number, x: number, y: number) => PanelJson
}
/** Panels side by side; their widths add up to at most the grid width. */
export type RowNode = { kind: "row"; panels: PanelNode[] }
export type DashboardNode = {
  kind: "dashboard"
  file: string
  children: (PanelNode | RowNode)[]
  render: (panels: PanelJson[]) => JsonObject
}
export type Node = PanelNode | RowNode | DashboardNode

/** What a component accepts as children: nodes, nested arrays of them, and the usual falsy values. */
export type Children = Node | Children[] | null | undefined | false

export const flatten = (children: Children): Node[] =>
  Array.isArray(children) ? children.flatMap(flatten) : children ? [children] : []
