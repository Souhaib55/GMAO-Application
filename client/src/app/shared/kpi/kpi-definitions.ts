import { fmtHours, fmtMoney, fmtNumber, fmtPercent } from '../utils/gm-format';

/**
 * What each maintenance indicator means, in plain French, for the people who read it.
 * Single source for the "?" of the dashboard, the monthly report and the Aide page:
 * if a formula changes on the server (API/Services/Kpi/KpiCalculator.cs), change it here too.
 */
export interface KpiDefinition {
  id: string;
  titre: string;
  /** What the figure means, in one sentence. */
  definition: string;
  /** The formula in words. */
  formule: string;
  /** Good or bad values for a garment workshop. */
  reperes: string;
  /** Which way is better. */
  sens: 'haut' | 'bas';
  /** Anything that avoids a wrong reading. */
  note?: string;
  /** Worked example with the current figures. */
  exemple?: (c: KpiContexte) => string;
}

/** Figures of the period, as returned by /api/pilotage. */
export interface KpiContexte {
  libelle: string;
  machines: number;
  heuresPeriode: number;
  disponibilite: number;
  heuresArret: number;
  pannes: number;
  mttr: number | null;
  mtbf: number | null;
  reparations: number;
  heuresReparation: number;
  respectPreventif: number | null;
  preventifsDus: number;
  preventifsATemps: number;
  backlog: number;
  enRetard: number;
  realisees: number;
  coutMainOeuvre: number;
  coutPieces: number;
  coutExterne: number;
  coutTotal: number;
  budgetPeriode: number;
}

const n = (v: number) => fmtNumber(v, v % 1 !== 0 && Math.abs(v) < 100 ? 1 : 0);

