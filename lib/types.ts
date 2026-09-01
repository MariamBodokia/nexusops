export type Status = 'healthy' | 'degraded' | 'warning' | 'critical';

export type Service = {
    id: string;
    name: string;
    status: Status;
    latency: number;
    errorRate: number;
    requestRate: number;
    cpu: number;
    memory: number;
    dependencies: string[];
    events: string[];
    deployment: string;
};

export type Incident = {
    id: string;
    title: string;
    severity: string;
    status: string;
    service: string;
    started: string;
    symptoms: string[];
};

export type LogEntry = [string, string, string, string];

export type Metrics = {
    service: string;
    window: string;
    latency_ms: number[];
    request_rate: number[];
    error_rate: number[];
    cpu_percent: number[];
    memory_percent: number[];
    db_connections: number[];
};

export type HealthyMetrics = {
    latency_ms: number;
    error_rate: number;
    db_connections: number;
    cpu_percent: number;
    memory_percent: number;
    request_rate: number;
};

export type Deployment = {
    version: string;
    service: string;
    time: string;
    status: string;
    actor: string;
    change: string;
};

export type NetworkEvent = {
    id: string;
    timestamp: string;
    type: string;
    source: string;
    destination: string;
    details: string;
};

export type InfrastructureEvent = {
    id: string;
    timestamp: string;
    type: string;
    resource: string;
    details: string;
};

export type SecurityEvent = {
    id: string;
    timestamp: string;
    type: string;
    user: string;
    details: string;
};

export type Evidence = {
    id: string;
    incidentId: string;
    timestamp: string;
    type: string;
    source: string;
    details: any;
    // Added for new model
    time: string;
    description: string;
};

export type AgentRole =
    | 'SRE Agent'
    | 'NOC Agent'
    | 'Developer Agent'
    | 'SOC Agent'
    | 'Incident Commander'
    | 'Human Operator';

export type RiskLevel = 'low' | 'medium' | 'high';

export type Tool = {
    name: string;
    category: string;
    description: string;
    readOnly: boolean;
    mutating: boolean;
    riskLevel: RiskLevel;
    requiresApproval: boolean;
    agentRoles: AgentRole[];
};

export type ActivityEntry = {
    time: string;
    role: AgentRole;
    name: string;
    args: string;
    success: boolean;
    summary: string;
    duration: number;
};

export type ToolDefinition = {
    name: string;
    title: string;
    description: string;
    inputSchema: Record<string, any>;
};

export type ToolExecution = {
    id: string;
    toolName: string;
    args: Record<string, unknown>;
    startTime: number;
    endTime: number;
    duration: number;
    result: any;
    success: boolean;
    agent?: AgentRole;
    rationale?: string;
};

// =================================================================
// Investigation Data Model v2
// =================================================================

export type Investigation = {
    id: string;
    incidentId: string;
    status: 'ongoing' | 'complete';
    summary: InvestigationSummary;
    timeline: TimelineEvent[];
    signals: Signal[];
    correlations: CorrelatedEvidence[];
    hypotheses: Hypothesis[];
    rootCause: RootCauseAssessment | null;
    recommendation: Recommendation | null;
    rawEvidence: Evidence[];
    perspectives: AgentPerspective[];
    commander: CommanderAssessment | null;
    causalChain: CausalChainNode[];
};

export type InvestigationSummary = {
    toolCount: number;
    evidenceSources: string[];
    durationMs: number;
    status: 'complete' | 'error';
}

export type TimelineEvent = {
    time: string;
    description: string;
    source: string;
    type: 'deployment' | 'metric_anomaly' | 'log_error' | 'incident_start' | 'other';
};

export type Signal = {
    metric: string;
    valueBefore: string | null;
    valueAfter: string;
    change: string;
    unit: string;
    type: 'latency' | 'error_rate' | 'resource_utilization' | 'other';
};

export type CorrelatedEvidence = {
    evidenceIds: string[];
    description: string;
};

export type Hypothesis = {
    id: string;
    title: string;
    description: string;
    score: number; // 0-100
    supportingEvidenceIds: string[];
    contradictingEvidenceIds: string[];
};

export type RootCauseAssessment = {
    hypothesisId: string;
    confidence: number; // 0-100
    supportingEvidenceCount: number;
    contradictingEvidenceCount: number;
    explanation: string;
};

export type Recommendation = {
    title: string;
    action: string;
    risk: 'low' | 'medium' | 'high';
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
};

// =================================================================
// Multi-agent investigation model
// =================================================================

export type AgentId = 'sre' | 'noc' | 'developer' | 'soc';

export type AgentPerspective = {
    id: AgentId;
    name: AgentRole;
    focus: string;
    toolsConsulted: string[];
    hypothesis: string;
    confidence: number; // 0-100, deterministically derived from evidence
    supportingEvidenceIds: string[];
    contradictingEvidenceIds: string[];
    reasoning: string;
};

export type CommanderAssessment = {
    rootCause: string;
    confidence: number;
    reasoning: string[];
    consideredHypotheses: { agent: AgentId; name: AgentRole; hypothesis: string; confidence: number }[];
    rejected: { agent: AgentId; name: AgentRole; reason: string }[];
};

export type CausalChainNode = {
    label: string;
    detail: string;
};
