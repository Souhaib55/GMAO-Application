# Sécurité V3 — GMAO SIMOTEX

Revue du 3 au 4 novembre 2026, selon le Top 10 de l'OWASP et le niveau 2 de l'ASVS, sur la branche `amelioration-v3`.

**Méthode** :

- lecture de chaque contrôleur et de la configuration (`API/Program.cs`) ;
- essais en conditions réelles : API en mode `Production`, SQL Server en niveau de compatibilité 120 ;
- tests automatisés, listés dans la colonne « Test ».

**Échelle de gravité** :

- **Élevée** : exploitable depuis le réseau de l'usine, avec un impact sur les données ou les comptes.
- **Moyenne** : exploitable sous conditions, ou impact limité.
- **Faible** : bonne pratique, ou risque résiduel.

## 1. Constats corrigés

| # | Constat | Gravité | Correction | Test |
|---|---|---|---|---|
| S1 | **Fichiers joints** : seule l'extension était contrôlée. Le type de contenu envoyé par le navigateur était enregistré tel quel, puis renvoyé aux autres utilisateurs. Une page web renommée `photo.jpg` et envoyée avec `text/html` était donc acceptée. | Moyenne | `API/Security/FichierSecurise.cs`, utilisé par les deux points d'envoi (documents et photo de la demande d'intervention) :<br>• les premiers octets doivent correspondre au type annoncé par l'extension (PDF, JPEG, PNG, HEIC, Office, ZIP…) ; un texte ne doit pas commencer comme un programme ou une page web ;<br>• le type de contenu est décidé par le serveur à partir de l'extension, y compris au téléchargement des fichiers déjà enregistrés ;<br>• le nom est nettoyé (ni chemin, ni caractère de contrôle, 200 caractères au maximum).<br>Inchangé : la limite de 10 Mo, le stockage en base (aucun chemin disque), `Content-Disposition: attachment` et `nosniff`. | `SecuriteTests` (11 cas). `api_tests.py` : page web en `.jpg` refusée, programme en `.pdf` refusé, vraie photo acceptée malgré un type navigateur trompeur, nom nettoyé, type `image/png` renvoyé. |
| S2 | **Adresse IP falsifiable** : les en-têtes `X-Forwarded-For` étaient acceptés de n'importe quel émetteur (`KnownNetworks.Clear()`). N'importe quel poste pouvait se faire passer pour une autre adresse à chaque essai, contourner la limite de 10 connexions par minute et fausser les adresses du journal. | Moyenne | Seuls les proxys de confiance sont crus : la boucle locale, plus les réseaux listés dans la nouvelle clé `ReverseProxy:KnownNetworks` (déjà renseignée dans `docker-compose.yml` pour nginx). Sous IIS, rien à configurer. | Essai depuis un conteneur Docker (adresse hors boucle locale) avec 12 adresses falsifiées : `401 ×10` puis `429, 429`. Avant correction, aucune limite. |
| S3 | **Pas de politique de contenu (CSP)** : rien ne limitait les scripts, les cadres ou les ressources externes. | Moyenne | En-têtes envoyés sur toutes les réponses :<br>• `Content-Security-Policy` : scripts uniquement de l'application ; styles en ligne permis (nécessaires à Angular) ; images `data:` et `blob:` ; cadres limités à Power BI ; `frame-ancestors 'none'` ;<br>• `Permissions-Policy` : caméra, micro, géolocalisation… désactivés pour la page ;<br>• `Cross-Origin-Opener-Policy` ;<br>• `Cache-Control: no-store` sur `/api`.<br>La compilation Angular n'insère plus de gestionnaire `onload` dans `index.html` (`inlineCritical: false`) : aucun script en ligne, donc la CSP ne bloque rien. | `api_tests.py` : présence et contenu des en-têtes. Les quatre suites de tests du navigateur passent avec la CSP active (voir le rapport final). |
| S4 | **Découverte de comptes** : le message « Ce compte est désactivé » apparaissait **avant** la vérification du mot de passe. On pouvait ainsi savoir qu'une adresse e-mail avait un compte. | Faible | Le mot de passe est vérifié d'abord (`CheckPasswordSignInAsync`, avec verrouillage). L'état du compte n'est révélé qu'à quelqu'un qui connaît le mot de passe. | `api_tests.py` : même réponse et même statut pour un e-mail inconnu et pour un mauvais mot de passe. |
| S5 | **Mots de passe** : 8 caractères au minimum, aucun contrôle des mots évidents (nom, « Azerty1234 », « Maintenance1 »), messages d'erreur en anglais. | Moyenne | 10 caractères au minimum, avec majuscule, minuscule et chiffre. Sont refusés : le prénom, le nom ou l'identifiant e-mail de la personne, et une liste de mots courants (`API/Security/MotDePasse.cs`). Tous les messages d'Identity sont en français. **Les mots de passe actuels restent valables** : la règle s'applique à la création et à la réinitialisation. Les écrans « Utilisateurs » et « Réinitialiser » affichent la nouvelle règle. | `SecuriteTests` (3 cas, dont le mot de passe de démonstration). `api_tests.py` : 8 caractères refusés avec un message en français, mot de passe contenant le nom refusé. |
| S6 | **Mot de passe oublié** : un compte désactivé pouvait encore changer son mot de passe avec un lien reçu avant sa désactivation. Les liens restaient valables 24 h. | Faible | Réinitialisation refusée pour un compte désactivé. Liens valables 2 h. | Relecture du code. Non couvert par un test automatisé : il faudrait un vrai e-mail. |
| S7 | **Contrôleurs de démonstration** : `BuggyController` (déclenche volontairement une erreur serveur) et `WeatherForecastController` (modèle Visual Studio). | Faible | Supprimés. Aucun écran ne les utilisait. | `api_tests.py` : `/api/buggy/internalerror` répond 404. |
| S8 | **Journal falsifiable** : le texte de recherche tapé par l'utilisateur était écrit tel quel dans le journal du serveur. Un retour à la ligne permettait d'y fabriquer de fausses lignes. | Faible | Écriture structurée, sur une seule ligne (équipements et pièces). | Relecture du code. |

## 2. Points vérifiés, sans correction nécessaire

| Domaine | Constat | Preuve |
|---|---|---|
| **Droits d'accès** | Tout point d'accès exige une connexion (politique par défaut), sauf la connexion et le mot de passe oublié.<br>Les rôles sont contrôlés sur chaque contrôleur : `[Authorize(Roles=…)]`, ou `SupervisorWrites` (lecture pour tous, écriture pour le superviseur).<br>Le demandeur ne voit que ses demandes. Le technicien voit ses demandes et celles qui lui sont affectées.<br>Le temps, les pièces, les étapes et les documents sont toujours rattachés à l'intervention vérifiée. Les nouveaux filtres et l'export passent par le même contrôle de visibilité. | `api_tests.py`, 168 vérifications, dont :<br>• le demandeur ne peut pas lire la fiche, le suivi ou les documents d'une intervention qui n'est pas la sienne (en changeant le numéro) ;<br>• le technicien ne peut pas saisir de temps sur celle d'un autre ;<br>• l'export du demandeur ne contient que ses demandes. |
| **Explorateur de données** | Le navigateur n'envoie jamais de SQL, seulement l'identifiant d'une question prédéfinie et des paramètres typés.<br>Au démarrage, le catalogue est contrôlé : il ne doit contenir que des lectures.<br>Chaque requête s'exécute dans une transaction toujours annulée, avec un délai de 20 s et 1 000 lignes au plus.<br>Une connexion en lecture seule est recommandée (`database/explorateur-lecture-seule.sql`). | `api_tests.py` : les 51 questions, et une tentative d'injection dans l'identifiant refusée. |
| **Injection SQL ailleurs** | EF Core uniquement, requêtes paramétrées. Aucun SQL construit par concaténation dans les contrôleurs. | Relecture du code. |
| **XSS** | Angular échappe tout le texte affiché. Les deux `innerHTML` du code n'affichent que des icônes SVG fixes, écrites dans le code (le type de notification envoyé par le serveur sert seulement à choisir l'icône). Le lien Power BI est validé côté serveur (https et domaine Power BI). | Relecture du code. |
| **Fuite d'informations** | En `Production`, une erreur renvoie seulement `{"message":"Une erreur interne est survenue."}`, sans trace ni détail. | Essai réel avant la suppression de `BuggyController` : statut 500 et ce message uniquement. |
| **Session** | L'application n'utilise **pas de jeton JWT** : la session est un cookie ASP.NET Identity.<br>• `HttpOnly`, `SameSite=Lax`, marqué `Secure` dès que la page est en HTTPS ;<br>• durée de 12 h, prolongée tant que l'utilisateur est actif ;<br>• rôle et désactivation revérifiés toutes les 5 minutes.<br>Les clés `Jwt:*` citées dans les consignes n'existent pas dans ce projet : il n'y a pas de clé à configurer, et donc aucune clé de jeton à protéger. | Relecture du code. |
| **Requêtes forgées depuis un autre site (CSRF)** | Le cookie `SameSite=Lax` n'est pas envoyé par un autre site pour un POST, un PUT ou un DELETE. Les appels JSON exigent `application/json`, ce qui impose une vérification CORS préalable. | Relecture du code. |
| **CORS** | Origines explicites, prises dans `Cors:AllowedOrigins`. Aucun joker n'est utilisé avec les cookies. | Relecture du code. |
| **Limitation des connexions** | Connexion, mot de passe oublié et réinitialisation : 10 essais par minute et par adresse. Compte verrouillé 15 minutes après 5 échecs. | Essai réel : `429` au 11ᵉ essai. |
| **Dépendances .NET** | `dotnet list package --vulnerable --include-transitive` : aucun paquet vulnérable (API, Core, Infrastructure). | Commande exécutée le 3 novembre 2026. |

