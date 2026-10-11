-- ============================================================================
-- GMAO SIMOTEX — removes the demonstration data loaded with "--seed-demo".
--
-- Only rows created by the demo loader are deleted: the demo machines (CP-, CA-,
-- CB-, FI-, RE-, UT- codes listed below), their work orders, plans, the demo
-- articles, suppliers, purchase orders, budgets and the demo accounts (@simotex.demo).
-- Reference values (lines, breakdown types…) are kept: delete them from the
-- Paramètres screen if they are not wanted.
--
-- Usage:  sqlcmd -S <serveur> -d gmao -I -f 65001 -i demo-cleanup.sql   (UTF-8)
-- Take a backup first.
-- ============================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @machines TABLE (Id int PRIMARY KEY);
INSERT INTO @machines
SELECT IdEquipement FROM Equipments WHERE CodeEquipement IN (
    'CP-01','CP-02','CP-03','CP-04','CA-01','CA-02','CA-03','CA-04','CA-05','CA-06','CA-07',
    'CB-01','CB-02','CB-03','CB-04','CB-05','CB-06','CB-07','FI-01','FI-02',
    'RE-01','RE-02','RE-03','RE-04','RE-05','UT-01');

DECLARE @articles TABLE (Id int PRIMARY KEY);
INSERT INTO @articles
SELECT IDPiece FROM Pieces WHERE CodePiece IN (
    'AIG-DBX1-90','AIG-DCX27-80','CRO-DDL9000','GRF-DDL','PPR-STD','PLQ-AIG','CFL-KIT','RSRT-TENS','BOI-CAN','CNT-BOBINE',
    'MOT-SERVO-550','CRT-CTRL-DDL','CTC-24V','FUS-10A','LMP-LED','RES-FER-1200','EVN-VAP-14','JNT-VAP-KIT','FLX-VAP-1M','PRS-VAP',
    'VRN-PNEU-25','FLT-AIR-CMP','HUI-CMP-5L','HUI-MACH-1L','GRS-HT-400','RLT-6203','CRR-TRAP-A','CRR-DENT-T5','LAM-GERB','AFF-PIERRE');

DECLARE @fournisseurs TABLE (Id int PRIMARY KEY);
INSERT INTO @fournisseurs SELECT Id FROM Fournisseurs WHERE Email LIKE '%.demo';

DECLARE @users TABLE (Id int PRIMARY KEY, AppUserId nvarchar(450));
INSERT INTO @users SELECT ID, AppUserId FROM Users WHERE Email LIKE '%@simotex.demo';

DECLARE @ots TABLE (Id int PRIMARY KEY);
INSERT INTO @ots
SELECT IdDemandeIntervention FROM DemandeInterventions
WHERE IDEquipement IN (SELECT Id FROM @machines)
   OR DemandeursID IN (SELECT Id FROM @users)
   OR IdPlanPreventif IN (SELECT p.Id FROM PlansPreventifs p WHERE p.IdEquipement IN (SELECT Id FROM @machines));

DECLARE @bcs TABLE (Id int PRIMARY KEY);
INSERT INTO @bcs SELECT Id FROM BonsCommande WHERE IdFournisseur IN (SELECT Id FROM @fournisseurs);

-- Stock movements and consumption
DELETE FROM InterventionPieces WHERE IdPiece IN (SELECT Id FROM @articles) OR IdDemandeIntervention IN (SELECT Id FROM @ots);
DELETE FROM MouvementsStock
WHERE IdPiece IN (SELECT Id FROM @articles) OR IdDemandeIntervention IN (SELECT Id FROM @ots) OR IdBonCommande IN (SELECT Id FROM @bcs);

-- Purchasing
DELETE FROM BonCommandeLignes WHERE IdBonCommande IN (SELECT Id FROM @bcs) OR IdPiece IN (SELECT Id FROM @articles);
DELETE FROM BonsCommande WHERE Id IN (SELECT Id FROM @bcs);
DELETE FROM DemandeAchatLignes WHERE IdDemandeAchat IN (SELECT Id FROM DemandesAchat WHERE IdDemandeur IN (SELECT Id FROM @users));
DELETE FROM DemandesAchat WHERE IdDemandeur IN (SELECT Id FROM @users);
DELETE FROM Budgets WHERE Notes = N'Budget de maintenance annuel';

-- Work orders (time, checklist cascade) and their notifications
DELETE FROM Notifications WHERE InterventionId IN (SELECT Id FROM @ots) OR UserId IN (SELECT Id FROM @users) OR TriggeredByUserId IN (SELECT Id FROM @users);
DELETE FROM InterventionTemps WHERE IdDemandeIntervention IN (SELECT Id FROM @ots) OR IdTechnicien IN (SELECT Id FROM @users);
DELETE FROM InterventionTaches WHERE IdDemandeIntervention IN (SELECT Id FROM @ots);
DELETE FROM PiecesJointes WHERE (Entite = 'Intervention' AND EntiteId IN (SELECT Id FROM @ots)) OR (Entite = 'Equipement' AND EntiteId IN (SELECT Id FROM @machines));
DELETE FROM DemandeInterventions WHERE IdDemandeIntervention IN (SELECT Id FROM @ots);

-- Plans, machines, articles, suppliers
DELETE FROM PlanPreventifTaches WHERE IdPlanPreventif IN (SELECT Id FROM PlansPreventifs WHERE IdEquipement IN (SELECT Id FROM @machines));
DELETE FROM PlansPreventifs WHERE IdEquipement IN (SELECT Id FROM @machines);
DELETE FROM Equipments WHERE IdEquipement IN (SELECT Id FROM @machines);
DELETE FROM Pieces WHERE IDPiece IN (SELECT Id FROM @articles);
UPDATE Pieces SET IdFournisseur = NULL WHERE IdFournisseur IN (SELECT Id FROM @fournisseurs);
UPDATE Equipments SET IdFournisseur = NULL WHERE IdFournisseur IN (SELECT Id FROM @fournisseurs);
DELETE FROM Fournisseurs WHERE Id IN (SELECT Id FROM @fournisseurs);

-- Demo accounts
UPDATE PlansPreventifs SET IdTechnicien = NULL WHERE IdTechnicien IN (SELECT Id FROM @users);
DELETE FROM Users WHERE ID IN (SELECT Id FROM @users);
DELETE FROM AspNetUserRoles WHERE UserId IN (SELECT AppUserId FROM @users);
DELETE FROM AspNetUsers WHERE Id IN (SELECT AppUserId FROM @users);

DELETE FROM ParametresApplication WHERE Cle = 'demo.seed';
DELETE FROM JournalActivites WHERE Action = N'Données de démonstration chargées';

COMMIT TRANSACTION;
PRINT 'Données de démonstration supprimées.';
