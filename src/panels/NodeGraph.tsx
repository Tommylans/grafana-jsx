import type { Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import { type Common, head, panel, withCommon } from "./fieldConfig.ts"

export type NodeGraphProps = Common & {
  /** Table query with columns `id`, `title`, `subtitle`, `mainstat`. */
  nodes: Target
  /** Table query with columns `id`, `source`, `target`, `mainstat`. */
  edges: Target
}

/** Grafana's node graph: nodes and edges from two table queries. It applies no unit to `mainstat`. */
export const NodeGraph = ({
  title,
  description,
  display,
  repeat,
  links,
  transformations,
  w = 24,
  h = 22,
  nodes,
  edges,
}: NodeGraphProps): Node =>
  panel(w, h, (id, x, y) =>
    withCommon(
      {
        ...head("nodeGraph", title, id, x, y, w, h, nodes.datasource),
        fieldConfig: { defaults: {}, overrides: [] },
        targets: [nodes.json, edges.json],
      },
      { description, display, repeat, links, transformations, w },
    ),
  )
