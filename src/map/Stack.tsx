// The map's layout in JSX: `<YStack>` and `<XStack>` hold cards and other stacks, with `gap`, an
// optional `label` (a group on the map), `justify` along the axis and `align` across it. The cards
// are plain objects (a `CardSpec` each) so their names stay a union type for the lines.
import type { Node, SpaceNode, StackNode } from "../core/node.ts"
import type { CardSpec } from "./layoutMap.ts"

type StackChild = Node | CardSpec | ReadonlyArray<StackChild> | null | undefined | false
export type StackProps = {
  gap?: number
  label?: string
  justify?: StackNode["justify"]
  align?: StackNode["align"]
  children?: StackChild
}

const isStackNode = (x: unknown): x is StackNode | SpaceNode =>
  typeof x === "object" && x !== null && "kind" in x && (x.kind === "stack" || x.kind === "space")
const isCard = (x: unknown): x is CardSpec => typeof x === "object" && x !== null && "name" in x && !("kind" in x)

const flattenStack = (children: StackChild): Array<StackNode | SpaceNode | CardSpec> => {
  if (Array.isArray(children)) return children.flatMap(flattenStack)
  if (!children) return []
  if (isStackNode(children) || isCard(children)) return [children]
  throw new Error("a stack holds cards and stacks; a panel does not belong on a map")
}

const stack = (dir: StackNode["dir"], { gap, label, justify, align, children }: StackProps): StackNode => ({
  kind: "stack",
  dir,
  children: flattenStack(children),
  ...(gap === undefined ? {} : { gap }),
  ...(label === undefined ? {} : { label }),
  ...(justify === undefined ? {} : { justify }),
  ...(align === undefined ? {} : { align }),
})

/** Children side by side. */
export const XStack = (props: StackProps): Node => stack("row", props)
/** Children top to bottom. */
export const YStack = (props: StackProps): Node => stack("col", props)
/** Empty room of `size` px along the parent's axis: a card's width to push a row past the one
 * below it, so a card lands right above the card it is wired to. */
export const Spacer = ({ size }: { size: number }): Node => ({ kind: "space", size })
