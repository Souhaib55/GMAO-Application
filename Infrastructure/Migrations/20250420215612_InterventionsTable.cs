using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InterventionsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ChaineProductions",
                columns: table => new
                {
                    IDChaineProduction = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Libelle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChaineProductions", x => x.IDChaineProduction);
                });

            migrationBuilder.CreateTable(
                name: "Etats",
                columns: table => new
                {
                    IDEtat = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Libelle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Etats", x => x.IDEtat);
                });

            migrationBuilder.CreateTable(
                name: "TypeInterventions",
                columns: table => new
                {
                    IDTypeIntervention = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Libelle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TypeInterventions", x => x.IDTypeIntervention);
                });

            migrationBuilder.CreateTable(
                name: "Urgences",
                columns: table => new
                {
                    IDUrgence = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Libelle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Urgences", x => x.IDUrgence);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nom = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Prenom = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "DemandeInterventions",
                columns: table => new
                {
                    IdDemandeIntervention = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Titre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    FichierAssocie = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    MachineArretee = table.Column<bool>(type: "bit", nullable: false),
                    IDEtat = table.Column<int>(type: "int", nullable: false),
                    IDTypeIntervention = table.Column<int>(type: "int", nullable: false),
                    IDUrgence = table.Column<int>(type: "int", nullable: false),
                    IDChaineProduction = table.Column<int>(type: "int", nullable: false),
                    DemandeursID = table.Column<int>(type: "int", nullable: false),
                    DestinatairesID = table.Column<int>(type: "int", nullable: false),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DemandeInterventions", x => x.IdDemandeIntervention);
                    table.ForeignKey(
                        name: "FK_DemandeInterventions_ChaineProductions_IDChaineProduction",
                        column: x => x.IDChaineProduction,
                        principalTable: "ChaineProductions",
                        principalColumn: "IDChaineProduction",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DemandeInterventions_Etats_IDEtat",
                        column: x => x.IDEtat,
                        principalTable: "Etats",
                        principalColumn: "IDEtat",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DemandeInterventions_TypeInterventions_IDTypeIntervention",
                        column: x => x.IDTypeIntervention,
                        principalTable: "TypeInterventions",
                        principalColumn: "IDTypeIntervention",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DemandeInterventions_Urgences_IDUrgence",
                        column: x => x.IDUrgence,
                        principalTable: "Urgences",
                        principalColumn: "IDUrgence",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DemandeInterventions_Users_DemandeursID",
                        column: x => x.DemandeursID,
                        principalTable: "Users",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DemandeInterventions_Users_DestinatairesID",
                        column: x => x.DestinatairesID,
                        principalTable: "Users",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DemandeInterventions_DemandeursID",
                table: "DemandeInterventions",
                column: "DemandeursID");

            migrationBuilder.CreateIndex(
                name: "IX_DemandeInterventions_DestinatairesID",
                table: "DemandeInterventions",
                column: "DestinatairesID");

            migrationBuilder.CreateIndex(
                name: "IX_DemandeInterventions_IDChaineProduction",
                table: "DemandeInterventions",
                column: "IDChaineProduction");

            migrationBuilder.CreateIndex(
                name: "IX_DemandeInterventions_IDEtat",
                table: "DemandeInterventions",
                column: "IDEtat");

            migrationBuilder.CreateIndex(
                name: "IX_DemandeInterventions_IDTypeIntervention",
                table: "DemandeInterventions",
                column: "IDTypeIntervention");

            migrationBuilder.CreateIndex(
                name: "IX_DemandeInterventions_IDUrgence",
                table: "DemandeInterventions",
                column: "IDUrgence");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DemandeInterventions");

            migrationBuilder.DropTable(
                name: "ChaineProductions");

            migrationBuilder.DropTable(
                name: "Etats");

            migrationBuilder.DropTable(
                name: "TypeInterventions");

            migrationBuilder.DropTable(
                name: "Urgences");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
