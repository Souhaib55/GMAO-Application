# GMAO — Déploiement sur le serveur SIMOTEX (SRV-TN-BI)

> **À qui s'adresse ce document.** Il est écrit pour l'assistant Claude Code du
> projet GMAO, et pour Souhaib. Il raconte comment l'application **Qualité En
> Cours** a été déployée sur le serveur de SIMOTEX en octobre 2026, avec les
> pièges réellement rencontrés et l'ordre dans lequel les résoudre, pour que
> GMAO suive le même chemin sans les retrouver un par un.
>
> **Ce n'est pas une documentation théorique.** Chaque avertissement marqué
> ⚠️ correspond à une erreur qui a réellement coûté du temps.

---

## 0. Ce que ce guide suppose

Le déploiement décrit vaut pour une application de cette forme :

| Élément | Qualité En Cours |
|---|---|
| Serveur | **ASP.NET Core 9** (.NET 9) |
| Client | **Angular**, compilé puis servi par l'API depuis `wwwroot` |
| Base | **SQL Server**, schéma géré par **EF Core Migrations** |
| Authentification | **JWT**, clé hors du dépôt |
| Hébergement | **IIS** sur Windows Server `SRV-TN-BI` |

**Si GMAO diffère sur l'un de ces points, l'assistant doit le dire avant de
commencer** et adapter — en particulier :

- si le client et l'API sont **deux sites séparés**, il faudra deux sites IIS,
  et le CORS devient réellement nécessaire (ici il ne l'est que pour satisfaire
  un garde-fou, voir §7) ;
- si GMAO n'utilise pas EF Core, l'étape des migrations (§9) change de nature ;
- si GMAO est en .NET Framework (et non .NET Core), **la moitié de ce guide ne
  s'applique pas** : le réglage « Aucun code managé » serait exactement l'inverse
  de ce qu'il faut.

### Le serveur, tel qu'il est

```
Nom           : SRV-TN-BI
Adresse IP    : 192.168.6.245
Base SQL      : instance par défaut sur SRV-TN-BI
Accès         : Bureau à distance, compte Administrateur.WIN-K6SFIATQ1N2
```

**Ports déjà occupés** (relevés dans le Gestionnaire IIS) :
`44, 55, 75, 78, 80, 81, 83, 85, 88, 99, 5000, 5081, 5090, 6668`

> `5090` est Qualité En Cours. **Pour GMAO, prendre `5091`** — ou vérifier
> d'abord qu'il est libre dans la liste des sites IIS.

---

## 1. L'idée centrale : deux dossiers, jamais un seul

C'est le point que tout le reste suppose compris.

```
C:\Users\Administrateur...\Desktop\GMAO-Final\GMAO
   └── LE CLONE — code source, .git, node_modules
       On y fait : git pull, ng build, dotnet publish
       IIS n'y touche JAMAIS

C:\GMAO
   └── LE PUBLIÉ — application compilée, autonome
       Créé vide, rempli par dotnet publish
       C'est CE dossier que IIS exécute
```

**Pourquoi ne jamais pointer IIS sur le clone :**

1. IIS ne sait pas exécuter du code source. Il lui faut des `.dll`, que seul
   `dotnet publish` fabrique. `dotnet run` les produisait en mémoire, à chaque
   lancement — c'est pour cela que l'on pouvait s'en passer jusqu'ici.
2. **Tout ce qui se trouve dans le dossier d'un site IIS est potentiellement
   servi sur le réseau.** Pointer sur le clone exposerait le code source,
   l'historique Git et les fichiers de configuration à toute personne connectée
   au réseau de l'usine.

La commande qui relie les deux, et la seule à relancer à chaque mise à jour :

```powershell
dotnet publish "<clone>\server\src\<Projet>.API" -c Release -o "C:\GMAO"
```

---

## 2. Préparer la session de travail

Tout se passe **sur le serveur**, en Bureau à distance. Trois outils à ouvrir et
à laisser ouverts.

**PowerShell en ADMINISTRATEUR**
Clic droit sur **Démarrer** → **Windows PowerShell (admin)**.

> ⚠️ Vérifier que le titre de la fenêtre contient **Administrateur**. Sans
> élévation, la règle de pare-feu et les commandes IIS échouent sur « Accès
> refusé ».
>
> ⚠️ Vérifier aussi que l'invite commence par `PS ` et non par `C:\...>` : la
> seconde est l'**Invite de commandes**, où aucune commande PowerShell ne
> fonctionne. Taper `powershell` puis Entrée pour basculer.

