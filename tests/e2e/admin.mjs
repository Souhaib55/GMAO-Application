// Équipements CRUD + fiche, utilisateurs (création -> connexion -> suppression libère ses OT),
// référentiels, budgets, techniciens, explorateur, notifications, droits du demandeur.
import { launch, login, goto, ev, check, shot, results, idle, sleep, API } from './cdp.mjs';
const PW = 'Simotex!2026';
const SUP = 'superviseur@simotex.demo', TECH = 'm.bensalah@simotex.demo', DEM = 's.haddad@simotex.demo';
const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
const api = (path, method = 'GET', body) => `fetch('${API}${path}', {method:'${method}', credentials:'include', headers:{'Content-Type':'application/json'}${body ? `, body: JSON.stringify(${JSON.stringify(body)})` : ''}}).then(async r => { const t = await r.text(); try { return t ? JSON.parse(t) : {status: r.status}; } catch { return {status: r.status, text: t.slice(0,200)}; } })`;
const b = await launch();
async function click(text, sel) {
  let r;
  for (let i = 0; i < 12; i++) { r = await ev(b, `__t.click(${JSON.stringify(text)}${sel ? ', ' + JSON.stringify(sel) : ''})`); if (!String(r).startsWith('DISABLED') && !String(r).startsWith('NOTFOUND')) break; await sleep(250); }
  await idle(b, 700); return r;
}
const fill = (sel, v) => ev(b, `__t.fill(${JSON.stringify(sel)}, ${JSON.stringify(String(v))})`);
const pick = async (sel, how) => { for (let i = 0; i < 20; i++) { const r = await ev(b, `__t.select(${JSON.stringify(sel)}, ${JSON.stringify(how)})`); if (String(r).startsWith('ok')) { await sleep(300); return r; } await sleep(250); } return 'NOOPTION ' + how; };
const text = () => ev(b, '__t.text()');
const rowAction = (needle, btnSel) => ev(b, `(() => { const row = [...document.querySelectorAll('tr')].find(r => r.innerText.includes(${JSON.stringify(needle)})); if (!row) return 'row not found'; const x = row.querySelector(${JSON.stringify(btnSel)}); if (!x) return 'no button ' + ${JSON.stringify(btnSel)}; x.click(); return 'ok'; })()`);

