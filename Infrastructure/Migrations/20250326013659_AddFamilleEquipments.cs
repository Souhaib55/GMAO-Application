using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFamilleEquipments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Alter existing columns to add constraints
            migrationBuilder.AlterColumn<string>(
                name: "Designation",
                table: "Equipments",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "Equipments",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            // Create FamilleEquipments table
            migrationBuilder.CreateTable(
                name: "FamilleEquipments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LibelleFamille = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FamilleEquipments", x => x.Id);
                });

            // Insert a default family
            migrationBuilder.Sql("INSERT INTO FamilleEquipments (LibelleFamille) VALUES ('coupeur');");

            // Add FamilleEquipmentId as non-nullable with default value 1
            migrationBuilder.AddColumn<int>(
                name: "FamilleEquipmentId",
                table: "Equipments",
                type: "int",
                nullable: false,
                defaultValue: 1); // Matches the inserted family’s Id

            // Create index and foreign key
            migrationBuilder.CreateIndex(
                name: "IX_Equipments_FamilleEquipmentId",
                table: "Equipments",
                column: "FamilleEquipmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Equipments_FamilleEquipments_FamilleEquipmentId",
                table: "Equipments",
                column: "FamilleEquipmentId",
                principalTable: "FamilleEquipments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Equipments_FamilleEquipments_FamilleEquipmentId",
                table: "Equipments");

            migrationBuilder.DropTable(
                name: "FamilleEquipments");

            migrationBuilder.DropIndex(
                name: "IX_Equipments_FamilleEquipmentId",
                table: "Equipments");

            migrationBuilder.DropColumn(
                name: "FamilleEquipmentId",
                table: "Equipments");

            migrationBuilder.AlterColumn<string>(
                name: "Designation",
                table: "Equipments",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "Equipments",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);
        }
    }
}
