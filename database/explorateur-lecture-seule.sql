-- ============================================================================
-- GMAO SIMOTEX — compte SQL en lecture seule pour l'Explorateur de données.
--
-- L'Explorateur n'exécute que des requêtes prédéfinies dans le code, dans une
-- transaction systématiquement annulée. Ce compte ajoute une troisième barrière :
-- même en cas d'erreur de programmation, il ne peut rien modifier.
--
-- 1. Remplacez le mot de passe ci-dessous, puis exécutez ce script en tant
--    qu'administrateur SQL Server (le serveur doit accepter l'authentification SQL).
-- 2. Ajoutez la chaîne de connexion « Explorateur » à l'API, par exemple dans
--    docker-compose.yml (service backend) :
--      ConnectionStrings__Explorateur=Server=sqlserver;Database=gmao;User Id=gmao_lecture;Password=<mot de passe>;TrustServerCertificate=True;
--    Sans cette chaîne, l'Explorateur utilise la connexion principale.
-- ============================================================================
USE master;
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'gmao_lecture')
    CREATE LOGIN gmao_lecture WITH PASSWORD = 'ChangezCeMotDePasse!2026', CHECK_POLICY = ON;
GO

USE gmao;
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'gmao_lecture')
    CREATE USER gmao_lecture FOR LOGIN gmao_lecture;
ALTER ROLE db_datareader ADD MEMBER gmao_lecture;
-- Les comptes et mots de passe de l'application ne sont jamais lus par l'Explorateur
DENY SELECT ON dbo.AspNetUsers TO gmao_lecture;
DENY SELECT ON dbo.AspNetUserTokens TO gmao_lecture;
DENY SELECT ON dbo.AspNetUserLogins TO gmao_lecture;
DENY SELECT ON dbo.AspNetUserClaims TO gmao_lecture;
DENY SELECT ON dbo.PiecesJointes TO gmao_lecture;
GO
PRINT 'Compte gmao_lecture prêt (lecture seule).';
