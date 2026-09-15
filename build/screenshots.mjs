// Regenerates docs/*.png by driving a running dev window over the devtools
// protocol — no clicking on your screen, no window chrome, same viewport
// every time.
//
//   npx expo start --web --port 8081
//   HOME=/tmp/demo-home ELECTRON_DEV=1 npx electron electron/main.js --remote-debugging-port=9333
//   node build/screenshots.mjs docs
//
// HOME points the app at a demo vault (/tmp/demo-home/Documents/post-manager)
// so the pictures never show real posts; put a links.md and an instructions.md
// there too, or the onboarding opens on launch.
import fs from 'node:fs';

const OUT = process.argv[2];
const targets = await (await fetch('http://127.0.0.1:9333/json')).json();
const page = targets.find((t) => t.type === 'page' && t.url.startsWith('http://localhost:8081'));
if (!page) throw new Error('app page not found');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + JSON.stringify(r.exceptionDetails.exception?.description));
  return r.result.value;
};

// Helpers injected once.
await evaluate(`
  window.__q = {
    byLabel: (l) => document.querySelector('[aria-label="' + l + '"]'),
    byText: (txt, root = document) => Array.from(root.querySelectorAll('div,span')).find((el) => el.children.length === 0 && el.textContent.trim() === txt),
    click: (el) => { if (!el) throw new Error('no element'); el.dispatchEvent(new MouseEvent('pointerdown', {bubbles:true})); el.dispatchEvent(new MouseEvent('pointerup', {bubbles:true})); el.click(); return true; },
  };
  true
`);
const clickLabel = (l) => evaluate(`__q.click(__q.byLabel(${JSON.stringify(l)}))`);
const clickText = (t) => evaluate(`__q.click(__q.byText(${JSON.stringify(t)}))`);
const escape = async () => {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
};

const W = 1240, H = 820;
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false });

const theme = async (dark) => {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
  await send('Emulation.setDefaultBackgroundColorOverride', {
    color: dark ? { r: 30, g: 30, b: 32, a: 1 } : { r: 250, g: 250, b: 252, a: 1 },
  });
  await sleep(400);
};

const shot = async (name) => {
  await sleep(500);
  const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, 'base64'));
  console.log('saved', name);
};

// Make sure nothing is open, calendar view, on september 2026 (today).
await escape(); await escape();
await theme(false);
await clickText('calendar');
await sleep(300);

await shot('calendar-light');

await clickText('list');
await shot('list');

// Editor: open the reels post in the list, caption preview.
await clickLabel('reels: shipping v2, 2026-09-10 18:00, draft');
await sleep(600);
const scrollPanel = () => evaluate(`(() => {
  const el = __q.byText('caption');
  let p = el; while (p && getComputedStyle(p).overflowY !== 'auto' && getComputedStyle(p).overflowY !== 'scroll') p = p.parentElement;
  if (p) p.scrollTop = p.scrollHeight; return !!p; })()`);
await scrollPanel();
await shot('preview');

// Script view of the same post.
await clickText('script');
await sleep(200);
await scrollPanel();
await shot('editor');

await escape();
await sleep(300);

// Dark: calendar + list.
await theme(true);
await clickText('calendar');
await shot('calendar-dark');
await clickText('list');
await shot('list-dark');

await theme(false);
await clickText('calendar');
await sleep(300);

// Shortcuts sheet.
await clickLabel('keyboard shortcuts');
await shot('shortcuts');
await escape();
await sleep(300);

// Profile, then onboarding from it.
await clickLabel('your creator profile (instructions.md)');
await sleep(600);
await shot('profile');
await clickLabel('redo the onboarding');
await sleep(500);
// jump to the "voice" screen: dots are labelled "step n"
await clickLabel('step 5');
await sleep(300);
await shot('onboarding');
await escape();

// Agent picker.
await clickLabel('open an agent in the posts folder');
await sleep(700);
await shot('agent');
await escape();
await sleep(300);

// Quick links editor.
await clickLabel('edit quick links');
await sleep(500);
await shot('links');
await escape();

ws.close();