**Gestionnaire IIS** — touche Windows → `IIS` → *Gestionnaire des services Internet*

**SQL Server Management Studio**
⚠️ **À ouvrir en tant qu'administrateur** (clic droit → *Exécuter en tant
qu'administrateur*). L'appartenance au groupe Administrateurs n'est active que
dans un processus élevé ; sans cela SQL Server refuse `CREATE LOGIN` avec
« User does not have permission to perform this action ».

---

## 3. Installer ce qui manque à IIS (une seule fois par serveur)

Si Qualité En Cours a déjà été déployée sur ce serveur, **ces deux composants
sont déjà installés** — vérifier plutôt que réinstaller.

### 3.1 Le Hosting Bundle ASP.NET Core

**C'est la cause d'erreur numéro un**, et son message ne dit jamais ce qui
manque.

<https://dotnet.microsoft.com/download/dotnet/9.0> → colonne **ASP.NET Core
Runtime** → **Hosting Bundle** (Windows).

```powershell
net stop was /y
net start w3svc

# Vérification
dir "C:\Program Files\IIS\Asp.Net Core Module\V2"
```

### 3.2 Les WebSockets

Nécessaires si l'application utilise SignalR ou tout temps réel.

```powershell
Install-WindowsFeature Web-WebSockets
Get-WindowsFeature Web-WebSockets      # doit afficher Installed
```

> Sur une édition qui n'est pas Windows Server :
> `Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebSockets -All`

---

## 4. Cloner et publier

```powershell
# Le dossier de travail
New-Item -ItemType Directory -Force "$env:USERPROFILE\Desktop\GMAO-Final"
cd "$env:USERPROFILE\Desktop\GMAO-Final"
git clone <URL_DU_DEPOT_GMAO>

$projet = "$env:USERPROFILE\Desktop\GMAO-Final\GMAO"
```

> ⚠️ `git clone` **crée son propre sous-dossier** du nom du dépôt. Le projet
> n'est pas dans `GMAO-Final` mais dans `GMAO-Final\GMAO`. C'est la source du
> message « Impossible de trouver le chemin d'accès » : on cherche un étage trop
> haut.
>
> ⚠️ **La variable `$projet` ne survit pas à la fermeture de PowerShell.** La
> retaper à chaque nouvelle fenêtre. Un `git fatal: not a git repository` vient
> presque toujours de là.

Créer le dossier publié, puis le remplir :

```powershell
New-Item -ItemType Directory -Force "C:\GMAO"

# a) Construire le client
cd "$projet\client\<dossier-angular>"
npx ng build

# b) Le déposer dans l'API
cd $projet
Copy-Item "client\<dossier-angular>\dist\<nom-app>\browser\*" "server\src\<Projet>.API\wwwroot" -Recurse -Force

# c) Publier
dotnet publish "$projet\server\src\<Projet>.API" -c Release -o "C:\GMAO"
```

**Vérification — les deux doivent répondre `True` :**

```powershell
Test-Path "C:\GMAO\<Projet>.API.dll"
Test-Path "C:\GMAO\wwwroot\index.html"
```

> ⚠️ Le résultat d'`ng build` n'est pas le dossier `dist`, mais le sous-dossier
> `dist\<nom-app>\browser` qu'il contient. Copier le niveau au-dessus produit un
> `wwwroot\browser\index.html` que l'API ne trouve pas : la page ne s'affiche
> pas et le serveur répond **401 Unauthorized** sur l'accueil. Rien dans ce
> message ne mène au vrai coupable.
>
> ⚠️ Si le site existe déjà et tourne, l'**arrêter avant** de publier
> (`Stop-WebSite`) : un site en marche verrouille ses `.dll`.

---

## 5. Créer le site IIS

Gestionnaire IIS → **Sites** → clic droit → **Ajouter un site Web…**

| Champ | Valeur |
|---|---|
| Nom du site | `GMAO` |
| Pool d'applications | `GMAO` (créé automatiquement) |
| Chemin d'accès physique | `C:\GMAO` |
| Type | `http` |
| Adresse IP | `Toutes non attribuées` |
| **Port** | `5091` |
| Nom de l'hôte | *vide* |
| Démarrez le site immédiatement | ☐ **décocher** |

