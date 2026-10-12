// Minimal CDP driver over headless Edge for end-to-end UI checks.
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

export const APP = 'http://localhost:4200';
export const sleep = ms => new Promise(r => setTimeout(r, ms));
// Screenshots of failed checks (and the headless browser profile) go next to the scripts
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'captures');
mkdirSync(OUT, { recursive: true });

const HELPERS = `
window.__t = {
  vis(e) { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; },
  find(text, sel) {
    sel = sel || 'button, a, [role=button], .more-badge, li, .tab, label';
    const els = [...document.querySelectorAll(sel)].filter(e => this.vis(e));
    const norm = s => (s || '').replace(/\\s+/g, ' ').trim();
    return els.find(e => norm(e.innerText) === text) || els.find(e => norm(e.innerText).includes(text));
  },
  click(text, sel) { const e = this.find(text, sel); if (!e) return 'NOTFOUND:' + text; if (e.disabled) return 'DISABLED:' + text; e.scrollIntoView({block:'center'}); e.click(); return 'ok'; },
  clickSel(sel) { const e = [...document.querySelectorAll(sel)].find(x => this.vis(x)); if (!e) return 'NOTFOUND:' + sel; if (e.disabled) return 'DISABLED:' + sel; e.scrollIntoView({block:'center'}); e.click(); return 'ok'; },
  fill(sel, val) { const e = [...document.querySelectorAll(sel)].find(x => this.vis(x)) || document.querySelector(sel); if (!e) return 'NOTFOUND:' + sel;
    const proto = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : e.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, val);
    e.dispatchEvent(new Event('input', {bubbles:true})); e.dispatchEvent(new Event('change', {bubbles:true})); e.dispatchEvent(new Event('blur', {bubbles:true})); return 'ok'; },
  select(sel, how) { const e = [...document.querySelectorAll(sel)].find(x => this.vis(x)) || document.querySelector(sel); if (!e) return 'NOTFOUND:' + sel;
    const opts = [...e.options]; let i = typeof how === 'number' ? how : opts.findIndex(o => o.text.includes(how));
    if (i < 0 || i >= opts.length) return 'NOOPTION:' + how + ' in ' + opts.map(o => o.text).join('|').slice(0, 200);
    e.selectedIndex = i; e.dispatchEvent(new Event('change', {bubbles:true})); return 'ok:' + opts[i].text; },
  text(sel) { const e = sel ? document.querySelector(sel) : document.body; return e ? e.innerText : ''; },
  busy() { return !!document.querySelector('.gm-loading, .gm-skeleton, .loading-state, .panel-body.loading, .loading-overlay'); }
};`;

export async function launch({ width = 1440, height = 900 } = {}) {
  const port = 9300 + Math.floor(Math.random() * 400);
  const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`,
    `--user-data-dir=${join(OUT, '.edge-' + port)}`, `--window-size=${width},${height}`, 'about:blank'
  ], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 150 && !target; i++) {
    try { target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); } catch { await sleep(200); }
  }
  if (!target) throw new Error('Edge did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let seq = 0; const pending = new Map();
  const b = {
    errors: [], dialogs: [], width, height,
    send(method, params = {}) { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => pending.set(id, { res, rej })); },
    close() { try { ws.close(); } catch {} edge.kill(); }
  };
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.method === 'Runtime.exceptionThrown') b.errors.push('EXC ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 300));
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') b.errors.push('CONSOLE ' + d.params.args.map(a => a.value || a.description || '').join(' ').slice(0, 300));
    if (d.method === 'Network.responseReceived' && d.params.response.url.includes('/api/') && d.params.response.status >= 400) b.errors.push(`HTTP ${d.params.response.status} ${d.params.response.url.replace(/^.*\/api/, '/api').slice(0, 140)}`);
    if (d.method === 'Page.javascriptDialogOpening') { b.dialogs.push(d.params.message); b.send('Page.handleJavaScriptDialog', { accept: true, promptText: 'Motif E2E de test' }); }
    if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(d.error) : p.res(d.result); }
  };
  await b.send('Page.enable'); await b.send('Runtime.enable'); await b.send('Network.enable');
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: HELPERS });
  await b.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
  return b;
}

export async function ev(b, expr) {
  const r = await b.send('Runtime.evaluate', { expression: `(async () => { ${HELPERS}; return (${expr}); })()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) return 'EVALERR:' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

export async function idle(b, extra = 400) {
  await sleep(300);
  for (let i = 0, calm = 0; i < 80 && calm < 2; i++) {
    calm = (await ev(b, '__t.busy()')) ? 0 : calm + 1;
    await sleep(250);
  }
  await sleep(extra);
}

export async function goto(b, route) {
  await b.send('Page.navigate', { url: APP + route });
  await sleep(800);
  await idle(b);
}

export async function shot(b, name) {
  const s = await b.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, name + '.png'), Buffer.from(s.data, 'base64'));
}

/** Logs in through the real sign-in form. */
export async function login(b, email, password) {
  await b.send('Page.navigate', { url: APP + '/login' });
  await sleep(1500);
  await ev(b, `localStorage.clear()`);
  await b.send('Network.clearBrowserCookies');
  await b.send('Page.navigate', { url: APP + '/login' });
  for (let i = 0; i < 60 && !(await ev(b, `!!document.querySelector('#email')`)); i++) await sleep(250);
  await sleep(300);
  await ev(b, `__t.fill('#email', ${JSON.stringify(email)})`);
  await ev(b, `__t.fill('#password', ${JSON.stringify(password)})`);
  for (let i = 0; i < 20 && (await ev(b, `document.querySelector('button[type=submit]').disabled`)); i++) await sleep(150);
  await ev(b, `__t.clickSel('button[type=submit]')`);
  for (let i = 0; i < 40; i++) { await sleep(300); if (!(await ev(b, 'location.pathname')).includes('login')) break; }
  await idle(b, 800);
  return ev(b, 'location.pathname');
}

// ---- tiny test reporter
export const results = [];
export async function check(b, name, fn) {
  const before = b.errors.length;
  let ok = true, detail = '';
  try { const r = await fn(); if (r !== true && r !== undefined) { ok = false; detail = String(r); } }
  catch (e) { ok = false; detail = String(e?.message || e); }
  const errs = b.errors.slice(before);
  results.push({ name, ok, detail, errs });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail.slice(0, 300) : ''}${errs.length ? '\n      ' + errs.join('\n      ') : ''}`);
  if (!ok) await shot(b, 'fail-' + results.length).catch(() => {});
  return ok;
}
