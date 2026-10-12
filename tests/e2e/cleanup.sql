-- Removes every record created by the E2E UI tests (titles / codes / notes starting with "E2E").
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRAN;

DECLARE @ot TABLE (Id int PRIMARY KEY);
INSERT @ot SELECT IdDemandeIntervention FROM DemandeInterventions WHERE Titre LIKE N'E2E%';

DECLARE @plan TABLE (Id int PRIMARY KEY);
INSERT @plan SELECT Id FROM PlansPreventifs WHERE Titre LIKE N'E2E%';
INSERT @ot SELECT IdDemandeIntervention FROM DemandeInterventions WHERE IdPlanPreventif IN (SELECT Id FROM @plan) AND IdDemandeIntervention NOT IN (SELECT Id FROM @ot);

DECLARE @art TABLE (Id int PRIMARY KEY);
INSERT @art SELECT IDPiece FROM Pieces WHERE CodePiece LIKE N'E2E-%';

DECLARE @da TABLE (Id int PRIMARY KEY);
INSERT @da SELECT Id FROM DemandesAchat WHERE Motif LIKE N'%E2E%';
DECLARE @bc TABLE (Id int PRIMARY KEY);
INSERT @bc SELECT Id FROM BonsCommande WHERE IdDemandeAchat IN (SELECT Id FROM @da)
   OR Id IN (SELECT IdBonCommande FROM BonCommandeLignes WHERE IdPiece IN (SELECT Id FROM @art));

-- Parts used by test OTs on real articles go back to stock (deleted OTs already returned theirs)
UPDATE p SET Quantite_Stock = p.Quantite_Stock + x.Q
FROM Pieces p JOIN (SELECT IdPiece, SUM(Quantite) Q FROM InterventionPieces WHERE IdDemandeIntervention IN (SELECT Id FROM @ot) GROUP BY IdPiece) x ON x.IdPiece = p.IDPiece
WHERE p.IDPiece NOT IN (SELECT Id FROM @art);

DELETE FROM InterventionPieces WHERE IdDemandeIntervention IN (SELECT Id FROM @ot);
DELETE FROM MouvementsStock WHERE IdDemandeIntervention IN (SELECT Id FROM @ot) OR IdPiece IN (SELECT Id FROM @art) OR IdBonCommande IN (SELECT Id FROM @bc);
DELETE FROM InterventionTemps WHERE IdDemandeIntervention IN (SELECT Id FROM @ot);
DELETE FROM InterventionTaches WHERE IdDemandeIntervention IN (SELECT Id FROM @ot);
DELETE FROM Notifications WHERE InterventionId IN (SELECT Id FROM @ot);
DELETE FROM JournalActivites WHERE Entite = N'Intervention' AND EntiteId IN (SELECT Id FROM @ot);
DELETE FROM PiecesJointes WHERE Entite = N'Intervention' AND EntiteId IN (SELECT Id FROM @ot);
UPDATE DemandesAchat SET IdDemandeIntervention = NULL WHERE IdDemandeIntervention IN (SELECT Id FROM @ot);
DELETE FROM DemandeInterventions WHERE IdDemandeIntervention IN (SELECT Id FROM @ot);

DELETE FROM PlanPreventifTaches WHERE IdPlanPreventif IN (SELECT Id FROM @plan);
DELETE FROM PlansPreventifs WHERE Id IN (SELECT Id FROM @plan);

DELETE FROM BonCommandeLignes WHERE IdBonCommande IN (SELECT Id FROM @bc);
DELETE FROM BonsCommande WHERE Id IN (SELECT Id FROM @bc);
DELETE FROM DemandeAchatLignes WHERE IdDemandeAchat IN (SELECT Id FROM @da);
DELETE FROM DemandesAchat WHERE Id IN (SELECT Id FROM @da);
DELETE FROM Pieces WHERE IDPiece IN (SELECT Id FROM @art);

DELETE FROM Budgets WHERE Notes LIKE N'E2E%';
DELETE FROM Equipments WHERE CodeEquipement LIKE N'E2E-EQ-%';
DELETE FROM Pannes WHERE Libelle LIKE N'Panne E2E%';
DELETE FROM JournalActivites WHERE Details LIKE N'%E2E%' OR (Entite = N'Plan' AND EntiteId IN (SELECT Id FROM @plan));

-- Test accounts (deleted in the UI = deactivated)
DECLARE @u TABLE (Id int PRIMARY KEY, Email nvarchar(256));
INSERT @u SELECT ID, Email FROM Users WHERE Email LIKE N'e2e.%@simotex.demo';
DELETE FROM Notifications WHERE UserId IN (SELECT Id FROM @u) OR TriggeredByUserId IN (SELECT Id FROM @u);
UPDATE DemandeInterventions SET DestinatairesID = NULL WHERE DestinatairesID IN (SELECT Id FROM @u);
DELETE FROM Users WHERE ID IN (SELECT Id FROM @u);
DELETE FROM AspNetUserRoles WHERE UserId IN (SELECT Id FROM AspNetUsers WHERE Email IN (SELECT Email FROM @u));
DELETE FROM AspNetUsers WHERE Email IN (SELECT Email FROM @u);

SELECT (SELECT COUNT(*) FROM @u) AS Comptes, (SELECT COUNT(*) FROM @ot) AS OT, (SELECT COUNT(*) FROM @plan) AS Plans, (SELECT COUNT(*) FROM @art) AS Articles,
       (SELECT COUNT(*) FROM @da) AS DA, (SELECT COUNT(*) FROM @bc) AS BC;
COMMIT;
