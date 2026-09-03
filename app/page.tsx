'use client'

import {
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react'

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  Gauge,
  Globe2,
  LayoutDashboard,
  Loader2,
  Menu,
  Network,
  Play,
  RefreshCw,
  Search,
  Server,
  Terminal,
  X,
} from 'lucide-react'

import {
  executeTool,
  toolDefinitions,
  tools,
  statusDot,
  statusStyles,
  setToolExecutor,
} from '@/lib/nexus-data'
import {
  getActivity,
  subscribe,
} from '@/lib/activity-store'
import {
  getIncident,
  getIncidentTimeline,
  getServices
} from '@/lib/data-access'

import LiveInvestigation from '@/components/live-investigation'
import { ActivityEntry, Status } from '@/lib/types'

type Section =
  | 'Overview'
  | 'Services'
  | 'Incidents'
  | 'Investigation'
  | 'Agent Activity'
  | 'WebMCP Tools'

type NavItem = {
  label: Section
  icon: typeof Activity
}

type ModelContext = {
  registerTool: (
    tool: unknown,
  ) => Promise<void> | void
}

const EMPTY_ACTIVITY: ActivityEntry[] = []

const nav: NavItem[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
  },
  {
    label: 'Services',
    icon: Server,
  },
  {
    label: 'Incidents',
    icon: AlertTriangle,
  },
  {
    label: 'Investigation',
    icon: Search,
  },
  {
    label: 'Agent Activity',
    icon: Bot,
  },
  {
    label: 'WebMCP Tools',
    icon: Code2,
  },
]

/* -------------------------------------------------------------------------- */
/* Shared UI                                                                   */
/* -------------------------------------------------------------------------- */

function AppShell({
  section,
  setSection,
  children,
  activityCount,
  webmcpAvailable,
}: {
  section: Section
  setSection: (section: Section) => void
  children: React.ReactNode
  activityCount: number
  webmcpAvailable: boolean
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-background lg:flex lg:flex-col">
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Network size={18} strokeWidth={2} />
          </div>

          <div className="min-w-0">
            <div className="text-[15px] font-bold tracking-tight">
              NEXUS<span className="text-accent">OPS</span>
            </div>

            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Operations fabric
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Command center
          </div>

          {nav.map(({ label, icon: Icon }) => {
            const active = section === label

            return (
              <button
                key={label}
                type="button"
                onClick={() => setSection(label)}
                className={[
                  'mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left',
                  'text-[13px] transition-colors',
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                ].join(' ')}
              >
                <Icon
                  size={16}
                  strokeWidth={1.9}
                />

                <span className="font-medium">
                  {label}
                </span>

                {label === 'Agent Activity' &&
                  activityCount > 0 && (
                    <span className="ml-auto rounded-md bg-background/70 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-foreground">
                      {activityCount}
                    </span>
                  )}

                {label === 'WebMCP Tools' && (
                  <span
                    className={[
                      'ml-auto h-2 w-2 rounded-full',
                      webmcpAvailable
                        ? 'bg-emerald-400'
                        : 'bg-amber-300',
                    ].join(' ')}
                    aria-label={
                      webmcpAvailable
                        ? 'WebMCP available'
                        : 'WebMCP unavailable'
                    }
                  />
                )}
              </button>
            )
          })}
        </nav>

        {/* Environment */}
        <div className="shrink-0 border-t border-border p-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              Environment
            </span>

            <span className="flex items-center gap-2 font-semibold text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              Simulated
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              WebMCP bridge
            </span>

            <span
              className={
                webmcpAvailable
                  ? 'font-bold text-emerald-400'
                  : 'font-bold text-amber-300'
              }
            >
              {webmcpAvailable
                ? 'ACTIVE'
                : 'UNAVAILABLE'}
            </span>
          </div>

          <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
            All incident data, telemetry and remediation actions in this demo are simulated. No real production system is affected.
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>

            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">
                {section}
              </div>

              <div className="mt-0.5 hidden items-center text-[11px] text-muted-foreground sm:flex">
                Production
                <ChevronRight
                  size={11}
                  className="mx-1.5"
                />
                us-east-1
              </div>
            </div>
          </div>

          <div className="ml-4 flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground xl:flex">
              <Search size={13} />

              <span>
                Search operations
              </span>

              <kbd className="ml-5 rounded border border-border px-1.5 py-0.5 text-[9px]">
                ⌘ K
              </kbd>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-accent text-[10px] font-bold">
              OP
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto w-full max-w-[1600px] p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function PageHeader({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow: string
  title: string
  sub: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-foreground" />
          {eyebrow}
        </div>

        <h1 className="text-[26px] font-bold tracking-[-0.025em] md:text-[30px]">
          {title}
        </h1>

        <p className="mt-2 max-w-3xl text-[13px] leading-6 text-muted-foreground">
          {sub}
        </p>
      </div>

      {action}
    </div>
  )
}

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={[
        'rounded-xl border border-border bg-card',
        className,
      ].join(' ')}
    >
      {children}
    </section>
  )
}

