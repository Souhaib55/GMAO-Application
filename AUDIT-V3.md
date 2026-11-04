# Audit V3 — GMAO SIMOTEX

Audit réalisé le 3 novembre 2026 sur la branche `refonte-gmao-pro` (commit `4a7c8b7`), avant les travaux de la version 3.

## Méthode

- **Environnement** : API ASP.NET Core 9 en mode `Production`, servie avec le client Angular compilé (`API/wwwroot`), comme sur `SRV-TN-BI`. SQL Server 2022 dans Docker, base `gmao` en **niveau de compatibilité 120** (SQL Server 2014) et `Database:CompatibilityLevel = 120`. Données de démonstration chargées par `--seed-demo` : 26 machines, 30 articles, 41 plans préventifs, 848 interventions sur 12 mois, 50 bons de commande.
- **Parcours** : chaque écran ouvert avec les trois rôles, comme un utilisateur réel. Comptes : `superviseur@simotex.demo`, `m.bensalah@simotex.demo` (technicien) et `s.haddad@simotex.demo` (demandeuse). Captures pleine page en 1440 × 900 (bureau), 1024 × 768 (tablette paysage du technicien) et 820 × 1180 (tablette portrait).
- **Code** : lecture des contrôleurs, des services et des écrans concernés, en particulier toutes les formules des indicateurs.
- **Tests existants** : `tests/e2e/pages.mjs` exécuté avec Chromium : 42 vérifications sur 42 réussies avant toute modification.

## Priorités

- **P1** : faux résultat, blocage, risque de sécurité, ou gêne quotidienne pour le rôle principal.
- **P2** : fait perdre du temps ou provoque des erreurs. À corriger dans cette version.
- **P3** : confort ou fonction concurrentielle. À faire si le temps le permet.

La colonne **Statut** indique ce qui a été fait dans la version 3 :

- **Fait** : corrigé et testé.
- **Partiel** : amélioré, mais pas complètement.
- **Non fait** : reporté, avec la raison dans le rapport final.

---

## 1. Problèmes bloquants trouvés pendant l'installation

| # | Écran / zone | Rôle | Problème | Impact | Correction | Prio | Statut |
|---|---|---|---|---|---|---|---|
| I1 | Base neuve (migrations) | Tous | La ligne `Superviseur` (IDRole = 1) de la table `Roles` n'est créée par **aucune** migration. Sur une base neuve, seuls `Demandeur` et `Utilisateur` existent. | Impossible de créer un compte superviseur sur une installation neuve. `--seed-demo` plante (`KeyNotFoundException: 'Superviseur'`). La base de production n'est pas touchée : la ligne y existe déjà. | Migration additive `RoleSuperviseurManquant` (`IF NOT EXISTS … INSERT`). Le chargement de démonstration crée aussi `superviseur@simotex.demo` s'il n'y a aucun superviseur. | P1 | Fait |
| I2 | Tests e2e | — | `tests/e2e/cdp.mjs` lance Edge par un chemin Windows écrit en dur, et l'adresse de l'application est figée (`localhost:4200`). | Impossible de lancer les tests ailleurs que sur le poste de développement Windows. | Détection automatique d'Edge, de Chrome ou de Chromium, chemin forcé possible par `GMAO_BROWSER`. Adresses réglables par `GMAO_APP` et `GMAO_API`. Valeurs par défaut inchangées pour Windows. | P2 | Fait |

## 2. Indicateurs : justesse des calculs

**Un indicateur faux est pire que pas d'indicateur.** Chaque formule a été recalculée à la main sur la base de démonstration.

