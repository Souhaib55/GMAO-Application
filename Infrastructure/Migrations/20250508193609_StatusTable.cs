using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class StatusTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DateAssignation",
                table: "DemandeInterventions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DateCloture",
                table: "DemandeInterventions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DateRealisation",
                table: "DemandeInterventions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RaisonAnnulation",
                table: "DemandeInterventions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StatusId",
                table: "DemandeInterventions",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "Statuses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Statut = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Statuses", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Statuses",
                columns: new[] { "Id", "Description", "IsActif", "Statut" },
                values: new object[,]
                {
                    { 1, "Nouvelle demande d'intervention", true, "A traiter" },
                    { 2, "Intervention assignée à un technicien", true, "En cours" },
                    { 3, "Intervention terminée par le technicien", true, "Réalisée" },
                    { 4, "Intervention validée par le superviseur", true, "Cloturée" },
                    { 5, "Intervention annulée", true, "Annulée" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_DemandeInterventions_StatusId",
                table: "DemandeInterventions",
                column: "StatusId");

            migrationBuilder.AddForeignKey(
                name: "FK_DemandeInterventions_Statuses_StatusId",
                table: "DemandeInterventions",
                column: "StatusId",
                principalTable: "Statuses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DemandeInterventions_Statuses_StatusId",
                table: "DemandeInterventions");

            migrationBuilder.DropTable(
                name: "Statuses");

            migrationBuilder.DropIndex(
                name: "IX_DemandeInterventions_StatusId",
                table: "DemandeInterventions");

            migrationBuilder.DropColumn(
                name: "DateAssignation",
                table: "DemandeInterventions");

            migrationBuilder.DropColumn(
                name: "DateCloture",
                table: "DemandeInterventions");

            migrationBuilder.DropColumn(
                name: "DateRealisation",
                table: "DemandeInterventions");

            migrationBuilder.DropColumn(
                name: "RaisonAnnulation",
                table: "DemandeInterventions");

            migrationBuilder.DropColumn(
                name: "StatusId",
                table: "DemandeInterventions");
        }
    }
}