function CardTitle({
  children,
  meta,
}: {
  children: React.ReactNode
  meta?: React.ReactNode
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border px-5 py-4">
      <h2 className="text-[13px] font-semibold tracking-tight">
        {children}
      </h2>

      {meta}
    </div>
  )
}

function Badge({
  status,
}: {
  status: Status
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-md border px-2.5 py-1',
        'text-[10px] font-bold capitalize',
        statusStyles[status],
      ].join(' ')}
    >
      <span
        className={[
          'h-1.5 w-1.5 rounded-full',
          statusDot[status],
        ].join(' ')}
      />

      {status}
    </span>
  )
}

function Spark({
  points,
}: {
  points: number[]
}) {
  const max = Math.max(...points)
  const min = Math.min(...points)

  return (
    <svg
      className="h-8 w-20 text-accent-foreground"
      viewBox="0 0 80 32"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        points={points
          .map((point, index) => {
            const x =
              index *
              (80 /
                Math.max(
                  points.length - 1,
                  1,
                ))

            const y =
              30 -
              ((point - min) /
                (max - min || 1)) *
              25

            return `${x},${y}`
          })
          .join(' ')}
      />
    </svg>
  )
}

function Stat({
  label,
  value,
  note,
  icon,
  good,
  alert,
}: {
  label: string
  value: string
  note: string
  icon: React.ReactNode
  good?: boolean
  alert?: boolean
}) {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium text-muted-foreground">
          {label}
        </span>

        <span
          className={
            alert
              ? 'text-amber-300'
              : 'text-muted-foreground'
          }
        >
          {icon}
        </span>
      </div>

      <div className="text-[23px] font-bold tracking-tight tabular-nums">
        {value}
      </div>

      <div
        className={[
          'mt-1.5 text-[11px]',
          good
            ? 'text-emerald-400'
            : alert
              ? 'text-amber-300'
              : 'text-muted-foreground',
        ].join(' ')}
      >
        {note}
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Overview                                                                    */
/* -------------------------------------------------------------------------- */

function Overview({
  setSection,
  activityCount,
  webmcpAvailable,
}: {
  setSection: (section: Section) => void
  activityCount: number
  webmcpAvailable: boolean
}) {
  const services = getServices();
  const incident = getIncident('INC-1042');
  const counts = {
    healthy: services.filter(
      (service) =>
        service.status === 'healthy',
    ).length,

    degraded: services.filter(
      (service) =>
        service.status === 'degraded',
    ).length,

    warning: services.filter(
      (service) =>
        service.status === 'warning',
    ).length,
  }

  const servicesNeedingAttention =
    counts.degraded + counts.warning

  return (
    <>
      <PageHeader
        eyebrow="Production / us-east-1"
        title="WebMCP-assisted Production Operations"
        sub="NexusOps provides an AI-native operations fabric powered by WebMCP for real-time incident investigation and response."
        action={
          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        }
      />

      <div className="mb-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="WebMCP Status"
          value={webmcpAvailable ? 'Active' : 'Unavailable'}
          note={webmcpAvailable ? "Tools are available to agents" : "Investigation is disabled"}
          icon={<Bot size={16} />}
          good={webmcpAvailable}
          alert={!webmcpAvailable}
        />

        <Stat
          label="Active incidents"
          value={incident ? "1" : "0"}
          note={incident ? "P1 requires attention" : "No active incidents"}
          icon={<AlertTriangle size={16} />}
          alert={!!incident}
        />

        <Stat
          label="Services requiring attention"
          value={String(servicesNeedingAttention)}
          note={`${counts.healthy} services are healthy`}
          icon={<Server size={16} />}
          alert={servicesNeedingAttention > 0}
        />

        <Stat
          label="Agent Activity"
          value={String(activityCount)}
          note={
            activityCount
              ? 'Tool executions this session'
              : 'No executions yet'
          }
          icon={<Activity size={16} />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardTitle
            meta={
              <button
                type="button"
                onClick={() =>
                  setSection('Services')
                }
                className="text-sm font-medium text-accent-foreground hover:underline"
              >
                View inventory
                <ArrowUpRight
                  className="ml-1 inline"
                  size={12}
                />
              </button>
            }
          >
            Service Health
          </CardTitle>

          <div className="divide-y divide-border">
            {services
              .slice(0, 8)
              .map((service) => (
                <div
                  className="flex items-center gap-4 px-5 py-4"
                  key={service.id}
                >
                  <span
                    className={[
                      'h-2 w-2 shrink-0 rounded-full',
                      statusDot[
                      service.status
                      ],
                    ].join(' ')}
                  />

                  <div className="min-w-0 w-40">
                    <div className="truncate text-sm font-semibold">
                      {service.name}
                    </div>
                  </div>

                  <Badge
                    status={service.status}
                  />

                  <div className="ml-auto hidden items-center gap-5 text-right sm:flex">
                    <div>
                      <div className="text-sm font-semibold tabular-nums">
                        {service.latency} ms
                      </div>

                      <div className="mt-0.5 text-xs text-muted-foreground">
                        latency
                      </div>
                    </div>

                    <Spark
                      points={
                        service.status ===
                          'degraded'
                          ? [
                            12,
                            13,
                            17,
                            25,
                            36,
                            48,
                          ]
                          : [
                            18,
                            16,
                            17,
                            15,
                            14,
                            15,
                          ]
                      }
                    />
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {incident && <div className="grid gap-6">
          <Card>
            <CardTitle
              meta={
                <span className="text-sm font-medium text-muted-foreground">
                  {incident.started} UTC
                </span>
              }
            >
              Active Incident
            </CardTitle>

            <div className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-md bg-red-400/10 px-2 py-1 text-xs font-bold text-red-400">
                  P1
                </span>

                <span className="font-mono text-xs text-muted-foreground">
                  {incident.id}
                </span>
              </div>

              <h3 className="text-lg font-bold tracking-tight">
                {incident.title}
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Payment API · investigating
              </p>

              <button
                type="button"
                onClick={() =>
                  setSection('Investigation')
                }
                className="mt-5 flex w-full items-center justify-between rounded-lg border border-border px-3.5 py-3 text-sm font-semibold transition-colors hover:bg-accent"
              >
                Open Investigation
                <ChevronRight size={14} />
              </button>
            </div>
          </Card>

          <Card>
            <CardTitle>
              Recent Events
            </CardTitle>

            <div className="space-y-5 p-5">
              {[...getIncidentTimeline(incident.id)].reverse().map(
                ([time, title, detail]) => (
                  <div
                    className="flex gap-3"
                    key={`${time}-${title}`}
                  >
                    <span className="w-11 shrink-0 font-mono text-sm text-muted-foreground">
                      {time}
                    </span>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        {title}
                      </div>

                      <div className="mt-1 text-sm leading-5 text-muted-foreground">
                        {detail}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </Card>
        </div>}
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Services                                                                    */
/* -------------------------------------------------------------------------- */

function Services() {
  const services = getServices();
  return (
    <>
      <PageHeader
        eyebrow="Inventory / production"
        title="Service inventory"
        sub="Current health signals, performance indicators, and resource utilization across production services."
      />

      <Card>
        <div className="hidden grid-cols-[1.4fr_.8fr_.7fr_.7fr_.7fr_.7fr] gap-4 border-b border-border px-5 py-3 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground md:grid">
          <span>Service</span>
          <span>Status</span>
          <span>Latency</span>
          <span>Error rate</span>
          <span>Req / min</span>
          <span>Resources</span>
        </div>

        <div className="divide-y divide-border">
          {services.map((service) => (
            <div
              className="grid items-center gap-4 px-5 py-4 md:grid-cols-[1.4fr_.8fr_.7fr_.7fr_.7fr_.7fr]"
              key={service.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={[
                    'h-2 w-2 shrink-0 rounded-full',
                    statusDot[
                    service.status
                    ],
                  ].join(' ')}
                />

                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold">
                    {service.name}
                  </div>

                  <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                    {service.id}
                  </div>
                </div>
              </div>

              <Badge
                status={service.status}
              />

              <div>
                <span className="text-[11px] font-semibold tabular-nums">
                  {service.latency} ms
                </span>

                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  p95
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold tabular-nums">
                  {service.errorRate}%
                </span>

                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  errors
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold tabular-nums">
                  {service.requestRate.toLocaleString()}
                </span>

                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  requests
                </div>
              </div>

              <div className="text-[10px] leading-5 text-muted-foreground">
                CPU {service.cpu}%
                <br />
                MEM {service.memory}%
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Incidents                                                                   */
/* -------------------------------------------------------------------------- */

function Incidents({
  setSection,
}: {
  setSection: (section: Section) => void
}) {
  const incident = getIncident('INC-1042');
  if (!incident) return null;

  return (
    <>
      <PageHeader
        eyebrow="Response / incident management"
        title="Incidents"
        sub="Human-owned incident response with agent-assisted evidence gathering and analysis."
      />

      <Card>
        <CardTitle
          meta={
            <span className="text-[11px] font-medium text-muted-foreground">
              1 active
            </span>
          }
        >
          Active incidents
        </CardTitle>

        <div className="p-5">
          <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-5 md:p-6">
            <div className="flex flex-col justify-between gap-5 lg:flex-row">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-red-400/15 px-2 py-1 text-[10px] font-bold text-red-400">
                    P1
                  </span>

                  <span className="font-mono text-[10px] text-muted-foreground">
                    {incident.id}
                  </span>

                  <span className="rounded-md border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-semibold text-amber-300">
                    Investigating
                  </span>
                </div>

                <h2 className="text-[18px] font-bold tracking-tight">
                  {incident.title}
                </h2>

                <p className="mt-1 text-[12px] text-muted-foreground">
                  Affected service: Payment API ·
                  opened at {incident.started} UTC
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSection('Investigation')
                }
                className="h-fit rounded-lg bg-primary px-4 py-2.5 text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Investigate incident
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {incident.symptoms.map(
                (symptom) => (
                  <div
                    className="border-l border-border pl-3 text-[11px] leading-5 text-muted-foreground"
                    key={symptom}
                  >
                    {symptom}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </Card>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* WebMCP Tools                                                                */
/* -------------------------------------------------------------------------- */

function ToolInspector({
  tool,
  meta,
  webmcpAvailable,
  onClose,
}: {
  tool: (typeof toolDefinitions)[number]
  meta?: (typeof tools)[number]
  webmcpAvailable: boolean
  onClose: () => void
}) {
  const properties: Record<string, { type?: string; description?: string; enum?: string[] }> =
    tool.inputSchema?.properties || {}
  const required: string[] = tool.inputSchema?.required || []
  const fieldNames = Object.keys(properties)

  const buildDefaults = () => {
    const defaults: Record<string, string> = {}
    for (const key of fieldNames) {
      if (key === 'incident_id') defaults[key] = 'INC-1042'
      else if (key === 'service_id') defaults[key] = 'payment-api'
      else if (properties[key].enum) defaults[key] = properties[key].enum![0]
      else if (properties[key].type === 'boolean') defaults[key] = 'false'
      else defaults[key] = ''
    }
    return defaults
  }

  const [values, setValues] = useState<Record<string, string>>(buildDefaults)
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [durationMs, setDurationMs] = useState<number | null>(null)
  const [rawOpen, setRawOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const setField = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const handleExecute = async () => {
    setStatus('running')
    setResult(null)
    const start = performance.now()

    const args: Record<string, unknown> = {}
    for (const key of fieldNames) {
      const prop = properties[key]
      const raw = values[key]
      if (raw === '' && !required.includes(key)) continue
      args[key] = prop.type === 'boolean' ? raw === 'true' : raw
    }

    try {
      const response = await executeTool(tool.name, args)
      setResult(response)
      setDurationMs(Math.round(performance.now() - start))
      setStatus(response?.error || response?.success === false ? 'error' : 'success')
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : String(error) })
      setDurationMs(Math.round(performance.now() - start))
      setStatus('error')
    }
  }

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const structuredEntries = result
    ? Object.entries(result).filter(([, v]) => typeof v !== 'object' || v === null)
    : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-border bg-background shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background/95 px-6 py-5 backdrop-blur">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
              <code className="truncate font-mono text-[15px] font-semibold">{tool.name}</code>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md border border-border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                {meta?.category}
              </span>
              {meta && (
                <span className={[
                  'rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                  meta.readOnly ? 'border-sky-400/30 text-sky-300' : 'border-amber-300/30 text-amber-300',
                ].join(' ')}>
                  {meta.readOnly ? 'READ' : 'WRITE'}
                </span>
              )}
              {meta && (
                <span className={[
                  'rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                  meta.riskLevel === 'high' ? 'border-red-400/30 text-red-400' : meta.riskLevel === 'medium' ? 'border-amber-300/30 text-amber-300' : 'border-emerald-400/30 text-emerald-400',
                ].join(' ')}>
                  {meta.riskLevel} risk
                </span>
              )}
              {meta?.requiresApproval && (
                <span className="rounded-md border border-red-400/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
                  Requires approval
                </span>
              )}
            </div>

            {meta && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Agents: {meta.agentRoles.join(', ')}
              </p>
            )}

            <p className="mt-3 max-w-md text-[13px] leading-5 text-muted-foreground">{tool.description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close tool inspector"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-6 px-6 py-5">
          {!webmcpAvailable && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300/30 bg-amber-300/5 p-4 text-sm text-amber-300">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">WebMCP unavailable</div>
                <div className="mt-1 text-xs text-amber-200/80">
                  This tool cannot be executed until the WebMCP bridge is active. There is no local fallback.
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Input</div>

            {fieldNames.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">This tool takes no input.</p>
            ) : (
              <div className="space-y-4">
                {fieldNames.map((key) => {
                  const prop = properties[key]
                  const isRequired = required.includes(key)

                  return (
                    <div key={key}>
                      <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                        <code className="font-mono text-[11px]">{key}</code>
                        {isRequired && <span className="text-red-400">*</span>}
                      </label>

                      {prop.enum ? (
                        <select
                          value={values[key] || ''}
                          onChange={(event) => setField(key, event.target.value)}
                          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                        >
                          {prop.enum.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : prop.type === 'boolean' ? (
                        <select
                          value={values[key] || 'false'}
                          onChange={(event) => setField(key, event.target.value)}
                          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                        >
                          <option value="false">false</option>
                          <option value="true">true</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={values[key] || ''}
                          onChange={(event) => setField(key, event.target.value)}
                          placeholder={prop.description}
                          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                        />
                      )}

                      {prop.description && (
                        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{prop.description}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleExecute}
            disabled={status === 'running' || !webmcpAvailable}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === 'running' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Execute
          </button>

          {status !== 'idle' && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Result</div>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  {status === 'running' && (
                    <span className="flex items-center gap-1.5 text-accent-foreground">
                      <Loader2 size={12} className="animate-spin" /> Running
                    </span>
                  )}
                  {status === 'success' && (
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <Check size={12} /> Success
                    </span>
                  )}
                  {status === 'error' && (
                    <span className="flex items-center gap-1.5 text-red-400">
                      <X size={12} /> Error
                    </span>
                  )}
                  {durationMs !== null && (
                    <span className="flex items-center gap-1"><Clock size={12} />{durationMs} ms</span>
                  )}
                </div>
              </div>

              {structuredEntries.length > 0 && (
                <div className="mb-3 space-y-1.5 rounded-lg border border-border bg-card p-3">
                  {structuredEntries.map(([key, value]) => (
                    <div key={key} className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="truncate font-mono font-semibold">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setRawOpen((open) => !open)}
                className="mb-2 flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent"
              >
                Raw JSON
                <ChevronDown size={14} className={rawOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>

              {rawOpen && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={copyJson}
                    className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md bg-background/80 px-2 py-1 text-[10px] font-medium hover:bg-accent"
                  >
                    {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy JSON'}
                  </button>

                  <pre className="max-h-80 overflow-auto rounded-md bg-card p-3 pr-16 font-mono text-[11px] leading-5">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ToolsPage({
  webmcpAvailable,
}: {
  webmcpAvailable: boolean
}) {
  const [selectedTool, setSelectedTool] = useState<(typeof toolDefinitions)[number] | null>(null)

  return (
    <>
      <PageHeader
        eyebrow="WebMCP / agent interface"
        title="Agent-accessible tools"
        sub="Operational capabilities exposed to compatible agents. The investigation engine uses these same tools."
        action={
          <div className="flex items-center gap-2 rounded-lg border border-accent-foreground/20 bg-accent/30 px-3.5 py-2.5 text-[11px] font-medium text-accent-foreground">
            <span
              className={[
                'h-2 w-2 rounded-full',
                webmcpAvailable
                  ? 'bg-emerald-400'
                  : 'bg-amber-300',
              ].join(' ')}
            />

            {webmcpAvailable
              ? 'WebMCP detected'
              : 'WebMCP unavailable'}
          </div>
        }
      />

      <div className="mt-6 rounded-xl border border-accent-foreground/20 bg-accent/30 p-5">
        <div className="flex items-start gap-3">
          <Terminal
            className="mt-0.5 shrink-0 text-accent-foreground"
            size={17}
          />

          <div>
            <div className="text-[12px] font-semibold">
              Browser-native agent interface
            </div>

            <p className="mt-1 max-w-3xl text-[11px] leading-5 text-muted-foreground">
              These capabilities are exposed to compatible agents through{' '}
              <code className="font-semibold text-foreground">document.modelContext.registerTool()</code>.
              Select a tool below to open the inspector and execute it directly.
            </p>
          </div>
        </div>
      </div>

      <Card className="mt-8">
        <CardTitle
          meta={
            <span className="text-[11px] text-muted-foreground">
              {tools.length} capabilities
            </span>
          }
        >
          WebMCP capability registry
        </CardTitle>

        <div className="grid md:grid-cols-2 lg:grid-cols-3">
          {toolDefinitions.map((tool) => {
            const fieldCount = Object.keys(tool.inputSchema?.properties || {}).length
            const meta = tools.find(t => t.name === tool.name)

            return (
              <button
                type="button"
                onClick={() => setSelectedTool(tool)}
                className="border-b border-border p-5 text-left transition-colors hover:bg-accent/40 md:[&:nth-child(even)]:border-l"
                key={tool.name}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />

                    <code className="truncate font-mono text-sm font-semibold">
                      {tool.name}
                    </code>
                  </div>

                  <span className="shrink-0 rounded-md border border-border px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                    {meta?.category}
                  </span>
                </div>

                <p className="mb-4 text-sm leading-6 text-muted-foreground">
                  {tool.description}
                </p>

                {meta && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    <span className={[
                      'rounded-md border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider',
                      meta.readOnly ? 'border-sky-400/30 text-sky-300' : 'border-amber-300/30 text-amber-300',
                    ].join(' ')}>
                      {meta.readOnly ? 'Read' : 'Write'}
                    </span>
                    <span className={[
                      'rounded-md border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider',
                      meta.riskLevel === 'high' ? 'border-red-400/30 text-red-400' : meta.riskLevel === 'medium' ? 'border-amber-300/30 text-amber-300' : 'border-emerald-400/30 text-emerald-400',
                    ].join(' ')}>
                      {meta.riskLevel} risk
                    </span>
                    {meta.requiresApproval && (
                      <span className="rounded-md border border-red-400/30 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-red-400">
                        Approval required
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {fieldCount === 0 ? 'No input' : `${fieldCount} input field${fieldCount === 1 ? '' : 's'}`}
                  </span>

                  <span className="flex items-center gap-1 font-semibold text-accent-foreground">
                    Inspect
                    <ChevronRight size={12} />
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {selectedTool && (
        <ToolInspector
          tool={selectedTool}
          meta={tools.find((t) => t.name === selectedTool.name)}
          webmcpAvailable={webmcpAvailable}
          onClose={() => setSelectedTool(null)}
        />
      )}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Activity                                                                    */
/* -------------------------------------------------------------------------- */

function ActivityPage({
  activity,
}: {
  activity: ActivityEntry[]
}) {
  const filters = ['ALL', 'SRE Agent', 'NOC Agent', 'Developer Agent', 'SOC Agent', 'Incident Commander', 'Human Operator'] as const
  const [filter, setFilter] = useState<(typeof filters)[number]>('ALL')

  const filtered = filter === 'ALL' ? activity : activity.filter((entry) => entry.role === filter)

  return (
    <>
      <PageHeader
        eyebrow="Agent activity / audit"
        title="Agent activity"
        sub="A structured, chronological audit trail of every real WebMCP tool invocation made by agents and the investigation interface."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setFilter(role)}
            className={[
              'rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-colors',
              filter === role
                ? 'border-accent-foreground/30 bg-accent text-accent-foreground'
                : 'border-border text-muted-foreground hover:bg-accent/40',
            ].join(' ')}
          >
            {role === 'ALL' ? 'All agents' : role}
          </button>
        ))}
      </div>

      <Card>
        <CardTitle
          meta={
            <span className="flex items-center gap-2 text-[11px] font-medium text-emerald-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Listening
            </span>
          }
        >
          Execution feed
        </CardTitle>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
            <Bot
              className="mb-4 text-muted-foreground"
              size={28}
            />

            <div className="text-[12px] font-semibold">
              No tool executions yet
            </div>

            <p className="mt-2 max-w-sm text-[11px] leading-5 text-muted-foreground">
              Start an investigation or invoke one of
              the exposed WebMCP tools. Actual executions
              will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((entry, index) => {
              const meta = tools.find((t) => t.name === entry.name)

              return (
                <div
                  className="flex gap-4 px-5 py-4"
                  key={`${entry.time}-${entry.name}-${index}`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Bot size={14} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold text-accent-foreground">
                        {entry.role}
                      </span>

                      <code className="font-mono text-[10px] font-semibold">
                        {entry.name}
                      </code>

                      {meta && (
                        <span className={[
                          'rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider',
                          meta.riskLevel === 'high' ? 'border-red-400/30 text-red-400' : meta.riskLevel === 'medium' ? 'border-amber-300/30 text-amber-300' : 'border-emerald-400/30 text-emerald-400',
                        ].join(' ')}>
                          {meta.riskLevel} risk
                        </span>
                      )}

                      <span className="text-[10px] text-muted-foreground">
                        {entry.time} · {entry.duration}ms
                      </span>
                    </div>

                    <div className="mt-1 text-[10px] leading-5 text-muted-foreground">
                      {entry.args} · {entry.summary}
                    </div>
                  </div>

                  <div className="shrink-0 pt-1">
                    {entry.success ? (
                      <Check
                        className="text-emerald-400"
                        size={14}
                      />
                    ) : (
                      <X
                        className="text-red-400"
                        size={14}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function Page() {
  const [section, setSection] =
    useState<Section>('Overview')

  const [webmcpAvailable, setWebmcpAvailable] =
    useState(false)

  /*
   * IMPORTANT:
   *
   * EMPTY_ACTIVITY is a stable reference.
   *
   * Previously this was:
   *
   * () => [] as ActivityEntry[]
   *
   * which created a brand-new array on every render.
   * React therefore detected a changing server snapshot
   * and could enter an infinite loop.
   */
  const activity = useSyncExternalStore(
    subscribe,
    getActivity,
    () => EMPTY_ACTIVITY,
  )

  useEffect(() => {
    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout> | undefined

    const getModelContext = (): ModelContext | undefined =>
      typeof document === 'undefined'
        ? undefined
        : (
            document as Document & {
              modelContext?: ModelContext
            }
          ).modelContext

    const registerTools = async (modelContext: ModelContext) => {
      /*
       * Register every tool concurrently instead of one-at-a-time: a WebMCP
       * client can query available tools as soon as the page loads, so
       * registration should complete as fast as possible rather than
       * serially awaiting each call.
       *
       * Keep registration state local to this effect. The browser may
       * preserve document.modelContext between React mounts, so calling
       * registerTool() again with the same name causes "Duplicate tool
       * name" — that is not a real failure, the tool is already registered.
       */
      const results = await Promise.allSettled(
        toolDefinitions.map((definition) => {
          const meta = tools.find((t) => t.name === definition.name)

          return modelContext.registerTool({
            name: definition.name,
            title: definition.title,
            description:
              definition.description,
            inputSchema:
              definition.inputSchema,
            annotations: {
              readOnlyHint: meta?.readOnly ?? true,
              destructiveHint: meta?.mutating ?? false,
            },
            execute: async (args: Record<string, unknown> = {}) => {
              return executeTool(
                definition.name,
                args,
              )
            },
          })
        }),
      )

      if (cancelled) {
        return
      }

      let registeredCount = 0

      results.forEach((outcome, index) => {
        if (outcome.status === 'fulfilled') {
          registeredCount += 1
          return
        }

        const message =
          outcome.reason instanceof Error
            ? outcome.reason.message
            : String(outcome.reason)

        // Duplicate registration can happen if React remounts while the
        // browser bridge keeps the previous registrations alive. The tool
        // is still registered with the bridge, so count it as successful.
        if (
          message
            .toLowerCase()
            .includes('duplicate tool name')
        ) {
          registeredCount += 1
        } else {
          console.warn(
            '[NexusOps] WebMCP registration failed:',
            toolDefinitions[index].name,
            outcome.reason,
          )
        }
      })

      console.info(
        `[NexusOps] WebMCP: ${registeredCount}/${toolDefinitions.length} tools registered.`,
      )

      // The bridge is only ACTIVE once at least one tool is confirmed
      // registered, never just because registerTool exists as a function.
      setWebmcpAvailable(registeredCount > 0)
    }

    /*
     * document.modelContext can be injected by a browser extension or agent
     * host asynchronously, sometimes after this effect's first run. Poll
     * briefly instead of permanently deciding "unavailable" on the first
     * tick, so a slightly-late bridge is still detected correctly.
     */
    const attempt = (attemptsLeft: number) => {
      if (cancelled) {
        return
      }

      const modelContext = getModelContext()

      if (
        modelContext &&
        typeof modelContext.registerTool === 'function'
      ) {
        console.info(
          '[NexusOps] WebMCP: document.modelContext detected.',
        )
        void registerTools(modelContext)
        return
      }

      if (attemptsLeft <= 0) {
        console.info(
          '[NexusOps] WebMCP: document.modelContext not available; bridge unavailable.',
        )
        setWebmcpAvailable(false)
        return
      }

      pollTimer = setTimeout(
        () => attempt(attemptsLeft - 1),
        250,
      )
    }

    // Poll for up to ~5 seconds before giving up.
    attempt(20)

    return () => {
      cancelled = true
      if (pollTimer) {
        clearTimeout(pollTimer)
      }
    }
  }, [])

  return (
    <AppShell
      section={section}
      setSection={setSection}
      activityCount={activity.length}
      webmcpAvailable={
        webmcpAvailable
      }
    >
      {section === 'Overview' && (
        <Overview
          setSection={setSection}
          activityCount={activity.length}
          webmcpAvailable={webmcpAvailable}
        />
      )}

      {section === 'Services' && (
        <Services />
      )}

      {section === 'Incidents' && (
        <Incidents
          setSection={setSection}
        />
      )}

      {section === 'Investigation' && <LiveInvestigation webmcpAvailable={webmcpAvailable} />}

      {section === 'Agent Activity' && (
        <ActivityPage
          activity={activity}
        />
      )}

      {section === 'WebMCP Tools' && (
        <ToolsPage
          webmcpAvailable={
            webmcpAvailable
          }
        />
      )}
    </AppShell>
  )
}