| # | Indicateur | Problème | Impact | Correction | Prio | Statut |
|---|---|---|---|---|---|---|
| K1 | Heures d'arrêt, disponibilité, MTBF (tableau de bord, fiche machine, `/api/kpi`) | Deux demandes ouvertes en même temps sur **la même machine** (doublon, ou deuxième panne pendant la première) sont additionnées : une heure d'arrêt réelle compte pour deux. | Arrêts surestimés, disponibilité et MTBF sous-estimés, et à un niveau différent sur chacun des trois écrans. | Moteur de calcul unique (`KpiCalculator`) qui fusionne les périodes d'arrêt de chaque machine avant de les additionner. Utilisé par les trois écrans. Tests unitaires. | P1 | Fait |
| K2 | Toutes les comparaisons « vs période précédente » | La période en cours fait `jours − 1` jours plus la journée entamée. La période précédente fait `jours` jours complets. | Les comptages (pannes, coûts, interventions) sont comparés à une période plus longue : ils paraissent en baisse de 3 % (30 j) à 14 % (7 j) alors que rien n'a changé. | La période précédente a **exactement la même durée** que la période en cours. | P1 | Fait |
| K3 | `/api/kpi` et tableau de bord | Deux moteurs avec des définitions différentes : `/api/kpi` compte les arrêts sans machine identifiée, prend tout le parc pour la disponibilité et ne tient pas compte des demandes annulées de la même façon. | Deux chiffres différents pour le même mot, selon l'écran. | `/api/kpi` reprend le moteur commun. L'adresse et le format de réponse ne changent pas. | P2 | Fait |
| K4 | Budgets : « 11 mois écoulés sur 12 » | Le libellé affiche le numéro du mois (novembre = 11) alors que seuls 10 mois et 3 jours sont écoulés. Le calcul au prorata, lui, est juste (il compte en jours). | Le superviseur croit que le budget est presque entièrement consommable. | Libellé « 84 % de l'année écoulée (307 jours sur 365) ». | P2 | Fait |
| K5 | Respect du préventif | Le tableau de bord (30 j) et la page Préventif (90 j) affichent deux valeurs différentes sous le même titre, sans dire sur quelle période. | « 80 % ou 82,6 % ? » Perte de confiance dans les chiffres. | La période est écrite sur chaque carte. Le « ? » donne la définition. | P2 | Fait |
| K6 | Écart vs période précédente | Un écart sans signification (−0,1 pt de disponibilité) s'affiche en rouge. | Fausse alerte, le superviseur s'inquiète pour rien. | En dessous d'un seuil significatif (0,5 pt ou 5 %), l'écart est affiché comme « stable », en gris. | P2 | Fait |
| K7 | Machines prises en compte | Les machines comptées pour la disponibilité incluent celles créées après le début de la période. | Effet faible, visible seulement juste après l'ajout de nombreuses machines. | Documenté dans l'explication de la disponibilité. Pas de changement de formule : l'historique des dates de mise en service n'est pas fiable. | P3 | Non fait (documenté) |

Les autres formules ont été vérifiées et sont **justes** :

- MTTR (prise en charge → réalisation) ;
- coût main-d'œuvre (minutes × taux ÷ 60), pièces (quantité × prix au moment de la sortie) et sous-traitance ;
- les pièces d'une intervention annulée retournent au magasin et sortent du coût ;
- budget au prorata des jours et projection de fin d'année (dépensé ÷ part de l'année écoulée) ;
- part du préventif dans les heures saisies ;
- backlog et retards.

Elles sont désormais couvertes par des tests unitaires (`tests/Gmao.Tests`).

## 3. Superviseur

