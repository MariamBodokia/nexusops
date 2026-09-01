import { executeTool } from '../lib/nexus-data';
import assert from 'assert';

// Exercises the highest-risk logic in the app: the human-approval gate that
// sits between an agent's recommendation and any real (simulated) action,
// and the verification step that must reflect real mutated state afterward.
async function run() {
  console.log('--- Testing WebMCP execution path + human approval gate ---');

  // 1. The real WebMCP execution path (same function passed to registerTool's
  // `execute`) must return structured, non-empty results for a read-only tool.
  const services: any = await executeTool('get_services', {});
  assert(Array.isArray(services.services) && services.services.length > 0, 'get_services should return a non-empty service list.');
  console.log('WebMCP execution path returns real structured data.');

  // 2. execute_remediation must be rejected before approval is recorded.
  const blocked: any = await executeTool('execute_remediation', {
    incident_id: 'INC-1042',
    action: 'rollback_payment_api',
    approved: true,
  });
  assert.strictEqual(blocked.success, false, 'Execution must be blocked without prior human approval.');
  assert(blocked.blocked, 'Blocked result should explicitly report that it was blocked.');
  console.log('Remediation correctly blocked without human approval.');

  // 3. Verification must not report success before remediation has run.
  const preVerify: any = await executeTool('verify_remediation', { incident_id: 'INC-1042' });
  assert.strictEqual(preVerify.success, false, 'Verification should fail before remediation executes.');
  console.log('Verification correctly reports no recovery before remediation.');

  // 4. A human approves, then execution succeeds.
  const approval: any = await executeTool('approve_remediation', {
    incident_id: 'INC-1042',
    action: 'rollback_payment_api',
  });
  assert.strictEqual(approval.success, true, 'Approval should succeed for a valid incident/action.');
  console.log('Human approval recorded.');

  const executed: any = await executeTool('execute_remediation', {
    incident_id: 'INC-1042',
    action: 'rollback_payment_api',
    approved: true,
  });
  assert.strictEqual(executed.success, true, 'Execution should succeed once approval is recorded.');
  console.log('Remediation executed after approval.');

  // 5. Verification must now reflect the real mutated state, not a canned response.
  const postVerify: any = await executeTool('verify_remediation', { incident_id: 'INC-1042' });
  assert.strictEqual(postVerify.success, true, 'Verification should succeed once remediation has actually executed.');
  console.log('Verification confirms recovery from real state.');

  console.log('--- All safety-gate tests passed! ---');
}

run().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
