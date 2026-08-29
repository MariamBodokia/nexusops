'use client'

import { useState } from 'react'
import { AlertTriangle, Check, Loader2, Search, X } from 'lucide-react'

type RegisteredTool = { name: string; inputSchema?: Record<string, unknown> }
type ModelContext = { getTools: () => Promise<RegisteredTool[]>; executeTool: (tool: RegisteredTool, args: string) => Promise<unknown> }
type Result = Record<string, any>

type Step = { label: string; tool: string; args: Record<string, unknown> }
const normalizeToolResult = (result: unknown): unknown => {
  if (typeof result !== 'string') return result
  try { return JSON.parse(result) } catch { return result }
}

const steps: Step[] = [
  { label: 'Reading incident state', tool: 'get_incident', args: { incident_id: 'INC-1042' } },
  { label: 'Gathering incident evidence', tool: 'get_incident_evidence', args: { incident_id: 'INC-1042' } },
  { label: 'Reading incident timeline', tool: 'get_incident_timeline', args: { incident_id: 'INC-1042' } },
  { label: 'Reading telemetry', tool: 'get_metrics', args: { service_id: 'payment-api' } },
  { label: 'Reading structured logs', tool: 'get_logs', args: { service_id: 'payment-api' } },
  { label: 'Reading deployment history', tool: 'get_deployment_history', args: { service_id: 'payment-api' } },
  { label: 'Correlating deployment and telemetry', tool: 'correlate_events', args: { service_id: 'payment-api', incident_id: 'INC-1042' } },
  { label: 'Running diagnostic', tool: 'run_diagnostic', args: { incident_id: 'INC-1042', service_id: 'payment-api' } },
]

async function callTool(ctx: ModelContext, name: string, args: Record<string, unknown>) {
  const registered = (await ctx.getTools()).find(tool => tool.name === name)
  if (!registered) throw new Error(`WebMCP tool “${name}” is not registered.`)
  const schema = registered.inputSchema
  const properties = schema && typeof schema === 'object' && 'properties' in schema ? (schema as { properties?: Record<string, unknown> }).properties : undefined
  const safeArgs = Object.fromEntries(Object.entries(args).filter(([key]) => !properties || key in properties))
  return normalizeToolResult(await ctx.executeTool(registered, JSON.stringify(safeArgs)))
}

