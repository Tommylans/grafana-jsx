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
/** What a card on a map says about itself, apart from its name and its place. */
export type MapCardSpec = {
  title: string
  sub: string
  /** Icon path as Grafana resolves it, e.g. `img/icons/unicons/server.svg`. */
  icon: string
  /** Series name whose last value colors the status dot (0 red, 1 green), or null for no dot. */
  up: string | null
  /** Series name whose last value is printed in the card's bottom-right corner (a load, a rate). */
  value?: string
  /** Up to four labelled values in rows of two (`cpu 24%`, `mem 63%`); labels of at most four characters.
   * The card with the most metrics sets the height of every card on the map. */
  metrics?: ReadonlyArray<{ label: string; series: string }>
}

/** A box on a map (`<XStack>`, `<YStack>`): its children are stacks or map cards, and it only ever
 * meets `layoutMap`, never a dashboard. */
/** Empty room of a fixed size along a stack's main axis, like a card that is not drawn. */
export type SpaceNode = { kind: "space"; size: number }

export type StackNode = {
  kind: "stack"
  dir: "row" | "col"
  children: ReadonlyArray<StackNode | SpaceNode | (MapCardSpec & { name: string })>
  gap?: number
  label?: string
  justify?: "start" | "center" | "end"
  align?: "start" | "center" | "end" | "stretch"
}

export type Node = PanelNode | RowNode | DashboardNode | StackNode | SpaceNode

/** What a component accepts as children: nodes, nested arrays of them, and the usual falsy values. */
export type Children = Node | Children[] | null | undefined | false

export const flatten = (children: Children): Node[] =>
  Array.isArray(children) ? children.flatMap(flatten) : children ? [children] : []
