import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

/**
 * Brand panel of the sign-in pages: deep navy with a fine technical grid, a short
 * headline and a quiet preview of what the application shows (plant indicators).
 * Purely decorative figures: no data is loaded before sign-in.
 */
@Component({
  selector: 'app-auth-visual',
  standalone: true,
  imports: [NgFor],
  template: `
    <aside class="panel" aria-hidden="true">
      <div class="grid"></div>
      <div class="inner">
        <div class="brand">
          <span class="mark">
            <svg viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/></svg>
          </span>
          <span class="brand-text"><b>SIMOTEX</b><small>Gestion de maintenance</small></span>
        </div>

        <div class="pitch">
          <h2>Pilotez votre maintenance.</h2>
          <p>Interventions, préventif, magasin et coûts : l'atelier en temps réel, sur un seul écran.</p>
        </div>

        <div class="preview">
          <div class="preview-head">
            <span>Atelier · aujourd'hui</span>
            <span class="live"><i></i>En direct</span>
          </div>
          <div class="kpis">
            <div class="kpi" *ngFor="let k of kpis">
              <span class="k-label">{{ k.label }}</span>
              <span class="k-value">{{ k.value }}<small>{{ k.unit }}</small></span>
              <svg class="k-spark" viewBox="0 0 100 24" preserveAspectRatio="none"><polyline [attr.points]="k.spark"/></svg>
            </div>
          </div>
          <div class="rows">
            <div class="row" *ngFor="let r of rows">
              <i [class]="r.tone"></i><span class="r-title">{{ r.title }}</span><span class="r-meta">{{ r.meta }}</span>
            </div>
          </div>
        </div>

        <footer class="foot">
          <span>Fonctionne sur le réseau de l'usine, sans Internet</span>
        </footer>
      </div>
    </aside>
  `,
  styles: [`
    :host { display: contents; }

    .panel {
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(120% 80% at 0% 0%, rgba(84, 120, 235, 0.35) 0%, transparent 55%),
        radial-gradient(90% 70% at 100% 100%, rgba(37, 66, 170, 0.45) 0%, transparent 60%),
        #101d47;
      color: #fff;
      display: flex;
    }

    /* Fine technical grid, fading towards the bottom */
    .grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
      background-size: 32px 32px;
      mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0.5) 60%, transparent 100%);
      -webkit-mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0.5) 60%, transparent 100%);
    }

    .inner {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 40px;
      width: 100%;
      max-width: 520px;
      margin: 0 auto;
      padding: 48px 48px 36px;
    }

    .brand { display: flex; align-items: center; gap: 12px; }
    .mark {
      width: 36px; height: 36px; border-radius: 9px;
      display: grid; place-items: center;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.16);
    }
    .mark svg { width: 19px; height: 19px; fill: none; stroke: #fff; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .brand-text { display: flex; flex-direction: column; line-height: 1.2; }
    .brand-text b { font-size: 14px; font-weight: 600; letter-spacing: 0.12em; }
    .brand-text small { font-size: 12px; color: rgba(255, 255, 255, 0.6); }

    .pitch { margin-top: auto; }
    .pitch h2 { margin: 0; font-size: 34px; line-height: 1.15; font-weight: 600; letter-spacing: -0.02em; color: #fff; }
    .pitch p { margin: 14px 0 0; font-size: 15px; line-height: 1.55; color: rgba(255, 255, 255, 0.72); max-width: 420px; }

    .preview {
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(6px);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .preview-head { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: rgba(255, 255, 255, 0.6); }
    .live { display: inline-flex; align-items: center; gap: 6px; }
    .live i { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; }

    .kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .kpi {
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.06);
      padding: 10px 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .k-label { font-size: 11px; color: rgba(255, 255, 255, 0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .k-value { font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
    .k-value small { font-size: 11px; font-weight: 500; color: rgba(255, 255, 255, 0.6); margin-left: 2px; }
    .k-spark { width: 100%; height: 18px; margin-top: 2px; }
    .k-spark polyline { fill: none; stroke: #8fa8ff; stroke-width: 1.6; vector-effect: non-scaling-stroke; }

    .rows { display: flex; flex-direction: column; }
    .row { display: grid; grid-template-columns: 10px 1fr auto; gap: 10px; align-items: center; padding: 8px 2px; font-size: 12.5px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
    .row i { width: 7px; height: 7px; border-radius: 50%; }
    .row i.bad { background: #f87171; }
    .row i.warn { background: #fbbf24; }
    .row i.ok { background: #4ade80; }
    .r-title { color: rgba(255, 255, 255, 0.88); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .r-meta { color: rgba(255, 255, 255, 0.5); font-size: 11.5px; white-space: nowrap; }

    .foot { font-size: 12px; color: rgba(255, 255, 255, 0.5); }

    @media (max-height: 760px) { .rows { display: none; } .inner { gap: 28px; } }
    @media (max-width: 960px) { .panel { display: none; } }
  `]
})
export class AuthVisualComponent {
  readonly kpis = [
    { label: 'Disponibilité', value: '96,4', unit: '%', spark: '0,16 15,14 30,15 45,10 60,11 75,7 100,6' },
    { label: "Préventif à l'heure", value: '88', unit: '%', spark: '0,14 15,15 30,11 45,12 60,9 75,10 100,7' },
    { label: 'OT ouverts', value: '12', unit: '', spark: '0,6 15,9 30,8 45,12 60,10 75,14 100,15' }
  ];

  readonly rows = [
    { tone: 'bad', title: "Piqueuse plate — casse d'aiguille", meta: 'Couture A · 08:42' },
    { tone: 'warn', title: 'Générateur de vapeur — purge hebdomadaire', meta: 'Préventif' },
    { tone: 'ok', title: 'Table de coupe — lame remplacée', meta: 'Clôturée' }
  ];
}
