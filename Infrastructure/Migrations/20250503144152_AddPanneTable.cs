using Microsoft.EntityFrameworkCore.Migrations;

namespace Infrastructure.Migrations
{
    public partial class AddPanneTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Modify Users table (existing steps unchanged)
            migrationBuilder.DropIndex(
                name: "IX_Users_AppUserId",
                table: "Users");

            migrationBuilder.AlterColumn<string>(
                name: "AppUserId",
                table: "Users",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            // Create Pannes table
            migrationBuilder.CreateTable(
                name: "Pannes",
                columns: table => new
                {
                    IDPanne = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Libelle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pannes", x => x.IDPanne);
                });

            // Insert a default Panne record (IDPanne = 1)
            migrationBuilder.Sql("INSERT INTO Pannes (Libelle, DateCreation, IsActif) VALUES ('Default Panne', GETDATE(), 1);");

            // Add IDPanne column to DemandeInterventions with a default value of 1 (matches the inserted Panne)
            migrationBuilder.AddColumn<int>(
                name: "IDPanne",
                table: "DemandeInterventions",
                type: "int",
                nullable: false,
                defaultValue: 1);

            // Recreate index on Users
            migrationBuilder.CreateIndex(
                name: "IX_Users_AppUserId",
                table: "Users",
                column: "AppUserId",
                unique: true,
                filter: "[AppUserId] IS NOT NULL");

            // Create index and foreign key on DemandeInterventions
            migrationBuilder.CreateIndex(
                name: "IX_DemandeInterventions_IDPanne",
                table: "DemandeInterventions",
                column: "IDPanne");

            migrationBuilder.AddForeignKey(
                name: "FK_DemandeInterventions_Pannes_IDPanne",
                table: "DemandeInterventions",
                column: "IDPanne",
                principalTable: "Pannes",
                principalColumn: "IDPanne",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DemandeInterventions_Pannes_IDPanne",
                table: "DemandeInterventions");

            migrationBuilder.DropIndex(
                name: "IX_DemandeInterventions_IDPanne",
                table: "DemandeInterventions");

            migrationBuilder.DropColumn(
                name: "IDPanne",
                table: "DemandeInterventions");

            migrationBuilder.DropTable(
                name: "Pannes");

            migrationBuilder.DropIndex(
                name: "IX_Users_AppUserId",
                table: "Users");

            migrationBuilder.AlterColumn<string>(
                name: "AppUserId",
                table: "Users",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_AppUserId",
                table: "Users",
                column: "AppUserId",
                unique: true);
        }
    }
}