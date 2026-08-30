'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Database,
  Loader2,
  Search,
  Server,
  X,
} from 'lucide-react'

type RegisteredTool = {
  name: string
  inputSchema?: Record<
    string,
    unknown
  >
}

type ModelContext = {
  getTools: () => Promise<
    RegisteredTool[]
  >

  executeTool: (
    tool: RegisteredTool,
    args: string,
  ) => Promise<unknown>
}

type Result = Record<
  string,
  any
>

type Step = {
  label: string
  tool: string
  args: Record<
    string,
    unknown
  >
}

const steps: Step[] = [
  {
    label: 'Reading active incidents',
    tool: 'get_active_incidents',
    args: {},
  },
  {
    label: 'Reading incident state',
    tool: 'get_incident',
    args: {
      incident_id: 'INC-1042',
    },
  },
  {
    label: 'Gathering incident evidence',
    tool: 'get_incident_evidence',
    args: {
      incident_id: 'INC-1042',
    },
  },
  {
    label: 'Reading incident timeline',
    tool: 'get_incident_timeline',
    args: {
      incident_id: 'INC-1042',
    },
  },
  {
    label: 'Reading telemetry',
    tool: 'get_metrics',
    args: {
      service_id: 'payment-api',
    },
  },
  {
    label: 'Comparing healthy baseline',
    tool: 'compare_metrics',
    args: {
      service_id: 'payment-api',
      incident_id: 'INC-1042',
    },
  },
  {
    label: 'Reading structured logs',
    tool: 'get_logs',
    args: {
      service_id: 'payment-api',
    },
  },
  {
    label: 'Reading deployment history',
    tool: 'get_deployment_history',
    args: {
      service_id: 'payment-api',
    },
  },
  {
    label: 'Inspecting dependencies',
    tool: 'get_dependencies',
    args: {
      service_id: 'payment-api',
    },
  },
  {
    label: 'Checking service health',
    tool: 'get_service_health',
    args: {
      service_id: 'payment-api',
    },
  },
  {
    label: 'Correlating events',
    tool: 'correlate_events',
    args: {
      service_id: 'payment-api',
      incident_id: 'INC-1042',
    },
  },
  {
    label: 'Running diagnostic',
    tool: 'run_diagnostic',
    args: {
      service_id: 'payment-api',
      incident_id: 'INC-1042',
    },
  },
]

const normalizeToolResult = (
  result: unknown,
): unknown => {
  if (typeof result !== 'string') {
    return result
  }

  try {
    return JSON.parse(result)
  } catch {
    return result
  }
}

async function callTool(
  ctx: ModelContext,
  name: string,
  args: Record<
    string,
    unknown
  >,
) {
  const registered = (
    await ctx.getTools()
  ).find(
    tool => tool.name === name,
  )

  if (!registered) {
    throw new Error(
      `WebMCP tool "${name}" is not registered.`,
    )
  }

  const schema =
    registered.inputSchema

  const properties =
    schema &&
    typeof schema === 'object' &&
    'properties' in schema
      ? (
          schema as {
            properties?: Record<
              string,
              unknown
            >
          }
        ).properties
      : undefined

  const safeArgs =
    Object.fromEntries(
      Object.entries(args).filter(
        ([key]) =>
          !properties ||
          key in properties,
      ),
    )

  const response =
    await ctx.executeTool(
      registered,
      JSON.stringify(
        safeArgs,
      ),
    )

  return normalizeToolResult(
    response,
  )
}

function numberFrom(
  value: unknown,
) {
  const n = Number(value)

  return Number.isFinite(n)
    ? n
    : null
}

function getLatestNumber(
  values: unknown,
): number | null {
  if (
    !Array.isArray(values) ||
    values.length === 0
  ) {
    return null
  }

  return numberFrom(
    values[values.length - 1],
  )
}

function formatPercent(
  value: number | null,
) {
  return value === null
    ? '—'
    : `${value}%`
}

function formatMs(
  value: number | null,
) {
  return value === null
    ? '—'
    : `${value.toLocaleString()} ms`
}

