// Building blocks for a map in a Canvas panel: groups (frames per place), cards (icon, title,
// subtitle, status dot), lines between them and the value next to each line. Everything is in
// pixels on a grid Canvas does not scale. A line is a chain of Canvas `connections` between the
// card, invisible knots and the other card. Measured on Grafana 13: connections are drawn in an SVG
// above all elements, and no element can be smaller than 10 px, so the value sits next to the line.
import type { Json, JsonObject, PanelJson } from "../core/node.ts"
import { length, type Point, route, type Side } from "./route.ts"

export const CARD_W = 150
export const CARD_H = 52

export type Card<N extends string = string> = {
  name: N
  left: number
  top: number
  title: string
  sub: string
  /** Icon path as Grafana resolves it, e.g. `img/icons/unicons/server.svg`. */
  icon: string
  /** Series name whose last value colors the status dot (0 red, 1 green), or null for no dot. */
  up: string | null
  /** Series name whose last value is printed in the card's bottom-right corner (a load, a rate). */
  value?: string
}
export type Group = { left: number; top: number; width: number; height: number; label: string }
/** One end of a line: a side of a card (`at` is the position along that side, 0..1, center by
 * default) or a loose point. */
export type End<N extends string = string> = { card: N; side: Side; at?: number } | { x: number; y: number }
/** A line between two ends; `via` is the coordinate of the middle segment of a Z (y for vertical
 * sides, x for horizontal ones) and an error on a straight line or an L. */
export type Line<N extends string = string> = { from: End<N>; to: End<N>; series: string; via?: number }
/** A neutral bar between two points (a backplane, a bus): nothing is measured on it, it ties lines together. */
export type Bar = { from: Point; to: Point }

export type Palette = {
  card: string
  cardBorder: string
  group: string
  groupBorder: string
  title: string
  muted: string
  label: string
  icon: string
  value: string
  valueBg: string
  line: string
  bar: string
}
/** Colors that read well on Grafana's dark theme. */
export const DARK: Palette = {
  card: "#242830",
  cardBorder: "#3b4150",
  group: "#1a1d24",
  groupBorder: "#2c313c",
  title: "#e8eaf0",
  muted: "#8a93a6",
  label: "#7c8598",
  icon: "#9aa4b8",
  value: "#e6e8ee",
  valueBg: "#101216",
  line: "#4a5062",
  bar: "#3b4150",
}

const place = (left: number, top: number, width: number, height: number) => ({
  constraint: { horizontal: "left", vertical: "top" },
  placement: { left, top, width, height },
})
const text = (
  name: string,
  left: number,
  top: number,
  w: number,
  h: number,
  s: string,
  size: number,
  color: string,
): JsonObject => ({
  type: "text",
  name,
  ...place(left, top, w, h),
  config: { text: { fixed: s, mode: "fixed" }, size, align: "left", valign: "middle", color: { fixed: color } },
  background: { color: { fixed: "transparent" } },
  border: { color: { fixed: "transparent" }, width: 0 },
})
const rect = (
  name: string,
  left: number,
  top: number,
  w: number,
  h: number,
  background: JsonObject,
  border: JsonObject = { color: { fixed: "transparent" }, width: 0 },
): JsonObject => ({
  type: "rectangle",
  name,
  ...place(left, top, w, h),
  config: { text: { fixed: "" }, size: 1, align: "center", valign: "middle", color: { fixed: "transparent" } },
  background,
  border,
})

type Anchor = Point
type Endpoint = { p: Point; side: Side | null; name: string | null; anchor: Anchor }

/** Where an end sits (px) and how the connection attaches there: Grafana's anchor space runs from -1 to 1, y=1 is up. */
function endpoint<N extends string>(end: End<N>, cards: ReadonlyMap<N, Card<N>>): Endpoint {
  if ("x" in end) return { p: { x: end.x, y: end.y }, side: null, name: null, anchor: { x: 0, y: 0 } }
  const card = cards.get(end.card)
  if (!card) throw new Error(`unknown card ${end.card}`)
  const at = end.at ?? 0.5
  switch (end.side) {
    case "top":
      return {
        p: { x: card.left + at * CARD_W, y: card.top },
        side: "top",
        name: end.card,
        anchor: { x: 2 * at - 1, y: 1 },
      }
    case "bottom":
      return {
        p: { x: card.left + at * CARD_W, y: card.top + CARD_H },
        side: "bottom",
        name: end.card,
        anchor: { x: 2 * at - 1, y: -1 },
      }
    case "left":
      return {
        p: { x: card.left, y: card.top + at * CARD_H },
        side: "left",
        name: end.card,
        anchor: { x: -1, y: 1 - 2 * at },
      }
    case "right":
      return {
        p: { x: card.left + CARD_W, y: card.top + at * CARD_H },
        side: "right",
        name: end.card,
        anchor: { x: 1, y: 1 - 2 * at },
      }
  }
}

