import { Component } from '@angular/core';
import { NgFor, NgSwitch, NgSwitchCase } from '@angular/common';

/**
 * Brand panel of the sign-in pages: light blue background, navy wordmark with the
 * SIMOTEX red accent, a two-line headline and three statements in round icon bubbles.
 */
@Component({
  selector: 'app-auth-visual',
  standalone: true,
  imports: [NgFor, NgSwitch, NgSwitchCase],
  template: `
    <aside class="panel" aria-hidden="true">
      <!-- Quiet line decoration -->
      <svg class="deco" viewBox="0 0 420 400" aria-hidden="true">
        <defs><linearGradient id="decoFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d8f0" stop-opacity="0"/><stop offset="0.35" stop-color="#c9d8f0"/></linearGradient></defs>
        <line x1="22" y1="0" x2="22" y2="400" stroke="url(#decoFade)" />
        <line x1="22" y1="350" x2="400" y2="350" class="fade" />
        <circle class="dot" cx="22" cy="130" r="3.5" />
        <circle class="dot" cx="22" cy="330" r="3.5" />
        <circle class="dot" cx="280" cy="350" r="3.5" />
      </svg>

      <div class="inner">
        <div class="brand">
          <i class="bar"></i>
          <span><b>SIMOTEX</b><small>Gestion de maintenance</small></span>
        </div>

        <div class="pitch">
          <h2>La maintenance,<br>en toute maîtrise.</h2>
          <i class="rule"></i>
          <p>Centralisez vos interventions, vos équipements et vos opérations.</p>

          <ul>
            <li *ngFor="let p of points">
              <span class="bubble" [ngSwitch]="p.icon">
                <svg *ngSwitchCase="'clipboard'" viewBox="0 0 24 24">
                  <rect x="5" y="4" width="14" height="17" rx="2" /><rect x="9" y="2.5" width="6" height="3" rx="1" />
                  <path d="M8.5 10.5l1.2 1.2 2-2M8.5 15.5l1.2 1.2 2-2" class="accent" /><path d="M13.5 11h2.5M13.5 16h2.5" />
                </svg>
                <svg *ngSwitchCase="'calendar'" viewBox="0 0 24 24">
                  <path d="M11 20H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" /><path d="M3 10h16M7.5 3v4M14.5 3v4" />
                  <circle cx="17" cy="17" r="4.2" class="accent" /><path d="M17 15v2.2l1.4 1" class="accent" />
                </svg>
                <svg *ngSwitchCase="'stock'" viewBox="0 0 24 24">
                  <ellipse cx="10" cy="5.5" rx="6.5" ry="2.5" /><path d="M3.5 5.5v11c0 1.4 2.9 2.5 6.5 2.5M16.5 5.5v4.5" />
                  <path d="M3.5 11c0 1.4 2.9 2.5 6.5 2.5" />
                  <circle cx="17" cy="17" r="4.2" class="accent" /><path d="M18.3 15.4c-.3-.4-.8-.6-1.3-.6-.8 0-1.4.4-1.4 1s.6.8 1.4 1 1.4.5 1.4 1.1-.6 1-1.4 1c-.6 0-1.1-.2-1.4-.6M17 14v.8M17 19.2v.8" class="accent" />
                </svg>
              </span>
              <span class="txt"><b>{{ p.text }}</b><small>{{ p.sub }}</small></span>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    :host { display: contents; }

    .panel {
      position: relative;
      overflow: hidden;
      display: flex;
      background:
        radial-gradient(85% 60% at 100% 0%, rgba(120, 170, 240, 0.32) 0%, transparent 65%),
        radial-gradient(70% 55% at 0% 100%, rgba(150, 190, 245, 0.30) 0%, transparent 70%),
        linear-gradient(165deg, #dbe9fb 0%, #e6f0fc 50%, #eef5fd 100%);
      color: #13254b;
      border-right: 1px solid #d3e1f5;
    }

    .deco { position: absolute; left: 0; bottom: 0; width: 420px; height: 400px; pointer-events: none; }
    .deco line, .deco path { fill: none; stroke: #b4c9ea; stroke-width: 1; }
    .deco .fade { stroke: #d6e2f4; }
    .deco line[stroke] { stroke-width: 1; }
    .deco .dot { fill: #6b93e0; stroke: none; }

    .inner {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 560px;
      margin: 0 auto;
      padding: 52px 64px 40px 72px;
    }

    .brand { display: flex; align-items: stretch; gap: 18px; }
    .brand .bar { width: 3px; border-radius: 2px; background: #b3152d; }
    .brand span { display: flex; flex-direction: column; line-height: 1.15; }
    .brand b { font-size: 27px; font-weight: 500; letter-spacing: 0.2em; color: #13254b; }
    .brand small { font-size: 14.5px; color: #4f5d75; margin-top: 3px; letter-spacing: 0.01em; }

    .pitch { margin: auto 0; padding: 36px 0; }
    .pitch h2 { margin: 0; font-size: 40px; line-height: 1.17; font-weight: 700; letter-spacing: -0.02em; color: #13254b; }
    .rule { display: block; width: 36px; height: 3px; border-radius: 2px; background: #b3152d; margin: 26px 0 22px; }
    .pitch p { margin: 0; font-size: 17px; line-height: 1.6; color: #4f5d75; max-width: 380px; }

    ul { list-style: none; margin: 40px 0 0; padding: 0 0 0 12px; display: flex; flex-direction: column; gap: 22px; }
    li { display: flex; align-items: center; gap: 24px; }
    .bubble {
      width: 56px; height: 56px; flex-shrink: 0; border-radius: 50%;
      display: grid; place-items: center;
      background: rgba(255, 255, 255, 0.75);
      box-shadow: 0 2px 8px -2px rgba(30, 70, 140, 0.12);
    }
    .bubble svg { width: 28px; height: 28px; fill: none; stroke: #13254b; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
    .bubble svg .accent { stroke: #b3152d; }
    .txt { display: flex; flex-direction: column; gap: 4px; }
    .txt b { font-size: 15.5px; font-weight: 600; color: #13254b; }
    .txt small { font-size: 13px; color: #5d6a80; }

    @media (max-width: 960px) { .panel { display: none; } }
  `]
})
export class AuthVisualComponent {
  readonly points = [
    { icon: 'clipboard', text: 'Suivi des interventions', sub: 'De la demande à la clôture' },
    { icon: 'calendar', text: 'Maintenance préventive', sub: 'Planifiez et anticipez les pannes' },
    { icon: 'stock', text: 'Stocks et coûts maîtrisés', sub: 'Gardez le contrôle des pièces et budgets' }
  ];
}