export default function LiveInvestigation() {
  const [running, setRunning] =
    useState(false)

  const [step, setStep] =
    useState(-1)

  const [error, setError] =
    useState('')

  const [
    toolResults,
    setToolResults,
  ] = useState<
    Record<string, Result>
  >({})

  const investigate = async () => {
    setRunning(true)
    setStep(0)
    setError('')
    setToolResults({})

    try {
      if (
        typeof document ===
          'undefined' ||
        !document.modelContext
      ) {
        throw new Error(
          'WebMCP is unavailable. Open NexusOps in a compatible browser with WebMCP enabled.',
        )
      }

      const ctx =
        document.modelContext as unknown as ModelContext

      const results: Record<
        string,
        Result
      > = {}

      for (
        let i = 0;
        i < steps.length;
        i++
      ) {
        setStep(i)

        const current =
          steps[i]

        const value =
          await callTool(
            ctx,
            current.tool,
            current.args,
          )

        if (
          !value ||
          typeof value !==
            'object'
        ) {
          throw new Error(
            `${current.tool} returned an invalid response.`,
          )
        }

        const result =
          value as Result

        if (result.error) {
          throw new Error(
            `${current.tool}: ${result.error}`,
          )
        }

        results[
          current.tool
        ] = result

        setToolResults({
          ...results,
        })
      }

      setStep(
        steps.length,
      )
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Investigation failed.',
      )
    } finally {
      setRunning(false)
    }
  }

  const metricsResult =
    toolResults.get_metrics

  const deploymentResult =
    toolResults.get_deployment_history

  const logsResult =
    toolResults.get_logs

  const diagnostic =
    toolResults.run_diagnostic

  const correlation =
    toolResults.correlate_events

  const baseline =
    toolResults.compare_metrics

  const incidentResult =
    toolResults.get_incident

  const latency =
    getLatestNumber(
      metricsResult?.latency_ms,
    )

  const errorRate =
    getLatestNumber(
      metricsResult?.error_rate,
    )

  const dbConnections =
    getLatestNumber(
      metricsResult?.db_connections,
    )

  const requestRate =
    getLatestNumber(
      metricsResult?.request_rate,
    )

  const deployments =
    deploymentResult?.deployments ??
    []

  const latestDeployment =
    deployments[0]

  const hasEvidence =
    Boolean(metricsResult) ||
    Boolean(logsResult) ||
    Boolean(deploymentResult) ||
    Boolean(correlation)

  const causalSignals = [
    {
      label: 'Recent deployment',
      value:
        latestDeployment?.version ??
        'No deployment returned',

      detail: latestDeployment
        ? `${latestDeployment.time} UTC · ${latestDeployment.change}`
        : 'No deployment evidence was returned.',

      icon: Server,

      positive:
        Boolean(
          latestDeployment,
        ),
    },

    {
      label: 'Database pressure',
      value:
        formatPercent(
          dbConnections,
        ),

      detail:
        dbConnections !==
        null
          ? 'Latest database connection utilization'
          : 'No database utilization metric returned.',

      icon: Database,

      positive:
        dbConnections !==
          null &&
        dbConnections >= 80,
    },

    {
      label: 'Latency',
      value:
        formatMs(latency),

      detail:
        baseline?.baseline
          ?.latency_ms !==
        undefined
          ? `Baseline: ${baseline.baseline.latency_ms} ms`
          : 'No baseline returned.',

      icon: AlertTriangle,

      positive:
        latency !== null &&
        latency > 500,
    },

    {
      label: 'HTTP error rate',
      value:
        formatPercent(
          errorRate,
        ),

      detail:
        baseline?.baseline
          ?.error_rate !==
        undefined
          ? `Baseline: ${baseline.baseline.error_rate}%`
          : 'No baseline returned.',

      icon: AlertTriangle,

      positive:
        errorRate !== null &&
        errorRate > 5,
    },
  ]

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[.2em] text-accent-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-foreground" />
            Investigation / WebMCP
          </div>

          <h1 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
            Payment API investigation
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Gather production evidence through the tools registered
            on this page. Findings shown below are derived from the
            returned evidence.
          </p>
        </div>

        <button
          type="button"
          onClick={investigate}
          disabled={running}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
        >
          {running ? (
            <Loader2
              className="animate-spin"
              size={14}
            />
          ) : (
            <Search size={14} />
          )}

          {running
            ? 'Investigation running'
            : 'Investigate with WebMCP'}
        </button>
      </div>

      {!running &&
        !hasEvidence &&
        !error && (
          <div className="mb-6 rounded-lg border border-accent-foreground/20 bg-accent/30 p-5 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">
              Ready for evidence collection
            </div>

            <p className="mt-1 text-xs leading-5">
              NexusOps will discover the browser's registered
              WebMCP tools and query the active incident, metrics,
              logs, deployment history, dependencies, timeline and
              diagnostic data.
            </p>

            <p className="mt-3 text-[11px] text-muted-foreground">
              No remediation is approved or executed by this
              investigation.
            </p>
          </div>
        )}

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-300"
        >
          <X
            size={16}
            className="mt-0.5 shrink-0"
          />

          <div>
            <div className="font-semibold">
              Investigation could not complete
            </div>

            <div className="mt-1 text-xs text-red-200/80">
              {error}
            </div>
          </div>
        </div>
      )}

      {(running ||
        hasEvidence) && (
        <>
          <section className="mb-6 rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">
                  Evidence-derived signals
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  These values come from WebMCP tool responses.
                </p>
              </div>

              <span className="rounded border border-accent-foreground/20 bg-accent/30 px-2 py-1 font-mono text-[10px] text-accent-foreground">
                LIVE TOOL DATA
              </span>
            </div>

            <div className="grid gap-0 md:grid-cols-2">
              {causalSignals.map(
                signal => {
                  const Icon =
                    signal.icon

                  return (
                    <div
                      key={
                        signal.label
                      }
                      className="border-b border-border p-5 md:[&:nth-child(even)]:border-l"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Icon
                              size={14}
                              className={
                                signal.positive
                                  ? 'text-amber-300'
                                  : 'text-muted-foreground'
                              }
                            />

                            <span className="text-sm font-semibold">
                              {
                                signal.label
                              }
                            </span>
                          </div>

                          <div className="mt-2 font-mono text-xl font-semibold">
                            {
                              signal.value
                            }
                          </div>
                        </div>

                        {signal.positive && (
                          <span className="rounded-full bg-amber-300/10 px-2 py-1 text-[9px] font-semibold uppercase text-amber-300">
                            signal
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        {
                          signal.detail
                        }
                      </p>
                    </div>
                  )
                },
              )}
            </div>
          </section>

          {diagnostic && (
            <section className="mb-6 rounded-lg border border-accent-foreground/20 bg-accent/20 p-5">
              <div className="mb-4">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-accent-foreground">
                  Diagnostic output
                </div>

                <h2 className="mt-1 text-base font-semibold">
                  Evidence returned by diagnostic tool
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Latency
                  </div>

                  <div className="mt-1 font-mono text-lg">
                    {formatMs(
                      numberFrom(
                        diagnostic
                          .diagnostic_signals
                          ?.latency_peak_ms,
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Error rate
                  </div>

                  <div className="mt-1 font-mono text-lg">
                    {formatPercent(
                      numberFrom(
                        diagnostic
                          .diagnostic_signals
                          ?.error_rate_peak_percent,
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    DB connections
                  </div>

                  <div className="mt-1 font-mono text-lg">
                    {formatPercent(
                      numberFrom(
                        diagnostic
                          .diagnostic_signals
                          ?.database_connection_peak_percent,
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Timeout events
                  </div>

                  <div className="mt-1 font-mono text-lg">
                    {diagnostic
                      .diagnostic_signals
                      ?.timeout_events ??
                      '—'}
                  </div>
                </div>
              </div>

              {Array.isArray(
                diagnostic.evidence,
              ) && (
                <div className="mt-5">
                  <div className="mb-2 text-xs text-muted-foreground">
                    Returned evidence
                  </div>

                  <ul className="space-y-2">
                    {diagnostic.evidence.map(
                      (
                        item: string,
                        index: number,
                      ) => (
                        <li
                          className="flex gap-2 text-xs text-muted-foreground"
                          key={`${item}-${index}`}
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-foreground" />
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}
            </section>
          )}

          {incidentResult && (
            <section className="mb-6 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold">
                    Incident state
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Returned by get_incident.
                  </p>
                </div>

                <span className="font-mono text-xs">
                  {
                    incidentResult.incident_id
                  }
                </span>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-4">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Severity
                  </div>

                  <div className="mt-1 font-mono text-sm text-red-400">
                    {
                      incidentResult.severity ??
                      '—'
                    }
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Status
                  </div>

                  <div className="mt-1 text-sm">
                    {
                      incidentResult.status ??
                      '—'
                    }
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Service
                  </div>

                  <div className="mt-1 font-mono text-sm">
                    {
                      incidentResult.service ??
                      '—'
                    }
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Request rate
                  </div>

                  <div className="mt-1 font-mono text-sm">
                    {requestRate !==
                    null
                      ? `${requestRate.toLocaleString()} / min`
                      : '—'}
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
            <section className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <div className="text-sm font-semibold">
                  WebMCP investigation flow
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  Each row represents an actual tool invocation.
                </div>
              </div>

              <div className="divide-y divide-border">
                {steps.map(
                  (item, i) => (
                    <div
                      key={`${item.tool}-${i}`}
                      className="flex items-center gap-3 px-5 py-4 text-xs"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          step > i
                            ? 'bg-emerald-400/15 text-emerald-400'
                            : step === i &&
                                running
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {step > i ? (
                          <Check size={13} />
                        ) : (
                          i + 1
                        )}
                      </span>

                      <div>
                        <div
                          className={
                            step >= i
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }
                        >
                          {
                            item.label
                          }
                        </div>

                        <code className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                          {
                            item.tool
                          }
                        </code>
                      </div>

                      {step === i &&
                        running && (
                          <Loader2
                            className="ml-auto animate-spin text-accent-foreground"
                            size={13}
                          />
                        )}

                      {step > i && (
                        <ChevronRight
                          className="ml-auto text-emerald-400"
                          size={13}
                        />
                      )}
                    </div>
                  ),
                )}
              </div>
            </section>

            <section className="space-y-6">
              <section className="rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border px-5 py-4 text-sm font-semibold">
                  <AlertTriangle
                    size={15}
                    className="text-amber-300"
                  />
                  Correlation output
                </div>

                {correlation ? (
                  <div className="space-y-4 p-5">
                    {Array.isArray(
                      correlation.correlations,
                    ) ? (
                      correlation.correlations.map(
                        (
                          item: Result,
                          index: number,
                        ) => (
                          <div
                            key={`${item.type}-${index}`}
                            className="rounded-md border border-border p-4"
                          >
                            <div className="font-mono text-[10px] uppercase tracking-wider text-accent-foreground">
                              {String(
                                item.type,
                              ).replaceAll(
                                '_',
                                ' ',
                              )}
                            </div>

                            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-5 text-muted-foreground">
                              {JSON.stringify(
                                item,
                                null,
                                2,
                              )}
                            </pre>
                          </div>
                        ),
                      )
                    ) : (
                      <pre className="overflow-x-auto whitespace-pre-wrap p-5 font-mono text-[10px] text-muted-foreground">
                        {JSON.stringify(
                          correlation,
                          null,
                          2,
                        )}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div className="p-5 text-xs text-muted-foreground">
                    Waiting for correlation output…
                  </div>
                )}
              </section>

              {logsResult && (
                <section className="rounded-lg border border-border bg-card">
                  <div className="border-b border-border px-5 py-4 text-sm font-semibold">
                    Returned log evidence
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[600px] divide-y divide-border">
                      {(
                        logsResult.logs ??
                        []
                      ).map(
                        (
                          entry: string[],
                          index: number,
                        ) => (
                          <div
                            key={`${entry[0]}-${index}`}
                            className="grid grid-cols-[70px_65px_1fr_1fr] gap-3 px-5 py-3 font-mono text-[11px]"
                          >
                            <span className="text-muted-foreground">
                              {
                                entry[0]
                              }
                            </span>

                            <span
                              className={
                                entry[1] ===
                                'ERROR'
                                  ? 'text-red-400'
                                  : entry[1] ===
                                      'WARN'
                                    ? 'text-amber-300'
                                    : 'text-emerald-400'
                              }
                            >
                              {
                                entry[1]
                              }
                            </span>

                            <span>
                              {
                                entry[2]
                              }
                            </span>

                            <span className="text-muted-foreground">
                              {
                                entry[3]
                              }
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </section>
              )}

              <section className="rounded-lg border border-border bg-card">
                <div className="border-b border-border px-5 py-4 text-sm font-semibold">
                  Investigation boundary
                </div>

                <div className="p-5">
                  <p className="text-xs leading-5 text-muted-foreground">
                    This investigation only gathers evidence and
                    analyzes returned telemetry. It does not approve,
                    execute, or verify remediation.
                  </p>

                  <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs text-emerald-400">
                    <Check size={14} />
                    Human approval remains required for remediation.
                  </div>
                </div>
              </section>
            </section>
          </div>
        </>
      )}
    </>
  )
}

declare global {
  interface Document {
    modelContext?: ModelContext
  }
}