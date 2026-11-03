import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { GLOSSAIRE, KPI, KpiDefinition } from '../../shared/kpi/kpi-definitions';
import { AuthService } from '../../core/services/auth.service';
import { TourService } from '../../core/services/tour.service';

interface Guide { role: string; titre: string; etapes: { titre: string; texte: string; lien?: string }[]; }

const GUIDES: Guide[] = [
  {
    role: 'Demandeur', titre: 'Chef de chaîne : déclarer une panne et la suivre',
    etapes: [
      { titre: 'Déclarer', texte: 'Le plus rapide : scannez l\'étiquette QR de la machine avec l\'appareil photo du téléphone. Sinon, « Déclarer une panne » en haut du tableau de bord. Choisissez le type de panne, ajoutez une phrase et, si possible, une photo.', lien: '/interventions/new' },
      { titre: 'Machine à l\'arrêt ?', texte: 'Choisissez l\'urgence « Haute » quand la production est bloquée : la demande passe en tête de liste chez le superviseur.' },
      { titre: 'Suivre', texte: 'Le tableau de bord montre vos demandes en cours. Une notification vous prévient quand un technicien commence, puis quand le travail est validé.', lien: '/dashboard' },
      { titre: 'Annuler', texte: 'Tant que personne n\'a commencé, vous pouvez annuler votre demande depuis sa fiche, avec un motif.' }
    ]
  },
  {
    role: 'Utilisateur', titre: 'Technicien : faire une intervention de bout en bout',
    etapes: [
      { titre: 'Accepter et commencer', texte: 'Ouvrez l\'intervention depuis le tableau de bord ou le planning. Le grand bouton bleu indique toujours l\'étape suivante : « Commencer le travail ».', lien: '/dashboard' },
      { titre: 'Saisir le temps', texte: '« Saisir » dans « Temps passé ». Les boutons 15 min, 30 min, 1 h, 2 h évitent de taper. Le temps sert au coût de la maintenance.' },
      { titre: 'Sortir les pièces', texte: '« Sortir du magasin » : choisissez l\'article et la quantité. Le stock baisse tout seul et la pièce est comptée dans le coût.' },
      { titre: 'Cocher les contrôles', texte: 'Pour un préventif, cochez chaque contrôle de la liste au fur et à mesure.' },
      { titre: 'Photo', texte: '« Ajouter » dans « Documents et photos » ouvre l\'appareil photo de la tablette.' },
      { titre: 'Terminer', texte: 'Notez la cause et le remède, écrivez le compte rendu (10 caractères au moins), puis « Marquer comme réalisée ». Le superviseur valide ensuite.' }
    ]
  },
  {
    role: 'Superviseur', titre: 'Superviseur : piloter la maintenance',
    etapes: [
      { titre: 'Chaque matin', texte: 'Tableau de bord : lisez « À retenir », puis « À traiter maintenant ». Le bouton « Voir » ouvre directement l\'écran utile.', lien: '/dashboard' },
      { titre: 'Affecter', texte: 'Sur une intervention « À traiter », « Affecter un technicien ». Le technicien est prévenu.', lien: '/interventions' },
      { titre: 'Valider', texte: 'Quand le technicien a terminé, relisez le compte rendu, puis « Valider et clôturer » ou « Renvoyer au technicien ».' },
      { titre: 'Comprendre un chiffre', texte: 'Le « ? » de chaque indicateur explique le calcul avec vos chiffres. Cliquez la carte pour voir les interventions qui le composent.' },
      { titre: 'Chaque mois', texte: 'Rapport mensuel : le bilan du mois à imprimer ou enregistrer en PDF pour la réunion.', lien: '/rapport-mensuel' },
      { titre: 'Étiquettes QR', texte: 'Équipements → « Étiquettes QR » : imprimez et collez une étiquette par machine pour que les chefs de chaîne déclarent les pannes en deux gestes.', lien: '/equipment/etiquettes' }
    ]
  }
];