try {
  await login(b, SUP, PW);

  // ================================================================ ÉQUIPEMENTS
  const EQ = 'E2E-EQ-' + stamp;
  let eqId;
  await check(b, 'Équipements: créer une machine', async () => {
    await goto(b, '/equipment/new');
    await fill('[formcontrolname=codeEquipement]', EQ);
    await fill('[formcontrolname=designation]', 'Surjeteuse E2E ' + stamp);
    for (const id of ['idCriticite', 'idEtat', 'idFamille', 'idChaineProduction']) await pick('#' + id, 1);
    await fill('#coutAchat', '4500');
    const r = await ev(b, `__t.clickSel('button[type=submit]')`); if (r !== 'ok') return r;
    await idle(b, 1200);
    const list = await ev(b, api('/Equipment?page=1&pageSize=5&search=' + EQ));
    const e = (list.data || list.items || list).find?.(x => x.codeEquipement === EQ);
    if (!e) return 'not created: ' + JSON.stringify(list).slice(0, 150);
    eqId = e.idEquipement;
  });
  await check(b, 'Équipements: modifier la machine', async () => {
    await goto(b, '/equipment/edit/' + eqId);
    await fill('[formcontrolname=designation]', 'Surjeteuse E2E modifiée ' + stamp);
    const r = await ev(b, `__t.clickSel('button[type=submit]')`); if (r !== 'ok') return r;
    await idle(b, 1200);
    const e = await ev(b, api('/Equipment/' + eqId));
    return (e.designation || '').includes('modifiée') || 'not saved: ' + e.designation;
  });
  await check(b, 'Équipements: fiche + onglets historique et documents', async () => {
    await goto(b, '/equipment/view/' + eqId);
    let r = await click('Historique', 'button, .tab, [role=tab]'); if (r !== 'ok') return 'historique tab: ' + r;
    r = await click('Documents', 'button, .tab, [role=tab]'); if (r !== 'ok') return 'documents tab: ' + r;
    return true;
  });
  await check(b, 'Équipements: la machine est proposée dans une déclaration', async () => {
    const e = await ev(b, api('/Equipment/' + eqId));
    await goto(b, '/interventions/new');
    const chaineId = e.idChaineProduction ?? e.chaineProduction?.idChaineProduction;
    await ev(b, `(() => { const s = document.querySelector('#idChaineProduction'); const i = [...s.options].findIndex(o => o.text.trim() === ${JSON.stringify(e.chaineProduction?.libelle || '')}); s.selectedIndex = i > 0 ? i : 1; s.dispatchEvent(new Event('change', {bubbles:true})); })()`);
    await idle(b, 1000);
    return (await ev(b, `[...document.querySelectorAll('#idEquipement option')].some(o => o.text.includes(${JSON.stringify(EQ)}))`)) || 'machine not offered for its line (chaine ' + chaineId + ')';
  });
  await check(b, 'Équipements: supprimer la machine', async () => {
    await goto(b, '/equipment');
    await fill('.gm-filters input[type=search]', EQ); await sleep(600); await idle(b, 800);
    const r = await rowAction(EQ, 'button[title=Supprimer]'); if (r !== 'ok') return r;
    await sleep(400);
    if (await ev(b, `__t.clickSel('.cd-box .btn-danger')`) !== 'ok') return 'confirmation dialog not shown';
    await idle(b, 1200);
    const list = await ev(b, api('/Equipment?page=1&pageSize=5&search=' + EQ));
    return !((list.data || list.items || list).some?.(x => x.codeEquipement === EQ)) || 'still listed';
  });

  // ================================================================ UTILISATEURS
  const EMAIL = `e2e.tech.${stamp}@simotex.demo`;
  await check(b, 'Utilisateurs: créer un technicien', async () => {
    await goto(b, '/settings/users');
    let r = await click('Nouvel utilisateur', 'button'); if (r !== 'ok') r = await ev(b, `__t.clickSel('.btn-primary')`);
    await idle(b, 500);
    await fill('[formcontrolname=firstName]', 'Test'); await fill('[formcontrolname=lastName]', 'E2E' + stamp);
    await fill('[formcontrolname=email]', EMAIL); await fill('[formcontrolname=password]', 'Technicien1!');
    const p = await pick('[formcontrolname=roleId]', 'Technicien'); if (!p.startsWith('ok')) { const p2 = await pick('[formcontrolname=roleId]', 'Utilisateur'); if (!p2.startsWith('ok')) return p2; }
    r = await ev(b, `__t.clickSel('.modal-overlay button[type=submit]')`); if (r !== 'ok') return r;
    await idle(b, 1500);
    return (await text()).includes(EMAIL) || 'not in list: ' + (await ev(b, `[...document.querySelectorAll('.error, .alert, .error-message')].map(e=>e.innerText).join('|')`));
  });
  let otForNewTech;
  await check(b, 'Utilisateurs: le nouveau technicien est affectable', async () => {
    const techs = await ev(b, api('/users/technicians'));
    const t = (techs.data || techs).find?.(x => x.email === EMAIL);
    if (!t) return 'not in technicians list: ' + JSON.stringify(techs).slice(0, 120);
    // give him an OT
    const list = await ev(b, api('/demandeintervention?page=1&pageSize=50'));
    const ot = list.data.find(x => (x.statusId ?? x.status?.id) === 1 && !x.destinataire);
    if (!ot) return true;
    const r = await ev(b, api(`/demandeintervention/${ot.idDemandeIntervention}/assign`, 'POST', { technicianId: String(t.id) }));
    otForNewTech = ot.idDemandeIntervention;
    const st = await ev(b, api('/demandeintervention/' + ot.idDemandeIntervention));
    return !!st.destinataire || 'assign failed: ' + JSON.stringify(r).slice(0, 150);
  });
  await check(b, 'Utilisateurs: le nouveau technicien se connecte et voit son OT + notification', async () => {
    const where = await login(b, EMAIL, 'Technicien1!');
    if (where.includes('login')) return 'cannot log in';
    if (!otForNewTech) return true;
    await goto(b, '/interventions');
    const seen = await ev(b, `__t.text().includes('INT-${String(otForNewTech).padStart(4, '0')}') || __t.text().includes('${otForNewTech}')`);
    const notif = await ev(b, api('/notification'));
    const hasNotif = JSON.stringify(notif).includes(String(otForNewTech)) || JSON.stringify(notif).toLowerCase().includes('affect');
    return (seen && hasNotif) || `OT visible=${seen} notification=${hasNotif}`;
  });
  await login(b, SUP, PW);
  await check(b, 'Utilisateurs: supprimer le technicien libère ses OT', async () => {
    await goto(b, '/settings/users');
    await fill('.search-box input, input[placeholder^="Rechercher un utilisateur"]', EMAIL); await idle(b, 600);
    let r = await rowAction(EMAIL, '.action-btn.delete'); if (r !== 'ok') return r;
    await idle(b, 500);
    r = await ev(b, `__t.clickSel('.cd-box .btn-danger')`); if (r !== 'ok') return r;
    await idle(b, 1200);
    if ((await text()).includes(EMAIL)) return 'still listed';
    if (!otForNewTech) return true;
    const st = await ev(b, api('/demandeintervention/' + otForNewTech));
    return !st.destinataire || 'OT still assigned to deleted user';
  });

  // ================================================================ RÉFÉRENTIELS
  const REF = 'Panne E2E ' + stamp;
  await check(b, 'Référentiels: ajouter puis supprimer un type de panne', async () => {
    await goto(b, '/settings/references');
    let r = await click('Interventions', '.gm-tabs button'); if (r !== 'ok') return 'tab: ' + r;
    r = await click('Types de pannes', '.nav-item'); if (r !== 'ok') return 'list: ' + r;
    await idle(b, 600);
    r = await click('Ajouter', '.ref-panel button'); if (r !== 'ok') return 'add: ' + r;
    await fill('[formcontrolname=name]', REF);
    r = await ev(b, `__t.clickSel('button[form=refForm]')`); await idle(b, 1000);
    if (!(await text()).includes(REF)) return 'not added';
    r = await ev(b, `(() => { const li = [...document.querySelectorAll('.item-list li')].find(x => x.innerText.includes(${JSON.stringify(REF)})); if (!li) return 'row'; li.querySelector('button[title=Supprimer]').click(); return 'ok'; })()`);
    if (r !== 'ok') return r;
    await idle(b, 400);
    await ev(b, `__t.clickSel('.cd-box .btn-danger')`); await idle(b, 1000);
    return !(await text()).includes(REF) || 'not deleted';
  });

  // ================================================================ BUDGETS / TECHNICIENS / EXPLORATEUR
  let budgetBefore;
  await check(b, 'Budgets: ajouter une ligne puis la supprimer', async () => {
    await goto(b, '/budgets');
    budgetBefore = await text();
    let r = await click('Nouvelle ligne', 'button'); if (r !== 'ok') r = await ev(b, `__t.clickSel('.gm-page .btn-primary')`);
    await idle(b, 400);
    const nCat = await ev(b, `document.querySelectorAll('.gm-dialog select')[0].options.length`);
    const nPer = await ev(b, `document.querySelectorAll('.gm-dialog select')[1].options.length`);
    let err = 'no free combination';
    for (let c = 0; c < nCat && err; c++) for (let p = 0; p < nPer && err; p++) {
      await ev(b, `(() => { const [a, z] = document.querySelectorAll('.gm-dialog select'); a.selectedIndex = ${c}; a.dispatchEvent(new Event('change', {bubbles:true})); z.selectedIndex = ${p}; z.dispatchEvent(new Event('change', {bubbles:true})); })()`);
      await fill('.gm-dialog input[type=number]', 12345);
      await fill('.gm-dialog input[maxlength="500"]', 'E2E ' + stamp);
      r = await click('Enregistrer', '.gm-dialog button');
      err = await ev(b, `document.querySelector('.gm-dialog') ? ([...document.querySelectorAll('.gm-error-box')].map(e => e.innerText).join('|') || 'dialog still open') : ''`);
      if (err && !/existe déjà/.test(err)) return err;
    }
    if (err) return err;
    const v = await ev(b, api('/budgets?annee=' + new Date().getFullYear()));
    const line = JSON.stringify(v).includes('E2E ' + stamp);
    if (!line) return 'line not saved';
    const lid = (v.lignes || v.budgets || []).find?.(l => (l.notes || '').includes(stamp))?.id;
    if (lid) await ev(b, api('/budgets/' + lid, 'DELETE'));
    return true;
  });
  await check(b, 'Techniciens: modifier le taux horaire (DT/h)', async () => {
    await goto(b, '/techniciens');
    let r = await ev(b, `(() => { const leaf = [...document.querySelectorAll('.page-content *')].find(x => x.children.length === 0 && x.textContent.trim() === 'Mohamed Ben Salah'); let c = leaf; while (c && !c.querySelector('button')) c = c.parentElement; if (!c) return 'row'; [...c.querySelectorAll('button')].pop().click(); return 'ok'; })()`);
    if (r !== 'ok') return r;
    await idle(b, 400);
    const old = await ev(b, `document.querySelector('.gm-dialog input[type=number]').value`);
    await fill('.gm-dialog input[type=number]', '14.5');
    r = await click('Enregistrer', '.gm-dialog button'); if (r !== 'ok') return r;
    const ok = (await text()).includes('14,5') || (await text()).includes('14.5');
    // restore
    await ev(b, `(() => { const leaf = [...document.querySelectorAll('.page-content *')].find(x => x.children.length === 0 && x.textContent.trim() === 'Mohamed Ben Salah'); let c = leaf; while (c && !c.querySelector('button')) c = c.parentElement; if (!c) return 'row'; [...c.querySelectorAll('button')].pop().click(); return 'ok'; })()`); await idle(b, 400);
    await fill('.gm-dialog input[type=number]', old); await click('Enregistrer', '.gm-dialog button');
    return ok || 'new rate not shown';
  });
  await check(b, 'Explorateur: exécuter une question', async () => {
    await goto(b, '/explorateur');
    let r = await ev(b, `(() => { const q = document.querySelector('.question, .q-item, [class*=question] button, li button'); if (!q) return 'no question'; q.click(); return 'ok'; })()`);
    if (r !== 'ok') return r;
    await idle(b, 600);
    r = await click('Exécuter', 'button'); if (r !== 'ok') r = await click('Afficher', 'button');
    await idle(b, 1500);
    return (await ev(b, `!!document.querySelector('table tbody tr') || __t.text().includes('Aucun résultat')`)) || 'no result table';
  });

  await check(b, 'Tableau de bord: alerte « sans technicien » ouvre la liste filtrée', async () => {
    await goto(b, '/dashboard');
    for (let i = 0; i < 40 && !(await ev(b, `!!document.querySelector('a.alert-row')`)); i++) await sleep(250);
    const r = await ev(b, `(() => { const a = [...document.querySelectorAll('a.alert-row')].find(x => x.innerText.includes('sans technicien')); if (!a) return 'no alert link'; a.click(); return 'ok'; })()`);
    if (r !== 'ok') return r;
    await idle(b, 1200);
    const url = await ev(b, 'location.pathname + location.search');
    if (!url.includes('vue=non-affectees')) return 'went to ' + url;
    // The active filter is shown as a banner in words (version 3; a chip before)
    const chip = await ev(b, `(document.querySelector('.drill-banner')?.innerText || '').includes('Demandes sans technicien')`);
    const rows = await ev(b, api('/demandeintervention?page=1&pageSize=100&vue=non-affectees'));
    const bad = (rows.data || []).filter(x => x.destinataire || (x.statusId ?? x.status?.id) !== 1).length;
    return (chip && bad === 0) || `chip=${chip} wrong rows=${bad}`;
  });
  await check(b, 'Tableau de bord: KPI « Interventions ouvertes » = nombre filtré', async () => {
    await goto(b, '/dashboard');
    // A KPI card is a block with a "?" and a link covering it (version 3; a link before)
    const kpi = await ev(b, `(() => { const a = [...document.querySelectorAll('.gm-kpi')].find(x => x.querySelector('.kpi-label')?.innerText.includes('Interventions ouvertes')); return a ? a.querySelector('.kpi-value').innerText.replace(/\D/g, '') : 'none'; })()`);
    const list = await ev(b, api('/demandeintervention?page=1&pageSize=1&vue=ouvertes'));
    return String(list.totalCount) === kpi || `KPI ${kpi} vs list ${list.totalCount}`;
  });

  // ================================================================ DEMANDEUR: modifier / annuler sa demande
  await login(b, DEM, PW);
  const T = 'E2E demandeur ' + stamp;
  let did;
  await check(b, 'Demandeur: déclare, modifie puis annule sa propre demande', async () => {
    await goto(b, '/interventions/new');
    await pick('#idChaineProduction', 1); await idle(b, 600);
    await pick('#idTypeIntervention', 1);
    if (await ev(b, `!!document.querySelector('#idPanne') && __t.vis(document.querySelector('#idPanne'))`)) await pick('#idPanne', 1);
    await ev(b, `document.querySelector('[formcontrolname=idUrgence]').click()`);
    await fill('#titre', T); await fill('#description', 'Test E2E du demandeur');
    let r = await click("Déclarer l'intervention", 'button'); if (r !== 'ok') return r;
    did = (await ev(b, api('/demandeintervention?page=1&pageSize=5&search=' + encodeURIComponent(T)))).data?.[0]?.idDemandeIntervention;
    if (!did) return 'not created';
    await goto(b, '/interventions/edit/' + did);
    await fill('#titre', T + ' bis');
    r = await click('Enregistrer les modifications', 'button'); if (r !== 'ok') return 'edit: ' + r;
    const st = await ev(b, api('/demandeintervention/' + did));
    if (st.titre !== T + ' bis') return 'edit not saved';
    await goto(b, '/interventions/view/' + did);
    r = await click('Annuler cette intervention', 'app-intervention-actions button'); if (r !== 'ok') return r;
    await fill('app-intervention-actions textarea', 'Saisie en double');
    r = await click("Confirmer l'annulation", 'app-intervention-actions button'); if (r !== 'ok') return r;
    return (await ev(b, api('/demandeintervention/' + did))).statusId === 5 || 'not cancelled';
  });
  await check(b, 'Demandeur: ne voit pas les demandes des autres', async () => {
    const list = await ev(b, api('/demandeintervention?page=1&pageSize=50'));
    const me = await ev(b, `JSON.parse(localStorage.getItem('currentUser')).internalId`);
    const others = (list.data || []).filter(x => x.demandeursID !== me);
    return others.length === 0 || others.length + ' foreign requests visible';
  });
  await check(b, 'Demandeur: API refuse les actions superviseur', async () => {
    const r = await ev(b, api('/preventif/plans', 'POST', { titre: 'x' }));
    const r2 = await ev(b, api('/magasin/mouvements', 'POST', { idPiece: 1, type: 'Entrée', quantite: 1 }));
    return ((r.status === 403 || r.status === 401) && (r2.status === 403 || r2.status === 401)) || `preventif ${r.status} magasin ${r2.status}`;
  });
} finally {
  b.close();
  const bad = results.filter(r => !r.ok || r.errs.length);
  console.log(`\n${results.length} checks, ${results.filter(r => r.ok).length} pass, ${bad.length} with failures or errors`);
}
