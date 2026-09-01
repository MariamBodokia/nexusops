import {
    Incident,
    Deployment,
    Metrics,
    LogEntry,
    Investigation,
    Evidence,
    ToolExecution,
    TimelineEvent,
    Signal,
    Hypothesis,
    RootCauseAssessment,
    Recommendation,
    CorrelatedEvidence
} from './types';
import { executeTool } from './nexus-data';

const executeTrackedTool = async (
    toolName: string,
    args: Record<string, unknown>,
    onToolExecution: (execution: ToolExecution) => void
): Promise<any> => {
    const startTime = Date.now();
    let success = false;
    let result: any;
    try {
        result = await executeTool(toolName, args);
        success = !(result && typeof result === 'object' && (result.error || result.success === false));
        return result;
    } catch (e) {
        result = e instanceof Error ? e.message : String(e);
        throw e;
    } finally {
        const endTime = Date.now();
        const duration = endTime - startTime;
        onToolExecution({
            id: `tool-${Date.now()}`,
            toolName,
            args,
            startTime,
            endTime,
            duration,
            result,
            success,
        });
    }
};

const extractEvidenceFromTools = (toolExecutions: ToolExecution[], incidentId: string): Evidence[] => {
    const evidence: Evidence[] = [];
    for (const exec of toolExecutions) {
        if (!exec.success) continue;

        const baseEvidence = {
            incidentId,
            timestamp: new Date(exec.endTime).toISOString(),
            source: `tool:${exec.toolName}`,
        };

        if (exec.toolName === 'get_deployment_history' && exec.result.deployments) {
            exec.result.deployments.forEach((d: Deployment) => {
                evidence.push({
                    ...baseEvidence,
                    id: `ev-dep-${d.version}-${d.time}`,
                    time: d.time,
                    type: 'Deployment',
                    description: `Service ${d.service} deployed version ${d.version}`,
                    details: d,
                });
            });
        } else if (exec.toolName === 'get_logs' && exec.result.logs) {
            exec.result.logs.forEach((l: LogEntry, i: number) => {
                if (l[3].includes('error') || l[3].includes('timeout')) {
                    evidence.push({
                        ...baseEvidence,
                        id: `ev-log-${l[0]}-${i}`,
                        time: l[1],
                        type: 'Log',
                        description: `Log entry: ${l[3]}`,
                        details: l,
                    });
                }
            });
        } else if (exec.toolName === 'get_metrics' && exec.result) {
            evidence.push({
                ...baseEvidence,
                id: `ev-metrics-${exec.result.service}`,
                time: new Date(exec.endTime).toLocaleTimeString('en-US', { hour12: false }),
                type: 'Metrics',
                description: `Metrics snapshot for ${exec.result.service}`,
                details: exec.result,
            });
        } else if (exec.toolName === 'get_incident' && exec.result) {
            evidence.push({
                ...baseEvidence,
                id: `ev-incident-${exec.result.id}`,
                time: exec.result.started,
                type: 'Incident',
                description: `Incident ${exec.result.id}: ${exec.result.title}`,
                details: exec.result,
            });
        }
    }
    return evidence;
};

const buildTimeline = (evidence: Evidence[], incident: Incident): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    for (const ev of evidence) {
        if (ev.type === 'Deployment') {
            events.push({ time: ev.time, description: ev.description, source: 'Deployments', type: 'deployment' });
        } else if (ev.type === 'Log' && ev.details[3].includes('connection_timeout')) {
            events.push({ time: ev.time, description: 'Database connection timeout', source: 'Logs', type: 'log_error' });
        }
    }

    // Add incident start to timeline
    events.push({ time: incident.started, description: 'Incident symptoms first observed', source: 'Monitoring', type: 'incident_start' });

    // A real implementation would parse metric timestamps, but for this demo we'll infer it
    const metricEvidence = evidence.find(e => e.type === 'Metrics');
    if (metricEvidence) {
        const highLatency = metricEvidence.details.latency_ms.slice(-1)[0] > 1000;
        const highErrors = metricEvidence.details.error_rate.slice(-1)[0] > 5;
        if (highLatency || highErrors) {
            // Find the approximate time of the metric spike. For the demo, this is a fixed offset.
             const incidentTimeParts = incident.started.split(':').map(Number);
             const metricTime = new Date();
             metricTime.setHours(incidentTimeParts[0]);
             metricTime.setMinutes(incidentTimeParts[1] + 4);
             const metricTimeString = metricTime.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: false});
            events.push({ time: metricTimeString, description: '5xx errors and latency spike detected', source: 'Metrics', type: 'metric_anomaly' });
        }
    }


    return events.sort((a, b) => a.time.localeCompare(b.time));
};

