using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class GmaoDomainEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SeuilMinimum",
                table: "Pieces",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "IdChaineProduction",
                table: "Equipments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompteRendu",
                table: "DemandeInterventions",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "DemandeInterventions",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IDEquipement",
                table: "DemandeInterventions",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Equipments_IdChaineProduction",
                table: "Equipments",
                column: "IdChaineProduction");

            migrationBuilder.CreateIndex(
                name: "IX_DemandeInterventions_IDEquipement",
                table: "DemandeInterventions",
                column: "IDEquipement");

            migrationBuilder.AddForeignKey(
                name: "FK_DemandeInterventions_Equipments_IDEquipement",
                table: "DemandeInterventions",
                column: "IDEquipement",
                principalTable: "Equipments",
                principalColumn: "IdEquipement",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Equipments_ChaineProductions_IdChaineProduction",
                table: "Equipments",
                column: "IdChaineProduction",
                principalTable: "ChaineProductions",
                principalColumn: "IDChaineProduction",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DemandeInterventions_Equipments_IDEquipement",
                table: "DemandeInterventions");

            migrationBuilder.DropForeignKey(
                name: "FK_Equipments_ChaineProductions_IdChaineProduction",
                table: "Equipments");

            migrationBuilder.DropIndex(
                name: "IX_Equipments_IdChaineProduction",
                table: "Equipments");

            migrationBuilder.DropIndex(
                name: "IX_DemandeInterventions_IDEquipement",
                table: "DemandeInterventions");

            migrationBuilder.DropColumn(
                name: "SeuilMinimum",
                table: "Pieces");

            migrationBuilder.DropColumn(
                name: "IdChaineProduction",
                table: "Equipments");

            migrationBuilder.DropColumn(
                name: "CompteRendu",
                table: "DemandeInterventions");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "DemandeInterventions");

            migrationBuilder.DropColumn(
                name: "IDEquipement",
                table: "DemandeInterventions");
        }
    }
}