| # | Écran | Problème | Impact | Correction | Prio | Statut |
|---|---|---|---|---|---|---|
| S1 | Tableau de bord, cartes d'indicateurs | Aucune carte n'explique ce qu'elle mesure. « MTBF 1032 h » ou « Respect du préventif 80 % » ne disent ni comment c'est calculé, ni si c'est bien ou mal. | **Principale difficulté du superviseur** : les chiffres ne sont pas utilisés, ou sont mal compris. | Un bouton « ? » sur chaque carte. Il donne la définition en une phrase, la formule en mots, le calcul avec les chiffres affichés, les repères pour un atelier de confection, et le sens « plus haut / plus bas = mieux ». | P1 | Fait |
| S2 | Tableau de bord, écarts | Le premier écart est rédigé « vs période préc. », les suivants n'affichent que « +41 % ». La couleur est expliquée nulle part. | Le superviseur ne sait pas à quoi se compare le chiffre, ni si le rouge veut dire « en hausse » ou « moins bien ». | Phrase complète (« +41 % par rapport aux 30 jours précédents »). Vert = mieux, rouge = moins bien, gris = stable, avec une légende toujours visible. Unités partout (h, %, DT). | P1 | Fait |
| S3 | Tableau de bord, clics | Disponibilité, heures d'arrêt et temps de réparation ne sont pas cliquables. Les autres cartes mènent à une page générale, non filtrée. | Impossible de répondre à « pourquoi ce chiffre est-il élevé ? » sans chercher à la main. | Chaque carte ouvre la liste filtrée des interventions qui composent le chiffre (même période, chaîne, machine). Le filtre est affiché en clair en haut de la liste. | P1 | Fait |
| S4 | Tableau de bord | Pas de synthèse. Le superviseur doit lire 6 cartes et 6 graphiques pour trouver ce qui compte. | Temps perdu, points importants manqués. | Bloc « À retenir » en tête, généré par des règles et non par une IA : machines qui concentrent les arrêts, chaîne la plus touchée, cause principale, préventif en retard, dépassement prévu du budget, ruptures de stock. Chaque point dit « Que faire ? » et mène à l'écran utile. | P1 | Fait |
| S5 | Tableau de bord, « Pannes les plus fréquentes » | Barres orange, alors que l'orange veut dire « attention » ailleurs. Pas de part cumulée. | Le principe de Pareto (« 20 % des causes font 80 % des pannes ») n'est pas lisible. | Pareto par cause et par machine, avec la part cumulée. Couleurs cohérentes avec le reste de l'écran. | P2 | Fait |
| S6 | Tableau de bord, répartition des coûts | « 3,3 k » au centre de l'anneau : abréviation anglaise. La sous-traitance disparaît de la légende quand elle vaut 0. | Lecture difficile. | Montant entier en DT, les trois postes toujours affichés. | P3 | Fait |
| S7 | Rapport mensuel | Aucun moyen de présenter le mois écoulé à la direction, à part une capture d'écran. | Rapport refait à la main dans Excel chaque mois. | Page « Rapport mensuel » imprimable (feuille de style d'impression, enregistrement en PDF depuis le navigateur, fonctionne hors ligne) : chiffres du mois et du mois précédent, synthèse, Pareto, machines, coûts, budget. | P2 | Fait |
| S8 | Interventions, liste | Seule une recherche texte est disponible. Pas de filtre par statut, chaîne, machine, période ou type, et pas d'export. 10 lignes par page. | Pour retrouver « les pannes de la Couture B ce mois-ci », il faut tout parcourir. | Filtres simples (statut, type, chaîne, période), nombre de lignes par page réglable, export Excel (CSV) de la liste filtrée complète. | P1 | Fait |
| S9 | Équipements, liste | Pas d'export. Pas de coût par machine dans la liste. | Le coût par machine n'est visible que fiche par fiche. | Export CSV. Le coût par machine apparaît dans « Machines les plus pénalisantes » et dans le rapport mensuel. | P2 | Fait |
| S10 | Équipements | Pas d'étiquette à coller sur la machine. | Pour déclarer une panne, le chef de chaîne doit chercher la machine dans une liste de 26 lignes. | Étiquettes QR imprimables. Le code QR ouvre « Déclarer une panne » avec la machine déjà remplie. Lu par l'appareil photo du téléphone, il fonctionne en HTTP. | P2 | Fait |
| S11 | Préventif | Uniquement au calendrier. Un compresseur ou un générateur vapeur s'entretient aussi selon ses heures de marche. | Entretiens trop tôt ou trop tard sur les machines de servitude. | Plans au compteur d'heures, et relevé du compteur sur la fiche machine. Voir §6. | P3 | Non fait : le bénéfice ne concerne que 2 ou 3 machines, et il ajouterait un relevé régulier à saisir par les techniciens. Un plan au calendrier, réglé sur l'usage moyen, couvre le besoin. |
| S12 | Toutes les pages | Aucune aide en ligne, aucun glossaire. MTBF, MTTR, backlog et OT ne sont expliqués nulle part. | Formation orale obligatoire, oubliée au bout d'un mois. | Page « Aide » : glossaire, explication de chaque indicateur, « comment faire » par rôle, et visite guidée à rejouer. | P1 | Fait |

## 4. Technicien (tablette)

