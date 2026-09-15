import type { Json, Node, PanelJson } from "../core/node.ts"
import type { Target } from "../query/datasource.ts"
import { type Common, datasourceOf, described, head, panel } from "./fieldConfig.ts"

export type CanvasProps = Common & {
  queries: Target[]
  /** The elements to draw; see `drawMap` for cards and lines. */
  elements: Json[]
  fieldConfig: PanelJson["fieldConfig"]
  /** Scroll to zoom and drag to pan; inert unless Grafana runs with the feature toggle `canvasPanelPanZoom`. */
  panZoom?: boolean
  /** No panel background and no border: the drawing's own frames do that work. */
  transparent?: boolean
}

/** A Canvas panel: the drawing itself (elements, connections) comes from the caller; this is the frame. */
export const Canvas = ({
  title,
  description,
  display,
  w = 24,
  h = 13,
  queries,
  elements,
  fieldConfig,
  panZoom = false,
  transparent = false,
}: CanvasProps): Node =>
  panel(w, h, (id, x, y) =>
    described(
      {
        ...head("canvas", title, id, x, y, w, h, datasourceOf(queries)),
        ...(transparent ? { transparent: true } : {}),
        fieldConfig,
        options: {
          inlineEditing: false,
          showAdvancedTypes: true,
          panZoom,
          root: {
            type: "frame",
            name: "root",
            elements,
            background: { color: { fixed: "transparent" } },
            border: { color: { fixed: "transparent" } },
          },
        },
        targets: queries.map((query) => query.json),
      },
      description,
      display,
    ),
  )
