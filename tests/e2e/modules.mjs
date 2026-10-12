// Préventif, Magasin and Achats through the real UI, with the links between them:
// plan -> generated OT (technician sees it), article -> movements -> reappro -> BC,
// technician DA -> approval -> BC -> reception -> stock.
import { launch, login, goto, ev, check, shot, results, idle, sleep } from './cdp.mjs';
const PW = 'Simotex!2026';
const SUP = 'superviseur@simotex.demo', TECH = 'm.bensalah@simotex.demo';
const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
const api = (path, method = 'GET', body) => `fetch('http://localhost:5000/api${path}', {method:'${method}', credentials:'include', headers:{'Content-Type':'application/json'}${body ? `, body: JSON.stringify(${JSON.stringify(body)})` : ''}}).then(async r => { const t = await r.text(); try { return t ? JSON.parse(t) : {status: r.status}; } catch { return {status: r.status, text: t.slice(0,200)}; } })`;
const b = await launch();
const iso = d => d.toISOString().slice(0, 10);

async function click(text, sel) {
  let r;
  for (let i = 0; i < 12; i++) { r = await ev(b, `__t.click(${JSON.stringify(text)}${sel ? ', ' + JSON.stringify(sel) : ''})`); if (!String(r).startsWith('DISABLED') && !String(r).startsWith('NOTFOUND')) break; await sleep(250); }
  await idle(b, 700); return r;
}
const fill = (sel, v) => ev(b, `__t.fill(${JSON.stringify(sel)}, ${JSON.stringify(String(v))})`);
const pick = async (sel, how) => { for (let i = 0; i < 20; i++) { const r = await ev(b, `__t.select(${JSON.stringify(sel)}, ${JSON.stringify(how)})`); if (String(r).startsWith('ok')) { await sleep(300); return r; } await sleep(250); } return 'NOOPTION ' + how; };
const visibleError = () => ev(b, `[...document.querySelectorAll('.gm-error-box')].filter(e => __t.vis(e)).map(e => e.innerText.trim()).join(' | ')`);
async function pickArticle(scopeSel, term) {
  await ev(b, `(() => { const i = [...document.querySelectorAll(${JSON.stringify(scopeSel + ' gm-article-picker input')})].filter(x => __t.vis(x)).pop(); i.focus(); i.dispatchEvent(new Event('focus')); return 'ok'; })()`);
  await ev(b, `(() => { const i = [...document.querySelectorAll(${JSON.stringify(scopeSel + ' gm-article-picker input')})].filter(x => __t.vis(x)).pop(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, ${JSON.stringify(term)}); i.dispatchEvent(new Event('input', {bubbles:true})); return 'ok'; })()`);
  for (let k = 0; k < 20; k++) {
    await sleep(300);
    const r = await ev(b, `(() => { const btn = [...document.querySelectorAll('gm-article-picker .list button')].find(x => x.innerText.includes(${JSON.stringify(term)})); if (!btn) return 'none'; btn.dispatchEvent(new MouseEvent('mousedown', {bubbles:true})); return 'ok'; })()`);
    if (r === 'ok') { await sleep(400); return 'ok'; }
  }
  return 'article not offered by picker';
}

