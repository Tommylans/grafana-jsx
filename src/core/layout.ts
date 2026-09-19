// From nodes to placed panels. The grid is 24 wide; a dashboard stacks its children, a row puts panels
// side by side on their own widths, a section is a Grafana row header above its children, and ids
// count up in reading order.
import { type Children, flatten, type PanelJson, type PanelNode, type RowNode, type SectionNode } from "./node.ts"

export const GRID = 24

/** Wraps children into a row, refusing anything that is not a panel and any row wider than the grid. */
export const rowOf = (children: Children): RowNode => {
  const panels = flatten(children).map((node) => {
    if (node.kind === "stack" || node.kind === "space") throw new Error("a stack belongs in layoutMap, not in a row")
    if (node.kind !== "panel") throw new Error("a row holds panels only")
    return node
  })
  const width = panels.reduce((sum, panel) => sum + panel.w, 0)
  if (width > GRID) throw new Error(`row is ${width} wide, the grid is ${GRID}: ${panels.map((p) => p.w).join("+")}`)
  return { kind: "row", panels }
}

/** Grafana's row panel: one grid line high, full width, and Grafana folds everything below it up to the
 * next one when it is collapsed. `panels` stays empty because the children are laid out as siblings;
 * Grafana only moves them inside on collapse. */
const sectionHead = (section: SectionNode, id: number, y: number): PanelJson => ({
  type: "row",
  title: section.title,
  id,
  gridPos: { h: 1, w: GRID, x: 0, y },
  fieldConfig: { defaults: {}, overrides: [] },
  collapsed: false,
  panels: [],
  ...(section.repeat === undefined ? {} : { repeat: section.repeat }),
})

type Cursor = { id: number; y: number }

const place = (children: (PanelNode | RowNode | SectionNode)[], out: PanelJson[], at: Cursor): Cursor => {
  let { id, y } = at
  for (const child of children) {
    if (child.kind === "section") {
      out.push(sectionHead(child, ++id, y))
      ;({ id, y } = place(child.children, out, { id, y: y + 1 }))
      continue
    }
    const row = child.kind === "row" ? child : rowOf(child)
    let x = 0
    for (const panel of row.panels) {
      out.push(panel.panel(++id, x, y))
      x += panel.w
    }
    y += Math.max(0, ...row.panels.map((panel) => panel.h))
  }
  return { id, y }
}

/** Places rows top to bottom. A panel outside a row keeps its own width; `y` and the panel ids follow
 * the reading order, so an id is a place rather than a name. */
export const layout = (children: (PanelNode | RowNode | SectionNode)[]): PanelJson[] => {
  const out: PanelJson[] = []
  place(children, out, { id: 0, y: 0 })
  return out
}
