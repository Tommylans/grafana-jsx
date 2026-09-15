import { describe, expect, test } from "bun:test"
import {
  CARD_H,
  CARD_W,
  type CardSpec,
  Dashboard,
  h,
  layoutMap,
  Map,
  placeCards,
  prometheus,
  promql,
  renderDashboard,
  trafficFieldConfig,
  XStack,
  YStack,
} from "../src/index.ts"

const CARDS = [
  { name: "a", title: "A", sub: "", icon: "img/x.svg", up: null },
  { name: "b", title: "B", sub: "", icon: "img/x.svg", up: null },
  { name: "c", title: "C", sub: "", icon: "img/x.svg", up: null },
] as const satisfies ReadonlyArray<CardSpec>
const [a, b, c] = CARDS

describe("stacks in JSX", () => {
  test("a YStack of XStacks lays out like the boxes, and placeCards keeps the declared names", () => {
    const laid = layoutMap(
      <YStack gap={40} align="center">
        <XStack gap={100} label="one">
          {a}
          {b}
        </XStack>
        <XStack justify="center">{c}</XStack>
      </YStack>,
      { pad: 20, labelHeight: 32 },
      0,
      0,
    )
    expect(laid.groups).toEqual([
      { left: 0, top: 0, width: 2 * CARD_W + 100 + 40, height: 32 + CARD_H + 20, label: "one" },
    ])
    const placed = placeCards(CARDS, laid)
    expect(placed.map((card) => [card.name, card.left, card.top])).toEqual([
      ["a", 20, 32],
      ["b", 20 + CARD_W + 100, 32],
      ["c", (2 * CARD_W + 140 - CARD_W) / 2, 32 + CARD_H + 20 + 40],
    ])
  })

  test("a panel in a stack, or a stack in a dashboard, is an error", () => {
    expect(() => placeCards([{ ...a, name: "zz" }], layoutMap(<XStack>{a}</XStack>, {}, 0, 0))).toThrow(
      /not in the layout/,
    )
  })
})

describe("<Map>", () => {
  test("lays out its stack, places the cards and renders a canvas whose height fits", () => {
    const { json } = renderDashboard(
      <Dashboard file="m.json" title="M" uid="m">
        <Map
          title="map"
          cards={CARDS}
          lines={[{ from: { card: "a", side: "right" }, to: { card: "b", side: "left" }, series: "s" }]}
          queries={[promql(prometheus("p"), "up")]}
          fieldConfig={trafficFieldConfig(1)}
          gap={100}
        >
          <YStack gap={40}>
            <XStack label="one">
              {a}
              {b}
            </XStack>
            <XStack>{c}</XStack>
          </YStack>
        </Map>
      </Dashboard>,
    )
    const panels = json.panels
    if (!Array.isArray(panels)) throw new Error("no panels")
    const panel = panels[0]
    if (typeof panel !== "object" || !panel || Array.isArray(panel)) throw new Error("no panel")
    expect(panel.type).toBe("canvas")
    expect(panel.gridPos).toMatchObject({ h: Math.ceil((32 + CARD_H + 20 + 40 + CARD_H + 20 + 40) / 38) })
  })

  test("a map with two stacks, or a card the layout never saw, is an error", () => {
    expect(() =>
      renderDashboard(
        <Dashboard file="m.json" title="M" uid="m">
          <Map
            title="map"
            cards={CARDS}
            lines={[]}
            queries={[promql(prometheus("p"), "up")]}
            fieldConfig={trafficFieldConfig(1)}
          >
            <XStack>{a}</XStack>
            <XStack>{b}</XStack>
          </Map>
        </Dashboard>,
      ),
    ).toThrow(/exactly one stack/)
  })
})