export const KPI: Record<string, KpiDefinition> = {
  disponibilite: {
    id: 'disponibilite',
    titre: 'Disponibilité du parc',
    definition: 'Part du temps pendant laquelle les machines pouvaient produire, sans arrêt pour panne.',
    formule: 'Disponibilité = 1 − heures d\'arrêt ÷ (nombre de machines × heures de la période)',
    exemple: c => `${c.machines} machines × ${n(c.heuresPeriode)} h = ${n(c.machines * c.heuresPeriode)} heures-machine. `
      + `1 − ${n(c.heuresArret)} ÷ ${n(c.machines * c.heuresPeriode)} = ${fmtPercent(c.disponibilite)}.`,
    reperes: 'Dans un atelier de confection : 98 % ou plus, c\'est bien. Entre 95 et 98 %, à surveiller. En dessous de 95 %, des machines bloquent la production. '
      + 'Attention : une seule machine critique arrêtée (table de coupe, générateur vapeur) peut bloquer une chaîne entière alors que ce chiffre reste haut.',
    sens: 'haut',
    note: 'Seuls les arrêts sur une machine identifiée comptent. Deux demandes ouvertes en même temps sur la même machine ne comptent qu\'une fois.'
  },
  heuresArret: {
    id: 'heuresArret',
    titre: 'Heures d\'arrêt',
    definition: 'Total des heures pendant lesquelles une machine était arrêtée par une panne, de la déclaration jusqu\'à la fin de la réparation.',
    formule: 'Somme, machine par machine, des heures entre la déclaration de la panne et la fin de la réparation (l\'attente du technicien compte).',
    exemple: c => `${fmtHours(c.heuresArret)} d'arrêt sur ${c.libelle}, pour ${c.pannes} panne${c.pannes > 1 ? 's' : ''} déclarée${c.pannes > 1 ? 's' : ''} sur la période`
      + (c.pannes > 0 ? `, soit ${fmtHours(c.heuresArret / c.pannes)} par panne en moyenne.` : '.'),
    reperes: 'Comparez surtout avec la période précédente : une hausse durable signale une machine qui vieillit ou un préventif insuffisant. '
      + 'Une partie de ce temps est l\'attente avant que le technicien commence : affecter vite la réduit.',
    sens: 'bas',
    note: 'Un arrêt commencé avant la période ne compte que pour ses heures dans la période.'
  },
  mttr: {
    id: 'mttr',
    titre: 'Temps moyen de réparation (MTTR)',
    definition: 'Durée moyenne d\'une réparation, du moment où le technicien commence jusqu\'au moment où il déclare le travail terminé.',
    formule: 'MTTR = temps total de réparation ÷ nombre de pannes réparées',
    exemple: c => c.reparations > 0
      ? `${fmtHours(c.heuresReparation)} de réparation ÷ ${c.reparations} panne${c.reparations > 1 ? 's' : ''} réparée${c.reparations > 1 ? 's' : ''} = ${fmtHours(c.mttr)}.`
      : 'Aucune panne réparée sur la période : pas de moyenne possible.',
    reperes: 'Machine à coudre : moins d\'1 h, c\'est bien ; 1 à 2 h, c\'est courant ; plus de 2 h signale souvent une pièce qui manque au magasin. '
      + 'Table de coupe, générateur vapeur, compresseur : 2 à 4 h restent normales.',
    sens: 'bas',
    note: 'MTTR vient de l\'anglais « Mean Time To Repair ». L\'attente avant le début du travail n\'est pas comptée ici : elle est dans les heures d\'arrêt.'
  },
  mtbf: {
    id: 'mtbf',
    titre: 'Temps moyen entre deux pannes (MTBF)',
    definition: 'Durée moyenne pendant laquelle une machine fonctionne entre deux pannes.',
    formule: 'MTBF = (machines × heures de la période − heures d\'arrêt) ÷ nombre de pannes',
    exemple: c => c.mtbf !== null
      ? `(${c.machines} × ${n(c.heuresPeriode)} h − ${n(c.heuresArret)} h) ÷ ${c.pannes} pannes = ${fmtNumber(c.mtbf)} h.`
      : 'Aucune panne sur la période : pas de moyenne possible (c\'est une bonne nouvelle).',
    reperes: 'Il augmente quand le préventif fonctionne. Comparez une machine avec ses semblables sur sa fiche : une piqueuse dont le MTBF est deux fois plus bas que les autres est à réviser.',
    sens: 'haut',
    note: 'MTBF vient de l\'anglais « Mean Time Between Failures ». Les heures sont comptées 24 h sur 24 : comparez ce chiffre d\'une période à l\'autre plutôt qu\'à une valeur absolue.'
  },
  respectPreventif: {
    id: 'respectPreventif',
    titre: 'Respect du préventif',
    definition: 'Part des entretiens préventifs prévus sur la période qui ont été faits à temps, c\'est-à-dire au plus tard 2 jours après la date prévue.',
    formule: 'Respect du préventif = préventifs faits à temps ÷ préventifs prévus × 100',
    exemple: c => c.preventifsDus > 0
      ? `${c.preventifsATemps} faits à temps sur ${c.preventifsDus} prévus = ${fmtPercent(c.respectPreventif)}.`
      : 'Aucun préventif prévu sur la période.',
    reperes: 'Objectif : 90 % ou plus. En dessous de 75 %, les pannes ont tendance à augmenter dans les semaines qui suivent.',
    sens: 'haut'
  },
  backlog: {
    id: 'backlog',
    titre: 'Interventions ouvertes',
    definition: 'Nombre d\'interventions déclarées et pas encore terminées (à traiter ou en cours), en ce moment.',
    formule: 'Interventions au statut « À traiter » ou « En cours ». En retard : préventif dont la date est dépassée, ou panne ouverte depuis plus de 48 h.',
    exemple: c => `${c.backlog} interventions ouvertes, dont ${c.enRetard} en retard. ${c.realisees} ont été terminées sur ${c.libelle}.`,
    reperes: 'Ce chiffre doit rester stable. S\'il grossit semaine après semaine, l\'équipe n\'arrive pas à suivre : il faut prioriser ou renforcer. '
      + 'Avec 4 techniciens, une vingtaine d\'interventions ouvertes reste normale.',
    sens: 'bas',
    note: 'Ce chiffre ne dépend pas de la période choisie : c\'est la situation à l\'instant présent.'
  },
  cout: {
    id: 'cout',
    titre: 'Coût de maintenance',
    definition: 'Ce que la maintenance a coûté sur la période : main-d\'œuvre, pièces et sous-traitance.',
    formule: 'Coût = heures saisies × taux horaire du technicien + pièces sorties du magasin × prix + prestations externes',
    exemple: c => `${fmtMoney(c.coutMainOeuvre)} de main-d'œuvre + ${fmtMoney(c.coutPieces)} de pièces + ${fmtMoney(c.coutExterne)} de sous-traitance = ${fmtMoney(c.coutTotal)}.`
      + (c.budgetPeriode > 0 ? ` Budget prévu pour cette durée : ${fmtMoney(c.budgetPeriode)} (budget annuel au prorata des jours), soit ${Math.round(100 * c.coutTotal / c.budgetPeriode)} % consommé.` : ' Aucun budget n\'est saisi pour cette période.'),
    reperes: 'Restez sous 100 % du budget de la période. Un mois au-dessus est normal en cas de grosse réparation. Plusieurs mois de suite annoncent un dépassement en fin d\'année.',
    sens: 'bas',
    note: 'Les pièces d\'une intervention annulée retournent au magasin et sortent du coût.'
  }
};