| # | Écran | Problème | Impact | Correction | Prio | Statut |
|---|---|---|---|---|---|---|
| T1 | Fiche intervention | L'action suivante (« Marquer comme réalisée ») est au milieu de l'écran, sous un grand champ de compte rendu. Les boutons « Saisir » et « Sortir du magasin » font 30 px de haut. | Les doigts ratent les boutons. Le technicien ne sait pas dans quel ordre travailler. | Sur tablette, toutes les cibles tactiles font 44 px ou plus. L'action suivante est un grand bouton principal. | P1 | Fait |
| T2 | Partout | Le rôle s'affiche « Utilisateur ». | Incompréhensible pour un technicien. | Affiché « Technicien ». Le nom technique du rôle ne change pas. | P2 | Fait |
| T3 | Saisie de temps | Il faut taper la durée. | Saisies approximatives ou oubliées. | Boutons de durée rapide (15 min, 30 min, 1 h, 2 h) en plus du champ libre. | P2 | Fait |
| T4 | Premier accès | Rien n'explique le déroulé (accepter → temps → pièces → photos → compte rendu). | Étapes oubliées, interventions clôturées sans pièces ni temps. | Visite guidée au premier accès, propre au rôle. | P2 | Fait |
| T5 | Contrôles du préventif | Les listes de contrôle existent déjà (étapes copiées dans chaque OT), mais les cases sont petites. | Cochage difficile avec des gants ou des doigts gras. | Cases agrandies (cibles de 44 px). | P2 | Fait |

## 5. Demandeur (chef de chaîne)

| # | Écran | Problème | Impact | Correction | Prio | Statut |
|---|---|---|---|---|---|---|
| D1 | Déclarer une panne | 5 champs obligatoires, dont « Type d'intervention », que le chef de chaîne ne sait pas remplir (« Dépannage » ou « Maintenance corrective » ?). La machine se choisit dans une longue liste. | Déclarations retardées ou mal classées. | Pour le demandeur, le type « corrective » et l'urgence « Normale » sont pré-remplis. La machine est pré-remplie par le code QR. Le titre est proposé à partir du type de panne et de la machine. | P1 | Fait |
| D2 | Déclarer une panne | Le bouton d'envoi de fichier est celui du navigateur, en anglais (« Choose File / No file chosen »). | Incompréhensible pour l'utilisateur. | Bouton en français « Ajouter une photo ou un document ». | P2 | Fait |
| D3 | Tableau de bord | Liste vide sans explication quand il n'y a pas de demande. | L'utilisateur ne sait pas quoi faire. | État vide avec le bouton « Déclarer une panne ». | P2 | Fait |
| D4 | Barre du haut | La cloche des notifications est cachée au demandeur. Pourtant, le serveur lui envoie des notifications (prise en charge, clôture, annulation). | Le chef de chaîne n'est jamais prévenu : il rappelle la maintenance pour savoir où en est sa demande. | Cloche affichée pour tous les rôles. | P2 | Fait |

## 6. Comparaison avec les leaders du marché

MaintainX, Fiix, UpKeep, Limble, Mobility Work, CARL Source et DIMO Maint ont été comparés à la GMAO. Seules les fonctions **utiles à un atelier de confection tunisien** ont été retenues, et la règle « plus simple pour la majorité » a été appliquée.

| Fonction des leaders | Dans la GMAO avant la V3 | Décision V3 | Pourquoi |
|---|---|---|---|
| Déclaration de panne par code QR collé sur la machine | Non | **Ajoutée** | Le geste le plus fréquent du chef de chaîne passe de 6 champs à 2 (type de panne, description). Fonctionne en HTTP, car c'est l'appareil photo du téléphone qui lit le code. |
| Listes de contrôle dans le préventif | Oui (étapes) | Gardée, cases agrandies | Déjà en place. |
| Préventif au compteur (heures de marche) | Non | Voir rapport final | Utile pour le compresseur et le générateur vapeur, peu pour les machines à coudre, qui n'ont pas de compteur. |
| Suivi des arrêts et Pareto par machine et par cause | Partiel | **Complété** | C'est la question de chaque réunion de production : « quelle machine nous coûte le plus ? ». |
| Coût par machine | Fiche par fiche | **Ajouté au classement** | Aide à décider s'il vaut mieux réparer ou remplacer. |
| Alertes de réapprovisionnement | Oui (onglet Réappro) | Gardées, rappelées dans « À retenir » | Déjà en place, avec une quantité suggérée. |
| Export Excel | Sur 9 écrans | **Ajouté** aux interventions et aux équipements | Le service méthodes travaille sous Excel. |
| Explications des indicateurs dans l'écran | Non | **Ajoutées** (« ? ») | C'est ce qui rend MaintainX ou Limble utilisables sans formation. |
| Visite guidée et centre d'aide | Non | **Ajoutés** | Arrivée de nouveaux techniciens, fort taux de rotation. |
| Application mobile hors ligne | Non | **Écartée** | Impossible en HTTP sur le réseau local (pas de service worker). La tablette reste en ligne sur le Wi-Fi de l'usine. |
| Photo prise directement dans la page | Non | **Écartée** | `getUserMedia` est bloqué en HTTP. Le sélecteur de fichier ouvre déjà l'appareil photo de la tablette. |
| Demandes de travaux par portail public, IoT, capteurs | Non | **Écartés** | Complexité sans bénéfice pour la taille de l'atelier. |
| Signature électronique, multi-sites | Non | **Écartés** | Un seul site. La clôture par le superviseur suffit. |

