import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserInfo } from '../models';

export interface TourStep {
  /** Element to point at; the step is shown in the middle of the screen when it is missing. */
  selector?: string;
  titre: string;
  texte: string;
}

const STEPS: Record<string, TourStep[]> = {
  Superviseur: [
    { titre: 'Bienvenue dans la GMAO SIMOTEX', texte: 'Une minute pour voir où se trouve l\'essentiel. Vous pourrez revoir cette visite à tout moment depuis le menu Aide.' },
    { selector: '.retenir', titre: 'Commencez ici chaque matin', texte: '« À retenir » résume les points importants de la période, du plus urgent au moins urgent, avec ce qu\'il faut faire. Le bouton « Voir » ouvre l\'écran utile.' },
    { selector: '.kpi-card app-kpi-info', titre: 'Chaque chiffre s\'explique', texte: 'Le bouton « ? » dit ce que mesure l\'indicateur, comment il est calculé avec vos chiffres, et quelle valeur est bonne. Cliquez la carte pour voir les interventions qui font ce chiffre.' },
    { selector: '.kpi-legend', titre: 'Les couleurs ont toujours le même sens', texte: 'Vert : mieux que la période précédente. Rouge : moins bien. Gris : stable. Changez la période (7 jours, 30 jours…) et la chaîne en haut de l\'écran.' },
    { selector: '.sidebar a[href="/interventions"]', titre: 'Interventions', texte: 'Affectez les demandes à un technicien et validez les travaux terminés. La liste se filtre par statut, type, chaîne et période, et s\'exporte vers Excel.' },
    { selector: '.sidebar a[href="/preventif"]', titre: 'Préventif', texte: 'Les plans d\'entretien créent les interventions tout seuls, avant chaque échéance.' },
    { selector: 'a[href="/rapport-mensuel"]', titre: 'Rapport mensuel', texte: 'Le bilan d\'un mois, prêt à imprimer ou à enregistrer en PDF pour la réunion de direction.' },
    { selector: '.sidebar a[href="/aide"]', titre: 'Besoin d\'aide ?', texte: 'Le glossaire, l\'explication de chaque indicateur et cette visite sont dans Aide.' }
  ],
  Utilisateur: [
    { titre: 'Bienvenue dans la GMAO SIMOTEX', texte: 'Une minute pour voir comment travailler avec la tablette. Vous pourrez revoir cette visite depuis le menu Aide.' },
    { selector: '.work-list', titre: 'Vos interventions', texte: 'Les machines arrêtées et les urgences sont en haut. Touchez une ligne pour ouvrir l\'intervention.' },
    { titre: 'Sur une intervention, dans l\'ordre', texte: '1. « Accepter et démarrer ». 2. Saisir le temps passé. 3. Sortir les pièces du magasin. 4. Ajouter une photo si utile. 5. Écrire le compte rendu, puis « Marquer comme réalisée ». Le grand bouton bleu montre toujours l\'étape suivante.' },
    { selector: '.sidebar a[href="/planning"]', titre: 'Planning', texte: 'Votre semaine : les préventifs prévus et les interventions à faire.' },
    { selector: '.sidebar a[href="/magasin"]', titre: 'Magasin', texte: 'Pour savoir si une pièce est en stock et où elle est rangée.' },
    { selector: '.sidebar a[href="/aide"]', titre: 'Besoin d\'aide ?', texte: 'Les mots de la maintenance et cette visite sont dans Aide.' }
  ],
  Demandeur: [
    { titre: 'Bienvenue dans la GMAO SIMOTEX', texte: 'Vous pouvez déclarer une panne et suivre son avancement. Vous pourrez revoir cette visite depuis le menu Aide.' },
    { selector: 'app-page-header .btn-primary', titre: 'Une machine en panne ?', texte: 'Touchez « Déclarer une panne ». Encore plus rapide : scannez l\'étiquette QR collée sur la machine avec l\'appareil photo du téléphone, la machine est déjà remplie.' },
    { selector: '.work-list', titre: 'Suivez vos demandes', texte: 'Vous voyez si un technicien est dessus et quand le travail est fini.' },
    { selector: '.notification-bell, .notifications-btn, [aria-label="Notifications"]', titre: 'Les notifications', texte: 'Vous êtes prévenu quand un technicien commence et quand la machine est réparée.' },
    { selector: '.sidebar a[href="/aide"]', titre: 'Besoin d\'aide ?', texte: 'Cette visite et les explications sont dans Aide.' }
  ]
};

/**
 * Guided tour per role, shown on the first visit of each account on this device and
 * replayable from the Aide page. Remembered in the browser only (a convenience: if the
 * browser forgets, the tour simply shows again).
 */
@Injectable({ providedIn: 'root' })
export class TourService {
  private readonly cle = 'gmao.visite.v3.';
  readonly steps$ = new BehaviorSubject<TourStep[] | null>(null);

  stepsFor(role: string): TourStep[] { return STEPS[role] ?? []; }

  start(role: string): void {
    const steps = this.stepsFor(role);
    if (steps.length) this.steps$.next(steps);
  }

  /**
   * Who the tour was shown to. The login answer names the account "userId" and the
   * /user-info answer (after a page reload) "id": both must give the same key, or a
   * tour that was skipped would come back.
   */
  static compte(user: UserInfo | null | undefined): string | null {
    return user ? String(user.userId ?? user.id ?? user.email ?? '') || null : null;
  }

  startIfFirstTime(role: string, user: UserInfo | null | undefined): void {
    const compte = TourService.compte(user);
    if (!compte || this.steps$.value) return;
    let vu = false;
    // "gmao.visite.off" switches the automatic tour off on a device (automated tests, shared kiosk)
    try { vu = localStorage.getItem(this.cle + compte) === '1' || localStorage.getItem('gmao.visite.off') === '1'; } catch { vu = false; }
    if (!vu) this.start(role);
  }

  finish(user: UserInfo | null | undefined): void {
    this.steps$.next(null);
    const compte = TourService.compte(user);
    if (!compte) return;
    try { localStorage.setItem(this.cle + compte, '1'); } catch { /* private browsing: the tour shows again next time */ }
  }
}
