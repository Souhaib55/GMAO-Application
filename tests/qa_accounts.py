"""
Creates or removes three local QA accounts (one per role) used by api_tests.py.

    python tests/qa_accounts.py create   [--server "localhost\\SQLEXPRESS"] [--database gmao]
    python tests/qa_accounts.py remove

Windows authentication by default. For a SQL login (Docker, Linux): --user sa --password ...
The sqlcmd program can be replaced with GMAO_SQLCMD, e.g.
    GMAO_SQLCMD="docker exec -i gmao-sql /opt/mssql-tools18/bin/sqlcmd -C"

Development databases only: rows are written directly with sqlcmd (Windows
authentication). The password hash uses the ASP.NET Core Identity v3 format
(PBKDF2-HMAC-SHA512, 100 000 iterations), so the accounts log in normally.
"""
import argparse
import base64
import hashlib
import os
import shlex
import struct
import subprocess
import uuid

PASSWORD = "QaTest!2026"
ACCOUNTS = [
    # email, first name, last name, Identity role, Roles.IDRole
    ("qa.superviseur@gmao.test", "QA", "Superviseur", "Superviseur", 1),
    ("qa.technicien@gmao.test", "QA", "Technicien", "Utilisateur", 3),
    ("qa.demandeur@gmao.test", "QA", "Demandeur", "Demandeur", 2),
]


def identity_v3_hash(password: str) -> str:
    salt = os.urandom(16)
    iterations = 100_000
    subkey = hashlib.pbkdf2_hmac("sha512", password.encode("utf-8"), salt, iterations, 32)
    blob = b"\x01" + struct.pack(">III", 2, iterations, len(salt)) + salt + subkey
    return base64.b64encode(blob).decode()


AUTH = ["-E"]  # Windows authentication unless --user is given


