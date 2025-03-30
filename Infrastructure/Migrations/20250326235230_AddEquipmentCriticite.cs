using Microsoft.EntityFrameworkCore.Migrations;

namespace Infrastructure.Migrations
{
    public partial class AddEquipmentCriticite : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 1: Create the EquipmentCriticites table
            migrationBuilder.CreateTable(
                name: "EquipmentCriticites",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CriticiteLevel = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EquipmentCriticites", x => x.Id);
                });

            // Step 2: Seed initial data into EquipmentCriticites
            migrationBuilder.Sql("INSERT INTO EquipmentCriticites (CriticiteLevel) VALUES ('normal');");
            migrationBuilder.Sql("INSERT INTO EquipmentCriticites (CriticiteLevel) VALUES ('critical');");
            migrationBuilder.Sql("INSERT INTO EquipmentCriticites (CriticiteLevel) VALUES ('urgent');");
            migrationBuilder.Sql("INSERT INTO EquipmentCriticites (CriticiteLevel) VALUES ('very urgent');");

            // Step 3: Add EquipmentCriticiteId column with a valid default value (1 = 'normal')
            migrationBuilder.AddColumn<int>(
                name: "EquipmentCriticiteId",
                table: "Equipments",
                type: "int",
                nullable: false,
                defaultValue: 1); // Default to 'normal' (Id = 1)

            // Step 4: Create index
            migrationBuilder.CreateIndex(
                name: "IX_Equipments_EquipmentCriticiteId",
                table: "Equipments",
                column: "EquipmentCriticiteId");

            // Step 5: Add foreign key constraint after seeding data
            migrationBuilder.AddForeignKey(
                name: "FK_Equipments_EquipmentCriticites_EquipmentCriticiteId",
                table: "Equipments",
                column: "EquipmentCriticiteId",
                principalTable: "EquipmentCriticites",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Equipments_EquipmentCriticites_EquipmentCriticiteId",
                table: "Equipments");

            migrationBuilder.DropIndex(
                name: "IX_Equipments_EquipmentCriticiteId",
                table: "Equipments");

            migrationBuilder.DropColumn(
                name: "EquipmentCriticiteId",
                table: "Equipments");

            migrationBuilder.DropTable(
                name: "EquipmentCriticites");
        }
    }
}