// What every panel component shares: the common props, the JSON head of a panel, the row/panel
// node builders, and the small helpers for colors, columns and links.
import { GRID } from "../core/layout.ts"
import type { Json, JsonObject, PanelJson, PanelNode } from "../core/node.ts"
import type { DataLink } from "../dashboard/links.ts"
import type { Datasource, Target } from "../query/datasource.ts"
import type { Transformation } from "../query/transforms.ts"

export type Common = {
  title: string
  description?: string
  w?: number
  h?: number
  /** The name every series shows as, Grafana's `displayName` template: `${__field.labels.pod}` names a
   * series after a label, which is how a series gets its name when a datasource ignores `legendFormat`. */
  display?: string
  /** Repeat the panel per value of this dashboard variable, side by side, as many per row as fit `w`. */
  repeat?: string
  /** Where a value on this panel leads: `linkTo(uid, …)`, `linkToValue(…)`. */
  links?: DataLink[]
  /** Reshapes the query result before the panel draws it: `joinByField`, `organize`, `timeSeriesTable`, … */
  transformations?: Transformation[]
}

/** What a panel hands to `withCommon`: the shared props it was given, plus the width the layout gave
 * it (the width decides how many repeated copies fit on a line). Spelled out with `| undefined`
 * because a destructured prop is always present, only its value may be missing. */
export type Shared = {
  description?: string | undefined
  display?: string | undefined
  repeat?: string | undefined
  links?: DataLink[] | undefined
  transformations?: Transformation[] | undefined
  w: number
}

/** One threshold step: `value: null` is the base color below every other step. */
export type Step = { color: string; value: number | null }
export const thresholds = (steps: Step[]): JsonObject => ({ mode: "absolute", steps })

/** What a value shows as: a text and/or a color per exact value (`"0": { text: "down", color: "red" }`); the key
 * `null` is the missing value (an empty cell, a gap), for a table whose colored cells must stay blank without one. */
export type ValueMap = Record<string, { text?: string; color?: string }>
/** Grafana's value mappings from a `ValueMap`; ranges and regexes stay hand-written overrides. */
export const valueMap = (map: ValueMap): JsonObject[] => {
  const shown = ({ text, color }: { text?: string; color?: string }, index: number): JsonObject => ({
    index,
    ...(text === undefined ? {} : { text }),
    ...(color === undefined ? {} : { color }),
  })
  const values = Object.entries(map).filter(([value]) => value !== "null")
  const mappings: JsonObject[] = values.length
    ? [{ type: "value", options: Object.fromEntries(values.map(([value, how], index) => [value, shown(how, index)])) }]
    : []
  const missing = map.null
  if (missing) mappings.push({ type: "special", options: { match: "null", result: shown(missing, values.length) } })
  return mappings
}

export const LEGEND_BOTTOM: JsonObject = { displayMode: "list", placement: "bottom", showLegend: true }
export const TOOLTIP_SINGLE: JsonObject = { mode: "single", sort: "none" }
export const LAST: JsonObject = { calcs: ["lastNotNull"], fields: "", values: false }

export type Colors = ReadonlyArray<readonly [string, string]>

/** A fixed color per series name, so a series keeps its color whatever else is on screen. */
export const byName = (colors: Colors): JsonObject[] =>
  colors.map(([name, color]) => ({
    matcher: { id: "byName", options: name },
    properties: [{ id: "color", value: { mode: "fixed", fixedColor: color } }],
  }))

/** Twelve of Grafana's named colors that stay apart from each other on a dark and a light surface, in
 * the order `colorsFor` hands them out. */
export const PALETTE = [
  "blue",
  "orange",
  "green",
  "purple",
  "red",
  "yellow",
  "dark-blue",
  "dark-orange",
  "dark-green",
  "dark-purple",
  "dark-red",
  "dark-yellow",
] as const

/** One color per name, in the order given, from `PALETTE`: the same list on every panel of a dashboard
 * gives an entity one color everywhere, whichever panels it appears on and however many others share
 * the panel. Refuses more names than the palette has colors: the thirteenth is not a color, it is a
 * sign the panel needs a facet or an "other" bucket. */
export const colorsFor = (names: ReadonlyArray<string>, palette: ReadonlyArray<string> = PALETTE): Colors => {
  if (names.length > palette.length)
    throw new Error(`${names.length} names for ${palette.length} colors: ${names.join(", ")}`)
  return names.map((name, index) => [name, palette[index] as string] as const)
}

/** How a table cell shows its value: a bar behind the number, the cell's background colored, or the
 * text colored; all three color by the column's `thresholds`. */
