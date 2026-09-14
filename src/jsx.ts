// The JSX side of the library. `h` is the factory named in tsconfig (`jsxFactory`); a component is a
// function from props to a node, and a node is either a panel (without a place yet), a row, or a
// dashboard. Placement on the grid happens at render time (core/layout.ts), not here.
import type { Children, Node } from "./core/node.ts"

type Component<P> = (props: P) => Node

/** Builds a node from a component and its props. Without attributes the TSX transform passes `null`
 * as props; spreading null is empty, which is fine. Nested children arrive as varargs; without any,
 * a `children` attribute is kept as is. */
export function h<P extends object>(
  type: Component<P & { children?: Children }>,
  props: P,
  ...children: Children[]
): Node {
  return type(children.length ? { ...props, children } : { ...props })
}

declare global {
  namespace JSX {
    type Element = Node
    interface ElementChildrenAttribute {
      children: object
    }
  }
}
