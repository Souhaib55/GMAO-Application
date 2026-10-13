"""
Exports every row of a GMAO database as one SQL script that runs on any SQL Server
from 2012 on (no BACKUP/RESTORE version barrier). The target schema must already exist
(created by the EF Core migrations); the script empties it and loads the data.

    python database/export-donnees.py "localhost\\SQLEXPRESS" gmao_demo  donnees-gmao.sql
    sqlcmd -S <serveur> -d gmao -E -C -f 65001 -i donnees-gmao.sql
"""
import datetime
import decimal
import sys
import uuid

import pyodbc

server, database, output = sys.argv[1], sys.argv[2], sys.argv[3]
cn = pyodbc.connect(f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};DATABASE={database};Trusted_Connection=yes;TrustServerCertificate=yes")
cur = cn.cursor()

tables = [r[0] for r in cur.execute(
    "SELECT QUOTENAME(s.name) + '.' + QUOTENAME(t.name) FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id "
    "WHERE t.name <> '__EFMigrationsHistory' ORDER BY t.name").fetchall()]


def literal(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, (int, float, decimal.Decimal)):
        return str(v)
    if isinstance(v, datetime.datetime):
        # Milliseconds: the old datetime type refuses more than 3 decimals, datetime2 accepts them
        return "'" + v.strftime("%Y-%m-%dT%H:%M:%S.") + f"{v.microsecond // 1000:03d}'"
    if isinstance(v, datetime.date):
        return "'" + v.isoformat() + "'"
    if isinstance(v, datetime.time):
        return "'" + v.isoformat() + "'"
    if isinstance(v, (bytes, bytearray)):
        return "0x" + v.hex() if v else "0x"
    if isinstance(v, uuid.UUID):
        return "'" + str(v) + "'"
    return "N'" + str(v).replace("'", "''") + "'"


with open(output, "w", encoding="utf-8", newline="\r\n") as f:
    f.write(f"-- Données de la base {database}, exportées le {datetime.datetime.now():%d/%m/%Y %H:%M}\n")
    f.write("-- À exécuter sur une base dont le schéma vient des migrations EF Core. Remplace toutes les données.\n")
    f.write("SET NOCOUNT ON;\nSET XACT_ABORT ON;\nGO\n")
    for t in tables:
        f.write(f"ALTER TABLE {t} NOCHECK CONSTRAINT ALL;\n")
    f.write("GO\n")
    for t in tables:
        f.write(f"DELETE FROM {t};\n")
    f.write("GO\n")

    total = 0
    for t in tables:
        meta = cur.execute(
            "SELECT QUOTENAME(c.name), TYPE_NAME(c.system_type_id) FROM sys.columns c WHERE c.object_id = OBJECT_ID(?) AND c.is_computed = 0 "
            "AND TYPE_NAME(c.system_type_id) NOT IN ('timestamp') ORDER BY c.column_id", t).fetchall()
        cols = [m[0] for m in meta]
        # datetimeoffset is read as ISO text (the driver cannot fetch it); SQL Server converts it back on insert
        select = [f"CONVERT(varchar(40), {m[0]}, 127)" if m[1] == "datetimeoffset" else m[0] for m in meta]
        has_identity = cur.execute("SELECT COUNT(*) FROM sys.identity_columns WHERE object_id = OBJECT_ID(?)", t).fetchone()[0] > 0
        rows = cur.execute(f"SELECT {', '.join(select)} FROM {t}").fetchall()
        if not rows:
            continue
        f.write(f"-- {t} : {len(rows)} ligne(s)\n")
        if has_identity:
            f.write(f"SET IDENTITY_INSERT {t} ON;\n")
        for i, row in enumerate(rows, 1):
            f.write(f"INSERT INTO {t} ({', '.join(cols)}) VALUES ({', '.join(literal(v) for v in row)});\n")
            if i % 200 == 0:
                f.write("GO\n" + (f"SET IDENTITY_INSERT {t} ON;\n" if has_identity else ""))
        if has_identity:
            f.write(f"SET IDENTITY_INSERT {t} OFF;\n")
        f.write("GO\n")
        total += len(rows)

    for t in tables:
        f.write(f"ALTER TABLE {t} WITH CHECK CHECK CONSTRAINT ALL;\n")
    f.write("GO\n")
    f.write("PRINT N'Données chargées.';\n")

print(f"{len(tables)} tables, {total} lignes -> {output}")
