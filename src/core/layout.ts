// From nodes to placed panels. The grid is 24 wide; a dashboard stacks its children, a row puts panels
// side by side on their own widths, and ids count up in reading order.
import { type Children, flatten, type PanelJson, type PanelNode, type RowNode } from "./node.ts"

export const GRID = 24

/** Wraps children into a row, refusing anything that is not a panel and any row wider than the grid. */
export const rowOf = (children: Children): RowNode => {
  const panels = flatten(children).map((node) => {
    if (node.kind === "stack") throw new Error("a stack belongs in layoutMap, not in a row")
    if (node.kind !== "panel") throw new Error("a row holds panels only")
    return node
  })
  const width = panels.reduce((sum, panel) => sum + panel.w, 0)
  if (width > GRID) throw new Error(`row is ${width} wide, the grid is ${GRID}: ${panels.map((p) => p.w).join("+")}`)
  return { kind: "row", panels }
}

/** Places rows top to bottom. A panel outside a row keeps its own width; `y` and the panel ids follow
 * the reading order, so an id is a place rather than a name. */
export const layout = (children: (PanelNode | RowNode)[]): PanelJson[] => {
  const out: PanelJson[] = []
  let y = 0
  let id = 0
  for (const child of children) {
    const row = child.kind === "row" ? child : rowOf(child)
    let x = 0
    for (const panel of row.panels) {
      out.push(panel.panel(++id, x, y))
      x += panel.w
    }
    y += Math.max(0, ...row.panels.map((panel) => panel.h))
  }
  return out
}