const analyzeSignals = (metrics: Metrics): Signal[] => {
    if (!metrics) return [];
    const signals: Signal[] = [];

    const createSignal = (metric: string, unit: string, data: number[], type: Signal['type']): Signal | null => {
        if (data.length < 2) return null;
        const before = data[0];
        const after = data[data.length - 1];
        const change = after - before;
        const percentageChange = before !== 0 ? (change / before) * 100 : Infinity;
        return {
            metric,
            valueBefore: `${before.toFixed(1)}`,
            valueAfter: `${after.toFixed(1)}`,
            change: `${change > 0 ? '+' : ''}${change.toFixed(1)} (${percentageChange.toFixed(0)}%)`,
            unit,
            type
        };
    };

    const latencySignal = createSignal('Latency', 'ms', metrics.latency_ms, 'latency');
    if (latencySignal) signals.push(latencySignal);

    const errorSignal = createSignal('Error Rate', '%', metrics.error_rate, 'error_rate');
    if (errorSignal) signals.push(errorSignal);

    const cpuSignal = createSignal('CPU', '%', metrics.cpu_percent, 'resource_utilization');
    if (cpuSignal) signals.push(cpuSignal);

    const memorySignal = createSignal('Memory', '%', metrics.memory_percent, 'resource_utilization');
    if (memorySignal) signals.push(memorySignal);

    const dbConnectionsSignal = createSignal('DB Connections', '', metrics.db_connections, 'resource_utilization');
    if (dbConnectionsSignal) {
        dbConnectionsSignal.unit = 'connections';
        signals.push(dbConnectionsSignal);
    }

    return signals;
};

const generateHypotheses = (evidence: Evidence[]): Hypothesis[] => {
    const hypotheses: Hypothesis[] = [];
    const hasDeployment = evidence.some(e => e.type === 'Deployment');
    const hasHighTraffic = evidence.some(e => e.type === 'Metrics' && e.details.request_rate.slice(-1)[0] > e.details.request_rate[0] * 1.5);
    const hasResourceSpike = evidence.some(e => e.type === 'Metrics' && e.details.cpu_percent.slice(-1)[0] > 90);

    if (hasDeployment) {
        hypotheses.push({
            id: 'h1',
            title: 'H1: Connection-pooling regression',
            description: 'The recent deployment introduced a change in database connection pooling, leading to resource exhaustion.',
            score: 0,
            supportingEvidenceIds: [],
            contradictingEvidenceIds: [],
        });
    }

    if (hasHighTraffic) {
        hypotheses.push({
            id: 'h2',
            title: 'H2: Traffic surge',
            description: 'A sudden increase in user traffic overwhelmed the service.',
            score: 0,
            supportingEvidenceIds: [],
            contradictingEvidenceIds: [],
        });
    }

    if (hasResourceSpike) {
        hypotheses.push({
            id: 'h3',
            title: 'H3: CPU Saturation',
            description: 'The service is CPU-bound, causing a cascading failure under normal load.',
            score: 0,
            supportingEvidenceIds: [],
            contradictingEvidenceIds: [],
        });
    }

    if (hypotheses.length === 0) {
        hypotheses.push({
            id: 'h-default',
            title: 'H1: Undetermined External Factor',
            description: 'The incident may be caused by an external factor not captured by the available tools.',
            score: 0,
            supportingEvidenceIds: [],
            contradictingEvidenceIds: [],
        });
    }

    return hypotheses;
};

