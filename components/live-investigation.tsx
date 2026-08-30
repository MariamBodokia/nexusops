'use client'

import { useReducer, Reducer, useState } from 'react'
import {
    AlertTriangle,
    Check,
    Loader2,
    Search,
    ChevronDown,
    X,
    Clock,
    FileText,
    List,
    TrendingUp,
    Zap,
    Target,
    GitCommit,
    Lightbulb,
    ShieldCheck,
    ThumbsUp,
    ChevronRight,
    Copy,
    AlertCircle
} from 'lucide-react'
import { Investigation, Evidence, ToolExecution, TimelineEvent, Signal, Hypothesis } from '@/lib/types';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { runInvestigation } from '@/lib/investigation-engine';

type InvestigationState = {
    running: boolean;
    error: string;
    investigation: Investigation | null;
    rawEvidence: Evidence[];
    toolExecutions: ToolExecution[];
    currentStep: string;
};

type InvestigationAction =
    | { type: 'START_INVESTIGATION' }
    | { type: 'SET_ERROR'; payload: string }
    | { type: 'ADD_RAW_EVIDENCE'; payload: Evidence }
    | { type: 'ADD_TOOL_EXECUTION'; payload: ToolExecution }
    | { type: 'SET_INVESTIGATION'; payload: Investigation }
    | { type: 'SET_STEP'; payload: string }
    | { type: 'RESET' };

const initialState: InvestigationState = {
    running: false,
    error: '',
    investigation: null,
    rawEvidence: [],
    toolExecutions: [],
    currentStep: '',
};

function investigationReducer(state: InvestigationState, action: InvestigationAction): InvestigationState {
    switch (action.type) {
        case 'START_INVESTIGATION':
            return { ...initialState, running: true, currentStep: 'Starting investigation...' };
        case 'SET_ERROR':
            return { ...state, error: action.payload, running: false, currentStep: 'Error' };
        case 'ADD_RAW_EVIDENCE':
            return { ...state, rawEvidence: [...state.rawEvidence, action.payload] };
        case 'ADD_TOOL_EXECUTION':
            return { ...state, toolExecutions: [...state.toolExecutions, action.payload] };
        case 'SET_INVESTIGATION':
            return { ...state, investigation: action.payload, running: false, currentStep: 'Investigation complete' };
        case 'SET_STEP':
            return { ...state, currentStep: action.payload };
        case 'RESET':
            return initialState;
        default:
            return state;
    }
}