## 3. Risques restants, et décisions à prendre

| # | Risque | Gravité | Recommandation |
|---|---|---|---|
| R1 | **Comptes de démonstration en production.** Le mot de passe `Simotex!2026` des comptes `*@simotex.demo` est écrit dans le dépôt et dans les guides. Si la base de `SRV-TN-BI` a été chargée avec `demo-donnees-simotex.sql`, ces comptes s'ouvrent depuis n'importe quel poste de l'usine. **Ceci n'a pas pu être vérifié d'ici.** | **Élevée** si les comptes existent | Avant l'usage réel, exécuter `database/demo-cleanup.sql`, ou au minimum désactiver ces comptes dans Paramètres → Utilisateurs. |
| R2 | **Angular 16** : `npm audit` signale 8 alertes (4 élevées, 4 moyennes). Aucune correction n'existe en version 16 : il faut Angular 19.2 ou plus. La plupart concernent des fonctions que l'application n'utilise pas : rendu serveur, hydratation, i18n, jeton XSRF du client HTTP. Celles sur l'assainissement des modèles supposent un modèle écrit par un attaquant, ce qui n'arrive pas ici. Le paquet ajouté (`qrcode-generator` 2.0.4, licence MIT, sans dépendance) n'a aucune alerte. | Moyenne | Planifier la montée de version, une version majeure à la fois (16 → 17 → 18 → 19), dans une branche dédiée. Non faite dans cette version, comme demandé. |
| R3 | **HTTP en clair sur le réseau de l'usine.** Sur le Wi-Fi, un appareil malveillant peut lire les mots de passe à la connexion et le cookie de session. | Moyenne | Plan HTTPS optionnel au §4. |
| R4 | **Verrouillage volontaire.** 5 mauvais mots de passe bloquent un compte 15 minutes : quelqu'un peut gêner un collègue exprès. | Faible | Accepté : c'est la contrepartie de la protection contre les essais de mots de passe. Le superviseur peut débloquer le compte. |
| R5 | **Mot de passe `sa` d'exemple** dans `appsettings.Production.json` et `docker-compose.yml` (`YourStrong!Password123`). La production sous IIS ne l'utilise pas : elle lit `appsettings.Local.json`. | Faible | Ne jamais réutiliser ce mot de passe sur un vrai serveur. Le retirer du dépôt le jour où Docker ne sert plus. |
| R6 | **Mot de passe à 10 caractères.** L'ASVS de niveau 2 recommande 12. 10 a été retenu pour la saisie sur tablette. | Faible | Décision du propriétaire : il suffit de passer `RequiredLength` à 12 dans `Program.cs`. |

