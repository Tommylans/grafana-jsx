// The map as one component: declare the cards, the lines between them and the layout as a stack
// tree, and get a Canvas panel. Positions come from the layout, the panel height from the layout's
// size, and the checks in `drawMap` run on the result.
import { type Children, flatten, type Node, type PanelJson } from "../core/node.ts"
import { Canvas } from "../panels/Canvas.tsx"
import type { Common } from "../panels/fieldConfig.ts"
import type { Target } from "../query/datasource.ts"
import { type Bar, drawMap, type Line, type MapOptions } from "./drawMap.ts"
import { type CardSpec, type LayoutOptions, layoutMap, placeCards } from "./layoutMap.ts"

export type MapProps<N extends string> = Omit<Common, "h"> &
  MapOptions &
  Omit<LayoutOptions, "cardWidth"> & {
    /** The cards by name; the layout (children) says where they sit, the lines what joins them. */
    cards: ReadonlyArray<CardSpec<N>>
    lines: ReadonlyArray<Line<NoInfer<N>>>
    bars?: readonly Bar[]
    queries: Target[]
    fieldConfig: PanelJson["fieldConfig"]
    /** Rows on the dashboard grid; unset fits the layout. */
    h?: number
    panZoom?: boolean
    /** One `<YStack>` or `<XStack>` holding every card. */
    children?: Children
  }

/** Grafana draws a row as 30 px plus an 8 px gutter, and the panel keeps ~40 px for its chrome. */
const rowsFor = (px: number) => Math.ceil((px + 40) / 38)

export function Map<N extends string>({
  title,
  description,
  w = 24,
  h,
  cards,
  lines,
  bars = [],
  queries,
  fieldConfig,
  cardWidth,
  gap,
  pad,
  labelHeight,
  cardHeight,
  palette,
  maxLineWidth,
  panZoom = true,
  children,
}: MapProps<N>): Node {
  const trees = flatten(children)
  const tree = trees[0]
  if (trees.length !== 1 || !tree || tree.kind !== "stack") throw new Error(`${title}: a map holds exactly one stack`)
  const layoutOptions: LayoutOptions = {
    ...(cardWidth === undefined ? {} : { cardWidth }),
    ...(gap === undefined ? {} : { gap }),
    ...(pad === undefined ? {} : { pad }),
    ...(labelHeight === undefined ? {} : { labelHeight }),
    ...(cardHeight === undefined ? {} : { cardHeight }),
  }
  const laid = layoutMap(tree, layoutOptions)
  const placed = placeCards(cards, laid)
  const mapOptions: MapOptions = {
    ...(cardWidth === undefined ? {} : { cardWidth }),
    ...(palette === undefined ? {} : { palette }),
    ...(maxLineWidth === undefined ? {} : { maxLineWidth }),
  }
  const elements = drawMap(laid.groups, placed, lines, bars, mapOptions)
  return Canvas({
    title,
    ...(description === undefined ? {} : { description }),
    w,
    h: h ?? rowsFor(laid.height + 20),
    queries,
    elements,
    fieldConfig,
    panZoom,
  })
}