function ToolExecutionTrace({ executions, running }: { executions: ToolExecution[], running: boolean }) {
    const resultSummary = (result: any) => {
        if (Array.isArray(result)) return `Returned ${result.length} items`;
        if (typeof result === 'object' && result !== null) {
            const keys = Object.keys(result);
            if (keys.includes('deployments')) return `Returned ${result.deployments.length} deployments`;
            if (keys.includes('logs')) return `Returned ${result.logs.length} log events`;
            if (keys.includes('service') && keys.includes('window')) return `Returned metrics for ${result.service}`;
            return `Returned object with keys: ${keys.join(', ')}`;
        }
        return 'Returned value';
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>WebMCP Execution Trace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {executions.length === 0 && !running && (
                    <p className="text-sm text-muted-foreground">Run an investigation to see the tool execution trace.</p>
                )}
                {executions.map((exec: ToolExecution) => (
                    <div key={exec.id} className="flex items-start gap-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background">
                            {exec.success ? <Check size={16} className="text-green-500" /> : <X size={16} className="text-red-500" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-sm font-semibold">{exec.toolName}</span>
                                <span className="text-xs text-muted-foreground">{exec.duration} ms</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {exec.success ? resultSummary(exec.result) : `Failed: ${exec.result}`}
                            </p>
                        </div>
                    </div>
                ))}
                {running && executions.length === 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="animate-spin" size={14} />
                        <span>Waiting for tool executions...</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function InvestigationSummaryCard({ investigation }: { investigation: Investigation }) {
    const { summary } = investigation;
    return (
        <Card>
            <CardHeader>
                <CardTitle>Investigation Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <List size={16} className="text-muted-foreground" />
                    <span><span className="font-bold">{summary.toolCount}</span> tools executed</span>
                </div>
                <div className="flex items-center gap-2">
                    <FileText size={16} className="text-muted-foreground" />
                    <span><span className="font-bold">{summary.evidenceSources.length}</span> evidence sources</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-muted-foreground" />
                    <span><span className="font-bold">{(summary.durationMs / 1000).toFixed(2)}s</span> duration</span>
                </div>
                <div className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span className="font-bold capitalize">{summary.status}</span>
                </div>
            </CardContent>
        </Card>
    );
}

function TimelineCard({ timeline }: { timeline: TimelineEvent[] }) {
    const getIcon = (type: TimelineEvent['type']) => {
        switch (type) {
            case 'deployment': return <GitCommit size={14} />;
            case 'incident_start': return <AlertCircle size={14} />;
            case 'log_error': return <FileText size={14} />;
            case 'metric_anomaly': return <Zap size={14} />;
            default: return <ChevronRight size={14} />;
        }
    }
    return (
        <Card>
            <CardHeader>
                <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {timeline.map((event, index) => (
                    <div key={index} className="flex items-start gap-3">
                        <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-background text-muted-foreground">
                            {getIcon(event.type)}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold">{event.description}</p>
                            <p className="text-xs text-muted-foreground">
                                <span className="font-mono">{event.time}</span> • {event.source}
                            </p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function SignalAnalysisCard({ signals }: { signals: Signal[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Signal Analysis</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <div className="font-semibold">Metric</div>
                    <div className="text-right font-semibold">Before</div>
                    <div className="text-right font-semibold">After</div>
                    <div className="text-right font-semibold">Change</div>
                </div>
                <div className="mt-2 space-y-3">
                    {signals.map(signal => (
                        <div key={signal.metric} className="grid grid-cols-4 items-center gap-x-4 text-sm">
                            <div className="font-semibold">{signal.metric}</div>
                            <div className="text-right font-mono text-muted-foreground">{signal.valueBefore} {signal.unit}</div>
                            <div className="text-right font-mono font-bold">{signal.valueAfter} {signal.unit}</div>
                            <div className={`text-right font-semibold ${signal.change.startsWith('+') ? 'text-red-500' : 'text-green-500'}`}>
                                {signal.change}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function CrossSourceCorrelationCard({ investigation }: { investigation: Investigation }) {
    if (!investigation.rootCause) return null;
    const { rawEvidence, rootCause, hypotheses } = investigation;
    const rootHypothesis = hypotheses.find(h => h.id === rootCause.hypothesisId);
    if (!rootHypothesis) return null;

    const points = rootHypothesis.supportingEvidenceIds
        .map(id => rawEvidence.find(e => e.id === id))
        .filter((e): e is Evidence => !!e)
        .map(e => ({
            id: e.id,
            description: e.description,
            type: e.type,
        }));

    const getIcon = (type: string) => {
        switch (type) {
            case 'Deployment': return <GitCommit size={16} />;
            case 'Log': return <FileText size={16} />;
            case 'Metrics': return <TrendingUp size={16} />;
            case 'Incident': return <AlertCircle size={16} />;
            default: return <Zap size={16} />;
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cross-Source Correlation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {points.map((point, index) => (
                    <div key={point.id} className="flex flex-col items-center">
                        <div className="flex w-full items-center gap-3 rounded-md bg-background p-3 text-sm">
                            <div className="text-muted-foreground">{getIcon(point.type)}</div>
                            <span className="flex-1">{point.description}</span>
                        </div>
                        {index < points.length - 1 && (
                            <ChevronDown size={20} className="my-1 text-muted-foreground" />
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function HypothesesCard({ hypotheses }: { hypotheses: Hypothesis[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Hypotheses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {hypotheses.map(h => (
                    <div key={h.id}>
                        <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm">{h.title}</p>
                            <span className="text-xs font-bold">{h.score}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{h.description}</p>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-background">
                            <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${h.score}%` }} />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function RootCauseAssessmentCard({ investigation }: { investigation: Investigation }) {
    if (!investigation.rootCause) return null;
    const { rootCause, hypotheses } = investigation;
    const rootHypothesis = hypotheses.find(h => h.id === rootCause.hypothesisId);
    if (!rootHypothesis) return null;

    return (
        <Card className="bg-gradient-to-br from-background to-accent/30">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Target size={18} />
                    Root Cause Assessment
                </CardTitle>
                <CardDescription>{rootHypothesis.title}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-4 text-sm">
                    {rootHypothesis.description}
                </div>
                <div className="text-sm font-semibold mb-1">Confidence</div>
                <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-background/50">
                        <div
                            className="h-2 rounded-full bg-green-500"
                            style={{ width: `${rootCause.confidence}%` }}
                        />
                    </div>
                    <span className="text-sm font-bold">{rootCause.confidence}%</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <Check size={14} className="text-green-500" />
                        <span>{rootCause.supportingEvidenceCount} supporting evidence</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <X size={14} className="text-red-500" />
                        <span>{rootCause.contradictingEvidenceCount} contradictions</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function WhyCard({ investigation }: { investigation: Investigation }) {
    const [open, setOpen] = useState(false);
    if (!investigation.rootCause) return null;
    const { rawEvidence, rootCause, hypotheses } = investigation;
    const rootHypothesis = hypotheses.find(h => h.id === rootCause.hypothesisId);
    if (!rootHypothesis) return null;

    const evidencePoints = rootHypothesis.supportingEvidenceIds
        .map(id => rawEvidence.find(e => e.id === id))
        .filter((e): e is Evidence => !!e);

    return (
        <Card>
            <CardHeader onClick={() => setOpen(!open)} className="cursor-pointer">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Lightbulb size={18} />
                        Why this hypothesis?
                    </div>
                    <ChevronDown size={20} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </CardTitle>
            </CardHeader>
            {open && (
                <CardContent>
                    <ul className="space-y-2 text-sm list-disc pl-5">
                        {evidencePoints.map(e => <li key={e.id}>{e.description}</li>)}
                    </ul>
                </CardContent>
            )}
        </Card>
    );
}

function RecommendationCard({ investigation }: { investigation: Investigation }) {
    if (!investigation.recommendation) return null;
    const { recommendation } = investigation;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ThumbsUp size={18} />
                    Recommended Next Step
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="font-semibold">{recommendation.title}</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">{recommendation.action}</p>
                <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-3 text-center text-xs font-semibold text-yellow-300">
                    HUMAN APPROVAL REQUIRED
                </div>
            </CardContent>
        </Card>
    )
}

function RawDataCard({ executions }: { executions: ToolExecution[] }) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(JSON.stringify(executions.map(e => e.result), null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card>
            <CardHeader onClick={() => setOpen(!open)} className="cursor-pointer">
                <CardTitle className="flex items-center justify-between">
                    Raw Tool Responses
                    <ChevronDown size={20} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </CardTitle>
            </CardHeader>
            {open && (
                <CardContent>
                    <button
                        onClick={copyToClipboard}
                        className="mb-2 flex items-center gap-2 rounded-md bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                    >
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy JSON'}
                    </button>
                    <pre className="text-xs bg-background p-4 rounded-md overflow-x-auto">
                        {JSON.stringify(executions.map(e => ({ tool: e.toolName, result: e.result })), null, 2)}
                    </pre>
                </CardContent>
            )}
        </Card>
    );
}

export default function LiveInvestigation({ webmcpAvailable }: { webmcpAvailable: boolean }) {
    const [state, dispatch] = useReducer(investigationReducer, initialState);
    const { running, error, investigation, toolExecutions, currentStep } = state;

    const investigate = async () => {
        dispatch({ type: 'START_INVESTIGATION' });

        const onStep = (step: string) => dispatch({ type: 'SET_STEP', payload: step });
        const onRawEvidence = (evidence: Evidence) => dispatch({ type: 'ADD_RAW_EVIDENCE', payload: evidence });
        const onToolExecution = (execution: ToolExecution) => dispatch({ type: 'ADD_TOOL_EXECUTION', payload: execution });

        try {
            const result = await runInvestigation('INC-1042', onStep, onRawEvidence, onToolExecution);
            dispatch({ type: 'SET_INVESTIGATION', payload: result });
        } catch (e) {
            dispatch({
                type: 'SET_ERROR', payload: e instanceof Error
                    ? e.message
                    : 'An unknown error occurred during investigation.'
            });
        }
    }

    return (
        <>
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[.2em] text-accent-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent-foreground" />
                        Investigation / Engine
                    </div>

                    <h1 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
                        INC-1042: Payment API Degradation
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        The investigation engine will invoke tools to gather and correlate evidence, then produce a root cause analysis.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={investigate}
                    disabled={running || !webmcpAvailable}
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

                    {running ? currentStep : 'Run Investigation'}
                </button>
            </div>

            {!webmcpAvailable && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-yellow-400/30 bg-yellow-400/5 p-4 text-sm text-yellow-300">
                    <AlertTriangle
                        size={16}
                        className="mt-0.5 shrink-0"
                    />
                    <div>
                        <div className="font-semibold">
                           WebMCP unavailable
                        </div>
                        <div className="mt-1 text-xs text-yellow-200/80">
                           Investigation requires an active WebMCP bridge.
                        </div>
                    </div>
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

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-1 space-y-8">
                    {investigation && <InvestigationSummaryCard investigation={investigation} />}
                    <ToolExecutionTrace executions={toolExecutions} running={running} />
                    {investigation && <RawDataCard executions={toolExecutions} />}
                </div>

                <div className="lg:col-span-2 space-y-8">
                    {investigation && (
                        <>
                           <RootCauseAssessmentCard investigation={investigation} />
                           <WhyCard investigation={investigation} />
                           <RecommendationCard investigation={investigation} />
                           <TimelineCard timeline={investigation.timeline} />
                           <SignalAnalysisCard signals={investigation.signals} />
                           {investigation.correlations && investigation.correlations.length > 0 && (
                               <CrossSourceCorrelationCard investigation={investigation} />
                           )}
                           <HypothesesCard hypotheses={investigation.hypotheses} />
                        </>
                    )}
                    {running && !investigation && (
                         <Card>
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                                <Loader2 className="animate-spin text-muted-foreground mb-4" size={24} />
                                <p className="font-semibold">{currentStep}</p>
                                <p className="text-sm text-muted-foreground">Analyzing evidence...</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </>
    )
}
