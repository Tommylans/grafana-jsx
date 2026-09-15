// Links in the dashboard header: to other dashboards by tag, or to any URL.
import type { JsonObject } from "../core/node.ts"

export type LinkOptions = {
  /** Carry the current time range along; off by default so a dashboard opens on the range it was designed for. */
  keepTime?: boolean
  /** Carry the current variable values along (a matching variable on the target picks them up). */
  includeVars?: boolean
}

/** A dropdown of every dashboard carrying these tags. */
export const dashboardsByTag = (
  title: string,
  tags: string[],
  { keepTime = false, includeVars = true }: LinkOptions = {},
): JsonObject => ({
  title,
  type: "dashboards",
  tags,
  asDropdown: true,
  includeVars,
  keepTime,
  targetBlank: false,
  icon: "external link",
  tooltip: "",
  url: "",
})

/** A plain link. */
export const link = (title: string, url: string, { newTab = true }: { newTab?: boolean } = {}): JsonObject => ({
  title,
  type: "link",
  url,
  targetBlank: newTab,
  tags: [],
  asDropdown: false,
  includeVars: false,
  keepTime: false,
  icon: "external link",
  tooltip: "",
})