## 4. Plan HTTPS optionnel (non appliqué)

**Pourquoi ce n'est pas forcé** : l'adresse `http://SRV-TN-BI:5091` est enregistrée dans les tablettes et imprimée sur les étiquettes QR. Passer en HTTPS change cette adresse. Il faut aussi que chaque tablette fasse confiance au certificat interne, sinon le navigateur affiche une alerte.

1. **Certificat interne** :
   - **Avec l'Active Directory de SIMOTEX** (AD CS) : demander un certificat « Serveur Web » pour `SRV-TN-BI` et `192.168.6.245`. Les postes du domaine lui font déjà confiance.
   - **Sans AD CS** : créer un certificat auto-signé sur le serveur.

     ```powershell
     New-SelfSignedCertificate -DnsName "SRV-TN-BI","192.168.6.245" -CertStoreLocation Cert:\LocalMachine\My -NotAfter (Get-Date).AddYears(3)
     ```

     L'exporter **sans la clé privée** (`.cer`), puis l'installer sur chaque tablette, dans les autorités de certification de confiance.
2. **IIS** : site GMAO → Liaisons → Ajouter → `https`, port `5443`, choisir le certificat. **Garder la liaison http 5091** pendant la transition.
3. **Pare-feu** :

   ```powershell
   New-NetFirewallRule -DisplayName "GMAO HTTPS (5443)" -Direction Inbound -Protocol TCP -LocalPort 5443 -Action Allow
   ```

4. **Configuration** : ajouter `https://SRV-TN-BI:5443` à `Cors:AllowedOrigins`. L'application n'a besoin d'aucune autre modification : le cookie devient `Secure` tout seul en HTTPS.
5. **Tablettes** : ouvrir `https://SRV-TN-BI:5443` et vérifier qu'aucune alerte n'apparaît.
6. **Étiquettes QR** : les réimprimer en indiquant l'adresse HTTPS sur la page « Étiquettes QR ».
7. **Seulement quand toutes les tablettes sont passées** : rediriger le HTTP vers le HTTPS (module URL Rewrite d'IIS), puis envisager HSTS. Ne pas activer HSTS avant : un navigateur qui l'a mémorisé refuse ensuite le HTTP.

Avantage supplémentaire : en HTTPS, la caméra pourrait être utilisée directement dans la page. L'application n'en dépend pas aujourd'hui.

## 5. Nouvelles clés de configuration

| Clé | Rôle | Valeur par défaut |
|---|---|---|
| `ReverseProxy:KnownNetworks` | Réseaux (notation CIDR) des proxys dont on accepte `X-Forwarded-For`. Inutile sous IIS. Dans Docker : `172.16.0.0/12`. | vide (boucle locale seulement) |

Aucune clé existante n'a été renommée.