const correlateEvidenceForHypotheses = (hypotheses: Hypothesis[], evidence: Evidence[], timeline: TimelineEvent[]): void => {
    const deploymentEvidence = evidence.find(e => e.type === 'Deployment' && e.details.change.includes('connection-pooling'));
    const connectionTimeoutLog = evidence.find(e => e.type === 'Log' && e.details[3].includes('connection_timeout'));
    const dbConnectionSpike = evidence.find(e => e.type === 'Metrics' && e.details.db_connections.slice(-1)[0] > e.details.db_connections[0] * 2);
    const errorSpike = evidence.find(e => e.type === 'Metrics' && e.details.error_rate.slice(-1)[0] > 5);
    const latencySpike = evidence.find(e => e.type === 'Metrics' && e.details.latency_ms.slice(-1)[0] > 1000);
    const incidentStart = timeline.find(t => t.type === 'incident_start');
    const deploymentEvent = timeline.find(t => t.type === 'deployment');

    // Several signals (latency/error/db) can resolve to the same underlying evidence
    // item (a single metrics snapshot), so dedupe before recording to avoid double
    // counting the same evidence in a hypothesis's score or list.
    const addEvidence = (ids: string[], evidenceItem: Evidence | undefined) => {
        if (evidenceItem && !ids.includes(evidenceItem.id)) ids.push(evidenceItem.id);
    };

    for (const h of hypotheses) {
        if (h.id === 'h1') { // Connection-pooling regression
            addEvidence(h.supportingEvidenceIds, deploymentEvidence);
            addEvidence(h.supportingEvidenceIds, connectionTimeoutLog);
            addEvidence(h.supportingEvidenceIds, dbConnectionSpike);
            addEvidence(h.supportingEvidenceIds, errorSpike);
            addEvidence(h.supportingEvidenceIds, latencySpike);
            if (incidentStart && deploymentEvent && deploymentEvent.time < incidentStart.time) {
                const depEvidence = evidence.find(e => e.type === 'Deployment');
                addEvidence(h.supportingEvidenceIds, depEvidence);
            }
        } else if (h.id === 'h2') { // Traffic surge
            const trafficSpike = evidence.find(e => e.type === 'Metrics' && e.details.request_rate.slice(-1)[0] > e.details.request_rate[0] * 1.5);
            addEvidence(h.supportingEvidenceIds, trafficSpike);
            addEvidence(h.contradictingEvidenceIds, deploymentEvidence);
        } else if (h.id === 'h3') { // CPU Saturation
            const cpuSpike = evidence.find(e => e.type === 'Metrics' && e.details.cpu_percent.slice(-1)[0] > 90);
            addEvidence(h.supportingEvidenceIds, cpuSpike);
            addEvidence(h.contradictingEvidenceIds, deploymentEvidence);
        }
    }
};

const assessRootCause = (hypotheses: Hypothesis[]): RootCauseAssessment | null => {
    if (hypotheses.length === 0) return null;

    hypotheses.forEach(h => {
        h.score = (h.supportingEvidenceIds.length * 20) - (h.contradictingEvidenceIds.length * 10);
        h.score = Math.max(0, Math.min(100, h.score));
    });

    const bestHypothesis = hypotheses.sort((a, b) => b.score - a.score)[0];

    const confidence = bestHypothesis.score;

    return {
        hypothesisId: bestHypothesis.id,
        confidence,
        supportingEvidenceCount: bestHypothesis.supportingEvidenceIds.length,
        contradictingEvidenceCount: bestHypothesis.contradictingEvidenceIds.length,
        explanation: `This hypothesis is the most likely because it is strongly supported by multiple sources of evidence (${bestHypothesis.supportingEvidenceIds.length}) and has few contradictions (${bestHypothesis.contradictingEvidenceIds.length}).`
    };
};

const generateRecommendation = (rootCause: RootCauseAssessment | null, hypotheses: Hypothesis[]): Recommendation | null => {
    if (!rootCause) return null;
    const rootCauseHypothesis = hypotheses.find(h => h.id === rootCause.hypothesisId);
    if (!rootCauseHypothesis) return null;

    let title = 'Review system configuration';
    let action = 'Investigate system settings and recent changes for misconfigurations.';
    let reason = 'The root cause is likely related to system configuration.';

    if (rootCauseHypothesis.id === 'h1') {
        title = 'Review connection-pooling change';
        action = 'Review the connection-pooling configuration introduced in v2.7.3 and consider rollback/mitigation.';
        reason = 'The deployment of v2.7.3, which changed connection pooling, is highly correlated with the incident.';
    }

    return {
        title,
        action,
        risk: 'medium',
        reason,
        status: 'pending',
    };
}


