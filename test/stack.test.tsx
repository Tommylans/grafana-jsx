import { describe, expect, test } from "bun:test"
import { CARD_H, CARD_W, type CardSpec, h, layoutMap, placeCards, XStack, YStack } from "../src/index.ts"

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
