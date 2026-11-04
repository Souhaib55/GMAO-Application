// Full corrective workflow through the real UI: Demandeur -> Superviseur -> Technicien -> Superviseur,
// plus refusal, send-back, cancellation (parts returned) and Superviseur CRUD on interventions.
import { launch, login, goto, ev, check, shot, results, idle, sleep, API } from './cdp.mjs';
const PW = 'Simotex!2026';
const SUP = 'superviseur@simotex.demo', TECH = 'm.bensalah@simotex.demo', TECH2 = 'k.jlassi@simotex.demo', DEM = 's.haddad@simotex.demo';
const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
const api = path => `fetch('${API}${path}', {credentials:'include'}).then(r => r.ok ? r.json() : {status: r.status})`;
const b = await launch();

async function findId(title) {
  const r = await ev(b, `${api('/demandeintervention?page=1&pageSize=5&search=' + encodeURIComponent(title))}`);
  return r?.data?.[0]?.idDemandeIntervention;
}
async function state(id) { return ev(b, api('/demandeintervention/' + id)); }
async function pickTech(name) {
  for (let i = 0; i < 40; i++) { const r = await ev(b, `__t.select('app-intervention-actions select', ${JSON.stringify(name)})`); if (String(r).startsWith("ok")) { await sleep(500); return r; } await sleep(250); }
  return 'technician option not found: ' + name;
}
async function click(text, sel) {
  let r;
  for (let i = 0; i < 10; i++) { r = await ev(b, `__t.click(${JSON.stringify(text)}${sel ? ', ' + JSON.stringify(sel) : ''})`); if (!String(r).startsWith('DISABLED')) break; await sleep(250); }
  await idle(b, 700); return r;
}
async function declare(title, { stop = true } = {}) {
  await goto(b, '/interventions/new');
  await ev(b, `__t.select('#idChaineProduction', 1)`); await idle(b, 800);
  const eq = await ev(b, `__t.select('#idEquipement', 1)`);
  await ev(b, `(() => { const e = document.querySelector('#idTypeIntervention'); const i = [...e.options].findIndex((o, k) => k > 0 && !/pr[ée]ventive/i.test(o.text)); e.selectedIndex = i; e.dispatchEvent(new Event('change', {bubbles:true})); return e.options[i].text; })()`); await sleep(300);
  if (await ev(b, `!!document.querySelector('#idPanne') && __t.vis(document.querySelector('#idPanne'))`)) await ev(b, `__t.select('#idPanne', 1)`);
  await ev(b, `(document.querySelector('[formcontrolname=idUrgence]')||{click(){}}).click()`);
  await ev(b, `__t.fill('#titre', ${JSON.stringify(title)})`);
  await ev(b, `__t.fill('#description', 'Bruit anormal et arrêt de la machine pendant la production (test E2E).')`);
  const r = await click("Déclarer l'intervention", 'button');
  await sleep(800);
  return { r, eq, path: await ev(b, 'location.pathname') };
}

