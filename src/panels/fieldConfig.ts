// What every panel component shares: the common props, the JSON head of a panel, the row/panel
// node builders, and the small helpers for colors, columns and links.
import type { Json, JsonObject, PanelJson, PanelNode } from "../core/node.ts"
import type { Datasource, Target } from "../query/datasource.ts"

export type Common = { title: string; description?: string; w?: number; h?: number }

/** One threshold step: `value: null` is the base color below every other step. */
export type Step = { color: string; value: number | null }
export const thresholds = (steps: Step[]): JsonObject => ({ mode: "absolute", steps })

/** What a value shows as: a text and/or a color per exact value (`"0": { text: "down", color: "red" }`). */
export type ValueMap = Record<string, { text?: string; color?: string }>
/** Grafana's value mappings from a `ValueMap`; ranges and regexes stay hand-written overrides. */
export const valueMap = (map: ValueMap): JsonObject[] => [
  {
    type: "value",
    options: Object.fromEntries(
      Object.entries(map).map(([value, { text, color }], index) => [
        value,
        { index, ...(text === undefined ? {} : { text }), ...(color === undefined ? {} : { color }) },
      ]),
    ),
  },
]

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

export type ColProps = {
  unit?: string
  decimals?: number
  width?: number
  links?: Json[]
  hidden?: boolean
  display?: string
}
// One ordered list: the order here is the order in the JSON, and every prop maps to exactly one Grafana property id.
const COL_PROPERTY: ReadonlyArray<[keyof ColProps, string]> = [
  ["unit", "unit"],
  ["decimals", "decimals"],
  ["width", "custom.width"],
  ["links", "links"],
  ["hidden", "custom.hidden"],
  ["display", "displayName"],
]
/** Formatting for one table column by name; what does not fit here (mappings, cell colors) is a hand-written override. */
export const col = (name: string, props: ColProps): JsonObject => ({
  matcher: { id: "byName", options: name },
  properties: COL_PROPERTY.flatMap(([key, id]) => {
    const value = props[key]
    return value === undefined ? [] : [{ id, value }]
  }),
})
/** A clickable column: the cell value is appended to `base + path`. `${__value.raw}` is Grafana's own
 * interpolation and has to reach the JSON literally, hence no template literal. */
export const linkTo = (title: string, base: string, path: string): Json[] => [
  // biome-ignore lint/style/useTemplate: Grafana's own `${__value.raw}` has to stay literal
  { title, url: `${base}${path}/` + "${__value.raw}", targetBlank: true },
]

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

/** Sets `description` only when there is one, keeping the JSON free of empty keys. */
export const described = (json: PanelJson, description: string | undefined): PanelJson =>
  description ? { ...json, description } : json