export type MapOptions = { palette?: Palette; maxLineWidth?: number }

/** Renders groups, knots, cards and values to Canvas elements (in that z-order; the first lies at the
 * bottom); the lines are connections on the elements they start from. `N` is the union of card names,
 * so a line to an unknown card fails at typecheck time; `lines` is typed against `cards` and cannot widen it. */
export function drawMap<N extends string>(
  groups: readonly Group[],
  cards: ReadonlyArray<Card<N>>,
  lines: ReadonlyArray<Line<NoInfer<N>>>,
  bars: readonly Bar[] = [],
  { palette: ink = DARK, maxLineWidth = 8 }: MapOptions = {},
): Json[] {
  const groupElements: Json[] = []
  for (const g of groups) {
    groupElements.push(
      rect(
        `group-${g.label}`,
        g.left,
        g.top,
        g.width,
        g.height,
        { color: { fixed: ink.group } },
        { color: { fixed: ink.groupBorder }, width: 1, radius: 10 },
      ),
    )
    groupElements.push(
      text(`group-label-${g.label}`, g.left + 12, g.top + 4, g.width - 24, 18, g.label.toUpperCase(), 10, ink.label),
    )
  }
  // Every element a line can hang from has a list of connections: the cards and the knots.
  const byName = new Map<N, Card<N>>(cards.map((card) => [card.name, card]))
  const connectionsOf = new Map<string, JsonObject[]>()
  const knots: Json[] = []
  const knotNames = new Map<string, string>()
  // An invisible 10 px knot (the minimum) centered on the point; the same point is the same knot.
  const knotAt = (p: Point): string => {
    const key = `${Math.round(p.x)},${Math.round(p.y)}`
    const known = knotNames.get(key)
    if (known) return known
    const name = `knot${knotNames.size}`
    const connections: JsonObject[] = []
    connectionsOf.set(name, connections)
    knotNames.set(key, name)
    knots.push({
      ...rect(name, Math.round(p.x - 5), Math.round(p.y - 5), 10, 10, { color: { fixed: "transparent" } }),
      connections,
    })
    return name
  }
  const chain = (points: Array<{ name: string; anchor: Anchor }>, color: JsonObject, size: JsonObject) => {
    points.slice(1).forEach((to, k) => {
      const from = points[k]
      const connections = from && connectionsOf.get(from.name)
      if (!from || !connections) throw new Error(`no element to hang a line from: ${from?.name ?? "?"}`)
      connections.push({
        source: { x: from.anchor.x, y: from.anchor.y },
        target: { x: to.anchor.x, y: to.anchor.y },
        targetName: to.name,
        path: "straight",
        direction: "none",
        color,
        size,
      })
    })
  }
  for (const card of cards) connectionsOf.set(card.name, [])
  for (const bar of bars) {
    chain(
      [
        { name: knotAt(bar.from), anchor: { x: 0, y: 0 } },
        { name: knotAt(bar.to), anchor: { x: 0, y: 0 } },
      ],
      { fixed: ink.bar },
      { fixed: 2 },
    )
  }
  const values: Json[] = []
  lines.forEach((line, i) => {
    const from = endpoint(line.from, byName)
    const to = endpoint(line.to, byName)
    const segments = route(from.p, from.side, to.p, to.side, line.via, line.series)
    const corners = segments.slice(1).map((segment) => segment.a)
    const points = [
      { name: from.name ?? knotAt(from.p), anchor: from.anchor },
      ...corners.map((p) => ({ name: knotAt(p), anchor: { x: 0, y: 0 } })),
      { name: to.name ?? knotAt(to.p), anchor: to.anchor },
    ]
    // `fixed` is the fallback without data: the line stays thin and grey instead of vanishing.
    chain(points, { fixed: ink.line, field: line.series }, { fixed: 1, field: line.series, min: 1, max: maxLineWidth })
    // The value next to the longest segment: above a horizontal one, right of a vertical one.
    const longest = segments.reduce((m, s) => (length(s) > length(m) ? s : m))
    const mid = { x: (longest.a.x + longest.b.x) / 2, y: (longest.a.y + longest.b.y) / 2 }
    const horizontal = Math.abs(longest.b.x - longest.a.x) > Math.abs(longest.b.y - longest.a.y)
    // No wider than the segment it belongs to, or the box slides over a card.
    const width = horizontal ? Math.max(48, Math.min(68, length(longest) - 6)) : 68
    const left = horizontal ? mid.x - width / 2 : mid.x + 9
    const top = horizontal ? mid.y - 29 : mid.y - 10
    values.push({
      type: "metric-value",
      name: `value${i}`,
      ...place(Math.round(left), Math.round(top), width, 20),
      config: {
        text: { field: line.series, mode: "field" },
        size: 12,
        align: "center",
        valign: "middle",
        color: { fixed: ink.value },
      },
      background: { color: { fixed: ink.valueBg } },
      border: { color: { fixed: ink.cardBorder }, width: 1, radius: 4 },
    })
  })
  const cardElements: Json[] = []
  for (const card of cards) {
    cardElements.push({
      ...rect(
        card.name,
        card.left,
        card.top,
        CARD_W,
        CARD_H,
        { color: { fixed: ink.card } },
        { color: { fixed: ink.cardBorder }, width: 1, radius: 8 },
      ),
      connections: connectionsOf.get(card.name) ?? [],
    })
    cardElements.push({
      type: "icon",
      name: `icon-${card.name}`,
      ...place(card.left + 12, card.top + 14, 24, 24),
      config: { path: { fixed: card.icon, mode: "fixed" }, fill: { fixed: ink.icon } },
    })
    cardElements.push(
      text(`title-${card.name}`, card.left + 46, card.top + 7, CARD_W - 60, 20, card.title, 13, ink.title),
    )
    cardElements.push(text(`sub-${card.name}`, card.left + 46, card.top + 27, CARD_W - 52, 18, card.sub, 10, ink.muted))
    if (card.value) {
      cardElements.push({
        type: "metric-value",
        name: `value-${card.name}`,
        ...place(card.left + CARD_W - 62, card.top + CARD_H - 22, 54, 16),
        config: {
          text: { field: card.value, mode: "field" },
          size: 11,
          align: "right",
          valign: "middle",
          color: { fixed: ink.muted },
        },
        background: { color: { fixed: "transparent" } },
        border: { color: { fixed: "transparent" }, width: 0 },
      })
    }
    if (card.up) {
      cardElements.push({
        type: "ellipse",
        name: `up-${card.name}`,
        ...place(card.left + CARD_W - 18, card.top + 8, 8, 8),
        config: { text: { fixed: "" }, size: 8, align: "center", valign: "middle", color: { fixed: "transparent" } },
        background: { color: { field: `up:${card.name}` } },
        border: { color: { fixed: "transparent" }, width: 0 },
      })
    }
  }
  // z-order: groups, knots (invisible), cards, and the values on top.
  return [...groupElements, ...knots, ...cardElements, ...values]
}

/** Field config for a map whose lines carry a rate (bytes/s, green to red up to `max`) and whose cards
 * carry red/green status dots on `up:*` series. */
export const trafficFieldConfig = (max: number): PanelJson["fieldConfig"] => ({
  defaults: { unit: "Bps", decimals: 1, min: 0, max, color: { mode: "continuous-GrYlRd" } },
  overrides: [
    {
      matcher: { id: "byRegexp", options: "up:.*" },
      properties: [
        { id: "unit", value: "none" },
        { id: "max", value: 1 },
        { id: "color", value: { mode: "thresholds" } },
        {
          id: "thresholds",
          value: {
            mode: "absolute",
            steps: [
              { color: "#e0413f", value: null },
              { color: "#2bb673", value: 1 },
            ],
          },
        },
      ],
    },
  ],
})
