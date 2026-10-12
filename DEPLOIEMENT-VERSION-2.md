# GMAO SIMOTEX — mise à jour vers la version 2

Ce document liste ce qui change au déploiement de la version 2 (modules préventif, magasin unifié, achats, budgets, explorateur de données, nouveau tableau de bord).

## 1. Avant de déployer

1. **Sauvegarder la base** `gmao` (sauvegarde complète SQL Server).
2. Vérifier que le poste serveur dispose d'au moins 4 Go de RAM libres pour SQL Server. Sur une machine juste en mémoire, fixer un plancher pour SQL Server :
   ```sql
   EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
   EXEC sp_configure 'min server memory (MB)', 512; RECONFIGURE;
   ```

## 2. Base de données

Les migrations s'appliquent automatiquement au démarrage de l'API. Elles sont **additives** : aucune table ni colonne existante n'est supprimée.

| Migration | Contenu |
|---|---|
| `GmaoModulesPro` | Tables du préventif, du suivi des OT, du magasin, des achats, des budgets, des pièces jointes, du journal et des paramètres. Reprise automatique de l'ancien module Stock : magasins, fournisseurs et lots deviennent des articles du magasin. Un mouvement « Inventaire initial » est créé pour chaque article en stock. |
| `AccentsStatuts` | Libellés « À traiter » et « Clôturée » (accents). |

Les anciennes tables `Stocks`, `StockEntities`, `StockStatuses` et `StockSuppliers` sont conservées en lecture. Les écrans « Pièces de rechange » et « Stock » restent accessibles par leur adresse, mais le menu mène au nouveau **Magasin**.

## 3. Configuration

| Réglage | Où | Rôle |
|---|---|---|
| `ConnectionStrings__Explorateur` | variable d'environnement du service `backend` | Connexion en lecture seule de l'Explorateur de données (recommandé). Créer le compte avec `database/explorateur-lecture-seule.sql`. Sans ce réglage, l'Explorateur utilise la connexion principale ; les requêtes restent en lecture seule (transaction annulée). |
| `DemoData__Seed=true` | variable d'environnement, **une seule fois** | Charge les données de démonstration textiles. Ne pas utiliser en production réelle. |
| `client_max_body_size 12m` | `client/nginx.conf` (déjà fait) | Autorise les pièces jointes de 10 Mo derrière nginx. |

## 4. Rapports Power BI

La page **Rapports** affiche les tableaux de bord publiés dans Power BI Service. Les liens se configurent dans l'application (**Rapports → Gérer les rapports**), une seule fois pour tous les postes.

- Lien sécurisé (« Incorporer → Site web ou portail ») : chaque utilisateur se connecte avec son compte Power BI.
- Lien « Publier sur le web » : public, à réserver aux données non confidentielles.
- Power BI nécessite Internet. Les postes doivent pouvoir joindre `app.powerbi.com` et `*.analysis.windows.net`. Sans Internet, la page l'indique clairement, et tout le reste de la GMAO fonctionne hors ligne.

## 5. Données de démonstration

- Chargement : démarrer l'API avec `--DemoData:Seed=true` (ou la variable `DemoData__Seed=true`). Le chargement ne s'exécute qu'une fois.
- Comptes de démonstration : mot de passe `Simotex!2026`.
  - Techniciens : `m.bensalah@simotex.demo`, `k.jlassi@simotex.demo`, `a.trabelsi@simotex.demo`, `s.gharbi@simotex.demo`.
  - Demandeurs (chefs de chaîne) : `s.haddad@simotex.demo`, `n.benamor@simotex.demo`, `h.mansour@simotex.demo`, `r.chaabane@simotex.demo`.
- Suppression avant la mise en production réelle :
  ```
  sqlcmd -S <serveur> -d gmao -I -f 65001 -i database/demo-cleanup.sql
  ```

## 6. Tests

```
python tests/qa_accounts.py create      # 3 comptes de test (base de développement uniquement)
python tests/api_tests.py --base http://localhost:5000
python tests/qa_accounts.py remove      # supprime les comptes et les données de test
```

121 vérifications : authentification et droits, cycle de vie d'une intervention, préventif, magasin, achats, budgets, explorateur (les 51 questions), tableau de bord, Power BI, et non-régression des écrans existants.