## 7. Accessibilité et performance

| # | Zone | Problème | Correction | Prio | Statut |
|---|---|---|---|---|---|
| A1 | Toute l'application | Le focus clavier n'est pas visible sur certains boutons et liens. | Contour de focus visible et cohérent (`:focus-visible`). | P2 | Fait |
| A2 | Boutons ne contenant qu'une icône (voir, modifier, supprimer) | Pas de nom lisible par un lecteur d'écran sur certains d'entre eux. | `aria-label` en français sur la liste des interventions, le suivi des travaux et les nouveaux écrans. Les autres écrans (magasin, achats, paramètres) gardent seulement l'info-bulle `title`. | P2 | Partiel |
| A3 | Couleurs de texte | Mesures : le texte gris d'aide sur blanc est à 4,66:1 (conforme AA). En revanche, le texte des pastilles vertes est à 4,35:1 et celui des pastilles orange à 3,53:1, sous le minimum AA de 4,5:1. | Pastilles avec la teinte foncée de leur couleur : 5,92:1 (vert), 5,09:1 (orange), 5,95:1 (rouge). Taille des textes d'aide relevée sur tablette. | P2 | Fait |
| P1 | Chargement | Tous les écrans sont dans un seul fichier de 1,13 Mo, chargé à la connexion. | Écrans chargés à la demande (`loadComponent`). Le chargement initial passe de 1,24 Mo à 649 Ko (de 234 Ko à 149 Ko compressé). | P2 | Fait |
| P2 | Polices | La charte prévoit IBM Plex Sans, mais l'application chargeait Public Sans (IBM Plex Sans était installée sans être utilisée). | IBM Plex Sans locale (`@fontsource`), conforme à la charte. | P3 | Fait |

## 8. Sécurité

Voir `SECURITE-V3.md`.

## 9. Ajouts et retraits importants, et pourquoi

- **Bloc « À retenir » sur le tableau de bord** : le superviseur lit d'abord 3 à 5 phrases qui disent quoi faire, puis seulement les chiffres.
- **« ? » sur chaque indicateur** : un chiffre que l'on ne comprend pas ne sert à rien. L'explication se trouve à côté du chiffre, pas dans un manuel.
- **Cartes cliquables vers la liste filtrée** : « pourquoi ce chiffre ? » trouve sa réponse en un clic.
- **Filtres et export de la liste des interventions** : la question la plus fréquente (« les pannes de telle chaîne ce mois-ci ») ne demande plus de chercher page par page.
- **Étiquettes QR** : déclarer une panne passe de 6 choix à 2, sans chercher la machine.
- **Pré-remplissage pour le demandeur** (type corrective, urgence Normale, titre proposé) : moins de champs pour la personne qui connaît le moins le vocabulaire de la maintenance.
- **Page « Aide » et visite guidée** : un nouveau technicien est autonome sans formation orale.
- **Rapport mensuel imprimable** : la réunion mensuelle se prépare en un clic, sans Excel.
- **Cibles tactiles de 44 px sur tablette** : moins d'erreurs de saisie à l'atelier.
- **Retrait des contrôleurs de démonstration `WeatherForecast` et `Buggy`** : modèles Visual Studio inutiles. `Buggy` provoquait volontairement des erreurs serveur.
- **Préventif au compteur d'heures, non ajouté** : il demanderait aux techniciens un relevé régulier pour 2 ou 3 machines seulement (compresseur, générateur vapeur). C'est plus de travail pour tous, au profit de très peu de machines.
- **Cloche des notifications pour le demandeur** : il est enfin prévenu quand sa panne est prise en charge et réparée, sans avoir à téléphoner.
- **Rien n'a été retiré des modules métier.** Toutes les adresses existantes restent valides.