try {
  await login(b, SUP, PW);
  const tomorrow = iso(new Date(Date.now() + 86400000));

  // ================================================================ PRÉVENTIF
  const P = 'E2E plan ' + stamp;
  let planId, otId;
  await check(b, 'Préventif: le superviseur crée un plan', async () => {
    await goto(b, '/preventif');
    let r = await click('Nouveau plan', 'button'); if (r !== 'ok') return r;
    await fill('#pTitre', P);
    let m = await pick('#pMachine', 1); if (!m.startsWith('ok')) return m;
    await fill('input[name=intervalle]', 1);
    await pick('select[name=frequence]', 'emaine');
    await fill('#pDuree', 45);
    await fill('#pNext', tomorrow); await fill('#pDebut', tomorrow);
    await fill('#pDelai', 3);
    await pick('#pTech', 'Ben Salah');
    r = await click('Ajouter une étape', 'button'); if (r !== 'ok') return r;
    await ev(b, `(() => { const i = [...document.querySelectorAll('input[placeholder="Décrire l\\'étape…"]')].pop(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i, 'Contrôler la tension de courroie'); i.dispatchEvent(new Event('input', {bubbles:true})); })()`);
    r = await ev(b, `__t.clickSel('button[form=planForm]')`); await idle(b, 1000);
    const err = await visibleError(); if (err) return 'form error: ' + err;
    const plans = await ev(b, api('/preventif/plans?search=' + encodeURIComponent(P)));
    const p = (plans.data || plans).find?.(x => x.titre === P);
    if (!p) return 'plan not found: ' + JSON.stringify(plans).slice(0, 200);
    planId = p.id; console.log('      plan', planId);
  });
  await check(b, 'Préventif: le plan apparaît dans la liste', async () => {
    await goto(b, '/preventif');
    return (await ev(b, `__t.text().includes(${JSON.stringify(P)})`)) || 'not listed';
  });
  await check(b, 'Préventif: modifier le plan (durée)', async () => {
    const r = await ev(b, `(() => { const row = [...document.querySelectorAll('tr')].find(r => r.innerText.includes(${JSON.stringify(P)})); if (!row) return 'row'; row.querySelector('button[title=Modifier]').click(); return 'ok'; })()`);
    if (r !== 'ok') return r;
    await idle(b, 600);
    await fill('#pDuree', 60);
    await ev(b, `__t.clickSel('button[form=planForm]')`); await idle(b, 1000);
    const err = await visibleError(); if (err) return 'form error: ' + err;
    const d = await ev(b, api('/preventif/plans/' + planId));
    return (d.plan?.dureeEstimeeMinutes ?? d.dureeEstimeeMinutes) === 60 || 'duration not saved: ' + JSON.stringify(d).slice(0, 200);
  });
  await check(b, 'Préventif: l\'OT de la première échéance est créé automatiquement', async () => {
    const list = await ev(b, api('/demandeintervention?page=1&pageSize=10&search=' + encodeURIComponent(P)));
    const ot = list.data?.[0];
    if (!ot) return 'no OT generated on save';
    otId = ot.idDemandeIntervention;
    console.log('      OT', otId, 'tech', ot.destinataire?.nom, 'planned', ot.datePlanifiee);
    if (list.data.length !== 1) return list.data.length + ' OTs';
    return !!ot.destinataire || 'generated OT not assigned to plan technician';
  });
  await check(b, 'Préventif: « Générer maintenant » refusé tant que l\'OT est ouvert', async () => {
    await goto(b, '/preventif');
    const r = await ev(b, `(() => { const row = [...document.querySelectorAll('tr')].find(r => r.innerText.includes(${JSON.stringify(P)})); if (!row) return 'row'; const bt = row.querySelector('button[title^="Générer"]'); if (bt.disabled) return 'disabled'; bt.click(); return 'ok'; })()`);
    if (r !== 'ok') return r;
    await sleep(900);
    const toast = await ev(b, `__t.text().includes('encore ouvert')`);
    const list = await ev(b, api('/demandeintervention?page=1&pageSize=10&search=' + encodeURIComponent(P)));
    if (list.data.length !== 1) return list.data.length + ' OTs after manual generation';
    return toast || 'no explanation shown';
  });
  await check(b, 'Préventif: le technicien voit l\'OT préventif', async () => {
    await login(b, TECH, PW);
    await goto(b, '/interventions');
    const ok = await ev(b, `__t.text().includes(${JSON.stringify(P)})`);
    await login(b, SUP, PW);
    return ok || 'technician does not see the generated OT';
  });
  await check(b, 'Préventif: calendrier affiche l\'échéance', async () => {
    await goto(b, '/preventif');
    let r = await click('Calendrier', 'button, .tab, [role=tab]'); if (r !== 'ok') return r;
    await idle(b, 800);
    return (await ev(b, `[...document.querySelectorAll('.month .ev, .agenda-ev')].some(e => (e.title || e.innerText).includes(${JSON.stringify(P)}))`)) || 'not on calendar';
  });
  await check(b, 'Préventif: suspendre puis réactiver', async () => {
    await goto(b, '/preventif');
    const tog = () => ev(b, `(() => { const row = [...document.querySelectorAll('tr')].find(r => r.innerText.includes(${JSON.stringify(P)})); if (!row) return 'row'; row.querySelector('button[title=Suspendre], button[title="Réactiver"]').click(); return 'ok'; })()`);
    let r = await tog(); if (r !== 'ok') return r; await idle(b, 800);
    let d = await ev(b, api('/preventif/plans/' + planId));
    if ((d.plan?.isActif ?? d.isActif) !== false) return 'not suspended';
    await click('Tous', 'button'); await idle(b, 600);
    r = await tog(); if (r !== 'ok') return 'reactivate: ' + r; await idle(b, 800);
    d = await ev(b, api('/preventif/plans/' + planId));
    return (d.plan?.isActif ?? d.isActif) === true || 'not reactivated';
  });

  // ================================================================ MAGASIN
  const CODE = 'E2E-' + stamp, DES = 'Roulement E2E ' + stamp;
  let artId;
  const art = async () => (await ev(b, api('/magasin/articles?search=' + CODE))).data?.[0];
  await check(b, 'Magasin: le superviseur crée un article', async () => {
    await goto(b, '/magasin');
    let r = await click('Nouvel article', 'button'); if (r !== 'ok') return r;
    await fill('input[name=code]', CODE); await fill('input[name=des]', DES);
    await fill('input[name=unite]', 'pièce'); await fill('input[name=seuil]', 5); await fill('input[name=init]', 10); await fill('input[name=prix]', '12.5');
    await pick('select[name=frn]', 1);
    await ev(b, `__t.clickSel('button[form=artForm]')`); await idle(b, 1000);
    const err = await visibleError(); if (err) return 'form error: ' + err;
    const a = await art(); if (!a) return 'article not created';
    artId = a.idPiece;
    return a.quantite_Stock === 10 || 'stock ' + a.quantite_Stock;
  });
  const openArticle = async () => {
    await goto(b, '/magasin');
    await fill('input[placeholder^="Code, désignation"]', CODE); await sleep(500); await idle(b, 800);
    const r = await ev(b, `(() => { const row = [...document.querySelectorAll('tr')].find(r => r.innerText.includes(${JSON.stringify(CODE)})); if (!row) return 'row not found'; row.click(); return 'ok'; })()`);
    await idle(b, 800); return r;
  };
  const movement = async (type, q, motif, prix) => {
    let r = await click(type === 'Ajustement' ? 'Inventaire' : type, '.gm-drawer button'); if (r !== 'ok') return r;
    await fill('#mvQ', q); if (motif !== undefined) await fill('#mvM', motif); if (prix !== undefined) await fill('#mvP', prix);
    await ev(b, `__t.clickSel('button[form=mvForm]')`); await idle(b, 900);
    return 'ok';
  };
  await check(b, 'Magasin: entrée de stock (+5)', async () => {
    let r = await openArticle(); if (r !== 'ok') return r;
    r = await movement('Entrée', 5, 'Livraison E2E', '12.5'); if (r !== 'ok') return r;
    const err = await visibleError(); if (err) return err;
    return (await art()).quantite_Stock === 15 || 'stock ' + (await art()).quantite_Stock;
  });
  await check(b, 'Magasin: sortie sans OT refusée sans motif', async () => {
    let r = await movement('Sortie', 1, ''); if (r !== 'ok') return r;
    const err = await visibleError();
    await ev(b, `__t.click('Annuler', '.gm-dialog button')`); await idle(b, 300);
    return (!!err && (await art()).quantite_Stock === 15) || 'accepted without motif (stock ' + (await art()).quantite_Stock + ')';
  });
  await check(b, 'Magasin: sortie avec motif (-1)', async () => {
    let r = await movement('Sortie', 1, 'Casse atelier E2E'); if (r !== 'ok') return r;
    const err = await visibleError(); if (err) return err;
    return (await art()).quantite_Stock === 14 || 'stock ' + (await art()).quantite_Stock;
  });
  await check(b, 'Magasin: sortie supérieure au stock refusée', async () => {
    let r = await movement('Sortie', 999, 'Test E2E'); if (r !== 'ok') return r;
    const err = await visibleError();
    await ev(b, `__t.click('Annuler', '.gm-dialog button')`); await idle(b, 300);
    return (!!err && (await art()).quantite_Stock === 14) || 'over-issue accepted (stock ' + (await art()).quantite_Stock + ')';
  });
  await check(b, 'Magasin: inventaire (compté 3, sous le seuil)', async () => {
    let r = await movement('Ajustement', 3, 'Inventaire E2E'); if (r !== 'ok') return r;
    const err = await visibleError(); if (err) return err;
    const a = await art();
    return (a.quantite_Stock === 3 && /alerte|surveiller|bas|rupture|seuil/i.test(a.niveau)) || `stock ${a.quantite_Stock} niveau ${a.niveau}`;
  });
  await check(b, 'Magasin: mouvements tracés', async () => {
    const mv = await ev(b, api('/magasin/mouvements?search=' + CODE));
    const n = (mv.data || []).length;
    return n >= 4 || n + ' movements';
  });
  await check(b, 'Magasin: l\'article apparaît au réapprovisionnement', async () => {
    await goto(b, '/magasin');
    let r = await click('Réapprovisionnement', 'button, .tab'); if (r !== 'ok') return r;
    await idle(b, 800);
    return (await ev(b, `__t.text().includes(${JSON.stringify(DES)})`)) || 'not in reappro list';
  });

  // ================================================================ ACHATS: DA (technicien) -> approbation -> BC -> réception
  await login(b, TECH, PW);
  let daNum;
  await check(b, 'Achats: le technicien crée une demande d\'achat', async () => {
    await goto(b, '/achats');
    let r = await click("Demande d'achat", 'button'); if (r !== 'ok') return r;
    await fill('.gm-drawer textarea', 'Roulement pour la machine E2E ' + stamp);
    r = await pickArticle('.gm-drawer', CODE); if (r !== 'ok') return r;
    await ev(b, `(() => { const i = document.querySelector('.gm-drawer .line input[type=number]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i, '4'); i.dispatchEvent(new Event('input', {bubbles:true})); })()`);
    r = await click('Soumettre', '.gm-drawer button'); if (r !== 'ok') return r;
    const err = await visibleError(); if (err) return err;
    const das = await ev(b, api('/achats/demandes'));
    const d = (das.data || das).find(x => (x.motif || '').includes(stamp));
    if (!d) return 'DA not found';
    daNum = d.numero; console.log('      DA', daNum, d.statut);
    return d.statut === 'Soumise' || d.statut;
  });
  await check(b, 'Achats: le technicien ne voit pas les bons de commande', async () => {
    return !(await ev(b, `__t.text().includes('Bon de commande')`)) || 'BC button visible to technician';
  });
  await login(b, SUP, PW);
  await check(b, 'Achats: le superviseur approuve la DA', async () => {
    await goto(b, '/achats');
    let r = await click('Demandes', '.tab, button'); await idle(b, 600);
    r = await ev(b, `(() => { const c = [...document.querySelectorAll('.da')].find(e => e.innerText.includes(${JSON.stringify(daNum)})); if (!c) return 'card'; [...c.querySelectorAll('button')].find(x => x.innerText.includes('Approuver')).click(); return 'ok'; })()`);
    if (r !== 'ok') return r;
    await idle(b, 500);
    r = await click('Approuver', '.gm-dialog button'); if (r !== 'ok') return r;
    const d = (r => (r.data || r))(await ev(b, api('/achats/demandes'))).find(x => x.numero === daNum);
    return d.statut === 'Approuvée' || d.statut;
  });
  let bcId;
  await check(b, 'Achats: commander depuis la DA (BC envoyé)', async () => {
    await click('Toutes', 'button'); await idle(b, 600);
    let r = await ev(b, `(() => { const c = [...document.querySelectorAll('.da')].find(e => e.innerText.includes(${JSON.stringify(daNum)})); if (!c) return 'card'; [...c.querySelectorAll('button')].find(x => x.innerText.includes('Commander')).click(); return 'ok'; })()`);
    if (r !== 'ok') return r;
    await idle(b, 600);
    const f = await pick('.gm-drawer select', 1); if (!f.startsWith('ok')) return f;
    r = await click('Enregistrer et envoyer', '.gm-drawer button'); if (r !== 'ok') return r;
    const err = await visibleError(); if (err) return err;
    const d = (r => (r.data || r))(await ev(b, api('/achats/demandes'))).find(x => x.numero === daNum);
    if (!d.bonCommande) return 'DA not linked to a BC (statut ' + d.statut + ')';
    const c = (r => (r.data || r))(await ev(b, api('/achats/commandes'))).find(x => x.demandeAchat === daNum);
    if (!c) return 'BC not listed';
    bcId = c.id;
    console.log('      BC', c.numero, c.statut);
    return /envoy/i.test(c.statut) || c.statut;
  });
  await check(b, 'Achats: réception totale → stock +4', async () => {
    const before = (await art()).quantite_Stock;
    await goto(b, '/achats');
    await ev(b, `(() => { const row = [...document.querySelectorAll('tr')].find(r => r.innerText.includes(${JSON.stringify((daNum || '').replace('DA', 'BC'))}) || r.innerText.includes('${stamp}')); })()`);
    const c = (r => (r.data || r))(await ev(b, api('/achats/commandes'))).find(x => x.id === bcId);
    let r = await ev(b, `(() => { const row = [...document.querySelectorAll('tr')].find(r => r.innerText.includes(${JSON.stringify(c.numero)})); if (!row) return 'BC row not found'; row.click(); return 'ok'; })()`);
    if (r !== 'ok') return r;
    await idle(b, 800);
    r = await click('Réception', '.gm-drawer button'); if (r !== 'ok') return 'open reception: ' + r;
    r = await click('Valider la réception', '.gm-dialog button'); if (r !== 'ok') return r;
    const err = await visibleError(); if (err) return err;
    const after = (await art()).quantite_Stock;
    const c2 = (r => (r.data || r))(await ev(b, api('/achats/commandes'))).find(x => x.id === bcId);
    console.log('      stock', before, '->', after, 'BC', c2.statut);
    return (after === before + 4 && /reçu|réceptionn|clôtur|livr/i.test(c2.statut)) || `stock ${before}->${after}, BC ${c2.statut}`;
  });
  await check(b, 'Budgets: page affiche les achats/dépenses de l\'année', async () => {
    await goto(b, '/budgets');
    const t = await ev(b, '__t.text()');
    return /DT/.test(t) || 'no amounts';
  });
  await check(b, 'Pilotage: tableau de bord superviseur charge les KPI', async () => {
    await goto(b, '/dashboard');
    const t = await ev(b, '__t.text()');
    return /Disponibilit/i.test(t) || 'no availability KPI';
  });
} finally {
  b.close();
  const bad = results.filter(r => !r.ok || r.errs.length);
  console.log(`\n${results.length} checks, ${results.filter(r => r.ok).length} pass, ${bad.length} with failures or errors`);
}
