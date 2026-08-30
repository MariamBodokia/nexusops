import { runInvestigation } from './lib/investigation-engine';
import { getActivity } from './lib/activity-store';
import { executeTool } from './lib/nexus-data';
import assert from 'assert';

async function runTests() {
  console.log('--- Running INC-1042 Investigation Test ---');

  // Define mock callbacks
  const onStep = (step: string) => console.log(`  [STEP] ${step}`);
  const onRawEvidence = () => {}; // No-op for this test
  const onToolExecution = () => {}; // No-op for this test

  // 1. Start Investigation
  console.log('Running investigation engine...');
  const investigation = await runInvestigation(
    'INC-1042',
    onStep,
    onRawEvidence,
    onToolExecution
  );
  console.log('Investigation complete.');

  // 2. Verify the structure of the investigation result
  assert(investigation, 'Investigation result should not be null.');
  assert(investigation.id === 'inv-INC-1042', 'Investigation should have the correct ID.');
  assert(investigation.status === 'complete', 'Investigation status should be complete.');
  
  assert(investigation.summary, 'Investigation should have a summary.');
  assert(investigation.summary.toolCount > 0, 'Summary should report tool executions.');

  assert(investigation.timeline, 'Investigation should have a timeline.');
  assert(investigation.timeline.length > 0, 'Timeline should have events.');

  assert(investigation.signals, 'Investigation should have signals.');
  assert(investigation.signals.length > 0, 'Signal analysis should produce results.');

  assert(investigation.hypotheses, 'Investigation should have hypotheses.');
  assert(investigation.hypotheses.length > 0, 'Should generate at least one hypothesis.');

  assert(investigation.rootCause, 'A root cause should be assessed.');
  assert(investigation.rootCause.confidence > 0, 'Root cause confidence should be greater than 0.');
  
  assert(investigation.recommendation, 'A recommendation should be generated.');
  console.log('Investigation result structure verified successfully.');

  // 3. Verify Agent Activity is still recorded
  const activity = getActivity();
  assert(activity.length > 0, 'Agent activity should be recorded.');
  console.log(`Agent activity verified. (${activity.length} entries)`);

  // 4. Test a single tool execution via the underlying mechanism
  console.log('--- Testing WebMCP tool execution ---');
  const incidentResult: any = executeTool('get_incident', { incident_id: 'INC-1042' });
  assert(incidentResult.id === 'INC-1042', 'get_incident should return the correct incident.');
  console.log('get_incident tool executed successfully.');

  console.log('--- All tests passed! ---');
}

runTests().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