export type Cell = "gauge" | "lcd" | "background" | "text"
const CELL_OPTIONS: Record<Cell, JsonObject> = {
  gauge: { type: "gauge", mode: "gradient", valueDisplayMode: "text" },
  lcd: { type: "gauge", mode: "lcd", valueDisplayMode: "text" },
  background: { type: "color-background", mode: "gradient" },
  text: { type: "color-text" },
}

export type ColProps = {
  unit?: string
  decimals?: number
  width?: number
  links?: DataLink[]
  hidden?: boolean
  display?: string
  /** A colored cell; needs `thresholds` (or a `color`) to say which color. */
  cell?: Cell
  thresholds?: Step[]
  /** One fixed color for the cell instead of thresholds. */
  color?: string
  min?: number
  max?: number
  /** Text and color per exact value, `valueMap`'s input. */
  values?: ValueMap
}
// One ordered list: the order here is the order in the JSON, and every prop maps to exactly one Grafana
// property id, with the value Grafana keeps under it.
const COL_PROPERTY: ReadonlyArray<[keyof ColProps, string, (value: never) => Json]> = [
  ["unit", "unit", (value: string) => value],
  ["decimals", "decimals", (value: number) => value],
  ["width", "custom.width", (value: number) => value],
  ["links", "links", (value: DataLink[]) => value],
  ["hidden", "custom.hidden", (value: boolean) => value],
  ["display", "displayName", (value: string) => value],
  ["cell", "custom.cellOptions", (value: Cell) => CELL_OPTIONS[value]],
  ["thresholds", "thresholds", (value: Step[]) => thresholds(value)],
  ["color", "color", (value: string) => ({ mode: "fixed", fixedColor: value })],
  ["min", "min", (value: number) => value],
  ["max", "max", (value: number) => value],
  ["values", "mappings", (value: ValueMap) => valueMap(value)],
]
/** Formatting for one table column by name; what does not fit here (ranges, regex mappings) is a hand-written override. */
export const col = (name: string, props: ColProps): JsonObject => {
  if (props.thresholds && props.color)
    throw new Error(`column ${name}: choose thresholds or color, a fixed color disables the thresholds`)
  if (props.cell && !props.thresholds && !props.color)
    throw new Error(`column ${name}: a ${props.cell} cell needs thresholds or a color`)
  const properties = COL_PROPERTY.flatMap(([key, id, toJson]) => {
    const value = props[key]
    return value === undefined ? [] : [{ id, value: toJson(value as never) }]
  })
  // A colored cell reads the column's thresholds only under the thresholds color mode; a fixed color sets its own.
  if (props.thresholds) properties.push({ id: "color", value: { mode: "thresholds" } })
  return { matcher: { id: "byName", options: name }, properties }
}
export const P50_P90: Colors = [
  ["p50", "blue"],
  ["p90", "orange"],
]

/** Grafana's own "-- Mixed --" datasource: the panel's targets each name their own. */
export const MIXED: Datasource = { type: "datasource", uid: "-- Mixed --" }

/** The datasource a panel is bound to: that of its targets when they agree, `MIXED` when they do not
 * (every target carries its own datasource, so Grafana routes each one itself). */
export const datasourceOf = (targets: Target[]): Datasource => {
  const first = targets[0]?.datasource
  if (!first) throw new Error("a panel without a query")
  return targets.some((target) => target.datasource.uid !== first.uid) ? MIXED : first
}

export const panel = (w: number, h: number, body: (id: number, x: number, y: number) => PanelJson): PanelNode => ({
  kind: "panel",
  w,
  h,
  panel: body,
})

export const head = (
  type: string,
  title: string,
  id: number,
  x: number,
  y: number,
  w: number,
  h: number,
  datasource: Datasource,
) => ({
  type,
  title,
  id,
  gridPos: { h, w, x, y },
  datasource,
})

/** The shared props onto the rendered panel: the description, the series display name, the data links,
 * the transformations and the repeat. Only what is set reaches the JSON, so a panel that asks for
 * nothing stays as small as it was. */
export const withCommon = (
  json: PanelJson,
  { description, display, repeat, links, transformations, w }: Shared,
): PanelJson => {
  const defaults: JsonObject = {
    ...json.fieldConfig.defaults,
    ...(display === undefined ? {} : { displayName: display }),
    ...(links === undefined ? {} : { links }),
  }
  return {
    ...json,
    ...(description === undefined ? {} : { description }),
    fieldConfig: { ...json.fieldConfig, defaults },
    ...(transformations === undefined ? {} : { transformations }),
    // Grafana lays repeated panels out itself: `maxPerRow` copies side by side, then the next line.
    ...(repeat === undefined ? {} : { repeat, repeatDirection: "h", maxPerRow: Math.max(1, Math.floor(GRID / w)) }),
  }
}