Ne pas toucher à « Se connecter en tant que… » : l'authentification directe est
ce qu'il faut.

> **Pourquoi pas le port 80.** Il est pris par « Default Web Site ». Une adresse
> sans port exigerait un alias DNS (`gmao.simotex.tn`) demandé à l'informatique,
> puis une liaison port 80 **avec nom d'hôte** — IIS distingue alors les sites
> par le nom demandé. Sans l'alias DNS, aucune tablette ne saurait où aller.

---

## 6. Régler le pool d'applications

⚠️ **Ce réglage n'est pas dans la fenêtre d'ajout du site.** Il vit sur le pool,
qui est un nœud séparé dans l'arborescence de gauche, **au-dessus de « Sites »**.

Gestionnaire IIS → **Pools d'applications** → **double-clic** sur `GMAO`.

### 6.1 Version du .NET CLR → « Aucun code managé »

```
Nom :                     GMAO
Version du .NET CLR :    [Aucun code managé ▾]   ← changer ceci
Mode de pipeline managé : [Intégré ▾]
```

> C'est le réglage le plus contre-intuitif de la procédure. Une application .NET
> Core n'est **pas** exécutée par le moteur .NET de IIS : IIS lui transmet
> seulement les requêtes, et elle tourne dans son propre processus à côté.
> Laisser « .NET CLR v4.0 » fait échouer le démarrage avec un **500.30** muet.

### 6.2 Paramètres avancés (clic droit → *Paramètres avancés…*)

| Réglage | Valeur | Pourquoi |
|---|---|---|
| **Activer les applications 32 bits** | `False` | ⚠️ voir ci-dessous |
| **Mode de démarrage** | `AlwaysRunning` | l'application démarre avec Windows |
| **Délai d'inactivité (minutes)** | `0` | sinon IIS l'éteint après 20 min sans visiteur |
| **Recyclage → Intervalle régulier** | `0` | évite une coupure quotidienne |
| **Charger le profil utilisateur** | `True` | ⚠️ voir ci-dessous |
| **Démarrer immédiatement le pool** | coché | sinon 503 Service Unavailable |

