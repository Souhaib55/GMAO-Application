// Version 3 screens, used like a person would: the "?" of the indicators, a card that opens the
// list behind its figure, "À retenir", the monthly report, the QR labels and the breakdown form
// opened from a label, the guided tour and the Aide page. Read-only except one cancelled request.
import { launch, login, goto, ev, check, results, idle, sleep, APP } from './cdp.mjs';
const PW = 'Simotex!2026';

const b = await launch();
try {
  // ------------------------------------------------------------------ supervisor
  console.log('\n=== Superviseur');
  await login(b, 'superviseur@simotex.demo', PW);
  await goto(b, '/dashboard');

  await check(b, 'À retenir : 1 à 5 points, chacun avec quoi faire', async () => {
    const n = await ev(b, `document.querySelectorAll('.retenir-list li').length`);
    const actions = await ev(b, `[...document.querySelectorAll('.retenir-list .que-faire')].every(e => e.innerText.trim().length > 5)`);
    return n >= 1 && n <= 5 && actions ? true : `points: ${n}, actions: ${actions}`;
  });

  await check(b, 'légende des couleurs visible', async () =>
    (await ev(b, `__t.text('.kpi-legend')`)).includes('vert = mieux') || 'légende absente');

  await check(b, 'six cartes, chacune avec un « ? »', async () => {
    const n = await ev(b, `document.querySelectorAll('.kpi-card').length`);
    const q = await ev(b, `document.querySelectorAll('.kpi-card .kpi-info-btn').length`);
    return n === 6 && q === 6 ? true : `${n} cartes, ${q} boutons`;
  });

  await check(b, '« ? » de la disponibilité : définition, calcul avec les chiffres, repères, sens', async () => {
    await ev(b, `document.querySelector('.kpi-card .kpi-info-btn').click()`);
    await sleep(300);
    // innerText follows the CSS (headings are in capitals): compare in lower case
    const t = (await ev(b, `__t.text('.kpi-info-panel')`)).toLowerCase();
    const ok = t.includes('calcul') && t.includes('avec vos chiffres') && /machines × .* h =/.test(t) && t.includes('repères') && t.includes('plus c\'est haut, mieux c\'est');
    return ok || t.slice(0, 300);
  });

  await check(b, '« ? » : Échap le ferme sans quitter la page', async () => {
    await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(200);
    const open = await ev(b, `!!document.querySelector('.kpi-info-panel')`);
    const path = await ev(b, 'location.pathname');
    return !open && path === '/dashboard' ? true : `ouvert: ${open}, page: ${path}`;
  });

  await check(b, 'clic sur « Respect du préventif » : la liste derrière le chiffre', async () => {
    const hint = await ev(b, `[...document.querySelectorAll('.kpi-card')].find(c => c.innerText.includes('Respect du préventif')).querySelector('.kpi-hint').innerText`);
    const prevus = +(/sur (\d+) prévus/.exec(hint) || [])[1];
    await ev(b, `[...document.querySelectorAll('.kpi-card')].find(c => c.innerText.includes('Respect du préventif')).querySelector('.kpi-link').click()`);
    await idle(b, 1000);
    const banner = await ev(b, `__t.text('.drill-banner')`);
    const count = +(/(\d+) intervention/.exec(await ev(b, `__t.text('.gm-filters .count')`)) || [])[1];
    return banner.includes('Préventifs prévus sur la période') && count === prevus ? true : `bannière: ${banner.slice(0, 80)} ; liste ${count} / carte ${prevus}`;
  });

  await check(b, 'retirer le filtre du tableau de bord', async () => {
    await ev(b, `__t.click('Retirer ce filtre')`);
    await idle(b, 800);
    return !(await ev(b, `!!document.querySelector('.drill-banner')`)) || 'bannière toujours là';
  });

  await check(b, 'filtre « Préventif » de la liste', async () => {
    await ev(b, `__t.select('.gm-filters select[aria-label="Type"]', 'Préventif')`);
    await idle(b, 800);
    const url = await ev(b, 'location.search');
    const types = await ev(b, `[...document.querySelectorAll('td[data-label="Type"]')].map(t => t.innerText)`);
    return url.includes('type=preventif') && types.length > 0 && types.every(t => /pr[ée]ventive/i.test(t)) ? true : `${url} ${types.slice(0, 3)}`;
  });

  await check(b, 'Pareto : bascule causes / machines', async () => {
    await goto(b, '/dashboard');
    const causes = await ev(b, `__t.text('.gm-card:has(.gm-seg.small) .gm-card-body')`);
    await ev(b, `__t.click('Machines', '.gm-seg.small button')`);
    await sleep(300);
    const machines = await ev(b, `__t.text('.gm-card:has(.gm-seg.small) .gm-card-body')`);
    return causes !== machines && /cumul \d+ %/.test(machines) ? true : machines.slice(0, 120);
  });

  await check(b, 'rapport mensuel : mois précédent, indicateurs et Pareto', async () => {
    await goto(b, '/rapport-mensuel');
    const t = await ev(b, `__t.text('.sheet')`);
    return t.includes('Rapport de') && t.includes('Indicateurs du mois') && t.includes('Disponibilité du parc') && t.includes('Pannes par cause') || t.slice(0, 200);
  });

  await check(b, 'étiquettes QR : un code par machine, adresse locale signalée', async () => {
    await goto(b, '/equipment/etiquettes');
    const labels = await ev(b, `document.querySelectorAll('.label svg path').length`);
    const warn = await ev(b, `!!document.querySelector('.setup .warn')`);
    const local = /localhost|127\./.test(APP);
    return labels > 0 && warn === local ? true : `${labels} codes, alerte: ${warn}`;
  });

  // ------------------------------------------------------------------ requester, from a QR label
  console.log('\n=== Demandeur (étiquette QR)');
  await login(b, 's.haddad@simotex.demo', PW);
  const machine = await ev(b, `fetch('${APP.replace(/\/$/, '')}/api/Equipment/lookup', {credentials:'include'}).then(r => r.json()).then(l => l[0])`);
  await check(b, 'QR : la déclaration s\'ouvre avec la machine, la chaîne, le type et l\'urgence remplis', async () => {
    await goto(b, `/interventions/new?machine=${machine.idEquipement}`);
    await sleep(800);
    const st = await ev(b, `({
      note: __t.text('.gm-note.ok'),
      machine: document.querySelector('#idEquipement').selectedOptions[0]?.text || '',
      chaine: document.querySelector('#idChaineProduction').selectedOptions[0]?.text || '',
      type: document.querySelector('#idTypeIntervention').selectedOptions[0]?.text || '',
      urgence: document.querySelector('.chip.selected')?.innerText.trim() || ''
    })`);
    return st.note.includes(machine.codeEquipement) && st.machine.includes(machine.codeEquipement) && !st.chaine.startsWith('Choisir') && /correct/i.test(st.type) && st.urgence === 'Normale'
      ? true : JSON.stringify(st);
  });

  await check(b, 'titre proposé à partir du type de panne et de la machine', async () => {
    await ev(b, `__t.select('#idPanne', 1)`);
    await sleep(200);
    const titre = await ev(b, `document.querySelector('#titre').value`);
    return titre.includes(machine.codeEquipement) || titre;
  });

  await check(b, 'bouton photo en français', async () =>
    (await ev(b, `__t.text('label.file-btn')`)).includes('Ajouter une photo') || 'bouton absent');

  await check(b, 'cloche des notifications visible pour le demandeur', async () =>
    (await ev(b, `!!document.querySelector('.notification-toggle')`)) || 'cloche absente');

  await check(b, 'page Aide : comment faire du demandeur, glossaire filtrable', async () => {
    await goto(b, '/aide');
    const t = await ev(b, `__t.text('.gm-page')`);
    await ev(b, `__t.fill('#glossaire input', 'mtbf')`);
    await sleep(200);
    const terms = await ev(b, `[...document.querySelectorAll('.glossaire dt')].map(d => d.innerText)`);
    return t.includes('Chef de chaîne') && !t.includes('Les indicateurs expliqués') && terms.some(x => x.includes('MTBF')) && terms.length < 16
      ? true : `${t.slice(0, 80)} | ${terms}`;
  });

  // ------------------------------------------------------------------ technician: first-login tour
  console.log('\n=== Technicien (visite guidée)');
  await login(b, 'm.bensalah@simotex.demo', PW);
  await ev(b, `localStorage.removeItem('gmao.visite.off')`);
  await check(b, 'visite guidée au premier accès, propre au rôle', async () => {
    await goto(b, '/dashboard');
    await sleep(900);
    const t = (await ev(b, `__t.text('.tour-card')`)).toLowerCase();
    return t.includes('étape 1 sur') && t.includes('tablette') || t.slice(0, 120);
  });
  await check(b, 'visite : Suivant, puis Passer la visite, et elle ne revient pas', async () => {
    await ev(b, `__t.click('Suivant', '.tour-card button')`);
    await sleep(300);
    const step2 = (await ev(b, `__t.text('.tour-count')`)).toLowerCase();
    await ev(b, `__t.click('Passer la visite', '.tour-card button')`);
    await sleep(300);
    await goto(b, '/dashboard');
    await sleep(900);
    const again = await ev(b, `!!document.querySelector('.tour-card')`);
    return step2.includes('étape 2') && !again ? true : `${step2} / revient: ${again}`;
  });
  await check(b, 'rôle affiché « Technicien »', async () =>
    (await ev(b, `__t.text('.user-card-role')`)) === 'Technicien' || await ev(b, `__t.text('.user-card-role')`));
  await check(b, 'technicien : rapport mensuel et étiquettes refusés', async () => {
    await goto(b, '/rapport-mensuel');
    const p1 = await ev(b, 'location.pathname');
    await goto(b, '/equipment/etiquettes');
    const p2 = await ev(b, 'location.pathname');
    return p1 !== '/rapport-mensuel' && p2 !== '/equipment/etiquettes' ? true : `${p1} ${p2}`;
  });
  await ev(b, `localStorage.setItem('gmao.visite.off', '1')`);
} finally {
  b.close();
  const failed = results.filter(r => !r.ok || r.errs.length);
  console.log(`\n${results.length} checks, ${results.filter(r => r.ok).length} pass, ${failed.length} with failures or errors`);
}
