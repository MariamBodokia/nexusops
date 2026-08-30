import type { Service, Incident, LogEntry, Metrics, HealthyMetrics, Deployment } from './types';

export const services: Service[] = [
  {
    id: 'api-gateway',
    name: 'API Gateway',
    status: 'healthy',
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
    status: 'healthy',
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
    status: 'degraded',
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
    status: 'healthy',
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
    status: 'warning',
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
    status: 'healthy',
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
    status: 'healthy',
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
    status: 'healthy',
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
    status: 'healthy',
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

export const incident: Incident = {
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



export const logs: LogEntry[] = [
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

export const metrics: Metrics = {
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
.4,
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

export const healthyMetrics: HealthyMetrics = {
  latency_ms: 142,
  error_rate: 0.6,
  db_connections: 48,
  cpu_percent: 52,
  memory_percent: 64,
  request_rate: 1180,
}

export const deployments: Deployment[] = [
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