> ⚠️ **« Activer les applications 32 bits » à `True` provoque un 500.31.** Le
> serveur SIMOTEX a **deux** installations de .NET :
> `C:\Program Files\dotnet` (x64, avec le runtime 9) et
> `C:\Program Files (x86)\dotnet` (x86, qui s'arrête à la version 8). En mode
> 32 bits, IIS cherche dans la seconde et ne trouve pas .NET 9.
>
> ⚠️ **« Charger le profil utilisateur » à `False` déconnecte tout le monde à
> chaque redémarrage du pool.** ASP.NET Core range ses clés de chiffrement dans
> le profil Windows du compte qui exécute l'application ; sans profil, elles
> vivent en mémoire et disparaissent. Les traces le disent :
> `Using an in-memory repository. Keys will not be persisted to storage.`

---

## 7. Le fichier de secrets : `appsettings.Local.json`

C'est le mécanisme retenu pour **tout ce qui ne doit jamais entrer dans Git**.

### 7.1 Le mettre en place dans le code (si GMAO ne l'a pas déjà)

Dans `Program.cs`, juste après `CreateBuilder` :

```csharp
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Les variables d'environnement et la ligne de commande REPRENNENT la main :
// une source ajoutée après l'emporte sur les précédentes, et sans ces deux
// lignes un fichier posé sur le serveur écraserait un --urls passé au
// lancement. C'est l'inverse de la précédence attendue.
builder.Configuration.AddEnvironmentVariables();
builder.Configuration.AddCommandLine(args);
```

Et dans `.gitignore` :

```
appsettings.Local.json
appsettings.*.Local.json
```

> **Pourquoi pas `appsettings.Development.json`.** Il est **suivi par Git**. Un
> mot de passe déposé dedans part sur GitHub au premier `git push` — et un
> secret publié doit être considéré comme compromis, même effacé ensuite.
> `reloadOnChange: true` offre en plus un avantage net : changer un mot de passe
> ne demande pas de redémarrer le site.

### 7.2 Le créer sur le serveur

```powershell
notepad C:\GMAO\appsettings.Local.json
```

```json
{
  "ConnectionStrings": {
    "GMAO": "Server=SRV-TN-BI;Database=<NomBaseGMAO>;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
  },
  "Jwt": {
    "Cle": "<48 caractères aléatoires>"
  },
  "Cors": {
    "OriginesAutorisees": [
      "http://SRV-TN-BI:5091",
      "http://localhost:5091",
      "http://192.168.6.245:5091"
    ]
  }
}
```

Pour engendrer la clé JWT :

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```

> ⚠️ **Ce fichier n'est copié par aucune publication et ne vient pas par
> `git pull`.** Il est à créer une fois sur le serveur, à la main. En revanche,
> aucune mise à jour future ne l'écrasera.
>
> ⚠️ **La clé JWT se génère une fois et ne change plus.** La modifier
> déconnecterait tout le monde instantanément. Elle doit être **différente** de
> celle du poste de développement.
>
> ⚠️ **Le CORS doit être déclaré même quand l'API sert son propre client.** Sous
> `dotnet run` les origines venaient de `appsettings.Development.json` ; sous
> IIS l'application tourne en **Production**, ce fichier n'est plus lu, la liste
> est vide, et un garde-fou refuse de démarrer plutôt que d'ouvrir l'API à
> toutes les origines. Erreur observée :
> `Aucune origine CORS déclarée. Renseignez « Cors:OriginesAutorisees »`.

---

## 8. Donner accès à la base de données

Sous IIS, l'application se connecte à SQL Server avec le compte du **pool**, et
non avec le compte de la personne connectée. Ce compte n'a aucun droit au
départ : le site démarre, puis échoue à la première page.

SSMS **ouvert en administrateur**, nouvelle requête :

```sql
CREATE LOGIN [IIS AppPool\GMAO] FROM WINDOWS;
GO
USE <NomBaseGMAO>;
GO
CREATE USER [IIS AppPool\GMAO] FOR LOGIN [IIS AppPool\GMAO];
GO
ALTER ROLE db_owner ADD MEMBER [IIS AppPool\GMAO];
GO
```

Même chose sans SSMS, depuis PowerShell :

```powershell
sqlcmd -S SRV-TN-BI -E -C -Q "CREATE LOGIN [IIS AppPool\GMAO] FROM WINDOWS;"
sqlcmd -S SRV-TN-BI -E -C -d <NomBaseGMAO> -Q "CREATE USER [IIS AppPool\GMAO] FOR LOGIN [IIS AppPool\GMAO]; ALTER ROLE db_owner ADD MEMBER [IIS AppPool\GMAO];"
```

> ⚠️ **Si SSMS répond « Database does not exist » alors que la base existe**,
> c'est que SSMS est connecté à une **autre instance SQL**. Vérifier avec :
>
> ```sql
> SELECT @@SERVERNAME AS Serveur, SUSER_NAME() AS Compte, IS_SRVROLEMEMBER('sysadmin') AS Sysadmin;
> SELECT name FROM sys.databases ORDER BY name;
> ```
>
> `Sysadmin` doit valoir `1`. À `0`, il faudra passer par l'administrateur SQL
> de SIMOTEX.

---

## 9. Appliquer les migrations — manuellement

⚠️ **Le schéma ne se migre pas tout seul hors développement, et c'est
délibéré.** Une application qui modifie sa propre base au démarrage est
ingérable en exploitation : deux instances qui démarrent ensemble se marchent
dessus, et le retour arrière devient impossible.

```powershell
$projet = "$env:USERPROFILE\Desktop\GMAO-Final\GMAO"
$env:ConnectionStrings__GMAO = "Server=SRV-TN-BI;Database=<NomBaseGMAO>;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"

dotnet ef database update --project "$projet\server\src\<Projet>.Infrastructure" --startup-project "$projet\server\src\<Projet>.API"
```

> La variable d'environnement pointe la bonne base **le temps de cette commande
> seulement** : elle disparaît à la fermeture de PowerShell, et ne touche ni le
> dépôt ni le fichier du serveur. C'est nécessaire parce que `dotnet ef`
> s'exécute depuis le **clone**, dont l'`appsettings.Development.json` pointe la
> base du poste de développement.

Si `dotnet ef` est introuvable :

```powershell
dotnet tool install --global dotnet-ef
```

**À refaire à chaque mise à jour contenant une migration.**

---

## 10. Ouvrir le port

```powershell
New-NetFirewallRule -DisplayName "GMAO (5091)" -Direction Inbound -Protocol TCP -LocalPort 5091 -Action Allow
```

---

## 11. Démarrer et vérifier

```powershell
Import-Module WebAdministration
Start-WebSite -Name "GMAO"

Invoke-WebRequest http://localhost:5091 -UseBasicParsing | Select-Object StatusCode
```

> ⚠️ Sous IIS, l'application .NET ne démarre qu'à la **première requête HTTP**.
> Il n'existe aucun bouton « démarrer l'application » : c'est la requête qui la
> lance, et qui crée le dossier `logs`.

**Tester dans cet ordre** — c'est l'ordre qui désigne le coupable sans deviner :

| # | Où | Adresse | Si ça échoue ici seulement |
|---|---|---|---|
| 1 | navigateur **du serveur** | `http://localhost:5091` | l'application |
| 2 | navigateur **du serveur** | `http://SRV-TN-BI:5091` | la liaison IIS |
| 3 | **tablette du réseau usine** | `http://SRV-TN-BI:5091` | le pare-feu |

---

## 12. Diagnostiquer

### Les traces

```powershell
# Journal applicatif (Serilog), s'il existe
Get-Content C:\GMAO\logs\*.log -Tail 40

# Trace de démarrage — à activer quand l'application meurt avant d'écrire
$wc = "C:\GMAO\web.config"
(Get-Content $wc -Raw) -replace 'stdoutLogEnabled="false"', 'stdoutLogEnabled="true"' | Set-Content $wc
New-Item -ItemType Directory -Force C:\GMAO\logs | Out-Null
Restart-WebAppPool -Name "GMAO"
try { Invoke-WebRequest http://localhost:5091 -UseBasicParsing } catch {}
Start-Sleep -Seconds 3
Get-Content C:\GMAO\logs\stdout*.log -Tail 50
```

> ⚠️ **Supprimer les anciens fichiers de trace avant de relire**
> (`Remove-Item C:\GMAO\logs\*.log -Force`). `stdout*.log` crée un fichier par
> processus : sans ménage, on relit l'erreur déjà corrigée du lancement
> précédent et on croit que rien n'a bougé. Cela nous est arrivé.

### Le tableau des erreurs rencontrées

| Erreur | Cause | Remède |
|---|---|---|
| **500.19** | Hosting Bundle absent | §3.1 |
| **500.31** `Failed to load ASP.NET Core runtime` | pool en **32 bits** | §6.2 |
| **500.30** `app failed to start` | l'application lève une exception au démarrage | lire `stdout*.log` |
| `Aucune origine CORS déclarée` | `Cors:OriginesAutorisees` vide en Production | §7.2 |
| `FormatException … Expected an ASCII digit` | message de validation `DataAnnotations` contenant `{` non doublées — **masque la vraie erreur** | doubler en `{{` `}}` ; la vraie cause était `Jwt:Cle` absente |
| `Login failed for user 'IIS APPPOOL\…'` | droits SQL | §8 |
| `Cannot open database` | mauvais nom de base | §7.2 |
| **401** sur l'accueil | `wwwroot\index.html` absent | §4 |
| **503 Service Unavailable** | pool arrêté | §6.2 |

> ⚠️ **Une erreur de validation d'options peut se masquer elle-même.**
> `DataAnnotations` passe le message d'erreur à `String.Format` : une accolade
> simple y est lue comme un emplacement de formatage. Un message contenant
> `{ "Cle": … }` fait lever une `FormatException` **au lieu** d'afficher la
> cause. Le piège ne se déclenche que sur une machine où la valeur manque —
> donc, par construction, sur le serveur et jamais en développement.

---

## 13. Les faux problèmes — ne pas y perdre de temps

### Le réseau depuis le poste de développement

Le PC de développement atteint `SRV-TN-BI` **par VPN** (`10.212.134.200`), pas
sur le sous-réseau `192.168.6.x`. Le VPN autorise le **3389** (Bureau à
distance) mais pas un port applicatif.

```powershell
# Sur le PC — le verdict en deux lignes
Test-NetConnection 192.168.6.245 -Port 3389   # True
Test-NetConnection 192.168.6.245 -Port 5091   # False
```

> ⚠️ **Un échec depuis le PC de développement ne prouve rien sur les
> tablettes** : ce n'est pas le même chemin réseau. Le seul test valable est
> depuis un appareil réellement situé dans l'usine. Nous avons cherché un
> problème de pare-feu qui n'existait pas.

### Chrome et Edge « ne marchent pas, Firefox privé oui »

Trois causes possibles, dans cet ordre de probabilité :

1. **Le remplissage automatique** réinjecte un mot de passe enregistré. Une
   fenêtre privée ne remplit rien — d'où la différence. Le journal serveur
   tranche immédiatement : il nomme l'identifiant reçu et distingue
   « identifiant inconnu » de « mot de passe invalide ».
2. **Le service worker** d'une PWA, enregistré sur une origine visitée
   auparavant : il ressert l'ancienne version et survit au vidage du cache.
   F12 → Application → *Service workers* → **Unregister**, puis **fermer tous
   les onglets** de l'application.
3. **HSTS** : Chrome a retenu « ce site est en HTTPS ».
   `chrome://net-internals/#hsts` → *Delete domain security policies*.

> ⚠️ **Un navigateur fraîchement installé qui échoue élimine les causes 1 à 3** :
> il n'a aucune mémoire. Chercher alors au niveau de la machine (proxy, DNS).

### Le service worker en réseau local

Sur `http://SRV-TN-BI:5091`, les navigateurs **refusent d'installer un service
worker** : il exige HTTPS ou `localhost`. C'est une bonne nouvelle — c'est lui
qui servait les anciennes versions en cache. Le revers : l'application n'est pas
installable comme application mobile et ne fonctionne pas hors réseau.

---

## 14. Les mises à jour, ensuite

```powershell
$projet = "$env:USERPROFILE\Desktop\GMAO-Final\GMAO"

cd $projet
git status --short          # vérifier AVANT de jeter quoi que ce soit
git pull

cd "$projet\client\<dossier-angular>"
npx ng build

cd $projet
Copy-Item "client\<dossier-angular>\dist\<nom-app>\browser\*" "server\src\<Projet>.API\wwwroot" -Recurse -Force

Import-Module WebAdministration
Stop-WebSite -Name "GMAO"
dotnet publish "$projet\server\src\<Projet>.API" -c Release -o "C:\GMAO"
Start-WebSite -Name "GMAO"
```

Et **si la mise à jour contient une migration**, refaire le §9 avant de
redémarrer.

> ⚠️ **Ne jamais lancer `git checkout -- .` sans regarder `git status` d'abord.**
> Cette commande a effacé la chaîne de connexion du serveur, qui vivait alors
> dans `appsettings.Development.json` — fichier suivi par Git. L'application
> s'est remise à pointer la base du poste de développement. C'est précisément ce
> que `appsettings.Local.json` (§7) empêche désormais.
>
> ⚠️ **Ne plus utiliser `dotnet run` une fois le site sous IIS** : deux copies
> de l'application tourneraient sur la même base.

---

## 15. Récapitulatif — la liste à cocher

```
[ ]  3.1  Hosting Bundle ASP.NET Core 9 installé
[ ]  3.2  WebSockets installés (si temps réel)
[ ]  4    Dépôt cloné, client construit, copié dans wwwroot
[ ]  4    dotnet publish vers C:\GMAO — les deux Test-Path à True
[ ]  5    Site IIS créé, port 5091, chemin C:\GMAO
[ ]  6.1  Pool → Version du .NET CLR = « Aucun code managé »
[ ]  6.2  Pool → 32 bits = False
[ ]  6.2  Pool → AlwaysRunning, inactivité 0, recyclage 0
[ ]  6.2  Pool → Charger le profil utilisateur = True
[ ]  7.2  appsettings.Local.json créé (ConnectionStrings, Jwt, Cors)
[ ]  8    Droits SQL pour IIS AppPool\GMAO
[ ]  9    Migrations appliquées
[ ] 10    Règle de pare-feu sur 5091
[ ] 11    localhost:5091 → 200
[ ] 11    SRV-TN-BI:5091 → 200 depuis le serveur
[ ] 11    SRV-TN-BI:5091 → testé depuis une tablette de l'usine
```

---

*Rédigé le 13 octobre 2026, d'après le déploiement de Qualité En Cours sur
SRV-TN-BI. Les avertissements ⚠️ correspondent à des erreurs réellement
rencontrées.*
