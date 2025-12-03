using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMissingRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Only insert roles 2 and 3 since role 1 already exists
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM Roles WHERE IDRole = 2)
                BEGIN
                    SET IDENTITY_INSERT Roles ON;
                    INSERT INTO Roles (IDRole, Libelle) VALUES (2, 'Demandeur');
                    SET IDENTITY_INSERT Roles OFF;
                END

                IF NOT EXISTS (SELECT 1 FROM Roles WHERE IDRole = 3)
                BEGIN
                    SET IDENTITY_INSERT Roles ON;
                    INSERT INTO Roles (IDRole, Libelle) VALUES (3, 'Utilisateur');
                    SET IDENTITY_INSERT Roles OFF;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "IDRole",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "IDRole",
                keyValue: 3);
        }
    }
}
