# Audit UI/UX V3 — passe de clarté

Audit réalisé le 4 novembre 2026, sur la branche `amelioration-v3`, après la version 3 fonctionnelle.

**But** : qu'une personne qui ouvre une page pour la première fois comprenne en 5 secondes ce qu'elle montre et ce qu'elle doit faire. **Le style n'est pas en cause** : le thème « Bleu atelier », IBM Plex Sans, la barre latérale blanche et les cartes de 12 px sont conservés. Les problèmes portent sur la densité et la clarté.

## Méthode

1. **Balayage automatique** (`uiscan.js`, Playwright, 73 combinaisons écran × rôle × largeur, chaque onglet cliqué) : chaque écran de chaque rôle, en 1440 × 900 (bureau) et en 1024 × 768 (tablette, écran tactile simulé). Le texte affiché, les champs, les textes d'exemple et les listes déroulantes sont fouillés à la recherche de `{{ }}`, `undefined`, `null`, `NaN`, `[object Object]`, `Invalid Date`, `Infinity` et de mots anglais d'interface.
2. **Recherche dans le code** :
   - échappements `\'` dans les modèles en ligne (`template:` entre accents graves) ;
   - libellés en « Title Case » ;
   - messages anglais visibles.
3. **Lecture des captures** « avant », page par page : `design-boards/v3-ui/before/`.
4. **Comparaison** avec la façon dont MaintainX, Fiix, UpKeep, Limble, Mobility Work et CARL Source présentent les mêmes écrans.

**Résultat du balayage avant correction** : 73 combinaisons, 1 fuite de code réelle (sur 4 écrans), aucune erreur JavaScript. Les mots signalés « Actions » et « Action » sont du français : faux positifs.

## Priorités

- **P1** : texte faux ou illisible (code affiché, format de date étranger), ou page principale difficile à lire.
- **P2** : ralentit, embrouille ou contredit le reste de l'application.
- **P3** : finition.

Tous les P1 et P2 sont traités. La colonne **Statut** indique ce qui a été fait.

## 1. Constats

