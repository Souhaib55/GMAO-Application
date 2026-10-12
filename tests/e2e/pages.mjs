// Visits every page each role can reach (sidebar + sub-pages); flags JS errors, failed API calls,
// pages stuck loading, empty pages, and forbidden pages that do not redirect.
import { launch, login, goto, ev, check, shot, results, idle } from './cdp.mjs';
const PW = 'Simotex!2026';
const roles = [
  { role: 'Superviseur', email: 'superviseur@simotex.demo', extra: ['/interventions/new', '/equipment/new', '/settings/users', '/settings/journal', '/settings/references'], forbidden: [] },
  { role: 'Technicien', email: 'm.bensalah@simotex.demo', extra: ['/interventions/new'], forbidden: ['/budgets', '/explorateur', '/techniciens', '/settings/users', '/equipment/new'] },
  { role: 'Demandeur', email: 's.haddad@simotex.demo', extra: ['/interventions/new'], forbidden: ['/budgets', '/magasin', '/preventif', '/planning', '/achats', '/settings'] }
];

const b = await launch();
try {
  for (const r of roles) {
    console.log(`\n=== ${r.role} (${r.email})`);
    const where = await login(b, r.email, PW);
    await check(b, `${r.role}: connexion`, () => where.includes('login') ? 'still on login page' : true);
    const links = await ev(b, `[...new Set([...document.querySelectorAll('.sidebar a[href], nav a[href]')].map(a => a.getAttribute('href')).filter(h => h && h.startsWith('/')))]`);
    console.log('menu:', links.join(' '));
    for (const route of [...links, ...r.extra]) {
      await check(b, `${r.role}: page ${route}`, async () => {
        await goto(b, route);
        const st = await ev(b, `({ path: location.pathname, busy: __t.busy(), len: (document.querySelector('.page-content')||document.body).innerText.trim().length, err: [...document.querySelectorAll('.gm-error-box, .error-state, .alert-error')].filter(e => __t.vis(e)).map(e => e.innerText.trim()).join(' | ') })`);
        if (st.busy) return 'still loading after 20s';
        if (st.len < 40) return 'page looks empty';
        if (st.err) return 'error shown: ' + st.err.slice(0, 200);
        if (st.path !== route) return 'redirected to ' + st.path;
      });
      await shot(b, `${r.role}-${route.replace(/\W+/g, '_')}`);
    }
    for (const route of r.forbidden) {
      await check(b, `${r.role}: accès refusé ${route}`, async () => {
        await goto(b, route);
        const p = await ev(b, 'location.pathname');
        return p === route ? 'page opened for a role that should not see it' : true;
      });
    }
  }
} finally {
  b.close();
  const failed = results.filter(r => !r.ok || r.errs.length);
  console.log(`\n${results.length} checks, ${results.filter(r => r.ok).length} pass, ${failed.length} with failures or errors`);
}
