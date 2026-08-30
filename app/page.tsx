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
  ChevronRight,
  Code2,
  Gauge,
  Globe2,
  LayoutDashboard,
  Menu,
  Network,
  RefreshCw,
  Search,
  Server,
  Terminal,
  X,
} from 'lucide-react'

import {
  executeTool,
  incident,
  services,
  statusDot,
  statusStyles,
  toolDefinitions,
  tools,
  getActivity,
  subscribe,
  type ActivityEntry,
} from '@/lib/nexus-data'

import LiveInvestigation from '@/components/live-investigation'

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

            <span className="flex items-center gap-2 font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Production
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
  status:
    | 'healthy'
    | 'degraded'
    | 'warning'
    | 'critical'
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
}: {
  setSection: (section: Section) => void
  activityCount: number
}) {
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
        title="Command center"
        sub="Current operational health, active incidents, and agent activity across the production environment."
        action={
          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-[11px] font-semibold transition-colors hover:bg-accent"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Environment health"
          value="97.8%"
          note="+0.4% from yesterday"
          icon={<Gauge size={16} />}
          good
        />

        <Stat
          label="Active incidents"
          value="01"
          note="P1 requires attention"
          icon={<AlertTriangle size={16} />}
          alert
        />

        <Stat
          label="Services operational"
          value={`${counts.healthy}/${services.length}`}
          note={`${servicesNeedingAttention} need attention`}
          icon={<Server size={16} />}
          good
        />

        <Stat
          label="Agent invocations"
          value={String(activityCount)}
          note={
            activityCount
              ? 'WebMCP executions this session'
              : 'No executions yet'
          }
          icon={<Bot size={16} />}
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
                className="text-[11px] font-medium text-accent-foreground hover:underline"
              >
                View inventory
                <ArrowUpRight
                  className="ml-1 inline"
                  size={12}
                />
              </button>
            }
          >
            Service health
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
                    <div className="truncate text-[12px] font-semibold">
                      {service.name}
                    </div>
                  </div>

                  <Badge
                    status={service.status}
                  />

                  <div className="ml-auto hidden items-center gap-5 text-right sm:flex">
                    <div>
                      <div className="text-[11px] font-semibold tabular-nums">
                        {service.latency} ms
                      </div>

                      <div className="mt-0.5 text-[10px] text-muted-foreground">
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

        <div className="grid gap-6">
          <Card>
            <CardTitle
              meta={
                <span className="text-[11px] font-medium text-muted-foreground">
                  {incident.started} UTC
                </span>
              }
            >
              Active incident
            </CardTitle>

            <div className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-md bg-red-400/10 px-2 py-1 text-[10px] font-bold text-red-400">
                  P1
                </span>

                <span className="font-mono text-[10px] text-muted-foreground">
                  {incident.id}
                </span>
              </div>

              <h3 className="text-[16px] font-bold tracking-tight">
                {incident.title}
              </h3>

              <p className="mt-1 text-[12px] text-muted-foreground">
                Payment API · investigating
              </p>

              <button
                type="button"
                onClick={() =>
                  setSection('Investigation')
                }
                className="mt-5 flex w-full items-center justify-between rounded-lg border border-border px-3.5 py-3 text-[11px] font-semibold transition-colors hover:bg-accent"
              >
                Open investigation
                <ChevronRight size={14} />
              </button>
            </div>
          </Card>

          <Card>
            <CardTitle>
              Recent events
            </CardTitle>

            <div className="space-y-5 p-5">
              {[
                [
                  '14:35',
                  'Incident created',
                  'INC-1042 opened by monitoring',
                ],
                [
                  '14:34',
                  'Error rate threshold',
                  'Payment API 5xx reached 23.4%',
                ],
                [
                  '14:29',
                  'Deployment completed',
                  'payment-api v2.7.3',
                ],
              ].map(
                ([time, title, detail]) => (
                  <div
                    className="flex gap-3"
                    key={time}
                  >
                    <span className="w-11 shrink-0 font-mono text-[10px] text-muted-foreground">
                      {time}
                    </span>

                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold">
                        {title}
                      </div>

                      <div className="mt-1 text-[11px] leading-5 text-muted-foreground">
                        {detail}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Services                                                                    */
/* -------------------------------------------------------------------------- */

function Services() {
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

function ToolsPage({
  webmcpAvailable,
}: {
  webmcpAvailable: boolean
}) {
  return (
    <>
      <PageHeader
        eyebrow="WebMCP / agent interface"
        title="Agent-accessible tools"
        sub="Operational capabilities exposed through document.modelContext. Compatible agents can discover and invoke these tools against the same operational state."
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

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Registered tools"
          value={String(tools.length)}
          note="Available to compatible agents"
          icon={<Code2 size={16} />}
          good
        />

        <Stat
          label="Structured outputs"
          value="JSON"
          note="Tool contracts use schemas"
          icon={<Box size={16} />}
          good
        />

        <Stat
          label="Execution model"
          value="Browser"
          note="WebMCP bridge on this page"
          icon={<Globe2 size={16} />}
        />
      </div>

      <Card>
        <CardTitle
          meta={
            <span className="text-[11px] text-muted-foreground">
              {tools.length} capabilities
            </span>
          }
        >
          WebMCP capability registry
        </CardTitle>

        <div className="grid md:grid-cols-2">
          {tools.map((tool) => (
            <div
              className="border-b border-border p-5 md:[&:nth-child(even)]:border-l"
              key={tool.name}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />

                  <code className="truncate font-mono text-[11px] font-semibold">
                    {tool.name}
                  </code>
                </div>

                <span className="shrink-0 rounded-md border border-border px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                  {tool.category}
                </span>
              </div>

              <p className="mb-4 text-[11px] leading-5 text-muted-foreground">
                {tool.description}
              </p>

              <div className="grid gap-2 text-[9px] text-muted-foreground">
                <div>
                  <span className="font-bold text-foreground">
                    INPUT
                  </span>{' '}
                  <code className="font-mono">
                    {tool.input}
                  </code>
                </div>

                <div>
                  <span className="font-bold text-foreground">
                    OUTPUT
                  </span>{' '}
                  {tool.output}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

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
              NexusOps exposes operational capabilities
              through document.modelContext. A compatible
              agent can discover the registered tools, invoke
              them, inspect structured responses, and reason
              over the returned evidence.
            </p>
          </div>
        </div>
      </div>
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
  return (
    <>
      <PageHeader
        eyebrow="Agent activity / audit"
        title="Agent activity"
        sub="A live audit trail of WebMCP tool invocations made by compatible agents and the investigation interface."
      />

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

        {activity.length === 0 ? (
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
            {activity.map((entry, index) => (
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

                    <span className="text-[10px] text-muted-foreground">
                      {entry.time}
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
            ))}
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

    const registerTools = async () => {
      if (
        typeof document === 'undefined'
      ) {
        return
      }

      const modelContext = (
        document as Document & {
          modelContext?: ModelContext
        }
      ).modelContext

      if (!modelContext) {
        return
      }

      setWebmcpAvailable(true)

      /*
       * Keep registration state local to this effect.
       *
       * The browser may preserve document.modelContext
       * between React mounts. Calling registerTool() again
       * with the same name causes:
       *
       * Duplicate tool name
       *
       * So we first keep track of the names registered by
       * this page instance and stop if cleanup happens.
       */
      const registeredNames = new Set<string>()

      for (const definition of toolDefinitions) {
        if (cancelled) {
          return
        }

        if (
          registeredNames.has(
            definition.name,
          )
        ) {
          continue
        }

        registeredNames.add(
          definition.name,
        )

        try {
          await modelContext.registerTool({
            name: definition.name,
            title: definition.title,
            description:
              definition.description,
            inputSchema:
              definition.inputSchema,
            execute: async (
              args: Record<
                string,
                unknown
              > = {},
            ) => {
              return executeTool(
                definition.name,
                args,
              )
            },
          })
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : String(error)

          /*
           * Duplicate registration can still happen if
           * React remounts while the browser bridge keeps
           * the previous registrations alive.
           *
           * Do not treat that as an application-breaking
           * error.
           */
          if (
            !message
              .toLowerCase()
              .includes(
                'duplicate tool name',
              )
          ) {
            console.warn(
              '[NexusOps] WebMCP registration failed:',
              definition.name,
              error,
            )
          }
        }
      }
    }

    void registerTools()

    return () => {
      cancelled = true
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

      {section === 'Investigation' && (
        <LiveInvestigation />
      )}

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