const FAQ = [
  { q: 'L\'appareil photo ne s\'ouvre pas dans la page', r: 'C\'est normal : sur le réseau de l\'usine (adresse en http), le navigateur interdit l\'accès direct à la caméra. Utilisez le bouton « Ajouter une photo » : la tablette propose alors de prendre une photo.' },
  { q: 'J\'ai oublié mon mot de passe', r: 'Sur l\'écran de connexion, « Mot de passe oublié ». Si vous ne recevez pas l\'e-mail, demandez à votre superviseur : il peut réinitialiser le compte dans Paramètres → Utilisateurs.' },
  { q: 'Mon compte est bloqué', r: 'Après 5 mots de passe faux, le compte est bloqué 15 minutes. Attendez, puis réessayez.' },
  { q: 'Pourquoi deux chiffres différents pour le respect du préventif ?', r: 'Ils ne portent pas sur la même période. Le tableau de bord suit la période choisie en haut (7, 30, 90 jours ou 12 mois), la page Préventif les 90 derniers jours. La période est écrite à côté de chaque chiffre.' },
  { q: 'Que veulent dire les couleurs ?', r: 'Partout dans les indicateurs : vert = mieux que la période précédente, rouge = moins bien, gris = stable (la différence est trop petite pour compter).' },
  { q: 'L\'application fonctionne-t-elle sans réseau ?', r: 'Non : la tablette doit être connectée au Wi-Fi de l\'usine. Internet n\'est pas nécessaire, sauf pour la page Rapports (Power BI).' }
];

