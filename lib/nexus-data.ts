export type Status =
  | 'healthy'
  | 'degraded'
  | 'warning'
  | 'critical'

export type AgentRole =
  | 'NOC Agent'
  | 'SRE Agent'
  | 'Human Operator'

export const services = [
  {
    id: 'api-gateway',
    name: 'API Gateway',
    status: 'healthy' as Status,
    latency: 42,
    errorRate: 0.12,
    requestRate: 8420,
    cpu: 38,
    memory: 54,
    dependencies: [
      'network',
      'authentication',
      'payment-api',
      'order-service',
    ],
    events: [
      '09:42 route cache refreshed',
      '08:16 TLS certificate renewed',
    ],
    deployment: 'v4.18.2 · 08:12',
  },

  {
    id: 'authentication',
    name: 'Authentication Service',
    status: 'healthy' as Status,
    latency: 86,
    errorRate: 0.08,
    requestRate: 3210,
    cpu: 44,
    memory: 61,
    dependencies: ['postgresql', 'redis'],
    events: ['09:12 token signing keys rotated'],
    deployment: 'v3.12.0 · yesterday',
  },

  {
    id: 'payment-api',
    name: 'Payment API',
    status: 'degraded' as Status,
    latency: 2400,
    errorRate: 23.4,
    requestRate: 1840,
    cpu: 91,
    memory: 78,
    dependencies: ['postgresql', 'redis'],
    events: [
      '14:34 5xx rate crossed P1 threshold',
      '14:29 deployment completed',
    ],
    deployment: 'v2.7.3 · 14:29',
  },

  {
    id: 'order-service',
    name: 'Order Service',
    status: 'healthy' as Status,
    latency: 120,
    errorRate: 0.42,
    requestRate: 1290,
    cpu: 52,
    memory: 63,
    dependencies: ['postgresql', 'payment-api'],
    events: ['13:05 queue depth normalized'],
    deployment: 'v8.4.1 · 11:45',
  },

  {
    id: 'postgresql',
    name: 'PostgreSQL',
    status: 'warning' as Status,
    latency: 18,
    errorRate: 1.8,
    requestRate: 11800,
    cpu: 74,
    memory: 82,
    dependencies: ['network'],
    events: [
      '14:33 connection pool at 93%',
      '14:30 read replica lag 1.8s',
    ],
    deployment: '15.6 · 4 days ago',
  },

  {
    id: 'redis',
    name: 'Redis',
    status: 'healthy' as Status,
    latency: 3,
    errorRate: 0.02,
    requestRate: 24500,
    cpu: 29,
    memory: 68,
    dependencies: ['network'],
    events: ['12:00 snapshot completed'],
    deployment: '7.2.4 · 6 days ago',
  },

  {
    id: 'message-queue',
    name: 'Message Queue',
    status: 'healthy' as Status,
    latency: 12,
    errorRate: 0.14,
    requestRate: 6400,
    cpu: 35,
    memory: 48,
    dependencies: ['network'],
    events: ['10:33 consumer rebalance completed'],
    deployment: '3.9.0 · Monday',
  },

  {
    id: 'network',
    name: 'Network',
    status: 'healthy' as Status,
    latency: 8,
    errorRate: 0.01,
    requestRate: 42000,
    cpu: 21,
    memory: 32,
    dependencies: [],
    events: ['11:02 edge health checks nominal'],
    deployment: 'edge · managed',
  },

  {
    id: 'monitoring',
    name: 'Monitoring Service',
    status: 'healthy' as Status,
    latency: 64,
    errorRate: 0.05,
    requestRate: 890,
    cpu: 28,
    memory: 47,
    dependencies: ['postgresql', 'message-queue'],
    events: ['14:35 incident INC-1042 opened'],
    deployment: 'v6.2.0 · 09:01',
  },
]

export const incident = {
  id: 'INC-1042',
  title: 'Payment API degradation',
  severity: 'P1',
  status: 'Investigating',
  service: 'payment-api',
  started: '14:35',

  symptoms: [
    'Increased latency',
    'Elevated HTTP 5xx rate',
    'High database connection utilization',
    'Increased traffic',
    'Recent deployment',
  ],
}

export const timeline = [
  ['14:29', 'Payment API deployment completed', 'deploy'],
  ['14:31', 'Request rate increased', 'info'],
  ['14:32', 'API latency begins increasing', 'warn'],
  ['14:33', 'Database connections increase', 'warn'],
  ['14:34', 'HTTP 5xx errors increase', 'error'],
  ['14:35', 'Incident created', 'incident'],
]

