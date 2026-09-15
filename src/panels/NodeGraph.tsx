import type { Json, Node } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import { type Common, described, head, panel } from "./fieldConfig.ts"

export type NodeGraphProps = Common & {
  /** Table query with columns `id`, `title`, `subtitle`, `mainstat`. */
  nodes: Target
  /** Table query with columns `id`, `source`, `target`, `mainstat`. */
  edges: Target
  transformations?: Json[]
}

/** Grafana's node graph: nodes and edges from two table queries. It applies no unit to `mainstat`. */
export const NodeGraph = ({
  title,
  description,
  w = 24,
  h = 22,
  nodes,
  edges,
  transformations = [],
}: NodeGraphProps): Node =>
  panel(w, h, (id, x, y) =>
    described(
      {
        ...head("nodeGraph", title, id, x, y, w, h, nodes.datasource),
        fieldConfig: { defaults: {}, overrides: [] },
        targets: [nodes.json, edges.json],
        transformations,
      },
      description,
    ),
  )