/** Help: how to do things for each role, the indicators explained, the maintenance words, FAQ. */
@Component({
  selector: 'app-aide',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, AppIconComponent],
  template: `
    <div class="gm-page">
      <app-page-header icon="help" title="Aide" subtitle="Comment faire, ce que veulent dire les chiffres et les mots de la maintenance.">
        <button type="button" class="btn btn-primary" (click)="revoirVisite()"><app-icon name="play"></app-icon> Revoir la visite guidée</button>
      </app-page-header>

      <nav class="toc" aria-label="Sommaire de l'aide">
        <a href="#comment-faire" (click)="aller($event, 'comment-faire')">Comment faire</a>
        <a href="#indicateurs" *ngIf="isSuperviseur" (click)="aller($event, 'indicateurs')">Les indicateurs expliqués</a>
        <a href="#glossaire" (click)="aller($event, 'glossaire')">Glossaire</a>
        <a href="#questions" (click)="aller($event, 'questions')">Questions fréquentes</a>
      </nav>

      <section id="comment-faire" class="block">
        <h2>Comment faire</h2>
        <div class="gm-card guide" *ngFor="let g of guides">
          <div class="gm-card-head"><div><h3>{{ g.titre }}</h3></div></div>
          <ol class="gm-card-body steps">
            <li *ngFor="let e of g.etapes; let i = index">
              <span class="n" aria-hidden="true">{{ i + 1 }}</span>
              <span><b>{{ e.titre }}.</b> {{ e.texte }} <a *ngIf="e.lien" [routerLink]="e.lien">Ouvrir</a></span>
            </li>
          </ol>
        </div>
      </section>

      <section id="indicateurs" class="block" *ngIf="isSuperviseur">
        <h2>Les indicateurs expliqués</h2>
        <p class="lead">Les mêmes explications que le bouton « ? » du tableau de bord. Les calculs sont identiques sur le tableau de bord, la fiche machine et le rapport mensuel.</p>
        <div class="kpi-grid">
          <article class="gm-card kpi-def" *ngFor="let k of kpis">
            <div class="gm-card-body">
              <h3>{{ k.titre }} <span class="sens" [class.up]="k.sens === 'haut'">{{ k.sens === 'haut' ? 'plus haut = mieux' : 'plus bas = mieux' }}</span></h3>
              <p>{{ k.definition }}</p>
              <p class="formule">{{ k.formule }}</p>
              <p class="muted"><b>Repères.</b> {{ k.reperes }}</p>
              <p class="muted" *ngIf="k.note"><b>À savoir.</b> {{ k.note }}</p>
            </div>
          </article>
        </div>
      </section>

      <section id="glossaire" class="block">
        <h2>Glossaire</h2>
        <span class="gm-search"><app-icon name="search"></app-icon>
          <input type="search" [(ngModel)]="filtre" placeholder="Chercher un mot (MTBF, préventif…)" aria-label="Chercher dans le glossaire">
        </span>
        <dl class="gm-card glossaire">
          <ng-container *ngFor="let t of glossaireFiltre">
            <dt>{{ t.terme }}</dt><dd>{{ t.definition }}</dd>
          </ng-container>
          <p class="muted empty" *ngIf="!glossaireFiltre.length">Aucun mot ne correspond à « {{ filtre }} ».</p>
        </dl>
      </section>

      <section id="questions" class="block">
        <h2>Questions fréquentes</h2>
        <details class="gm-card faq" *ngFor="let f of faq"><summary>{{ f.q }}</summary><p>{{ f.r }}</p></details>
      </section>
    </div>
  `,
  styles: [`
    .toc { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .toc a { padding: 6px 12px; border-radius: 999px; background: var(--gray-100); color: var(--text-secondary); text-decoration: none; font-size: 0.8125rem; font-weight: 500; }
    .toc a:hover { background: var(--primary-50); color: var(--primary-700); }
    .block { margin-top: 20px; scroll-margin-top: 80px; }
    h2 { font-size: 1.0625rem; font-weight: 600; margin: 0 0 10px; }
    .lead { margin: -4px 0 12px; color: var(--text-secondary); font-size: 0.875rem; }
    .guide { margin-bottom: 12px; }
    .steps { list-style: none; margin: 0; display: grid; gap: 10px; }
    .steps li { display: grid; grid-template-columns: 28px 1fr; gap: 10px; align-items: start; font-size: 0.875rem; line-height: 1.5; }
    .steps .n { width: 26px; height: 26px; border-radius: 50%; background: var(--primary-50); color: var(--primary-700); display: grid; place-items: center; font-weight: 600; font-size: 0.8125rem; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
    .kpi-def h3 { font-size: 0.9375rem; font-weight: 600; margin: 4px 0 6px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .kpi-def p { font-size: 0.8125rem; line-height: 1.5; margin: 0 0 8px; }
    .formule { background: var(--primary-50); color: var(--primary-900); border-radius: 6px; padding: 6px 8px; }
    .sens { font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: var(--gray-100); color: var(--gray-700); }
    .muted { color: var(--text-secondary); }
    .gm-search { margin-bottom: 10px; max-width: 420px; }
    .glossaire { padding: 8px 16px; margin: 0; }
    .glossaire dt { font-weight: 600; font-size: 0.875rem; margin-top: 10px; }
    .glossaire dd { margin: 2px 0 10px; font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; border-bottom: 1px solid var(--gray-100); padding-bottom: 10px; }
    .glossaire .empty { padding: 12px 0; }
    .faq { margin-bottom: 8px; padding: 0 16px; }
    .faq summary { cursor: pointer; padding: 12px 0; font-weight: 600; font-size: 0.875rem; min-height: 44px; display: flex; align-items: center; }
    .faq p { margin: 0 0 12px; font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; }
  `]
})
export class AideComponent implements OnInit {
  guides: Guide[] = [];
  readonly kpis: KpiDefinition[] = ['disponibilite', 'heuresArret', 'mttr', 'mtbf', 'respectPreventif', 'backlog', 'cout'].map(k => KPI[k]);
  readonly faq = FAQ;
  filtre = '';
  role = '';

  constructor(private auth: AuthService, private tour: TourService, private router: Router) {}

  get isSuperviseur(): boolean { return this.role === 'Superviseur'; }

  ngOnInit(): void {
    this.role = this.auth.getCurrentUser()?.role ?? '';
    // Own role first; the supervisor also sees how the others work
    const mine = GUIDES.filter(g => g.role === this.role);
    this.guides = this.isSuperviseur ? [...mine, ...GUIDES.filter(g => g.role !== this.role)] : mine;
  }

  get glossaireFiltre() {
    const f = this.filtre.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (!f) return GLOSSAIRE;
    const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return GLOSSAIRE.filter(t => n(t.terme).includes(f) || n(t.definition).includes(f));
  }

  aller(event: Event, id: string): void {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  revoirVisite(): void {
    this.router.navigate(['/dashboard']).then(() => setTimeout(() => this.tour.start(this.role), 600));
  }
}
