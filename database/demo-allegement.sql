-- =============================================================================
--  Lightens a copy of the development database into a clean demonstration base
--  (to run on gmao_demo, NEVER on the working database).
--
--  Keeps: the last 60 days of activity (closed jobs thinned by half), open work,
--  preventive jobs due within 7 days, 12 representative preventive plans, the
--  textile machines and reference lists, the demo accounts.
--  Removes: older history, anything further in the future, test data and test
--  accounts, the generic machines of the first version, notifications.
-- =============================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME() = N'gmao' THROW 50000, N'Refusé : ce script se lance sur la copie gmao_demo, pas sur gmao.', 1;

BEGIN TRAN;

DECLARE @now datetime2 = SYSDATETIME();
DECLARE @superviseur int = (SELECT ID FROM Users WHERE Email = N'superviseur@simotex.demo');
DECLARE @technicien  int = (SELECT ID FROM Users WHERE Email = N'm.bensalah@simotex.demo');

-- ---------------------------------------------------------------- Preventive plans kept
DECLARE @plans TABLE (Id int PRIMARY KEY);
INSERT @plans VALUES (42),(47),(49),(51),(55),(58),(63),(70),(76),(77),(79),(82);

-- ---------------------------------------------------------------- Work orders removed
DECLARE @ot TABLE (Id int PRIMARY KEY);
INSERT @ot SELECT IdDemandeIntervention FROM DemandeInterventions
WHERE IsActif = 0                                                              -- already deleted
   OR (IdPlanPreventif IS NOT NULL AND IdPlanPreventif NOT IN (SELECT Id FROM @plans))
   OR COALESCE(DatePlanifiee, DateCreation) < DATEADD(DAY, -60, @now)         -- old history
   OR DatePlanifiee > DATEADD(DAY, 7, @now)                                    -- far future
   OR DateCreation > @now                                                      -- declared in the future
   OR Titre LIKE N'%test%' OR Titre LIKE N'E2E%' OR Titre LIKE N'QA %';        -- test data

-- Closed jobs: keep one in two, the dashboards stay meaningful and the planning readable
INSERT @ot SELECT IdDemandeIntervention FROM DemandeInterventions
WHERE StatusId = 4 AND IdDemandeIntervention % 2 = 0
  AND IdDemandeIntervention NOT IN (SELECT Id FROM @ot);

UPDATE DemandesAchat   SET IdDemandeIntervention = NULL WHERE IdDemandeIntervention IN (SELECT Id FROM @ot);
UPDATE MouvementsStock SET IdDemandeIntervention = NULL WHERE IdDemandeIntervention IN (SELECT Id FROM @ot);
DELETE FROM JournalActivites WHERE Entite = N'Intervention' AND EntiteId IN (SELECT Id FROM @ot);
DELETE FROM PiecesJointes    WHERE Entite = N'Intervention' AND EntiteId IN (SELECT Id FROM @ot);
DELETE FROM DemandeInterventions WHERE IdDemandeIntervention IN (SELECT Id FROM @ot);  -- temps, pièces, étapes : en cascade

DELETE FROM PlansPreventifs WHERE Id NOT IN (SELECT Id FROM @plans);                  -- étapes du plan : en cascade
UPDATE PlansPreventifs SET IsActif = 1;

-- ---------------------------------------------------------------- Test accounts removed
DECLARE @u TABLE (Id int PRIMARY KEY, Email nvarchar(256));
INSERT @u SELECT ID, Email FROM Users
WHERE Email IN (N'karim@gmail.com', N'karim1@gmail.com', N'loujain@gmail.com', N'mohamed@gmail.com', N'sou123@gmail.com',
                N'superviseur@example.com', N'superviseur@gmao.com', N'superviseur1@gmao.com', N'testuser@example.com');

UPDATE DemandeInterventions SET DemandeursID = @superviseur  WHERE DemandeursID  IN (SELECT Id FROM @u);
UPDATE DemandeInterventions SET DestinatairesID = @technicien WHERE DestinatairesID IN (SELECT Id FROM @u);
UPDATE InterventionTemps    SET IdTechnicien = @technicien   WHERE IdTechnicien  IN (SELECT Id FROM @u);
UPDATE PlansPreventifs      SET IdTechnicien = @technicien   WHERE IdTechnicien  IN (SELECT Id FROM @u);
UPDATE MouvementsStock      SET UtilisateurId = @superviseur WHERE UtilisateurId IN (SELECT Id FROM @u);
UPDATE DemandesAchat        SET IdDemandeur = @superviseur   WHERE IdDemandeur   IN (SELECT Id FROM @u);

-- Fresh notification bell for the demo
DELETE FROM Notifications;

DELETE FROM Users WHERE ID IN (SELECT Id FROM @u);
DELETE FROM AspNetUserRoles  WHERE UserId IN (SELECT Id FROM AspNetUsers WHERE Email IN (SELECT Email FROM @u));
DELETE FROM AspNetUserClaims WHERE UserId IN (SELECT Id FROM AspNetUsers WHERE Email IN (SELECT Email FROM @u));
DELETE FROM AspNetUserLogins WHERE UserId IN (SELECT Id FROM AspNetUsers WHERE Email IN (SELECT Email FROM @u));
DELETE FROM AspNetUserTokens WHERE UserId IN (SELECT Id FROM AspNetUsers WHERE Email IN (SELECT Email FROM @u));
DELETE FROM AspNetUsers      WHERE Email IN (SELECT Email FROM @u);

-- ---------------------------------------------------------------- First-version leftovers hidden (history kept)
UPDATE Equipments SET IsDeleted = 1
WHERE CodeEquipement LIKE N'EQ-%' OR CodeEquipement IN (N'e02', N'Souhaib');
UPDATE ChaineProductions SET IsActif = 0
WHERE Libelle IN (N'sou', N'Chaîne de production A', N'Chaîne de production B', N'Chaîne d''assemblage');
UPDATE TypeInterventions SET IsActif = 0 WHERE Libelle IN (N'sou', N'souhaib');
UPDATE Pannes            SET IsActif = 0 WHERE Libelle IN (N'sou', N'Default Panne');

-- ---------------------------------------------------------------- Result
SELECT (SELECT COUNT(*) FROM DemandeInterventions)                                   AS Interventions,
       (SELECT COUNT(*) FROM DemandeInterventions WHERE StatusId IN (1, 2))           AS Ouvertes,
       (SELECT COUNT(*) FROM DemandeInterventions WHERE DatePlanifiee > @now)         AS Futures,
       (SELECT COUNT(*) FROM PlansPreventifs)                                         AS Plans,
       (SELECT COUNT(*) FROM Users WHERE IsActif = 1)                                 AS Comptes,
       (SELECT COUNT(*) FROM Equipments WHERE IsDeleted = 0)                          AS Machines;

COMMIT;
