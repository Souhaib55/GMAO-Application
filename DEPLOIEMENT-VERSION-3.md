# GMAO SIMOTEX — mise à jour vers la version 3

**À qui s'adresse ce document** : à la personne qui met à jour la GMAO sur `SRV-TN-BI`.

**Ce qui change** : tableau de bord expliqué, rapport mensuel, étiquettes QR, filtres et export des listes, aide et visite guidée, ergonomie tablette, sécurité.

**Ce qui ne change pas** : le site IIS, le port `5091`, le dossier `C:\GMAO` et le fichier `C:\GMAO\appsettings.Local.json`.

> Les étapes reprennent `GMAO-Guide-Serveur-SIMOTEX.md`, §14 « Les mises à jour, ensuite ». Seuls les points propres à la version 3 sont détaillés ici.

---

## 1. Résumé pour le déploiement

| Question | Réponse |
|---|---|
| Nouvelles migrations ? | **Oui, une seule** : `20261103203031_RoleSuperviseurManquant`. Elle est additive et compatible avec SQL Server 2014. Elle s'applique toute seule au démarrage. Détails au §2. |
| Nouvelles clés de configuration ? | **Une, facultative** : `ReverseProxy:KnownNetworks`. **Inutile sous IIS.** Aucune clé existante n'est renommée. Détails au §3. |
| `client/package.json` ou `package-lock.json` modifiés ? | **Oui** : ajout de `qrcode-generator` 2.0.4 (licence MIT, sans dépendance), qui dessine les codes QR dans le navigateur. **`npm ci` est obligatoire** avant `ng build`. |
| SQL à lancer à la main ? | **Aucun.** Voir tout de même le §6 sur les comptes de démonstration. |
| Changement IIS ? | **Aucun.** `web.config` et `API/wwwroot/.gitkeep` sont inchangés. |
| Internet nécessaire ? | **Non**, sauf pour la page Rapports (Power BI), comme avant. Polices, icônes et codes QR sont intégrés à l'application. |

## 2. Base de données

| Migration | Ce qu'elle fait | Additive ? | SQL Server 2014 ? |
|---|---|---|---|
| `20261103203031_RoleSuperviseurManquant` | Ajoute la ligne `Superviseur` (IDRole = 1) dans la table `Roles`, **seulement si elle manque**. Sur une base neuve, aucune migration ne la créait, et il était impossible de créer un superviseur. **Sur la base de production, la ligne existe déjà : la migration ne fait rien**, à part s'inscrire dans `__EFMigrationsHistory`. | Oui : aucune table, aucune colonne et aucune donnée supprimée ou modifiée. | Oui : uniquement `IF NOT EXISTS`, `SET IDENTITY_INSERT` et `INSERT`. Essayée sur une base en niveau de compatibilité 120. |

Aucune table ni colonne n'a été ajoutée, modifiée ou supprimée.

Script SQL équivalent, pour information. Il n'est pas à lancer, puisque l'API le fait au démarrage :

```sql
IF NOT EXISTS (SELECT * FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20261103203031_RoleSuperviseurManquant')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Roles WHERE IDRole = 1)
    BEGIN
        SET IDENTITY_INSERT Roles ON;
        INSERT INTO Roles (IDRole, Libelle) VALUES (1, N'Superviseur');
        SET IDENTITY_INSERT Roles OFF;
    END
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20261103203031_RoleSuperviseurManquant', N'9.0.3');
END;
```

## 3. Configuration

### 3.1 Sous IIS (cas de SRV-TN-BI) : rien à ajouter

Le fichier `C:\GMAO\appsettings.Local.json` reste tel quel. Les clés existantes ne changent pas : `ConnectionStrings:DefaultConnection`, `Cors:AllowedOrigins`, `Database:CompatibilityLevel` (laisser **120**) et `DemoData:Seed`.

### 3.2 Nouvelle clé facultative : `ReverseProxy:KnownNetworks`

**Rôle.** Liste des réseaux (notation CIDR) des proxys dont l'API accepte l'en-tête `X-Forwarded-For`, c'est-à-dire la vraie adresse du client.

**Valeur par défaut.** Vide : seule la boucle locale est acceptée, ce qui suffit sous IIS.