export const logs = [
  [
    '14:32:01',
    'INFO',
    'payment request received',
    'request_id=req_8f21 route=/v1/charge',
  ],
  [
    '14:32:03',
    'WARN',
    'database connection pool utilization',
    'utilization=87% pool=payments',
  ],
  [
    '14:33:02',
    'ERROR',
    'database connection timeout',
    'waited_ms=3000 pool=payments',
  ],
  [
    '14:33:18',
    'WARN',
    'retrying transaction',
    'attempt=2 request_id=req_8f21',
  ],
  [
    '14:34:18',
    'ERROR',
    'payment request failed',
    'status=503 error=connection_timeout',
  ],
  [
    '14:34:42',
    'ERROR',
    'payment request failed',
    'status=500 error=upstream_unavailable',
  ],
]

export const metrics = {
  service: 'payment-api',
  window: 'last_60m',

  latency_ms: [
    120,
    140,
    180,
    420,
    980,
    2400,
  ],

  request_rate: [
    1120,
    1240,
    1380,
    1610,
    1790,
    1840,
  ],

  error_rate: [
    0.4,
    0.6,
    1.2,
    4.8,
    16.2,
    23.4,
  ],

  cpu_percent: [
    48,
    55,
    64,
    76,
    87,
    91,
  ],

  memory_percent: [
    62,
    65,
    69,
    73,
    76,
    78,
  ],

  db_connections: [
    42,
    48,
    61,
    74,
    87,
    93,
  ],
}

export const healthyMetrics = {
  latency_ms: 142,
  error_rate: 0.6,
  db_connections: 48,
  cpu_percent: 52,
  memory_percent: 64,
  request_rate: 1180,
}

export const deployments = [
  {
    version: 'v2.7.3',
    service: 'payment-api',
    time: '14:29',
    status: 'successful',
    actor: 'release-bot',
    change: 'Connection pooling configuration',
  },

  {
    version: 'v2.7.2',
    service: 'payment-api',
    time: 'yesterday 18:02',
    status: 'successful',
    actor: 'release-bot',
    change: 'PCI logging updates',
  },
]

/*
|--------------------------------------------------------------------------
| WebMCP TOOL CATALOG
|--------------------------------------------------------------------------
*/

export const tools = [
  {
    name: 'get_active_incidents',
    category: 'OBSERVATION',
    description:
      'List active production incidents requiring operator attention.',
  },

  {
    name: 'get_incident',
    category: 'OBSERVATION',
    description:
      'Retrieve the current state of a specific incident.',
  },

  {
    name: 'get_incident_evidence',
    category: 'OBSERVATION',
    description:
      'Return correlated metrics, logs, timeline, deployment and finding evidence for an incident.',
  },

  {
    name: 'get_service_health',
    category: 'OBSERVATION',
    description:
      'Retrieve current health signals for a service.',
  },

  {
    name: 'get_dependencies',
    category: 'OBSERVATION',
    description:
      'Retrieve the current service dependency graph and dependency health.',
  },

  {
    name: 'get_deployment_history',
    category: 'OBSERVATION',
    description:
      'Retrieve deployment history for a service.',
  },

  {
    name: 'get_metrics',
    category: 'OBSERVATION',
    description:
      'Retrieve current telemetry metrics for a service.',
  },

  {
    name: 'get_logs',
    category: 'OBSERVATION',
    description:
      'Retrieve structured application logs for a service.',
  },

  {
    name: 'get_incident_timeline',
    category: 'INVESTIGATION',
    description:
      'Retrieve the chronological timeline of an incident.',
  },

  {
    name: 'compare_metrics',
    category: 'INVESTIGATION',
    description:
      'Compare incident telemetry against the prior healthy baseline.',
  },

  {
    name: 'correlate_events',
    category: 'INVESTIGATION',
    description:
      'Correlate deployment events, telemetry changes, logs and incident timing.',
  },

  {
    name: 'run_diagnostic',
    category: 'INVESTIGATION',
    description:
      'Run an evidence-based diagnostic across incident telemetry without executing remediation.',
  },

  {
    name: 'create_investigation_finding',
    category: 'INVESTIGATION',
    description:
      'Store an investigation finding for human operator review.',
  },

  {
    name: 'propose_remediation',
    category: 'RECOMMENDATION',
    description:
      'Generate a safe, human-reviewable mitigation recommendation.',
  },

  {
    name: 'approve_remediation',
    category: 'HUMAN CONTROL',
    description:
      'Record explicit human operator approval for the simulated rollback.',
  },

  {
    name: 'execute_remediation',
    category: 'ACTION',
    description:
      'Execute the approved non-destructive simulated rollback.',
  },

  {
    name: 'verify_remediation',
    category: 'VERIFICATION',
    description:
      'Verify service recovery after remediation.',
  },

  {
    name: 'verify_incident',
    category: 'VERIFICATION',
    description:
      'Verify the current incident state.',
  },

  {
    name: 'get_agent_activity',
    category: 'OBSERVATION',
    description:
      'Read the live audit trail of tool invocations.',
  },
]

