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

/** The user's shell — the one whose rc files put `claude` on the PATH. */
function userShell() {
  return process.env.SHELL || '/bin/zsh';
}

/**
 * GUI apps do not inherit the shell's PATH (`~/.local/bin`, homebrew…), so ask
 * the user's login shell where the binaries are. Cached: nothing here changes
 * while the app is open, and the shell takes a moment to start.
 *
 * `checked` is false when the shell did not answer in time (heavy rc files,
 * nvm…). The UI then offers every agent rather than calling them missing —
 * the terminal itself will have the same PATH and may well find them.
 */
function detect() {
  if (detected) return detected;
  detected = new Promise((resolve) => {
    const result = { agents: {}, terminals: ['terminal'], checked: false, shell: userShell() };
    for (const a of AGENTS) result.agents[a.id] = null;
    if (fs.existsSync(WARP_APP)) result.terminals.push('warp');

    // A marker line so greetings printed by the rc files can be skipped.
    const marker = '__pm_agents__';
    const script = [`echo ${marker}`, ...AGENTS.map((a) => `command -v ${a.bin} || echo ''`)].join('; ');
    execFile(userShell(), ['-lic', script], { timeout: 6000 }, (err, stdout) => {
      const lines = String(stdout ?? '').split('\n').map((l) => l.trim());
      const start = lines.indexOf(marker);
      if (err || start === -1) return resolve(result);
      const paths = lines.slice(start + 1, start + 1 + AGENTS.length);
      AGENTS.forEach((a, i) => {
        const p = paths[i] ?? '';
        result.agents[a.id] = p.startsWith('/') ? p : null;
      });
      result.checked = true;
      resolve(result);
    });
  });
  return detected;
}

/**
 * The .command Terminal runs. A /bin/sh wrapper hands off to the user's own
 * shell as login + interactive, so PATH is whatever their rc files make it —
 * zsh, bash or fish alike; `||`, `;` and `exec` are common to all three.
 */
function scriptFor(agent, prompt) {
  const cmd = [agent.bin, ...agent.args(prompt).map(shellQuote)].join(' ');
  const inner = `cd ${shellQuote(VAULT_DIR)} || exit 1; clear; exec ${cmd}`;
  return [
    '#!/bin/sh',
    `exec ${shellQuote(userShell())} -lic ${shellQuote(inner)}`,
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