**Quand la renseigner.** Seulement si un autre serveur (nginx, répartiteur de charge) est placé **devant** l'API sur une autre machine ou un autre conteneur. C'est déjà fait dans `docker-compose.yml`.

**Pourquoi c'est important.** Avant la version 3, l'API croyait cet en-tête quel que soit l'émetteur. N'importe quel poste pouvait donc changer d'adresse à chaque essai et contourner la limite de 10 connexions par minute.

Bloc à ajouter dans `C:\GMAO\appsettings.Local.json` **uniquement dans ce cas** (exemple pour un proxy à l'adresse 192.168.6.10) :

```json
{
  "ReverseProxy": {
    "KnownNetworks": [ "192.168.6.10/32" ]
  }
}
```

### 3.3 Comportements qui changent sans configuration

| Sujet | Avant | Version 3 |
|---|---|---|
| Mots de passe | 8 caractères minimum | **10 caractères minimum**, avec majuscule, minuscule et chiffre. Le nom de la personne et les mots courants (« azerty », « password »…) sont refusés. **Les mots de passe actuels continuent de fonctionner** : la règle s'applique seulement aux nouveaux comptes et aux réinitialisations. |
| Lien « Mot de passe oublié » | valable 24 h | valable **2 h**. Refusé si le compte a été désactivé entre-temps. |
| En-têtes HTTP | `nosniff`, `X-Frame-Options`, `Referrer-Policy` | en plus : `Content-Security-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, et `Cache-Control: no-store` sur `/api`. La page Rapports (Power BI) reste autorisée. |
| Fichiers joints | contrôle de l'extension seulement | contrôle du **contenu réel** : un fichier renommé est refusé avec un message clair. Le type renvoyé au navigateur est décidé par le serveur. |

## 4. Étapes de mise à jour

Toutes les commandes sont lancées **sur le serveur**, dans PowerShell **en administrateur**.

```powershell
$projet = "$env:USERPROFILE\Desktop\GMAO-Final\GMAO"
```

1. **Sauvegarder la base** `gmao` (sauvegarde complète dans SSMS).
2. **Garder une copie de la version en service**, pour pouvoir revenir en arrière :

   ```powershell
   Copy-Item C:\GMAO "C:\GMAO-v2-$(Get-Date -Format yyyyMMdd)" -Recurse
   ```

3. Récupérer le code :

   ```powershell
   cd $projet
   git status --short
   git pull
   ```

4. **Installer les paquets du client.** Cette étape est obligatoire en version 3, car `package-lock.json` a changé :

   ```powershell
   cd "$projet\client"
   npm ci
   npx ng build
   ```

5. Copier le client compilé dans l'API. Le résultat est dans `client\dist\client` : **il n'y a pas de sous-dossier `browser`** pour ce projet.

   ```powershell
   Copy-Item "$projet\client\dist\client\*" "$projet\API\wwwroot" -Recurse -Force
   ```

   Les anciens fichiers `*.js` restés dans `wwwroot` ne gênent pas : `index.html` désigne les nouveaux.
6. Publier :

   ```powershell
   Import-Module WebAdministration
   Stop-WebSite -Name "GMAO"
   dotnet publish "$projet\API" -c Release -o "C:\GMAO"
   Start-WebSite -Name "GMAO"
   ```

7. **Vérifier** :
   - `http://localhost:5091` répond 200 ;
   - la connexion fonctionne ;
   - le tableau de bord affiche le bloc « À retenir » en haut ;
   - `Get-Content C:\GMAO\logs\*.log -Tail 40` ne montre aucune erreur de migration.
8. Depuis une tablette de l'usine, ouvrir `http://SRV-TN-BI:5091` et **vider le cache** si l'ancienne interface apparaît (Ctrl+F5).

## 5. Retour arrière

L'unique migration n'ajoute qu'une ligne de référence (le rôle Superviseur), qui existe déjà en production. **La base n'a pas besoin d'être restaurée** pour revenir à la version 2 : la version 2 ignore cette migration.

```powershell
Import-Module WebAdministration
Stop-WebSite -Name "GMAO"
Remove-Item C:\GMAO -Recurse -Force
Copy-Item "C:\GMAO-v2-<date>" C:\GMAO -Recurse
Start-WebSite -Name "GMAO"
```

Côté dépôt, revenir au code de la version 2 : `git checkout refonte-gmao-pro` dans le clone.

La sauvegarde de l'étape 4.1 n'est à restaurer qu'en cas de problème de données, ce qui n'est pas attendu.

## 6. Avant la mise en service réelle : comptes de démonstration

Si la base de production a été chargée avec `database/demo-donnees-simotex.sql`, les comptes `*@simotex.demo` existent, et leur mot de passe `Simotex!2026` est écrit dans le dépôt. **N'importe qui sur le réseau de l'usine peut alors se connecter en superviseur.** Avant l'usage réel :

```
sqlcmd -S SRV-TN-BI -d gmao -I -f 65001 -i database\demo-cleanup.sql
```

Si les données de démonstration servent encore aux présentations, désactiver au minimum ces comptes dans **Paramètres → Utilisateurs**.

## 7. Après la mise à jour : coller les étiquettes QR

1. Se connecter en superviseur **depuis un poste ou une tablette qui utilise l'adresse de l'usine**, `http://SRV-TN-BI:5091`, et non `localhost`.
2. **Équipements → Étiquettes QR** : vérifier l'adresse en haut de la page, puis **Imprimer**.
3. Scanner une étiquette avec l'appareil photo d'un téléphone de l'usine : la page « Déclarer une panne » doit s'ouvrir avec la machine remplie.
4. Coller chaque étiquette sur sa machine.

## 8. Ce qu'il faut dire aux utilisateurs

**Au superviseur**

- Le tableau de bord commence par **« À retenir »** : quelques phrases, des plus urgentes aux moins urgentes, chacune avec ce qu'il faut faire et un bouton « Voir ».
- Chaque chiffre a un bouton **« ? »** qui l'explique avec ses propres chiffres.
- Un clic sur une carte ouvre **la liste des interventions qui font ce chiffre**.
- Couleurs : **vert = mieux, rouge = moins bien, gris = stable**, par rapport à la période précédente de même durée.
- **Rapport mensuel** (bouton en haut du tableau de bord) : à imprimer, ou à enregistrer en PDF, pour la réunion.
- Liste des interventions : **filtres** et bouton **Exporter** vers Excel. Liste des équipements : **Exporter**.
- **Étiquettes QR** dans Équipements.
- Les nouveaux mots de passe font **10 caractères** au moins.

**Aux techniciens**

- Sur la fiche d'une intervention, le **grand bouton bleu** montre toujours l'étape suivante.
- Pour le temps passé : boutons **15 min, 30 min, 1 h, 2 h**.
- Les boutons sont plus grands sur la tablette.
- Le rôle s'affiche maintenant « Technicien ».

**Aux chefs de chaîne (demandeurs)**

- **Scanner l'étiquette QR** de la machine avec l'appareil photo du téléphone : la déclaration s'ouvre avec la machine remplie.
- Le type et l'urgence sont déjà choisis, le titre est proposé.
- La **cloche** des notifications est maintenant visible : vous êtes prévenu quand un technicien commence et quand la demande est clôturée.

**À tout le monde**

- Une **visite guidée** s'affiche à la première connexion.
- La page **Aide** (dernier lien du menu) explique les mots de la maintenance et répond aux questions fréquentes. La visite peut y être relancée.

## 9. Tests (base de développement uniquement, jamais en production)

```powershell
# Tests unitaires des indicateurs, de la synthèse « À retenir » et des contrôles de sécurité
dotnet test tests\Gmao.Tests

# Tests de l'API (168 vérifications) ; --user/--password pour un compte SQL au lieu de l'authentification Windows
python tests\qa_accounts.py create
python tests\api_tests.py --base http://localhost:5000
python tests\qa_accounts.py remove

# Tests de l'interface, avec Edge sur Windows (ou Chrome / Chromium : GMAO_BROWSER=<chemin>)
node tests\e2e\pages.mjs
node tests\e2e\workflow.mjs
node tests\e2e\modules.mjs
node tests\e2e\admin.mjs
```

Si l'API sert elle-même le client compilé (comme sous IIS), ajouter avant les tests de l'interface :

```powershell
$env:GMAO_APP="http://localhost:5000"
$env:GMAO_API="http://localhost:5000/api"
```

La limite de 10 connexions par minute s'applique aussi aux tests. **Laisser une minute** entre deux suites de tests lancées à la suite.
