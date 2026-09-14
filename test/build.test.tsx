import { describe, expect, test } from "bun:test"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { buildDashboards, configMapName, Dashboard, h, postgres, Stat, sql } from "../src/index.ts"

const DB = postgres("db")
const dash = (file: string, uid: string) => (
  <Dashboard file={file} title={uid} uid={uid}>
    <Stat title="one" unit="short" query={sql(DB, "select 1", { format: "table" })} />
  </Dashboard>
)
const k8s = { namespace: "app", folder: "Apps" }

describe("buildDashboards", () => {
  test("writes JSON and a ConfigMap per dashboard, and --check is green afterwards", async () => {
    const outDir = mkdtempSync(`${tmpdir()}/grafana-`)
    expect(await buildDashboards([dash("a.json", "a")], { outDir, kubernetes: k8s })).toBe(true)
    const json = await Bun.file(`${outDir}/a.json`).json()
    expect(json.uid).toBe("a")
    const yaml = await Bun.file(`${outDir}/a.configmap.yaml`).text()
    expect(yaml).toContain('grafana_dashboard: "1"')
    expect(yaml).toContain('namespace: "app"')
    expect(yaml).toContain('  "a.json": |\n    {')
    expect(await buildDashboards([dash("a.json", "a")], { outDir, check: true, kubernetes: k8s })).toBe(true)
    expect(await buildDashboards([dash("a.json", "b")], { outDir, check: true, kubernetes: k8s })).toBe(false)
  })
  test("an orphaned JSON in outDir fails the check unless it is kept", async () => {
    const outDir = mkdtempSync(`${tmpdir()}/grafana-`)
    await buildDashboards([dash("a.json", "a")], { outDir })
    await Bun.write(`${outDir}/old.json`, "{}\n")
    expect(await buildDashboards([dash("a.json", "a")], { outDir, check: true })).toBe(false)
    expect(await buildDashboards([dash("a.json", "a")], { outDir, check: true, keep: ["old.json"] })).toBe(true)
  })
  test("two dashboards on one file or one uid are an error", async () => {
    const outDir = mkdtempSync(`${tmpdir()}/grafana-`)
    await expect(buildDashboards([dash("a.json", "a"), dash("a.json", "b")], { outDir })).rejects.toThrow(/a\.json/)
    await expect(buildDashboards([dash("a.json", "a"), dash("b.json", "a")], { outDir })).rejects.toThrow(/uid a/)
  })
  test("a ConfigMap name must be a DNS label", () => {
    expect(() => configMapName("Sales_Overview.json", k8s)).toThrow(/DNS label/)
    expect(configMapName("sales-overview.json", k8s)).toBe("dashboard-sales-overview")
  })
})
