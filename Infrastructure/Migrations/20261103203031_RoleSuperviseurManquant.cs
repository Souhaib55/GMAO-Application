using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <summary>
    /// The "Superviseur" row (IDRole = 1) of the Roles table was declared in the model but
    /// never inserted by a migration: a brand-new database had only Demandeur and Utilisateur,
    /// so no supervisor account could be created. Inserts it only when it is missing
    /// (existing databases already have it). SQL Server 2014 compatible, additive.
    /// </summary>
    public partial class RoleSuperviseurManquant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM Roles WHERE IDRole = 1)
BEGIN
    SET IDENTITY_INSERT Roles ON;
    INSERT INTO Roles (IDRole, Libelle) VALUES (1, N'Superviseur');
    SET IDENTITY_INSERT Roles OFF;
END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Nothing to undo: the row is part of the reference data and may be used by accounts.
        }
    }
}
