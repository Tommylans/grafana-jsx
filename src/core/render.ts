import { layout } from "./layout.ts"
import type { JsonObject, Node } from "./node.ts"

/** Renders a `<Dashboard>` node to the JSON Grafana reads, together with the file it belongs in. */
export const renderDashboard = (node: Node): { file: string; json: JsonObject } => {
  if (node.kind !== "dashboard") throw new Error("the root must be a <Dashboard>")
  return { file: node.file, json: node.render(layout(node.children)) }
}