export default function LiveInvestigation() {
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState(-1)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ incident?: Result; evidence?: Result; timeline?: Result; correlation?: Result; diagnostic?: Result }>({})

  const investigate = async () => {
    setRunning(true); setStep(0); setError(''); setResult({})
    try {
      if (typeof document === 'undefined' || !document.modelContext) throw new Error('WebMCP is unavailable. Open NexusOps in Chrome with WebMCP enabled.')
      const ctx = document.modelContext as unknown as ModelContext
      const active = await callTool(ctx, 'get_active_incidents', {})
      if (!active || typeof active !== 'object' || (active as Result).error) throw new Error('The active incident tool returned an invalid response.')
      const activeIncidents = Array.isArray((active as Result).incidents) ? (active as Result).incidents : []
      const requestedIncident = activeIncidents.find((item: Result) => item?.id === 'INC-1042')
      if (!requestedIncident) throw new Error('INC-1042 was not returned by get_active_incidents.')
      const values: Result[] = []
      for (let i = 0; i < steps.length; i++) { setStep(i); const value = await callTool(ctx, steps[i].tool, steps[i].args); if (!value || typeof value !== 'object' || (value as Result).error) throw new Error(`${steps[i].tool} failed: ${(value as Result)?.error || 'malformed response'}`); values.push(value as Result) }
      setResult({ incident: values[0], evidence: values[1], timeline: values[2], correlation: values[3], diagnostic: values[4] }); setStep(steps.length)
    } catch (e) { setError(e instanceof Error ? e.message : 'Investigation failed.') }
    finally { setRunning(false) }
  }

  const diagnostic = result.diagnostic
  const evidence = result.evidence
  return <>
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[.2em] text-accent-foreground"><span className="h-1.5 w-1.5 rounded-full bg-accent-foreground"/>Investigation / WebMCP</div><h1 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">Payment API degradation</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Run a genuine evidence-gathering investigation through the tools registered on this page.</p></div><button onClick={investigate} disabled={running} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60">{running?<Loader2 className="animate-spin" size={14}/>:<Search size={14}/>} {running?'Investigation running':'Investigate with WebMCP'}</button></div>
    {!running && !result.diagnostic && !error && <div className="mb-6 rounded-lg border border-accent-foreground/20 bg-accent/30 p-5 text-sm text-muted-foreground">This action discovers registered tools, reads active incidents, retrieves INC-1042 evidence and timeline, correlates telemetry, and runs a diagnostic. It does not approve or execute remediation.</div>}
    {error && <div role="alert" className="mb-6 flex items-start gap-3 rounded-lg border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-300"><X size={16} className="mt-0.5 shrink-0"/><div><div className="font-semibold">Investigation could not complete</div><div className="mt-1 text-xs text-red-200/80">{error}</div></div></div>}
    {(running || result.diagnostic) && <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]"><section className="rounded-lg border border-border bg-card"><div className="border-b border-border px-5 py-4 text-sm font-semibold">Agent investigation flow</div><div className="divide-y divide-border">{steps.map((item,i)=><div key={item.tool} className="flex items-center gap-3 px-5 py-4 text-xs"><span className={`flex h-6 w-6 items-center justify-center rounded-full ${step>i?'bg-emerald-400/15 text-emerald-400':step===i&&running?'bg-accent text-accent-foreground':'bg-muted text-muted-foreground'}`}>{step>i?<Check size={13}/>:i+1}</span><span className={step>=i?'text-foreground':'text-muted-foreground'}>{item.label}</span>{step===i&&running&&<Loader2 className="ml-auto animate-spin text-accent-foreground" size={13}/>}</div>)}</div></section><section className="space-y-6"><section className="rounded-lg border border-border bg-card"><div className="flex items-center gap-2 border-b border-border px-5 py-4 text-sm font-semibold"><AlertTriangle size={15} className="text-amber-300"/>Diagnostic result</div>{diagnostic?<div className="space-y-5 p-5"><div><div className="text-xs text-muted-foreground">Finding</div><p className="mt-1 text-sm leading-6">{diagnostic.finding}</p></div><div className="grid gap-4 sm:grid-cols-2"><div><div className="text-xs text-muted-foreground">Confidence</div><div className="mt-1 font-mono text-2xl text-emerald-400">{Math.round(Number(diagnostic.confidence)*100)}%</div></div><div><div className="text-xs text-muted-foreground">Next action</div><p className="mt-1 text-xs leading-5">{diagnostic.next_action}</p></div></div><div><div className="mb-2 text-xs text-muted-foreground">Evidence returned by tool</div><ul className="space-y-2">{Array.isArray(diagnostic.evidence)&&diagnostic.evidence.map((item:string)=><li className="flex gap-2 text-xs text-muted-foreground" key={item}><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-foreground"/>{item}</li>)}</ul></div></div>:<div className="p-5 text-xs text-muted-foreground">Waiting for diagnostic output…</div>}</section>{evidence&&<section className="rounded-lg border border-border bg-card"><div className="border-b border-border px-5 py-4 text-sm font-semibold">Returned evidence</div><div className="grid gap-4 p-5 sm:grid-cols-3"><div><div className="text-[10px] uppercase text-muted-foreground">Metrics</div><div className="mt-1 text-xs">{evidence.metrics?'Retrieved':'Unavailable'}</div></div><div><div className="text-[10px] uppercase text-muted-foreground">Logs</div><div className="mt-1 text-xs">{evidence.logs?'Retrieved':'Unavailable'}</div></div><div><div className="text-[10px] uppercase text-muted-foreground">Deployment</div><div className="mt-1 font-mono text-xs">{evidence.deployment?.version || 'Unavailable'}</div></div></div></section>}</section></div>}
  </>
}

declare global { interface Document { modelContext?: ModelContext } }