export type ActivityEntry = {
  time: string
  role: AgentRole
  name: string
  args: string
  success: boolean
  summary: string
}

let activity: ActivityEntry[] = []

let approved = false
let remediationExecuted = false

const findings: string[] = []

const listeners = new Set<() => void>()

export const subscribe = (
  listener: () => void,
) => {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

export const getActivity = () => activity

export const getWorkflowState = () => ({
  approved,
  remediationExecuted,
})

const notify = () =>
  listeners.forEach((listener) => listener())

const roleFor = (
  name: string,
): AgentRole => {
  if (
    [
      'get_active_incidents',
      'get_incident',
      'get_service_health',
    ].includes(name)
  ) {
    return 'NOC Agent'
  }

  if (
    name === 'approve_remediation'
  ) {
    return 'Human Operator'
  }

  return 'SRE Agent'
}

const summarize = (
  name: string,
  result: Record<string, unknown>,
) => {
  if (name === 'get_service_health') {
    return `${String(result.service)} is ${String(
      result.status,
    )}`
  }

  if (name === 'execute_remediation') {
    return String(
      result.success
        ? 'Rollback executed'
        : result.reason,
    )
  }

  if (
    name === 'verify_remediation' ||
    name === 'verify_incident'
  ) {
    return `Incident ${String(
      result.status ||
        result.incident_status ||
        'unknown',
    )}`
  }

  if (
    name ===
    'create_investigation_finding'
  ) {
    return 'Finding stored for operator review'
  }

  if (name === 'run_diagnostic') {
    return 'Evidence-based diagnostic completed'
  }

  if (name === 'correlate_events') {
    return 'Deployment, telemetry and log signals correlated'
  }

  return 'Structured result returned'
}

const record = (
  name: string,
  args: Record<string, unknown>,
  result: Record<string, unknown>,
) => {
  const failed =
    Boolean(result.error) ||
    result.success === false

  activity = [
    {
      time: new Date().toLocaleTimeString(
        'en-US',
        {
          hour12: false,
        },
      ),

      role: roleFor(name),

      name,

      args:
        Object.values(args).join(' ') ||
        '—',

      success: !failed,

      summary: summarize(
        name,
        result,
      ),
    },

    ...activity,
  ].slice(0, 50)

  notify()
}

/*
|--------------------------------------------------------------------------
| LOCAL SIMULATION / TOOL DATA PROVIDER
|--------------------------------------------------------------------------
*/

export function getToolResult(
  name: string,
  args: Record<string, unknown> = {},
) {
  const incidentId = String(
    args.incident_id || 'INC-1042',
  )

  const serviceId = String(
    args.service_id || 'payment-api',
  )

  const svc = services.find(
    (service) =>
      service.id === serviceId,
  )

  let result: Record<
    string,
    unknown
  >

  /*
  |--------------------------------------------------------------------------
  | OBSERVATION
  |--------------------------------------------------------------------------
  */

  if (
    name === 'get_active_incidents'
  ) {
    result = remediationExecuted
      ? {
          incidents: [],
        }
      : {
          incidents: [incident],
        }
  }

  else if (
    name === 'get_agent_activity'
  ) {
    result = {
      activity,
    }
  }

  else if (
    name === 'get_incident'
  ) {
    if (
      incidentId !== incident.id
    ) {
      result = {
        error: `Unknown incident: ${incidentId}`,
      }
    } else {
      result = {
        incident_id: incident.id,

        severity:
          incident.severity,

        status:
          remediationExecuted
            ? 'resolved'
            : incident.status.toLowerCase(),

        service:
          'Payment API',

        title:
          incident.title,

        started:
          incident.started,

        symptoms:
          incident.symptoms,
      }
    }
  }

  else if (
    name ===
    'get_incident_evidence'
  ) {
    if (
      incidentId !== incident.id
    ) {
      result = {
        error: `Unknown incident: ${incidentId}`,
      }
    } else {
      result = {
        incident,

        metrics,

        baseline:
          healthyMetrics,

        logs,

        timeline,

        deployment:
          deployments[0],

        dependencies: {
          payment_api: [
            'postgresql',
            'redis',
          ],
          postgresql: [
            'network',
          ],
          redis: [
            'network',
          ],
        },

        findings: [
          ...findings,
        ],
      }
    }
  }

  else if (
    name === 'get_services'
  ) {
    result = {
      services,
    }
  }

  else if (
    name === 'get_service_health'
  ) {
    if (!svc) {
      result = {
        error: `Unknown service: ${serviceId}`,

        valid_service_ids:
          services.map(
            (service) =>
              service.id,
          ),
      }
    } else {
      result = {
        service: svc.id,

        status:
          remediationExecuted &&
          serviceId ===
            'payment-api'
            ? 'healthy'
            : svc.status,

        latency_ms:
          remediationExecuted &&
          serviceId ===
            'payment-api'
            ? healthyMetrics.latency_ms
            : svc.latency,

        error_rate:
          remediationExecuted &&
          serviceId ===
            'payment-api'
            ? healthyMetrics.error_rate
            : svc.errorRate,

        request_rate:
          remediationExecuted &&
          serviceId ===
            'payment-api'
            ? healthyMetrics.request_rate
            : svc.requestRate,

        cpu_percent:
          remediationExecuted &&
          serviceId ===
            'payment-api'
            ? healthyMetrics.cpu_percent
            : svc.cpu,

        memory_percent:
          remediationExecuted &&
          serviceId ===
            'payment-api'
            ? healthyMetrics.memory_percent
            : svc.memory,

        dependencies:
          svc.dependencies,
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | METRICS
  |--------------------------------------------------------------------------
  */

  else if (
    name === 'get_metrics'
  ) {
    if (
      remediationExecuted &&
      serviceId ===
        'payment-api'
    ) {
      result = {
        service:
          'payment-api',

        window:
          'post-remediation',

        latency_ms: [
          ...metrics.latency_ms.slice(
            0,
            -1,
          ),
          142,
        ],

        request_rate: [
          ...metrics.request_rate.slice(
            0,
            -1,
          ),
          1180,
        ],

        error_rate: [
          ...metrics.error_rate.slice(
            0,
            -1,
          ),
          0.6,
        ],

        cpu_percent: [
          ...metrics.cpu_percent.slice(
            0,
            -1,
          ),
          52,
        ],

        memory_percent: [
          ...metrics.memory_percent.slice(
            0,
            -1,
          ),
          64,
        ],

        db_connections: [
          ...metrics.db_connections.slice(
            0,
            -1,
          ),
          48,
        ],
      }
    } else {
      result = metrics
    }
  }

  else if (
    name === 'compare_metrics'
  ) {
    result = {
      service:
        serviceId,

      incident_id:
        incidentId,

      baseline: {
        latency_ms:
          healthyMetrics.latency_ms,

        error_rate:
          healthyMetrics.error_rate,

        db_connections:
          healthyMetrics.db_connections,

        cpu_percent:
          healthyMetrics.cpu_percent,

        memory_percent:
          healthyMetrics.memory_percent,
      },

      incident_peak: {
        latency_ms: 2400,
        error_rate: 23.4,
        db_connections: 93,
        cpu_percent: 91,
        memory_percent: 78,
      },

      delta: {
        latency_ms:
          2400 -
          healthyMetrics.latency_ms,

        error_rate:
          23.4 -
          healthyMetrics.error_rate,

        db_connections:
          93 -
          healthyMetrics.db_connections,

        cpu_percent:
          91 -
          healthyMetrics.cpu_percent,

        memory_percent:
          78 -
          healthyMetrics.memory_percent,
      },
    }
  }

  else if (
    name === 'get_logs'
  ) {
    result = {
      service:
        serviceId,

      logs,
    }
  }

  else if (
    name === 'get_dependencies'
  ) {
    result = {
      root: 'internet',

      graph: {
        internet: [
          'api-gateway',
        ],

        'api-gateway': [
          'payment-api',
        ],

        'payment-api': [
          'redis',
          'postgresql',
        ],

        postgresql: [
          'network',
        ],

        redis: [
          'network',
        ],
      },

      health:
        Object.fromEntries(
          services.map(
            (service) => [
              service.id,
              remediationExecuted &&
              service.id ===
                'payment-api'
                ? 'healthy'
                : service.status,
            ],
          ),
        ),
    }
  }

  else if (
    name ===
    'get_deployment_history'
  ) {
    result = {
      service:
        serviceId,

      deployments,
    }
  }

  else if (
    name ===
    'get_incident_timeline'
  ) {
    result = {
      incident_id:
        incident.id,

      timeline,
    }
  }

  /*
  |--------------------------------------------------------------------------
  | INVESTIGATION
  |--------------------------------------------------------------------------
  */

  else if (
    name ===
    'correlate_events'
  ) {
    result = {
      incident_id:
        incidentId,

      service_id:
        serviceId,

      correlations: [
        {
          type:
            'deployment_before_degradation',

          finding:
            'Payment API deployment v2.7.3 completed six minutes before the incident was opened.',

          deployment:
            deployments[0],

          timeline:
            timeline.filter(
              (event) =>
                [
                  '14:29',
                  '14:31',
                  '14:32',
                  '14:33',
                  '14:34',
                ].includes(
                  event[0],
                ),
            ),
        },

        {
          type:
            'telemetry_change',

          finding:
            'Latency, HTTP error rate and database connection utilization increased together while request volume also increased.',

          metrics: {
            latency_ms:
              metrics.latency_ms,

            error_rate:
              metrics.error_rate,

            db_connections:
              metrics.db_connections,

            request_rate:
              metrics.request_rate,
          },
        },

        {
          type:
            'database_connection_pressure',

          finding:
            'Database connection utilization reached 93%, coinciding with connection timeout errors.',

          database_connection_peak_percent:
            93,

          baseline:
            healthyMetrics.db_connections,
        },

        {
          type:
            'log_signal',

          finding:
            'Application logs contain database connection timeout and transaction retry events before the 5xx spike.',

          matching_logs:
            logs.filter(
              (entry) =>
                String(
                  entry[2],
                )
                  .toLowerCase()
                  .includes(
                    'connection',
                  ) ||
                String(
                  entry[3],
                )
                  .toLowerCase()
                  .includes(
                    'connection',
                  ),
            ),
        },

        {
          type:
            'dependency_health',

          finding:
            'PostgreSQL shows warning-level pressure while Redis and the network remain healthy.',

          dependencies: {
            postgresql:
              'warning',

            redis:
              'healthy',

            network:
              'healthy',
          },
        },
      ],
    }
  }

  else if (
    name === 'run_diagnostic'
  ) {
    const peakLatency =
      metrics.latency_ms[
        metrics.latency_ms.length - 1
      ]

    const peakErrors =
      metrics.error_rate[
        metrics.error_rate.length - 1
      ]

    const peakConnections =
      metrics.db_connections[
        metrics.db_connections.length - 1
      ]

    const peakCpu =
      metrics.cpu_percent[
        metrics.cpu_percent.length - 1
      ]

    const latestDeployment =
      deployments[0]

    const timeoutLogs =
      logs.filter(
        (entry) =>
          String(entry[2])
            .toLowerCase()
            .includes(
              'timeout',
            ) ||
          String(entry[3])
            .toLowerCase()
            .includes(
              'timeout',
            ),
      )

    result = {
      incident_id:
        incidentId,

      service_id:
        serviceId,

      diagnostic_signals: {
        recent_deployment:
          latestDeployment,

        latency_peak_ms:
          peakLatency,

        error_rate_peak_percent:
          peakErrors,

        database_connection_peak_percent:
          peakConnections,

        cpu_peak_percent:
          peakCpu,

        timeout_events:
          timeoutLogs.length,

        traffic_series:
          metrics.request_rate,
      },

      evidence: [
        `${latestDeployment.version} deployment recorded at ${latestDeployment.time} UTC`,

        `Deployment change: ${latestDeployment.change}`,

        `Latency increased from ${healthyMetrics.latency_ms} ms baseline to ${peakLatency} ms`,

        `Error rate increased from ${healthyMetrics.error_rate}% baseline to ${peakErrors}%`,

        `Database connection utilization increased from ${healthyMetrics.db_connections}% baseline to ${peakConnections}%`,

        `${timeoutLogs.length} timeout-related log events returned`,

        'PostgreSQL is warning while Redis and network remain healthy',

        'The degradation sequence follows the deployment and precedes the incident creation',
      ],

      reasoning_hints: {
        temporal_correlation:
          'Deployment preceded telemetry degradation',

        primary_failure_signal:
          'Database connection pressure and timeout errors',

        affected_service:
          'payment-api',

        affected_dependency:
          'postgresql',

        likely_trigger:
          'connection pooling configuration change',

        confidence:
          'high',
      },

      requires_agent_interpretation:
        true,

      remediation_allowed:
        false,
    }
  }

  else if (
    name ===
    'create_investigation_finding'
  ) {
    const finding = String(
      args.finding || '',
    ).trim()

    if (!finding) {
      result = {
        error:
          'finding is required',
      }
    } else {
      findings.push(finding)

      result = {
        incident_id:
          incidentId,

        finding,

        stored: true,

        findings: [
          ...findings,
        ],
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | RECOMMENDATION
  |--------------------------------------------------------------------------
  */

  else if (
    name ===
    'propose_remediation'
  ) {
    result = {
      incident_id:
        incidentId,

      recommendation:
        'Rollback payment-api from v2.7.3 to the previous known-good version v2.7.2.',

      action:
        'rollback_payment_api',

      target_service:
        'payment-api',

      current_version:
        'v2.7.3',

      target_version:
        'v2.7.2',

      rationale: [
        'The deployment preceded the degradation.',
        'The deployment changed connection pooling configuration.',
        'Database connection utilization reached 93%.',
        'Connection timeout errors appeared in application logs.',
        'HTTP 5xx rate increased to 23.4%.',
      ],

      requires_human_approval:
        true,

      approved,
    }
  }

  /*
  |--------------------------------------------------------------------------
  | HUMAN CONTROL
  |--------------------------------------------------------------------------
  */

  else if (
    name ===
    'approve_remediation'
  ) {
    const valid =
      incidentId ===
        incident.id &&
      String(
        args.action || '',
      ) ===
        'rollback_payment_api'

    approved = valid

    result = valid
      ? {
          success: true,

          incident_id:
            incidentId,

          approved: true,

          action:
            'rollback_payment_api',

          approved_by:
            'Human Operator',
        }
      : {
          success: false,

          error:
            'Valid incident and rollback action are required.',
        }
  }

  /*
  |--------------------------------------------------------------------------
  | ACTION
  |--------------------------------------------------------------------------
  */

  else if (
    name ===
    'execute_remediation'
  ) {
    const valid =
      approved &&
      args.approved === true &&
      incidentId ===
        incident.id &&
      String(
        args.action || '',
      ) ===
        'rollback_payment_api'

    if (!valid) {
      result = {
        success: false,

        blocked: true,

        reason:
          'Human approval required',
      }
    } else {
      remediationExecuted =
        true

      const payment =
        services.find(
          (service) =>
            service.id ===
            'payment-api',
        )!

      payment.status =
        'healthy'

      payment.latency =
        healthyMetrics.latency_ms

      payment.errorRate =
        healthyMetrics.error_rate

      payment.requestRate =
        healthyMetrics.request_rate

      payment.cpu =
        healthyMetrics.cpu_percent

      payment.memory =
        healthyMetrics.memory_percent

      const db =
        services.find(
          (service) =>
            service.id ===
            'postgresql',
        )!

      db.status =
        'healthy'

      db.errorRate =
        0.4

      db.memory =
        64

      result = {
        success: true,

        action:
          'rollback',

        service:
          'Payment API',

        previous_version:
          'v2.7.3',

        restored_version:
          'v2.7.2',

        status:
          'healthy',

        incident_id:
          incidentId,

        human_approval_verified:
          true,
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | VERIFICATION
  |--------------------------------------------------------------------------
  */

  else if (
    name ===
      'verify_remediation' ||
    name ===
      'verify_incident'
  ) {
    if (
      remediationExecuted
    ) {
      result = {
        success: true,

        incident_id:
          incidentId,

        status:
          'resolved',

        incident_status:
          'resolved',

        payment_api:
          'healthy',

        postgresql:
          'healthy',

        redis:
          'healthy',

        error_rate:
          healthyMetrics.error_rate,

        latency_ms:
          healthyMetrics.latency_ms,

        db_connections:
          healthyMetrics.db_connections,

        cpu_percent:
          healthyMetrics.cpu_percent,

        recovery_confirmed:
          true,
      }
    } else {
      result = {
        success: false,

        incident_id:
          incidentId,

        status:
          'investigating',

        incident_status:
          'investigating',

        reason:
          'Remediation has not been executed.',
      }
    }
  }

  else {
    result = {
      error:
        `Unknown tool: ${name}`,
    }
  }

  record(
    name,
    args,
    result,
  )

  return result
}

export const executeTool = (
  name: string,
  args: Record<string, unknown>,
) =>
  getToolResult(
    name,
    args,
  )

/*
|--------------------------------------------------------------------------
| UI STATUS STYLES
|--------------------------------------------------------------------------
*/

export const statusStyles: Record<
  Status,
  string
> = {
  healthy:
    'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',

  degraded:
    'text-amber-300 bg-amber-300/10 border-amber-300/20',

  warning:
    'text-orange-300 bg-orange-300/10 border-orange-300/20',

  critical:
    'text-red-400 bg-red-400/10 border-red-400/20',
}

export const statusDot: Record<
  Status,
  string
> = {
  healthy:
    'bg-emerald-400',

  degraded:
    'bg-amber-300',

  warning:
    'bg-orange-300',

  critical:
    'bg-red-400',
}

export type Tool =
  (typeof tools)[number]

/*
|--------------------------------------------------------------------------
| PRECISE WEBMCP SCHEMAS
|--------------------------------------------------------------------------
*/

const noInput = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
}

const incidentInput = {
  type: 'object',
  properties: {
    incident_id: {
      type: 'string',
      description:
        'Incident identifier, for example INC-1042.',
    },
  },
  required: [
    'incident_id',
  ],
  additionalProperties: false,
}

const serviceInput = {
  type: 'object',
  properties: {
    service_id: {
      type: 'string',
      description:
        'Service identifier, for example payment-api.',
    },
  },
  required: [
    'service_id',
  ],
  additionalProperties: false,
}

const incidentServiceInput = {
  type: 'object',
  properties: {
    incident_id: {
      type: 'string',
      description:
        'Incident identifier.',
    },

    service_id: {
      type: 'string',
      description:
        'Service identifier.',
    },
  },
  required: [
    'incident_id',
    'service_id',
  ],
  additionalProperties: false,
}

const findingInput = {
  type: 'object',
  properties: {
    incident_id: {
      type: 'string',
      description:
        'Incident identifier.',
    },

    finding: {
      type: 'string',
      description:
        'Investigation finding to store for operator review.',
    },
  },
  required: [
    'incident_id',
    'finding',
  ],
  additionalProperties: false,
}

const approvalInput = {
  type: 'object',
  properties: {
    incident_id: {
      type: 'string',
    },

    action: {
      type: 'string',
      enum: [
        'rollback_payment_api',
      ],
    },
  },
  required: [
    'incident_id',
    'action',
  ],
  additionalProperties: false,
}

const executionInput = {
  type: 'object',
  properties: {
    incident_id: {
      type: 'string',
    },

    action: {
      type: 'string',
      enum: [
        'rollback_payment_api',
      ],
    },

    approved: {
      type: 'boolean',
      description:
        'Must be true and must match recorded human approval.',
    },
  },
  required: [
    'incident_id',
    'action',
    'approved',
  ],
  additionalProperties: false,
}

const schemaFor = (
  name: string,
) => {
  switch (name) {
    case 'get_active_incidents':
    case 'get_agent_activity':
      return noInput

    case 'get_incident':
    case 'get_incident_evidence':
    case 'get_incident_timeline':
    case 'propose_remediation':
    case 'verify_remediation':
    case 'verify_incident':
      return incidentInput

    case 'get_service_health':
    case 'get_dependencies':
    case 'get_deployment_history':
    case 'get_metrics':
    case 'get_logs':
      return serviceInput

    case 'compare_metrics':
    case 'correlate_events':
      return incidentServiceInput

    case 'create_investigation_finding':
      return findingInput

    case 'approve_remediation':
      return approvalInput

    case 'execute_remediation':
      return executionInput

    default:
      return noInput
  }
}

export const toolDefinitions =
  tools.map((tool) => ({
    name: tool.name,

    title:
      tool.name.replaceAll(
        '_',
        ' ',
      ),

    description:
      tool.description,

    inputSchema:
      schemaFor(tool.name),
  }))