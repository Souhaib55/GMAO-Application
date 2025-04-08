using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    public partial class AddEquipmentTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Alter existing stock tables (assuming they exist from a previous migration)
            migrationBuilder.AlterColumn<string>(
                name: "SupplierName",
                table: "StockSuppliers",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "StockStatuses",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Stocks",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedOn",
                table: "Stocks",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime",
                oldDefaultValueSql: "GETDATE()");

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "Stocks",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "StockEntities",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            // Create equipment-related tables
            // 1. EquipmentCriticites
            migrationBuilder.CreateTable(
                name: "EquipmentCriticites",
                columns: table => new
                {
                    IdCriticite = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NomCriticite = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EquipmentCriticites", x => x.IdCriticite);
                });

            // 2. EtatEquipements
            migrationBuilder.CreateTable(
                name: "EtatEquipements",
                columns: table => new
                {
                    IdEtat = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NomEtat = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EtatEquipements", x => x.IdEtat);
                });

            // 3. FamilleEquipements
            migrationBuilder.CreateTable(
                name: "FamilleEquipements",
                columns: table => new
                {
                    IdFamille = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NomFamille = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FamilleEquipements", x => x.IdFamille);
                });

            // 4. Marques
            migrationBuilder.CreateTable(
                name: "Marques",
                columns: table => new
                {
                    IdMarque = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NomMarque = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Marques", x => x.IdMarque);
                });

            // 5. GroupeEquipements
            migrationBuilder.CreateTable(
                name: "GroupeEquipements",
                columns: table => new
                {
                    IdGroupe = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NomGroupe = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupeEquipements", x => x.IdGroupe);
                });

            // 6. ModeleEquipements (depends on Marques, FamilleEquipements, EquipmentCriticites)
            migrationBuilder.CreateTable(
                name: "ModeleEquipements",
                columns: table => new
                {
                    IdModele = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NomModele = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IdMarque = table.Column<int>(type: "int", nullable: false),
                    IdFamille = table.Column<int>(type: "int", nullable: false),
                    IdCriticite = table.Column<int>(type: "int", nullable: false),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    Commentaire = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ModeleEquipements", x => x.IdModele);
                    table.ForeignKey(
                        name: "FK_ModeleEquipements_Marques_IdMarque",
                        column: x => x.IdMarque,
                        principalTable: "Marques",
                        principalColumn: "IdMarque",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ModeleEquipements_FamilleEquipements_IdFamille",
                        column: x => x.IdFamille,
                        principalTable: "FamilleEquipements",
                        principalColumn: "IdFamille",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ModeleEquipements_EquipmentCriticites_IdCriticite",
                        column: x => x.IdCriticite,
                        principalTable: "EquipmentCriticites",
                        principalColumn: "IdCriticite",
                        onDelete: ReferentialAction.Restrict);
                });

            // 7. Equipments (depends on all above tables)
            migrationBuilder.CreateTable(
                name: "Equipments",
                columns: table => new
                {
                    IdEquipement = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CodeEquipement = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Designation = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IdCriticite = table.Column<int>(type: "int", nullable: false),
                    IdEtat = table.Column<int>(type: "int", nullable: false),
                    IdFamille = table.Column<int>(type: "int", nullable: false),
                    IdModele = table.Column<int>(type: "int", nullable: false),
                    IdGroupe = table.Column<int>(type: "int", nullable: false),
                    DateInstallation = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateMiseEnService = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NumeroSerie = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SousGarantie = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    DateAchat = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateFinGarantie = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateConstruction = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CoutAchat = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Equipments", x => x.IdEquipement);
                    table.ForeignKey(
                        name: "FK_Equipments_EquipmentCriticites_IdCriticite",
                        column: x => x.IdCriticite,
                        principalTable: "EquipmentCriticites",
                        principalColumn: "IdCriticite",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Equipments_EtatEquipements_IdEtat",
                        column: x => x.IdEtat,
                        principalTable: "EtatEquipements",
                        principalColumn: "IdEtat",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Equipments_FamilleEquipements_IdFamille",
                        column: x => x.IdFamille,
                        principalTable: "FamilleEquipements",
                        principalColumn: "IdFamille",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Equipments_ModeleEquipements_IdModele",
                        column: x => x.IdModele,
                        principalTable: "ModeleEquipements",
                        principalColumn: "IdModele",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Equipments_GroupeEquipements_IdGroupe",
                        column: x => x.IdGroupe,
                        principalTable: "GroupeEquipements",
                        principalColumn: "IdGroupe",
                        onDelete: ReferentialAction.Restrict);
                });

            // Create indexes
            migrationBuilder.CreateIndex(
                name: "IX_Equipments_CodeEquipement",
                table: "Equipments",
                column: "CodeEquipement",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Equipments_IdCriticite",
                table: "Equipments",
                column: "IdCriticite");

            migrationBuilder.CreateIndex(
                name: "IX_Equipments_IdEtat",
                table: "Equipments",
                column: "IdEtat");

            migrationBuilder.CreateIndex(
                name: "IX_Equipments_IdFamille",
                table: "Equipments",
                column: "IdFamille");

            migrationBuilder.CreateIndex(
                name: "IX_Equipments_IdModele",
                table: "Equipments",
                column: "IdModele");

            migrationBuilder.CreateIndex(
                name: "IX_Equipments_IdGroupe",
                table: "Equipments",
                column: "IdGroupe");

            migrationBuilder.CreateIndex(
                name: "IX_ModeleEquipements_IdMarque",
                table: "ModeleEquipements",
                column: "IdMarque");

            migrationBuilder.CreateIndex(
                name: "IX_ModeleEquipements_IdFamille",
                table: "ModeleEquipements",
                column: "IdFamille");

            migrationBuilder.CreateIndex(
                name: "IX_ModeleEquipements_IdCriticite",
                table: "ModeleEquipements",
                column: "IdCriticite");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop all equipment-related tables
            migrationBuilder.DropTable(name: "Equipments");
            migrationBuilder.DropTable(name: "ModeleEquipements");
            migrationBuilder.DropTable(name: "GroupeEquipements");
            migrationBuilder.DropTable(name: "Marques");
            migrationBuilder.DropTable(name: "FamilleEquipements");
            migrationBuilder.DropTable(name: "EtatEquipements");
            migrationBuilder.DropTable(name: "EquipmentCriticites");

            // Revert alterations to stock tables
            migrationBuilder.AlterColumn<string>(
                name: "SupplierName",
                table: "StockSuppliers",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "StockStatuses",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Stocks",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedOn",
                table: "Stocks",
                type: "datetime",
                nullable: false,
                defaultValueSql: "GETDATE()",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "Stocks",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "StockEntities",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");
        }
    }
}