// From components to files: every dashboard to `<outDir>/<file>`, and with `kubernetes` also a
// ConfigMap per dashboard. `check` writes nothing and fails when a file in git is not what its
// component renders — that is the gate: the JSON is never edited by hand.
import type { Node } from "../core/node.ts"
import { renderDashboard } from "../core/render.ts"
import { configMap, type Kubernetes } from "./kubernetes.ts"

export type BuildOptions = {
  outDir: string
  /** Compare instead of write; report every file that differs. */
  check?: boolean
  kubernetes?: Kubernetes
  /** Files in `outDir` that are not rendered here but may stay (hand-written dashboards next to the
   * rendered ones). Any other `.json` in `outDir` that no component claims is reported by `check`. */
  keep?: string[]
}

/** Renders `dashboards` into `outDir`. Returns `false` when a check found a difference or an orphan;
 * duplicate file names or uids are an error. */
export async function buildDashboards(
  dashboards: Node[],
  { outDir, check = false, kubernetes, keep = [] }: BuildOptions,
): Promise<boolean> {
  const rendered = dashboards.map(renderDashboard)
  const seen = { file: new Set<string>(), uid: new Set<unknown>() }
  for (const { file, json } of rendered) {
    if (seen.file.has(file)) throw new Error(`two dashboards write ${file}`)
    if (seen.uid.has(json.uid)) throw new Error(`two dashboards share uid ${String(json.uid)}`)
    seen.file.add(file)
    seen.uid.add(json.uid)
  }
  const outputs: Array<{ path: string; text: string }> = []
  for (const { file, json } of rendered) {
    const text = `${JSON.stringify(json, null, 2)}\n`
    outputs.push({ path: `${outDir}/${file}`, text })
    if (kubernetes)
      outputs.push({
        path: `${outDir}/${file.replace(/\.json$/, "")}.configmap.yaml`,
        text: configMap(file, text, kubernetes),
      })
  }
  let ok = true
  if (check) {
    for (const { path, text } of outputs) {
      const current = await Bun.file(path)
        .text()
        .catch(() => null)
      if (current !== text) {
        console.error(`${path} differs from its component; run the build`)
        ok = false
      }
    }
    const claimed = new Set([...seen.file, ...keep])
    const glob = new Bun.Glob("*.json")
    for await (const name of glob.scan({ cwd: outDir })) {
      if (!claimed.has(name)) {
        console.error(`${outDir}/${name} is not rendered by any component (add it to keep, or remove it)`)
        ok = false
      }
    }
    if (ok) console.log(`${rendered.length} dashboards up to date`)
    return ok
  }
  for (const { path, text } of outputs) {
    await Bun.write(path, text)
    console.log(path)
  }
  return true
}