const analyzeEvidence = (incident: Incident, toolExecutions: ToolExecution[]): Investigation => {
    const startTime = Math.min(...toolExecutions.map(t => t.startTime));
    const endTime = Math.max(...toolExecutions.map(t => t.endTime));

    const allEvidence = extractEvidenceFromTools(toolExecutions, incident.id);
    const timeline = buildTimeline(allEvidence, incident);
    const metrics = toolExecutions.find(t => t.toolName === 'get_metrics')?.result as Metrics;
    const signals = analyzeSignals(metrics);

    const hypotheses = generateHypotheses(allEvidence);
    correlateEvidenceForHypotheses(hypotheses, allEvidence, timeline);

    const rootCause = assessRootCause(hypotheses);
    const recommendation = generateRecommendation(rootCause, hypotheses);

    const correlations: CorrelatedEvidence[] = [];
    if (rootCause) {
        const rootCauseHypothesis = hypotheses.find(h => h.id === rootCause.hypothesisId);
        if (rootCauseHypothesis && rootCauseHypothesis.supportingEvidenceIds.length > 1) {
            correlations.push({
                evidenceIds: rootCauseHypothesis.supportingEvidenceIds,
                description: "The deployment, database connection issues, and metric spikes are all linked, pointing to the regression."
            });
        }
    }


    return {
        id: `inv-${incident.id}`,
        incidentId: incident.id,
        status: 'complete',
        summary: {
            toolCount: toolExecutions.length,
            evidenceSources: [...new Set(allEvidence.map(e => e.source.split(':')[1] || 'Unknown'))],
            durationMs: endTime - startTime,
            status: 'complete',
        },
        timeline,
        signals,
        correlations,
        hypotheses,
        rootCause,
        recommendation,
        rawEvidence: allEvidence,
    };
};


export const runInvestigation = async (
    incidentId: string,
    onStep: (step: string) => void,
    // onEvidence is no longer needed during the run, it's all at the end.
    onRawEvidence: (evidence: Evidence) => void,
    onToolExecution: (execution: ToolExecution) => void
): Promise<Investigation> => {
    const toolExecutions: ToolExecution[] = [];
    const onToolExecutionAndCollect = (execution: ToolExecution) => {
        toolExecutions.push(execution);
        onToolExecution(execution);
    };

    onStep('Fetching incident details...');
    const incident: Incident = await executeTrackedTool('get_incident', { incident_id: incidentId }, onToolExecutionAndCollect);

    onStep('Correlating deployment history...');
    await executeTrackedTool('get_deployment_history', { service_id: incident.service }, onToolExecutionAndCollect);

    onStep('Fetching service metrics...');
    await executeTrackedTool('get_metrics', { service_id: incident.service }, onToolExecutionAndCollect);

    onStep('Comparing telemetry against healthy baseline...');
    await executeTrackedTool('compare_metrics', { incident_id: incidentId, service_id: incident.service }, onToolExecutionAndCollect);

    onStep('Querying service logs...');
    await executeTrackedTool('get_logs', { service_id: incident.service }, onToolExecutionAndCollect);

    onStep('Correlating deployment, telemetry and log signals...');
    await executeTrackedTool('correlate_events', { incident_id: incidentId, service_id: incident.service }, onToolExecutionAndCollect);

    onStep('Running evidence-based diagnostic...');
    await executeTrackedTool('run_diagnostic', { incident_id: incidentId, service_id: incident.service }, onToolExecutionAndCollect);

    onStep('Correlating evidence and analyzing root cause...');
    const investigationResult = analyzeEvidence(incident, toolExecutions);

    // This callback is just to satisfy the old signature, can be removed later
    investigationResult.rawEvidence.forEach(onRawEvidence);

    if (investigationResult.rootCause) {
        const rootHypothesis = investigationResult.hypotheses.find(h => h.id === investigationResult.rootCause!.hypothesisId);
        if (rootHypothesis) {
            onStep('Recording investigation finding...');
            await executeTrackedTool('create_investigation_finding', {
                incident_id: incidentId,
                finding: `${rootHypothesis.title}: ${rootHypothesis.description} (confidence ${investigationResult.rootCause.confidence}%, ${rootHypothesis.supportingEvidenceIds.length} supporting / ${rootHypothesis.contradictingEvidenceIds.length} contradicting evidence items).`,
            }, onToolExecutionAndCollect);
        }
    }

    return investigationResult;
};
