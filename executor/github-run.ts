import 'dotenv/config';
import { normalizeOutput, runSandbox, type Test } from './sandbox';

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const executionId = requiredEnv('EXECUTION_ID');
const apiUrl = requiredEnv('EXECUTOR_API_URL').replace(/\/$/, '');
const executorSecret = requiredEnv('EXECUTOR_SHARED_SECRET');

type ExecutionPayload = {
  executionId: string;
  roomId: string;
  language: string;
  source: string;
  stdin: string;
  problemTemplateId: string | null;
  tests: Test[];
};

type ResultPayload = {
  status: 'COMPLETED' | 'FAILED';
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  results: Array<Record<string, unknown>>;
  failureReason: string | null;
};

async function apiRequest<T>(pathName: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${pathName}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-coderoom-executor-secret': executorSecret,
      ...(init?.headers ?? {})
    }
  });

  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    throw new Error(`Executor API ${response.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }
  return body as T;
}

async function reportResult(body: ResultPayload) {
  await apiRequest(`/api/executor/jobs/${encodeURIComponent(executionId)}/result`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

async function main() {
  const payload = await apiRequest<ExecutionPayload>(`/api/executor/jobs/${encodeURIComponent(executionId)}`);
  const cases = payload.tests.length > 0 ? payload.tests : [{ id: 'stdin', name: 'Standard input', input: payload.stdin, expected: '', hidden: false }];

  const results: Array<Record<string, unknown>> = [];
  let overallStdout = '';
  let overallStderr = '';
  let firstFailureReason: string | null = null;
  let firstNonZeroExitCode: number | null = null;
  const overallStarted = Date.now();

  for (const test of cases) {
    const result = await runSandbox(payload.language, payload.source, test.input, payload.problemTemplateId);
    const passed = test.expected.length > 0
      ? normalizeOutput(result.stdout) === normalizeOutput(test.expected) && result.exitCode === 0 && !result.timedOut
      : result.exitCode === 0 && !result.timedOut;

    if (result.exitCode !== null && result.exitCode !== 0 && firstNonZeroExitCode === null) {
      firstNonZeroExitCode = result.exitCode;
    }

    results.push({
      id: test.id,
      name: test.name,
      hidden: test.hidden,
      passed,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      expected: test.hidden ? undefined : test.expected,
      stdout: test.hidden ? undefined : result.stdout,
      stderr: result.stderr
    });

    overallStdout += result.stdout;
    overallStderr += result.stderr;

    if (!passed && !firstFailureReason) {
      if (result.timedOut) firstFailureReason = `Time limit exceeded on ${test.name}.`;
      else if (result.exitCode !== 0) firstFailureReason = `Runtime or compilation error on ${test.name}.`;
      else firstFailureReason = `Wrong answer on ${test.name}.`;
    }
  }

  const allPassed = results.length > 0 && results.every(item => item.passed === true);
  const passedCount = results.filter(item => item.passed === true).length;
  const status = allPassed ? 'COMPLETED' : 'FAILED';

  await reportResult({
    status,
    stdout: overallStdout.slice(0, 250000),
    stderr: overallStderr.slice(0, 250000),
    exitCode: firstNonZeroExitCode ?? 0,
    durationMs: Date.now() - overallStarted,
    results,
    failureReason: allPassed ? null : `${firstFailureReason ?? 'Execution failed.'} ${passedCount}/${results.length} tests passed.`
  });

  console.log(`[executor] ${executionId}: ${status} (${passedCount}/${results.length})`);
}

async function failExecution(error: unknown) {
  const message = error instanceof Error ? error.message : 'Execution failed.';
  console.error('[executor] Execution failed:', message);

  try {
    await reportResult({
      status: 'FAILED',
      stdout: '',
      stderr: message,
      exitCode: null,
      durationMs: 0,
      results: [],
      failureReason: message
    });
  } catch (reportError) {
    console.error('[executor] Failed to report execution failure:', reportError);
  }
}

main().catch(failExecution);
