import type { Node, PanelJson } from "../core/node.ts"
import { type Common, described, panel } from "./fieldConfig.ts"

export type TextProps = Common & {
  /** Markdown by default; `html` renders as-is. */
  mode?: "markdown" | "html"
  children?: string | string[]
}

/** A block of text on the dashboard: an explanation, a legend, links. The text is the children. */
export const Text = ({ title, description, w = 24, h = 4, mode = "markdown", children = "" }: TextProps): Node =>
  panel(w, h, (id, x, y) => {
    const json: PanelJson = {
      type: "text",
      title,
      id,
      gridPos: { h, w, x, y },
      fieldConfig: { defaults: {}, overrides: [] },
      options: { mode, content: Array.isArray(children) ? children.join("") : children },
    }
    return described(json, description)
  })
