'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');
const { app, shell } = require('electron');
const { VAULT_DIR } = require('./posts');

/**
 * Opens a coding agent in the posts folder, in a terminal. The folder already
 * carries AGENTS.md / CLAUDE.md (how the files work) and instructions.md (who
 * the creator is), which the CLIs read on their own — so this is only about
 * getting a terminal there with the right command running.
 *
 * Neither the Claude nor the Codex desktop app exposes an "open this folder"
 * url, so it is the CLIs or nothing.
 */
const AGENTS = [
  {
    id: 'claude',
    label: 'claude code',
    bin: 'claude',
    install: 'npm i -g @anthropic-ai/claude-code',
    args: (prompt) => (prompt ? [prompt] : []),
  },
  {
    id: 'codex',
    label: 'codex',
    bin: 'codex',
    install: 'npm i -g @openai/codex',
    args: (prompt) => (prompt ? [prompt] : []),
  },
  {
    id: 'gemini',
    label: 'gemini cli',
    bin: 'gemini',
    install: 'npm i -g @google/gemini-cli',
    args: (prompt) => (prompt ? ['-i', prompt] : []),
  },
];

const WARP_APP = '/Applications/Warp.app';
const WARP_CONFIGS = path.join(os.homedir(), '.warp', 'launch_configurations');

/** Single-quotes a string for zsh/bash. */
function shellQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

let detected = null;

/**
 * GUI apps do not inherit the shell's PATH (`~/.local/bin`, homebrew…), so ask
 * the user's login shell where the binaries are. Cached: nothing here changes
 * while the app is open, and the shell takes a moment to start.
 */
function detect() {
  if (detected) return detected;
  detected = new Promise((resolve) => {
    const result = { agents: {}, terminals: ['terminal'] };
    for (const a of AGENTS) result.agents[a.id] = null;
    if (fs.existsSync(WARP_APP)) result.terminals.push('warp');

    const sh = process.env.SHELL || '/bin/zsh';
    const script = AGENTS.map((a) => `command -v ${a.bin} || echo ''`).join('; ');
    execFile(sh, ['-lic', script], { timeout: 4000 }, (_err, stdout) => {
      const lines = String(stdout ?? '').split('\n').map((l) => l.trim());
      // Interactive shells may print greetings; keep only lines that look like paths.
      const paths = lines.filter((l) => l === '' || l.startsWith('/'));
      AGENTS.forEach((a, i) => {
        const p = paths[i] ?? '';
        result.agents[a.id] = p && p.startsWith('/') ? p : null;
      });
      resolve(result);
    });
  });
  return detected;
}

function scriptFor(agent, prompt) {
  const cmd = [agent.bin, ...agent.args(prompt).map(shellQuote)].join(' ');
  return [
    // Login + interactive, so PATH is the one the user sees in their own terminal.
    '#!/bin/zsh -li',
    `cd ${shellQuote(VAULT_DIR)} || exit 1`,
    'clear',
    `exec ${cmd}`,
    '',
  ].join('\n');
}

async function launchInTerminal(agent, prompt) {
  const dir = path.join(app.getPath('userData'), 'launch');
  await fsp.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${agent.id}.command`);
  await fsp.writeFile(file, scriptFor(agent, prompt), { encoding: 'utf8', mode: 0o755 });
  await fsp.chmod(file, 0o755);
  await new Promise((resolve, reject) => {
    const child = spawn('open', ['-a', 'Terminal', file], { stdio: 'ignore' });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`open exited ${code}`))));
  });
}

function yamlString(s) {
  return JSON.stringify(String(s));
}

async function launchInWarp(agent, prompt) {
  await fsp.mkdir(WARP_CONFIGS, { recursive: true });
  const name = `post-manager-${agent.id}`;
  const cmd = [agent.bin, ...agent.args(prompt).map(shellQuote)].join(' ');
  const yaml = [
    `name: ${yamlString(`post manager — ${agent.label}`)}`,
    'windows:',
    '  - tabs:',
    `      - title: ${yamlString(agent.label)}`,
    '        layout:',
    `          cwd: ${yamlString(VAULT_DIR)}`,
    '          commands:',
    `            - exec: ${yamlString(cmd)}`,
    '',
  ].join('\n');
  await fsp.writeFile(path.join(WARP_CONFIGS, `${name}.yaml`), yaml, 'utf8');
  await shell.openExternal(`warp://launch/${name}`);
}

async function launch({ agent: id, terminal = 'terminal', prompt = '' } = {}) {
  const agent = AGENTS.find((a) => a.id === id);
  if (!agent) throw new Error(`unknown agent: ${id}`);
  const text = String(prompt ?? '').trim();
  if (terminal === 'warp') await launchInWarp(agent, text);
  else await launchInTerminal(agent, text);
  return { agent: agent.label, terminal: terminal === 'warp' ? 'Warp' : 'Terminal' };
}

module.exports = { AGENTS, shellQuote, scriptFor, detect, launch };