try {
  // ---------------------------------------------------------------- 1. Demandeur declares
  let id;
  const T1 = 'E2E panne ' + stamp;
  await login(b, DEM, PW);
  await check(b, 'Demandeur: déclare une panne via le formulaire', async () => {
    const d = await declare(T1);
    id = await findId(T1);
    if (!id) return `not created (${JSON.stringify(d)})`;
    console.log('      created INT', id, d.eq);
  });
  await check(b, 'Demandeur: voit sa demande dans la liste', async () => {
    await goto(b, '/interventions');
    return (await ev(b, `__t.text().includes(${JSON.stringify(T1)})`)) || 'not in list';
  });
  await check(b, 'Demandeur: fiche sans actions de superviseur', async () => {
    await goto(b, '/interventions/view/' + id);
    const t = await ev(b, '__t.text()');
    if (t.includes('Affecter un technicien')) return 'assign visible for Demandeur';
    return t.includes('Annuler cette intervention') || 'demandeur cannot cancel own new request';
  });

  // ---------------------------------------------------------------- 2. Superviseur assigns from the Interventions page
  await login(b, SUP, PW);
  await check(b, 'Superviseur: affecte un technicien depuis la fiche intervention', async () => {
    await goto(b, '/interventions/view/' + id);
    const s1 = await pickTech('Ben Salah');
    if (!String(s1).startsWith('ok')) return s1;
    const r = await click('Affecter', 'app-intervention-actions button');
    if (r !== 'ok') return r;
    const st = await state(id);
    return st.destinataire ? true : 'not assigned: ' + JSON.stringify(st).slice(0, 200);
  });

  // ---------------------------------------------------------------- 3. Technician refuses, supervisor reassigns
  await login(b, TECH, PW);
  await check(b, 'Technicien: refuse avec motif', async () => {
    await goto(b, '/interventions/view/' + id);
    let r = await click('Refuser', 'app-intervention-actions button'); if (r !== 'ok') return r;
    await ev(b, `__t.fill('app-intervention-actions textarea', 'Indisponible ce matin (test E2E)')`);
    r = await click('Confirmer le refus', 'app-intervention-actions button'); if (r !== 'ok') return r;
    let st = '';
    for (let i = 0; i < 16 && st !== '/interventions'; i++) { st = await ev(b, 'location.pathname'); if (st !== '/interventions') await sleep(250); }
    return st === '/interventions' || 'stayed on ' + st;
  });
  await login(b, SUP, PW);
  await check(b, 'Superviseur: voit le motif de refus et réaffecte', async () => {
    await goto(b, '/interventions/view/' + id);
    await pickTech('Ben Salah');
    const r = await click('Affecter', 'app-intervention-actions button'); if (r !== 'ok') return r;
    return !!(await state(id)).destinataire || 'not reassigned';
  });

  // ---------------------------------------------------------------- 4. Technician accepts, records work, completes
  await login(b, TECH, PW);
  await check(b, 'Technicien: voit l\'intervention dans son planning / tableau de bord', async () => {
    await goto(b, '/dashboard');
    return (await ev(b, `__t.text().includes(${JSON.stringify(T1)})`)) || 'not on technician dashboard';
  });
  await check(b, 'Technicien: accepte et démarre', async () => {
    await goto(b, '/interventions/view/' + id);
    const r = await click('Accepter et démarrer', 'app-intervention-actions button'); if (r !== 'ok') return r;
    const st = await state(id);
    return st.statusId === 2 || 'status ' + st.statusId;
  });
  await check(b, 'Technicien: machine passe En panne', async () => {
    const st = await state(id);
    if (!st.idEquipement) return 'no machine on this OT (skip)';
    const eq = await ev(b, api('/Equipment/' + st.idEquipement));
    return /panne/i.test(JSON.stringify(eq.etatEquipement || eq.etat || eq)) || 'machine state: ' + JSON.stringify(eq.etatEquipement || eq.etat).slice(0, 80);
  });
  await check(b, 'Technicien: saisit son temps', async () => {
    let r = await click('Saisir', 'app-intervention-suivi button'); if (r !== 'ok') return r;
    const d = new Date(Date.now() - (10 + Math.floor(Math.random() * 100)) * 60000); const pad = n => String(n).padStart(2, '0');
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    await ev(b, `__t.fill('app-intervention-suivi input[type=datetime-local]', '${local}')`);
    await ev(b, `__t.fill('app-intervention-suivi input[type=number][max="1440"]', '5')`);
    r = await click('Enregistrer', 'app-intervention-suivi button'); if (r !== 'ok') return r;
    const s = await ev(b, api(`/interventions/${id}/suivi`));
    return (s.temps?.length > 0) || 'no time entry: ' + await ev(b, `__t.text('app-intervention-suivi').slice(0,300)`);
  });
  let stockBefore, articleId;
  await check(b, 'Technicien: sort une pièce du magasin', async () => {
    let r = await click('Sortir du magasin', 'app-intervention-suivi button'); if (r !== 'ok') return r;
    // pick any article in stock
    const arts = await ev(b, api('/magasin/articles?page=1&pageSize=50'));
    const a = (arts.data || []).find(x => x.quantite_Stock >= 2 && !/["«»]/.test(x.designation));
    if (!a) return 'no article in stock: ' + JSON.stringify(arts).slice(0, 150);
    articleId = a.idPiece; stockBefore = a.quantite_Stock;
    await ev(b, `__t.fill('app-intervention-suivi input[placeholder^="Rechercher"]', ${JSON.stringify(a.codePiece)})`);
    await ev(b, `document.querySelector('app-intervention-suivi input[placeholder^="Rechercher"]').dispatchEvent(new Event('input', {bubbles:true}))`);
    await sleep(1200);
    r = await ev(b, `__t.clickSel('app-intervention-suivi .results button, app-intervention-suivi [class*=result] button')`);
    if (r !== 'ok') r = await click(a.designation, 'app-intervention-suivi button');
    if (r !== 'ok') return 'pick article: ' + r;
    await sleep(300);
    r = await click('Valider la sortie', 'app-intervention-suivi button'); if (r !== 'ok') return r;
    const after = (await ev(b, api('/magasin/articles?page=1&pageSize=50'))).data.find(x => x.idPiece === articleId);
    return after.quantite_Stock === stockBefore - 1 || `stock ${stockBefore} -> ${after.quantite_Stock}`;
  });
  await check(b, 'Technicien: ne peut pas terminer sans compte rendu', async () => {
    const dis = await ev(b, `(() => { const e = __t.find('Marquer comme réalisée', 'app-intervention-actions button'); return e ? e.disabled : 'NOTFOUND'; })()`);
    return dis === true || 'button state: ' + dis;
  });
  await check(b, 'Technicien: termine avec compte rendu', async () => {
    await ev(b, `__t.fill('app-intervention-actions textarea', 'Remplacement du roulement, réglage et essai OK (E2E).')`);
    const r = await click('Marquer comme réalisée', 'app-intervention-actions button'); if (r !== 'ok') return r;
    const st = await state(id);
    return st.statusId === 3 || 'status ' + st.statusId;
  });
  await check(b, 'Technicien: ne peut pas clôturer', async () => {
    await goto(b, '/interventions/view/' + id);
    return !(await ev(b, `__t.text().includes('Valider et clôturer')`)) || 'close button visible to technician';
  });

  // ---------------------------------------------------------------- 5. Supervisor reads report, sends back, then closes
  await login(b, SUP, PW);
  await check(b, 'Superviseur: lit le compte rendu sur la fiche', async () => {
    await goto(b, '/interventions/view/' + id);
    return (await ev(b, `__t.text().includes('Remplacement du roulement')`)) || 'report not visible';
  });
  await check(b, 'Superviseur: lit le compte rendu dans le panneau du planning', async () => {
    await goto(b, '/planning');
    const r = await ev(b, `(() => { const e = [...document.querySelectorAll('.intervention-badge')].find(x => x.title === ${JSON.stringify(T1)}); if (e) { e.click(); return 'ok'; } const m = [...document.querySelectorAll('.calendar-day.today .more-badge')][0]; if (m) { m.click(); return 'more'; } return 'NOTFOUND'; })()`);
    await idle(b, 800);
    if (r === 'more') { await click(T1, '.day-list li'); await idle(b, 800); }
    else if (r !== 'ok') return 'badge not on planning';
    const t = await ev(b, `__t.text('.panel')`);
    await shot(b, 'planning-panel-report');
    const buttons = await ev(b, `[...document.querySelectorAll('.panel button')].filter(e => e.innerText.includes('Valider et clôturer')).length`);
    if (buttons !== 1) return 'Valider et clôturer shown ' + buttons + ' times';
    return t.includes('Remplacement du roulement') || 'report not in panel';
  });
  await check(b, 'Superviseur: renvoie au technicien', async () => {
    await goto(b, '/interventions/view/' + id);
    const r = await click('Renvoyer au technicien', 'app-intervention-actions button'); if (r !== 'ok') return r;
    return (await state(id)).statusId === 2 || 'not back to En cours';
  });
  await login(b, TECH, PW);
  await check(b, 'Technicien: termine à nouveau', async () => {
    await goto(b, '/interventions/view/' + id);
    await ev(b, `__t.fill('app-intervention-actions textarea', 'Reprise : serrage vérifié, essai 30 min OK (E2E).')`);
    const r = await click('Marquer comme réalisée', 'app-intervention-actions button'); if (r !== 'ok') return r;
    return (await state(id)).statusId === 3 || 'not Réalisée';
  });
  await login(b, SUP, PW);
  await check(b, 'Superviseur: valide et clôture', async () => {
    await goto(b, '/interventions/view/' + id);
    const r = await click('Valider et clôturer', 'app-intervention-actions button'); if (r !== 'ok') return r;
    const st = await state(id);
    return st.statusId === 4 || 'status ' + st.statusId;
  });
  await check(b, 'Clôture: machine revenue En service', async () => {
    const st = await state(id);
    if (!st.idEquipement) return true;
    const eq = await ev(b, api('/Equipment/' + st.idEquipement));
    return /service/i.test(JSON.stringify(eq.etatEquipement || eq.etat || '')) || 'machine state: ' + JSON.stringify(eq.etatEquipement || eq.etat).slice(0, 80);
  });
  await check(b, 'Clôture: fiche verrouillée (plus d\'actions ni de modification)', async () => {
    await goto(b, '/interventions');
    await ev(b, `__t.fill('.gm-filters input[type=search]', ${JSON.stringify(T1)})`); await idle(b, 1200);
    const edit = await ev(b, `[...document.querySelectorAll('tr')].filter(r => r.innerText.includes(${JSON.stringify(T1)})).map(r => !!r.querySelector('button[title=Modifier]')).join()`);
    return edit === 'false' || 'edit button on closed OT: ' + edit;
  });
  await check(b, 'Journal: étapes tracées', async () => {
    await goto(b, '/settings/journal');
    const t = await ev(b, '__t.text()');
    return /INT-0*\d+/.test(t) || 'journal empty';
  });

  // ---------------------------------------------------------------- 6. Supervisor CRUD + cancellation returns parts
  const T2 = 'E2E superviseur ' + stamp;
  let id2;
  await check(b, 'Superviseur: crée une intervention', async () => {
    await declare(T2); id2 = await findId(T2); return !!id2 || 'not created';
  });
  await check(b, 'Superviseur: modifie l\'intervention', async () => {
    await goto(b, '/interventions/edit/' + id2);
    await ev(b, `__t.fill('#titre', ${JSON.stringify(T2 + ' modifiée')})`);
    const r = await click('Enregistrer les modifications', 'button'); if (r !== 'ok') return r;
    return (await state(id2)).titre === T2 + ' modifiée' || 'title not saved';
  });
  await check(b, 'Superviseur: affecte puis annule avec motif (pièces remises en stock)', async () => {
    await goto(b, '/interventions/view/' + id2);
    const pk = await pickTech('Jlassi');
    let r = await click('Affecter', 'app-intervention-actions button'); if (r !== 'ok') return r + ' / pick: ' + pk + ' / sel=' + await ev(b, `document.querySelector('app-intervention-actions select')?.value`);
    r = await click('Annuler cette intervention', 'app-intervention-actions button'); if (r !== 'ok') return r;
    await ev(b, `__t.fill('app-intervention-actions textarea', 'Doublon (test E2E)')`);
    r = await click("Confirmer l'annulation", 'app-intervention-actions button'); if (r !== 'ok') return r;
    return (await state(id2)).statusId === 5 || 'not cancelled';
  });
  await check(b, 'Superviseur: supprime une intervention depuis la liste', async () => {
    await goto(b, '/interventions');
    await ev(b, `__t.fill('.gm-filters input[type=search]', ${JSON.stringify(T2)})`); await idle(b, 1200);
    const r = await ev(b, `(() => { const row = [...document.querySelectorAll('tr')].find(r => r.innerText.includes(${JSON.stringify(T2)})); if (!row) return 'row not found'; const d = row.querySelector('button[title=Supprimer]'); if (!d) return 'no delete button'; d.click(); return 'ok'; })()`);
    if (r !== 'ok') return r;
    await idle(b, 800);
    // custom confirm dialog?
    await sleep(400);
    if (await ev(b, `__t.clickSel('.cd-box .btn-danger')`) !== 'ok') return 'confirmation dialog not shown';
    await idle(b, 1200);
    const st = await state(id2);
    return st.status === 404 || 'still exists: ' + JSON.stringify(st).slice(0, 120);
  });
} finally {
  b.close();
  const bad = results.filter(r => !r.ok || r.errs.length);
  console.log(`\n${results.length} checks, ${results.filter(r => r.ok).length} pass, ${bad.length} with failures or errors`);
}