def sql(server: str, database: str, query: str) -> str:
    sqlcmd = shlex.split(os.environ.get("GMAO_SQLCMD", "sqlcmd"))
    result = subprocess.run(
        sqlcmd + ["-S", server, *AUTH, "-d", database, "-I", "-b", "-W", "-h", "-1", "-Q", "SET NOCOUNT ON; " + query],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        raise SystemExit(result.stdout + result.stderr)
    return result.stdout.strip()


def create(server: str, database: str) -> None:
    remove(server, database, quiet=True)
    for email, first, last, role, role_id in ACCOUNTS:
        uid = str(uuid.uuid4())
        sql(server, database, f"""
INSERT INTO AspNetUsers (Id, FirstName, LastName, UserName, NormalizedUserName, Email, NormalizedEmail, EmailConfirmed,
    PasswordHash, SecurityStamp, ConcurrencyStamp, PhoneNumberConfirmed, TwoFactorEnabled, LockoutEnabled, AccessFailedCount)
VALUES ('{uid}', N'{first}', N'{last}', '{email}', '{email.upper()}', '{email}', '{email.upper()}', 1,
    '{identity_v3_hash(PASSWORD)}', '{uuid.uuid4().hex.upper()}', '{uuid.uuid4()}', 0, 0, 1, 0);
INSERT INTO AspNetUserRoles (UserId, RoleId) SELECT '{uid}', Id FROM AspNetRoles WHERE Name = '{role}';
INSERT INTO Users (AppUserId, Nom, Prenom, Email, DateCreation, DateModification, IsActif, IDRole, TauxHoraire)
VALUES ('{uid}', N'{last}', N'{first}', '{email}', GETDATE(), GETDATE(), 1, {role_id}, {'12.000' if role_id == 3 else 'NULL'});""")
    print(f"{len(ACCOUNTS)} comptes QA créés (mot de passe : {PASSWORD}).")


def remove(server: str, database: str, quiet: bool = False) -> None:
    emails = ",".join(f"'{a[0]}'" for a in ACCOUNTS)
    # Data created by api_tests.py is prefixed with QA
    sql(server, database, f"""
DECLARE @u TABLE (Id int, AppUserId nvarchar(450));
INSERT INTO @u SELECT ID, AppUserId FROM Users WHERE Email IN ({emails});
DECLARE @plans TABLE (Id int);
INSERT INTO @plans SELECT Id FROM PlansPreventifs WHERE Titre LIKE 'QA %';
DECLARE @art TABLE (Id int);
INSERT INTO @art SELECT IDPiece FROM Pieces WHERE CodePiece LIKE 'QA-%';
DECLARE @frn TABLE (Id int);
INSERT INTO @frn SELECT Id FROM Fournisseurs WHERE Nom LIKE 'QA %';
DECLARE @bc TABLE (Id int);
INSERT INTO @bc SELECT Id FROM BonsCommande WHERE IdFournisseur IN (SELECT Id FROM @frn);
DECLARE @ot TABLE (Id int);
INSERT INTO @ot SELECT IdDemandeIntervention FROM DemandeInterventions
WHERE DemandeursID IN (SELECT Id FROM @u) OR IdPlanPreventif IN (SELECT Id FROM @plans) OR Titre LIKE 'QA %';
DELETE FROM InterventionPieces WHERE IdPiece IN (SELECT Id FROM @art);
DELETE FROM MouvementsStock WHERE IdPiece IN (SELECT Id FROM @art) OR IdBonCommande IN (SELECT Id FROM @bc);
DELETE FROM BonCommandeLignes WHERE IdBonCommande IN (SELECT Id FROM @bc) OR IdPiece IN (SELECT Id FROM @art);
DELETE FROM BonsCommande WHERE Id IN (SELECT Id FROM @bc);
DELETE FROM DemandeAchatLignes WHERE IdPiece IN (SELECT Id FROM @art);
DELETE FROM Budgets WHERE Notes = 'QA';
DELETE FROM Magasins WHERE Code LIKE 'QA-%';
DELETE FROM Notifications WHERE UserId IN (SELECT Id FROM @u) OR TriggeredByUserId IN (SELECT Id FROM @u) OR InterventionId IN (SELECT Id FROM @ot);
DELETE FROM InterventionPieces WHERE IdDemandeIntervention IN (SELECT Id FROM @ot);
DELETE FROM InterventionTemps WHERE IdDemandeIntervention IN (SELECT Id FROM @ot) OR IdTechnicien IN (SELECT Id FROM @u);
DELETE FROM MouvementsStock WHERE IdDemandeIntervention IN (SELECT Id FROM @ot);
UPDATE MouvementsStock SET UtilisateurId = NULL WHERE UtilisateurId IN (SELECT Id FROM @u);
DELETE FROM PiecesJointes WHERE AjouteParId IN (SELECT Id FROM @u);
DELETE FROM DemandeAchatLignes WHERE IdDemandeAchat IN (SELECT Id FROM DemandesAchat WHERE IdDemandeur IN (SELECT Id FROM @u));
DELETE FROM DemandesAchat WHERE IdDemandeur IN (SELECT Id FROM @u);
UPDATE DemandeInterventions SET DestinatairesID = NULL WHERE DestinatairesID IN (SELECT Id FROM @u);
DELETE FROM InterventionTaches WHERE IdDemandeIntervention IN (SELECT Id FROM @ot);
DELETE FROM DemandeInterventions WHERE IdDemandeIntervention IN (SELECT Id FROM @ot);
DELETE FROM PlanPreventifTaches WHERE IdPlanPreventif IN (SELECT Id FROM @plans);
DELETE FROM PlansPreventifs WHERE Id IN (SELECT Id FROM @plans);
DELETE FROM Pieces WHERE IDPiece IN (SELECT Id FROM @art);
DELETE FROM Fournisseurs WHERE Id IN (SELECT Id FROM @frn);
DELETE FROM JournalActivites WHERE UtilisateurNom LIKE 'QA %';
UPDATE PlansPreventifs SET IdTechnicien = NULL WHERE IdTechnicien IN (SELECT Id FROM @u);
UPDATE PlansPreventifs SET CreeParId = NULL WHERE CreeParId IN (SELECT Id FROM @u);
DELETE FROM Users WHERE ID IN (SELECT Id FROM @u);
DELETE FROM AspNetUserRoles WHERE UserId IN (SELECT AppUserId FROM @u);
DELETE FROM AspNetUsers WHERE Email IN ({emails});""")
    if not quiet:
        print("Comptes QA supprimés.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["create", "remove"])
    parser.add_argument("--server", default="localhost\\SQLEXPRESS")
    parser.add_argument("--database", default="gmao")
    parser.add_argument("--user", help="SQL login (default: Windows authentication)")
    parser.add_argument("--password", help="password of the SQL login")
    args = parser.parse_args()
    if args.user:
        AUTH = ["-U", args.user, "-P", args.password or ""]
    (create if args.action == "create" else remove)(args.server, args.database)