/** Maintenance words used in the application, for the Aide page. */
export const GLOSSAIRE: { terme: string; definition: string }[] = [
  { terme: 'Intervention (OT)', definition: 'Un travail de maintenance : une panne à réparer ou un entretien à faire. « OT » veut dire ordre de travail. Chaque intervention a une référence INT-0000.' },
  { terme: 'Maintenance corrective', definition: 'Réparer une machine après une panne.' },
  { terme: 'Maintenance préventive', definition: 'Entretenir une machine avant qu\'elle tombe en panne, à date fixe (chaque semaine, chaque mois…). Les interventions préventives sont créées automatiquement par les plans.' },
  { terme: 'Plan préventif', definition: 'La règle qui crée les entretiens d\'une machine : quoi faire (liste de contrôles), tous les combien, et par qui.' },
  { terme: 'Arrêt machine', definition: 'La panne empêche la machine de produire. Le temps d\'arrêt compte de la déclaration jusqu\'à la fin de la réparation.' },
  { terme: 'Disponibilité', definition: KPI['disponibilite'].definition },
  { terme: 'MTTR', definition: KPI['mttr'].definition },
  { terme: 'MTBF', definition: KPI['mtbf'].definition },
  { terme: 'Backlog', definition: 'Les interventions ouvertes, pas encore terminées. Mot anglais pour « travail en attente ».' },
  { terme: 'Pareto', definition: 'Classement des causes de la plus fréquente à la moins fréquente. En général, quelques causes font la majorité des pannes : ce sont elles qu\'il faut traiter d\'abord.' },
  { terme: 'Criticité', definition: 'L\'importance d\'une machine pour la production. Une machine « critique » arrête toute la chaîne quand elle tombe en panne (table de coupe, générateur vapeur, compresseur).' },
  { terme: 'Compte rendu', definition: 'Ce que le technicien écrit à la fin : ce qu\'il a constaté, ce qu\'il a fait, les pièces changées.' },
  { terme: 'Cause / remède', definition: 'La cause est l\'origine de la panne (ex. ressort de tension usé). Le remède est ce qui a été fait pour la supprimer (ex. remplacement du ressort).' },
  { terme: 'Seuil de réapprovisionnement', definition: 'Quantité minimale d\'un article au magasin. En dessous, l\'article apparaît dans l\'onglet Réappro avec la quantité à commander.' },
  { terme: 'DA, BC', definition: 'DA : demande d\'achat (un besoin, validé par le superviseur). BC : bon de commande (envoyé au fournisseur). La réception d\'un BC fait entrer les articles en stock.' },
  { terme: 'Clôture', definition: 'Validation finale par le superviseur après la réalisation. Une intervention clôturée ne peut plus être modifiée.' }
];