| # | Page | Rôle | Problème | Correction | Prio | Statut |
|---|---|---|---|---|---|---|
| U1 | Fiche équipement, « Fin de garantie » | Tous | Le code du modèle s'affiche tel quel : `{{ end >= today ? 'Sous garantie jusqu'au ' + … }}`. Cause : `\'` dans un modèle en ligne, entre accents graves. TypeScript le transforme en `'`, ce qui casse l'expression Angular. | La logique passe dans une méthode du composant. Les 5 autres `\'` du code client ont été vérifiés : ils sont écrits `\\'` et restent valides. | P1 | Fait |
| U2 | Fiche équipement (consultation) | Tous | La fiche est un formulaire grisé : les dates suivent le format du navigateur (`mm/dd/yyyy`, ou `10/14/2023` sur un poste en anglais), et les champs vides affichent « -- Sélectionner -- ». | En consultation, une fiche de lecture : libellé et valeur, dates au format `jj/mm/aaaa`, « Non renseigné » pour un champ vide, état et importance en pastilles. Le formulaire reste pour la modification. | P1 | Fait |
| U3 | Tableau de bord | Superviseur | Six cartes d'indicateurs de même poids, puis neuf blocs (« À traiter », tendance, chaînes, Pareto, coûts, machines, alertes…). Aucun n'indique par quoi commencer. Chaque carte porte une pastille de couleur, un écart coloré et une ligne d'aide : trois messages. | Hiérarchie : « À retenir », puis **4 indicateurs du matin** (disponibilité, heures d'arrêt, interventions ouvertes, respect du préventif). Les 3 autres (temps de réparation, temps entre pannes, coût) sont derrière « Voir plus d'indicateurs ». Ensuite « À traiter maintenant » et « Alertes », puis **4 graphiques titrés par une question**, plus grands, avec les valeurs écrites sur les barres et en bout de courbe au lieu d'une légende. Le détail (machines avec leur coût, répartition des coûts) est replié sous « Voir le détail ». | P1 | Fait |
| U4 | Tableau de bord, cartes | Superviseur | L'état (bon ou mauvais) n'est donné que par une pastille de couleur. | Texte + couleur : « Bon niveau », « À surveiller », « Sous l'objectif ». L'écart dit lui aussi « Mieux » ou « Moins bien » en toutes lettres. | P1 | Fait |
| U5 | Paramètres | Superviseur | Organisé par table de la base : « Données de référence », 14 listes de même poids, noms techniques (« Criticité équipement », « État intervention », « Groupe équipement »). Une grille de 7 tuiles reprend le menu latéral. Une carte « Version 2.0 » est périmée. | 4 groupes selon ce que l'on veut faire : **Utilisateurs et accès**, **Machines et chaînes**, **Magasin et achats**, **Interventions**. Chacun a une phrase d'explication, ses 2 à 4 réglages courants, puis « Autres listes » repliées pour les réglages rares. Les noms sont en langage clair (« Importance des machines », « Familles d'articles »…). Version 3.0. | P1 | Fait |
| U6 | Listes de choix (Paramètres) | Superviseur | Libellés en « Title Case » (« Criticité Équipement », « Niveaux d'Urgence », « Types de Pannes »). Pas de recherche. La page s'ouvre sur la liste la moins utile (criticité des équipements). | Libellés en langage clair et en minuscules, recherche dans la liste, état vide qui propose « Ajouter », ouverture sur « Chaînes de production ». | P2 | Fait |
| U7 | Utilisateurs | Superviseur | Le rôle technicien s'affiche « Utilisateur » (pastilles, carte, filtre, formulaire). « Total Utilisateurs » est en Title Case. « ID : 1 » apparaît sous chaque nom. « Email ». | « Technicien » partout à l'écran ; le nom technique du rôle ne change pas. « Comptes », « Adresse e-mail ». Identifiant interne retiré. | P2 | Fait |
| U8 | Planning, compteurs | Superviseur, Technicien | « Nouveau » et « Terminé » ne correspondent à aucun statut : partout ailleurs, on lit « À traiter » et « Réalisée / Clôturée ». | Libellés des statuts réels. | P2 | Fait |
| U9 | Équipements, Préventif, Achats, tableau de bord : en-têtes | Superviseur | Deux ou trois boutons de même poids dans l'en-tête : « Exporter », « Étiquettes QR », « Nouvel équipement »… | **Un seul bouton principal** par écran. Les actions secondaires sont regroupées dans un menu « Plus d'actions », accessible au clavier. | P2 | Fait |
| U10 | Fiche intervention (consultation), surtout sur tablette | Technicien | La demande s'affiche en formulaire grisé de 3 sections (environ 900 px de haut), au-dessus du suivi des travaux. Le technicien fait défiler la page pour arriver au temps et aux pièces. | En consultation : un bloc « La demande » compact, en libellé et valeur, avec la description en entier. Le formulaire reste pour la modification. | P2 | Fait |
| U11 | Préventif, actions par ligne | Superviseur | Trois icônes sans texte (générer, modifier, suspendre) : seule une info-bulle au survol les nomme, et une tablette n'a pas de survol. | Nom lisible par un lecteur d'écran sur chaque icône (`aria-label`). L'info-bulle reste. | P2 | Fait |
| U12 | Code client | — | `app.component.html` (page de démarrage d'Angular, en anglais), `app.module.ts` et `app-routing.module.ts` ne sont jamais utilisés : l'application démarre en composants autonomes. | Fichiers supprimés. | P3 | Fait |
| U13 | Magasin | Superviseur | Cinq indicateurs, dont « Stock dormant », un terme peu parlant. | « Stock dormant » expliqué sous le chiffre : « Aucune sortie depuis 12 mois ». C'était déjà le cas, aucun changement. | P3 | Non fait (déjà correct) |
| U14 | Messages d'erreur techniques | — | Le module qui capte les erreurs du serveur écrit en anglais (« Error Code… »), mais uniquement dans la console du développeur. L'utilisateur voit toujours le message français du serveur. | Rien à corriger à l'écran. | P3 | Non fait (invisible) |
| U15 | Magasin, liste des articles | Superviseur | 6 colonnes, dont prix unitaire et valeur. | Gardées : le prix et la valeur servent au superviseur pour décider d'un achat. Une colonne de moins n'apporterait pas de clarté. | P3 | Non fait (volontaire) |
| U16 | Planning, étiquettes du calendrier | Superviseur, Technicien | Titres coupés (« Nettoyage et lu… ») dans les cases du mois. | Le titre complet est dans l'info-bulle et dans le panneau qui s'ouvre au clic. C'est la convention des calendriers (MaintainX, Limble). | P3 | Non fait (volontaire) |

## 2. Comparaison avec les leaders, écran par écran

| Écran | Ce que font les meilleurs | Repris ici |
|---|---|---|
| Tableau de bord | Limble et MaintainX : 4 ou 5 chiffres en tête, chaque graphique répond à une question, le détail est un clic plus loin. | 4 indicateurs, « Voir plus », titres en forme de question, détail replié. |
| Fiche machine | Fiix et UpKeep : une fiche de lecture (libellé et valeur), le bouton « Modifier » pour passer au formulaire. | Fiche de lecture, formulaire seulement pour modifier. |
| Fiche intervention | MaintainX : en tête, ce qu'il faut faire ; la demande est un résumé court ; les étapes et le temps viennent juste en dessous. | La demande devient un résumé compact ; « À faire » et le suivi remontent. |
| Paramètres | UpKeep et Mobility Work : quelques rubriques par objectif (équipe, actifs, stock, demandes), les listes rares sont repliées. | 4 groupes, réglages rares repliés. |
| En-têtes de liste | Tous : un bouton principal (« Nouveau … »), le reste dans un menu « … ». | Menu « Plus d'actions ». |

## 3. Écarté volontairement

- **Thème sombre, personnalisation du tableau de bord par glisser-déposer** (proposés par MaintainX et Limble) : plus de réglages pour l'utilisateur, ce qui ne rend pas la lecture plus simple.
- **Graphiques supplémentaires** (répartition par technicien, délai de première réponse) : déjà dans l'Explorateur de données. Les ajouter au tableau de bord le surchargerait.
- **Refonte complète des formulaires de création** (équipement, article) : ils sont déjà découpés en sections courtes, avec des libellés clairs. Le seul problème réel, en consultation, est traité par U2.

## 4. Vérification

Mesures du 4 novembre 2026, sur la version déployée comme sous IIS : API en mode `Production`, client compilé servi par l'API, SQL Server en niveau de compatibilité 120.

### 4.1 Balayage du texte affiché, avant et après

Même script, mêmes 73 combinaisons écran × rôle × largeur. Résultats bruts dans `design-boards/v3-ui/before/scan-before.json` et `design-boards/v3-ui/after/scan-after.json`.

| | Avant | Après |
|---|---|---|
| Code de modèle visible (`{{ }}`) | 4 combinaisons (fiche machine : 2 rôles × 2 largeurs) | **0** |
| `undefined`, `null`, `NaN`, `[object Object]`, `Invalid Date`, `Infinity` | 0 | **0** |
| Erreurs JavaScript | 0 | **0** |
| Mots signalés « anglais » | 4 combinaisons : « Actions », « Action », « Email » | 3 combinaisons : « Actions », « Action ». Ce sont des faux positifs (mots français). « Email » est devenu « Adresse e-mail ». |

### 4.2 Tests automatisés

| Suite | Résultat |
|---|---|
| `dotnet test tests/Gmao.Tests` | **46 / 46** |
| `tests/api_tests.py` | **168 / 168** |
| `tests/e2e/v3.mjs` (mis à jour pour cette passe) | **25 / 25** |
| `tests/e2e/pages.mjs` | **51 / 51** |
| `tests/e2e/workflow.mjs` | **26 / 26** |
| `tests/e2e/modules.mjs` | **23 / 23** |
| `tests/e2e/admin.mjs` | **18 / 18**, après mise à jour d'un sélecteur : la liste s'appelle désormais « Types de pannes » et non plus « Types de Pannes ». Premier passage : 17 / 18. |

Les tests e2e tournent avec Chromium. Les lignes d'« erreur » qui restent dans leurs journaux sont des refus que les tests provoquent exprès : 404 après une suppression, budget en double, stock insuffisant, OT déjà ouvert, pages interdites (403).

Deux vérifications du nouveau fichier `v3.mjs` ont échoué au premier passage, et c'était le test qui était en cause. Le menu « Plus d'actions » a été revérifié séparément, avec un vrai clavier et une vraie souris : Entrée ouvre le menu et place le focus sur le premier choix, ↓ passe au suivant, Échap ferme le menu et rend le focus au bouton. Le test utilise désormais de vraies touches.

### 4.3 Contraste (WCAG AA, 4,5:1 pour le petit texte)

| Élément | Contraste |
|---|---|
| Tendance « Mieux » / « Moins bien » / « Stable » sur blanc | 6,87 / 7,03 / 6,98 :1 |
| Pastilles de niveau : bon, à surveiller, sous l'objectif, neutre | 5,92 / 5,09 / 5,95 / 6,17 :1 |
| Liens « Voir plus », « Autres réglages », pièce jointe | 6,47 à 6,88 :1 |
| Descriptions des réglages, libellés de la fiche machine | 6,98 :1 |
| Garantie expirée | 7,03 :1 |
| Courbes « Déclarées » et « Réalisées » | 5,38 et 5,26 :1 |
| Texte des axes des graphiques | 4,66 :1 |

### 4.4 Clavier

- Le focus est visible sur tout ce qui a été touché, grâce à la règle globale `:focus-visible`, étendue aux volets repliables (`summary`).
- Les cartes d'indicateurs s'ouvrent au clavier par leur lien, le « ? » reste un bouton à part.
- « Plus d'actions » se manipule au clavier, comme décrit au §4.2.
- Les boutons-icônes du préventif et des listes de choix ont un nom lu par les lecteurs d'écran.

### 4.5 Compilation

`npx ng build` : **aucun avertissement**. Avant cette passe, la compilation en donnait 3 : 1 ancien dans `references`, 2 venus de la V3 dans `kpi-info`. Chargement initial : 649,8 Ko (149,3 Ko compressés), sans changement notable.
