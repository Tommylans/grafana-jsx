// The map as one component: declare the cards, the lines between them and the layout as a stack
// tree, and get a Canvas panel. Positions come from the layout, the panel height from the layout's
// size, and the checks in `drawMap` run on the result.
import { type Children, flatten, type Node, type PanelJson } from "../core/node.ts"
import { Canvas } from "../panels/Canvas.tsx"
import type { Common } from "../panels/fieldConfig.ts"
import type { Target } from "../query/datasource.ts"
import { type Bar, drawMap, type Line, type MapOptions } from "./drawMap.ts"
import { type CardSpec, type LayoutOptions, layoutMap, placeCards } from "./layoutMap.ts"

export type CardMapProps<N extends string> = Omit<Common, "h"> &
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
    transparent?: boolean
    /** Where the layout's top-left corner lands on the canvas; a narrow screen wants a smaller margin. */
    left?: number
    top?: number
    /** One `<YStack>` or `<XStack>` holding every card. */
    children?: Children
  }

/** Grafana draws a row as 30 px plus an 8 px gutter (`38h - 8` px for `h` rows); the title bar takes 40 px
 * of that and the border 2 px (measured in PanelChrome on 13.1: no title means no header at all), plus
 * 4 px of slack so a drawing that fits exactly does not lose its bottom border to a rounding. */
const rowsFor = (px: number, titled: boolean) => Math.ceil((px + (titled ? 54 : 14)) / 38)

export function CardMap<N extends string>({
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
  flow,
  cornerRadius,
  panZoom = false,
  transparent = false,
  left = 20,
  top = 20,
  children,
}: CardMapProps<N>): Node {
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
  const laid = layoutMap(tree, layoutOptions, left, top)
  const placed = placeCards(cards, laid)
  const mapOptions: MapOptions = {
    ...(cardWidth === undefined ? {} : { cardWidth }),
    ...(palette === undefined ? {} : { palette }),
    ...(maxLineWidth === undefined ? {} : { maxLineWidth }),
    ...(flow === undefined ? {} : { flow }),
    ...(cornerRadius === undefined ? {} : { cornerRadius }),
  }
  const elements = drawMap(laid.groups, placed, lines, bars, mapOptions)
  return Canvas({
    title,
    ...(description === undefined ? {} : { description }),
    w,
    h: h ?? rowsFor(laid.height + top, title !== ""),
    queries,
    elements,
    fieldConfig,
    panZoom,
    transparent,
  })
}
