import { launch, login, goto, shot, ev, idle, sleep } from './cdp.mjs';
const b = await launch({ height: 1000 });
await login(b, 'superviseur@simotex.demo', 'Simotex!2026');
await goto(b, '/settings'); await shot(b, 'set-hub');
await ev(b, `document.querySelector('.main-content, .page-content').scrollTo(0, 600)`); await sleep(400); await shot(b, 'set-hub2');
await goto(b, '/settings/references'); await shot(b, 'set-ref');
await ev(b, `__t.click('Modifier','button')`); await sleep(500); await shot(b, 'set-ref-dlg');
b.close();
