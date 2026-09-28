import { spawn, execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const timeoutMs = Number(process.env.EXECUTION_TIMEOUT_MS ?? 5000);
const imagePullTimeoutMs = Number(process.env.IMAGE_PULL_TIMEOUT_MS ?? 300000);
const maxOutputBytes = 250000;

type SandboxResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
};

export type Test = {
  id: string;
  name: string;
  input: string;
  expected: string;
  hidden: boolean;
};

const languageMap: Record<string, { image: string; filename: string }> = {
  python: { image: 'python:3.12-alpine', filename: 'main.py' },
  javascript: { image: 'node:22-alpine', filename: 'main.js' },
  typescript: { image: 'node:22-alpine', filename: 'main.js' },
  cpp: { image: 'gcc:14-bookworm', filename: 'main.cpp' },
  java: { image: 'eclipse-temurin:21-jdk', filename: 'Main.java' }
};

async function ensureDockerImage(image: string) {
  try {
    await execFileAsync('docker', ['image', 'inspect', image], { timeout: 15000, maxBuffer: 2 * 1024 * 1024 });
    return;
  } catch {
    console.log(`[executor] Pulling sandbox image ${image} ...`);
    await execFileAsync('docker', ['pull', image], {
      timeout: imagePullTimeoutMs,
      maxBuffer: 2 * 1024 * 1024
    });
  }
}

export function normalizeOutput(value: string) {
  const trimmed = value.replace(/\r\n/g, '\n').trim();
  if (!trimmed) return '';
  try {
    const normalizedJson = trimmed.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null');
    return JSON.stringify(JSON.parse(normalizedJson));
  } catch {
    return trimmed.replace(/\s+/g, ' ');
  }
}

function pythonHarness(templateId: string | null, source: string) {
  const prefix = `${source.trimEnd()}\n\n# ---- CodeRoom test harness ----\n`;
  switch (templateId) {
    case 'two-sum':
      return `${prefix}import sys\nnums_line = sys.stdin.readline()\ntarget_line = sys.stdin.readline()\nif not nums_line or not target_line:\n    raise ValueError('Expected two input lines: nums and target')\nnums = list(map(int, nums_line.split()))\ntarget = int(target_line.strip())\nprint(two_sum(nums, target))\n`;
    case 'valid-parentheses':
      return `${prefix}import sys\ns = sys.stdin.read().rstrip('\\n')\nprint(str(is_valid(s)).lower())\n`;
    case 'binary-search':
      return `${prefix}import sys\nnums = list(map(int, sys.stdin.readline().split()))\ntarget = int(sys.stdin.readline().strip())\nprint(search(nums, target))\n`;
    case 'best-time-stock':
      return `${prefix}import sys\nprices = list(map(int, sys.stdin.read().split()))\nprint(max_profit(prices))\n`;
    case 'longest-substring':
      return `${prefix}import sys\ns = sys.stdin.read().rstrip('\\n')\nprint(length_of_longest_substring(s))\n`;
    case 'merge-intervals':
      return `${prefix}import sys\nraw = sys.stdin.read().strip()\nintervals = []\nif raw:\n    for part in raw.split(';'):\n        a, b = map(int, part.split())\n        intervals.append([a, b])\nprint(merge(intervals))\n`;
    default:
      return null;
  }
}

function buildSource(language: string, source: string, problemTemplateId: string | null) {
  if (language === 'python' && problemTemplateId) return pythonHarness(problemTemplateId, source) ?? source;
  return source;
}

export async function runSandbox(language: string, source: string, stdin: string, problemTemplateId: string | null): Promise<SandboxResult> {
  const spec = languageMap[language];
  if (!spec) throw new Error(`Unsupported language: ${language}`);
  await ensureDockerImage(spec.image);

  const executableSource = buildSource(language, source, problemTemplateId);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderoom-'));
  await fs.writeFile(path.join(tempDir, spec.filename), executableSource, 'utf8');
  await fs.writeFile(path.join(tempDir, 'stdin.txt'), stdin ?? '', 'utf8');

  return new Promise((resolve) => {
    const started = Date.now();
    const args = [
      'run', '--rm', '--pull', 'never', '--network', 'none', '--cpus', '1', '--memory', '256m', '--pids-limit', '64',
      '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only', '--user', '1000:1000',
      '--mount', `type=bind,src=${tempDir},dst=/input,readonly`,
      '--tmpfs', '/tmp/coderoom:rw,size=64m,uid=1000,gid=1000,mode=1770',
      spec.image, 'sh', '-lc', (() => {
        const destination = `/tmp/coderoom/${spec.filename}`;
        const input = '/input/stdin.txt';
        if (language === 'python') return `cp /input/${spec.filename} ${destination} && python ${destination} < ${input}`;
        if (language === 'javascript' || language === 'typescript') return `cp /input/${spec.filename} ${destination} && node ${destination} < ${input}`;
        if (language === 'cpp') return `cp /input/${spec.filename} ${destination} && g++ -std=c++20 -O2 ${destination} -o /tmp/coderoom/main && /tmp/coderoom/main < ${input}`;
        return `cp /input/${spec.filename} ${destination} && javac ${destination} && java -cp /tmp/coderoom Main < ${input}`;
      })()
    ];

    const proc = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let finished = false;

    const finish = (code: number | null, extra?: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (extra) stderr += `\n${extra}`;
      fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
      resolve({ stdout: stdout.slice(0, maxOutputBytes), stderr: stderr.slice(0, maxOutputBytes), exitCode: code, timedOut, durationMs: Date.now() - started });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
    }, timeoutMs);

    proc.stdout.on('data', chunk => { stdout += chunk.toString(); if (stdout.length > maxOutputBytes) stdout = stdout.slice(0, maxOutputBytes); });
    proc.stderr.on('data', chunk => { stderr += chunk.toString(); if (stderr.length > maxOutputBytes) stderr = stderr.slice(0, maxOutputBytes); });
    proc.on('error', error => finish(null, error.message));
    proc.on('close', code => finish(code));
  });
}
