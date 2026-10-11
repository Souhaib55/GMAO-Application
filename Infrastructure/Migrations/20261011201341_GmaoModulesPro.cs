using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class GmaoModulesPro : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Specialite",
                table: "Users",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TauxHoraire",
                table: "Users",
                type: "decimal(10,3)",
                precision: 10,
                scale: 3,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Telephone",
                table: "Users",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "IDConstructeur",
                table: "Pieces",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "DelaiApproJours",
                table: "Pieces",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Emplacement",
                table: "Pieces",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IdFournisseur",
                table: "Pieces",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IdMagasin",
                table: "Pieces",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReferenceFournisseur",
                table: "Pieces",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StockMaximum",
                table: "Pieces",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TypeArticle",
                table: "Pieces",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Pièce de rechange");

            migrationBuilder.AddColumn<string>(
                name: "Unite",
                table: "Pieces",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "pièce");

            migrationBuilder.AddColumn<string>(
                name: "Emplacement",
                table: "Equipments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IdFournisseur",
                table: "Equipments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cause",
                table: "DemandeInterventions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CoutExterne",
                table: "DemandeInterventions",
                type: "decimal(12,3)",
                precision: 12,
                scale: 3,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DatePlanifiee",
                table: "DemandeInterventions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DureeEstimeeMinutes",
                table: "DemandeInterventions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IdPlanPreventif",
                table: "DemandeInterventions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Remede",
                table: "DemandeInterventions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Budgets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Annee = table.Column<int>(type: "int", nullable: false),
                    Categorie = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IdChaineProduction = table.Column<int>(type: "int", nullable: true),
                    Montant = table.Column<decimal>(type: "decimal(14,3)", precision: 14, scale: 3, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Budgets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Budgets_ChaineProductions_IdChaineProduction",
                        column: x => x.IdChaineProduction,
                        principalTable: "ChaineProductions",
                        principalColumn: "IDChaineProduction",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DemandesAchat",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Numero = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DateDemande = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IdDemandeur = table.Column<int>(type: "int", nullable: false),
                    Statut = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Motif = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IdDemandeIntervention = table.Column<int>(type: "int", nullable: true),
                    DateDecision = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IdDecideur = table.Column<int>(type: "int", nullable: true),
                    CommentaireDecision = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DemandesAchat", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DemandesAchat_DemandeInterventions_IdDemandeIntervention",
                        column: x => x.IdDemandeIntervention,
                        principalTable: "DemandeInterventions",
                        principalColumn: "IdDemandeIntervention",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DemandesAchat_Users_IdDemandeur",
                        column: x => x.IdDemandeur,
                        principalTable: "Users",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Fournisseurs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Nom = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Contact = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Telephone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Adresse = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    DelaiLivraisonJours = table.Column<int>(type: "int", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Fournisseurs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InterventionPieces",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdDemandeIntervention = table.Column<int>(type: "int", nullable: false),
                    IdPiece = table.Column<int>(type: "int", nullable: false),
                    Quantite = table.Column<int>(type: "int", nullable: false),
                    PrixUnitaire = table.Column<decimal>(type: "decimal(12,3)", precision: 12, scale: 3, nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IdMouvementStock = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InterventionPieces", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InterventionPieces_DemandeInterventions_IdDemandeIntervention",
                        column: x => x.IdDemandeIntervention,
                        principalTable: "DemandeInterventions",
                        principalColumn: "IdDemandeIntervention",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InterventionPieces_Pieces_IdPiece",
                        column: x => x.IdPiece,
                        principalTable: "Pieces",
                        principalColumn: "IDPiece",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InterventionTaches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdDemandeIntervention = table.Column<int>(type: "int", nullable: false),
                    Ordre = table.Column<int>(type: "int", nullable: false),
                    Libelle = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Fait = table.Column<bool>(type: "bit", nullable: false),
                    DateFait = table.Column<DateTime>(type: "datetime2", nullable: true),
                    FaitParId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InterventionTaches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InterventionTaches_DemandeInterventions_IdDemandeIntervention",
                        column: x => x.IdDemandeIntervention,
                        principalTable: "DemandeInterventions",
                        principalColumn: "IdDemandeIntervention",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InterventionTemps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdDemandeIntervention = table.Column<int>(type: "int", nullable: false),
                    IdTechnicien = table.Column<int>(type: "int", nullable: false),
                    Debut = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Fin = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DureeMinutes = table.Column<int>(type: "int", nullable: false),
                    TauxHoraire = table.Column<decimal>(type: "decimal(10,3)", precision: 10, scale: 3, nullable: true),
                    Commentaire = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DateSaisie = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InterventionTemps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InterventionTemps_DemandeInterventions_IdDemandeIntervention",
                        column: x => x.IdDemandeIntervention,
                        principalTable: "DemandeInterventions",
                        principalColumn: "IdDemandeIntervention",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InterventionTemps_Users_IdTechnicien",
                        column: x => x.IdTechnicien,
                        principalTable: "Users",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "JournalActivites",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UtilisateurId = table.Column<int>(type: "int", nullable: true),
                    UtilisateurNom = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Entite = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    EntiteId = table.Column<int>(type: "int", nullable: true),
                    Action = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Details = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JournalActivites", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Magasins",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Nom = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Magasins", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ParametresApplication",
                columns: table => new
                {
                    Cle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Valeur = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParametresApplication", x => x.Cle);
                });

            migrationBuilder.CreateTable(
                name: "PiecesJointes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Entite = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    EntiteId = table.Column<int>(type: "int", nullable: false),
                    NomFichier = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Taille = table.Column<long>(type: "bigint", nullable: false),
                    Donnees = table.Column<byte[]>(type: "varbinary(max)", nullable: false),
                    DateAjout = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AjouteParId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PiecesJointes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlansPreventifs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Titre = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    IdEquipement = table.Column<int>(type: "int", nullable: false),
                    IdTypeIntervention = table.Column<int>(type: "int", nullable: true),
                    Frequence = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Intervalle = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    DureeEstimeeMinutes = table.Column<int>(type: "int", nullable: true),
                    IdTechnicien = table.Column<int>(type: "int", nullable: true),
                    DateDebut = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ProchaineEcheance = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DerniereGeneration = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DelaiGenerationJours = table.Column<int>(type: "int", nullable: false, defaultValue: 7),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    CreeParId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlansPreventifs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlansPreventifs_Equipments_IdEquipement",
                        column: x => x.IdEquipement,
                        principalTable: "Equipments",
                        principalColumn: "IdEquipement",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PlansPreventifs_TypeInterventions_IdTypeIntervention",
                        column: x => x.IdTypeIntervention,
                        principalTable: "TypeInterventions",
                        principalColumn: "IDTypeIntervention",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PlansPreventifs_Users_IdTechnicien",
                        column: x => x.IdTechnicien,
                        principalTable: "Users",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DemandeAchatLignes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdDemandeAchat = table.Column<int>(type: "int", nullable: false),
                    IdPiece = table.Column<int>(type: "int", nullable: true),
                    Designation = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Quantite = table.Column<int>(type: "int", nullable: false),
                    PrixEstime = table.Column<decimal>(type: "decimal(12,3)", precision: 12, scale: 3, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DemandeAchatLignes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DemandeAchatLignes_DemandesAchat_IdDemandeAchat",
                        column: x => x.IdDemandeAchat,
                        principalTable: "DemandesAchat",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DemandeAchatLignes_Pieces_IdPiece",
                        column: x => x.IdPiece,
                        principalTable: "Pieces",
                        principalColumn: "IDPiece",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BonsCommande",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Numero = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IdFournisseur = table.Column<int>(type: "int", nullable: false),
                    IdDemandeAchat = table.Column<int>(type: "int", nullable: true),
                    DateCommande = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateLivraisonPrevue = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateReceptionComplete = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Statut = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IdCreateur = table.Column<int>(type: "int", nullable: true),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BonsCommande", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BonsCommande_DemandesAchat_IdDemandeAchat",
                        column: x => x.IdDemandeAchat,
                        principalTable: "DemandesAchat",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BonsCommande_Fournisseurs_IdFournisseur",
                        column: x => x.IdFournisseur,
                        principalTable: "Fournisseurs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PlanPreventifTaches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdPlanPreventif = table.Column<int>(type: "int", nullable: false),
                    Ordre = table.Column<int>(type: "int", nullable: false),
                    Libelle = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanPreventifTaches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlanPreventifTaches_PlansPreventifs_IdPlanPreventif",
                        column: x => x.IdPlanPreventif,
                        principalTable: "PlansPreventifs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BonCommandeLignes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdBonCommande = table.Column<int>(type: "int", nullable: false),
                    IdPiece = table.Column<int>(type: "int", nullable: true),
                    Designation = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Quantite = table.Column<int>(type: "int", nullable: false),
                    QuantiteRecue = table.Column<int>(type: "int", nullable: false),
                    PrixUnitaire = table.Column<decimal>(type: "decimal(12,3)", precision: 12, scale: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BonCommandeLignes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BonCommandeLignes_BonsCommande_IdBonCommande",
                        column: x => x.IdBonCommande,
                        principalTable: "BonsCommande",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BonCommandeLignes_Pieces_IdPiece",
                        column: x => x.IdPiece,
                        principalTable: "Pieces",
                        principalColumn: "IDPiece",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MouvementsStock",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdPiece = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Quantite = table.Column<int>(type: "int", nullable: false),
                    StockApres = table.Column<int>(type: "int", nullable: false),
                    PrixUnitaire = table.Column<decimal>(type: "decimal(12,3)", precision: 12, scale: 3, nullable: true),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Motif = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IdDemandeIntervention = table.Column<int>(type: "int", nullable: true),
                    IdBonCommande = table.Column<int>(type: "int", nullable: true),
                    UtilisateurId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MouvementsStock", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MouvementsStock_BonsCommande_IdBonCommande",
                        column: x => x.IdBonCommande,
                        principalTable: "BonsCommande",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MouvementsStock_DemandeInterventions_IdDemandeIntervention",
                        column: x => x.IdDemandeIntervention,
                        principalTable: "DemandeInterventions",
                        principalColumn: "IdDemandeIntervention",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MouvementsStock_Pieces_IdPiece",
                        column: x => x.IdPiece,
                        principalTable: "Pieces",
                        principalColumn: "IDPiece",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MouvementsStock_Users_UtilisateurId",
                        column: x => x.UtilisateurId,
                        principalTable: "Users",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Pieces_IdFournisseur",
                table: "Pieces",
                column: "IdFournisseur");

            migrationBuilder.CreateIndex(
                name: "IX_Pieces_IdMagasin",
                table: "Pieces",
                column: "IdMagasin");

            migrationBuilder.CreateIndex(
                name: "IX_Equipments_IdFournisseur",
                table: "Equipments",
                column: "IdFournisseur");

            migrationBuilder.CreateIndex(
                name: "IX_DemandeInterventions_DatePlanifiee",
                table: "DemandeInterventions",
                column: "DatePlanifiee");

            migrationBuilder.CreateIndex(
                name: "IX_DemandeInterventions_IdPlanPreventif",
                table: "DemandeInterventions",
                column: "IdPlanPreventif");

            migrationBuilder.CreateIndex(
                name: "IX_BonCommandeLignes_IdBonCommande",
                table: "BonCommandeLignes",
                column: "IdBonCommande");

            migrationBuilder.CreateIndex(
                name: "IX_BonCommandeLignes_IdPiece",
                table: "BonCommandeLignes",
                column: "IdPiece");

            migrationBuilder.CreateIndex(
                name: "IX_BonsCommande_IdDemandeAchat",
                table: "BonsCommande",
                column: "IdDemandeAchat");

            migrationBuilder.CreateIndex(
                name: "IX_BonsCommande_IdFournisseur",
                table: "BonsCommande",
                column: "IdFournisseur");

            migrationBuilder.CreateIndex(
                name: "IX_BonsCommande_Numero",
                table: "BonsCommande",
                column: "Numero",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Budgets_Annee_Categorie_IdChaineProduction",
                table: "Budgets",
                columns: new[] { "Annee", "Categorie", "IdChaineProduction" },
                unique: true,
                filter: "[IdChaineProduction] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Budgets_IdChaineProduction",
                table: "Budgets",
                column: "IdChaineProduction");

            migrationBuilder.CreateIndex(
                name: "IX_DemandeAchatLignes_IdDemandeAchat",
                table: "DemandeAchatLignes",
                column: "IdDemandeAchat");

            migrationBuilder.CreateIndex(
                name: "IX_DemandeAchatLignes_IdPiece",
                table: "DemandeAchatLignes",
                column: "IdPiece");

            migrationBuilder.CreateIndex(
                name: "IX_DemandesAchat_IdDemandeIntervention",
                table: "DemandesAchat",
                column: "IdDemandeIntervention");

            migrationBuilder.CreateIndex(
                name: "IX_DemandesAchat_IdDemandeur",
                table: "DemandesAchat",
                column: "IdDemandeur");

            migrationBuilder.CreateIndex(
                name: "IX_DemandesAchat_Numero",
                table: "DemandesAchat",
                column: "Numero",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Fournisseurs_Code",
                table: "Fournisseurs",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InterventionPieces_IdDemandeIntervention",
                table: "InterventionPieces",
                column: "IdDemandeIntervention");

            migrationBuilder.CreateIndex(
                name: "IX_InterventionPieces_IdPiece",
                table: "InterventionPieces",
                column: "IdPiece");

            migrationBuilder.CreateIndex(
                name: "IX_InterventionTaches_IdDemandeIntervention",
                table: "InterventionTaches",
                column: "IdDemandeIntervention");

            migrationBuilder.CreateIndex(
                name: "IX_InterventionTemps_IdDemandeIntervention",
                table: "InterventionTemps",
                column: "IdDemandeIntervention");

            migrationBuilder.CreateIndex(
                name: "IX_InterventionTemps_IdTechnicien",
                table: "InterventionTemps",
                column: "IdTechnicien");

            migrationBuilder.CreateIndex(
                name: "IX_JournalActivites_Date",
                table: "JournalActivites",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_JournalActivites_Entite_EntiteId",
                table: "JournalActivites",
                columns: new[] { "Entite", "EntiteId" });

            migrationBuilder.CreateIndex(
                name: "IX_Magasins_Code",
                table: "Magasins",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MouvementsStock_Date",
                table: "MouvementsStock",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_MouvementsStock_IdBonCommande",
                table: "MouvementsStock",
                column: "IdBonCommande");

            migrationBuilder.CreateIndex(
                name: "IX_MouvementsStock_IdDemandeIntervention",
                table: "MouvementsStock",
                column: "IdDemandeIntervention");

            migrationBuilder.CreateIndex(
                name: "IX_MouvementsStock_IdPiece_Date",
                table: "MouvementsStock",
                columns: new[] { "IdPiece", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_MouvementsStock_UtilisateurId",
                table: "MouvementsStock",
                column: "UtilisateurId");

            migrationBuilder.CreateIndex(
                name: "IX_PiecesJointes_Entite_EntiteId",
                table: "PiecesJointes",
                columns: new[] { "Entite", "EntiteId" });

            migrationBuilder.CreateIndex(
                name: "IX_PlanPreventifTaches_IdPlanPreventif",
                table: "PlanPreventifTaches",
                column: "IdPlanPreventif");

            migrationBuilder.CreateIndex(
                name: "IX_PlansPreventifs_Code",
                table: "PlansPreventifs",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlansPreventifs_IdEquipement",
                table: "PlansPreventifs",
                column: "IdEquipement");

            migrationBuilder.CreateIndex(
                name: "IX_PlansPreventifs_IdTechnicien",
                table: "PlansPreventifs",
                column: "IdTechnicien");

            migrationBuilder.CreateIndex(
                name: "IX_PlansPreventifs_IdTypeIntervention",
                table: "PlansPreventifs",
                column: "IdTypeIntervention");

            migrationBuilder.CreateIndex(
                name: "IX_PlansPreventifs_IsActif_ProchaineEcheance",
                table: "PlansPreventifs",
                columns: new[] { "IsActif", "ProchaineEcheance" });

            migrationBuilder.AddForeignKey(
                name: "FK_DemandeInterventions_PlansPreventifs_IdPlanPreventif",
                table: "DemandeInterventions",
                column: "IdPlanPreventif",
                principalTable: "PlansPreventifs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Equipments_Fournisseurs_IdFournisseur",
                table: "Equipments",
                column: "IdFournisseur",
                principalTable: "Fournisseurs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Pieces_Fournisseurs_IdFournisseur",
                table: "Pieces",
                column: "IdFournisseur",
                principalTable: "Fournisseurs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Pieces_Magasins_IdMagasin",
                table: "Pieces",
                column: "IdMagasin",
                principalTable: "Magasins",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // ------------------------------------------------------------------
            // Data: merge the legacy "Stock" module into the unified store.
            // The legacy tables are left untouched (nothing is deleted).
            // ------------------------------------------------------------------

            // Store rooms keep the ids of the former StockEntities rows
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.StockEntities') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Magasins)
BEGIN
    SET IDENTITY_INSERT Magasins ON;
    INSERT INTO Magasins (Id, Code, Nom, Description, IsActif, DateCreation)
    SELECT Id, CONCAT(N'MAG-', RIGHT(CONCAT(N'00', Id), 2)), LEFT(Name, 100), NULL, 1, GETDATE()
    FROM StockEntities;
    SET IDENTITY_INSERT Magasins OFF;
END");

            // Suppliers keep the ids of the former StockSuppliers rows
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.StockSuppliers') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Fournisseurs)
BEGIN
    SET IDENTITY_INSERT Fournisseurs ON;
    INSERT INTO Fournisseurs (Id, Code, Nom, IsActif, DateCreation)
    SELECT Id, CONCAT(N'FRN-', RIGHT(CONCAT(N'000', Id), 3)), LEFT(SupplierName, 150), 1, GETDATE()
    FROM StockSuppliers;
    SET IDENTITY_INSERT Fournisseurs OFF;
END");

            // Legacy stock lots become store articles (quantity unknown, so 0)
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.Stocks') IS NOT NULL
BEGIN
    DECLARE @famille int = (SELECT TOP 1 IDFamillePiece FROM FamillePieces
                            ORDER BY CASE WHEN NomFamille LIKE N'%onsommable%' THEN 0 ELSE 1 END, IsActif DESC, IDFamillePiece);
    DECLARE @criticite int = (SELECT TOP 1 IDCriticitePiece FROM CriticitePieces
                              ORDER BY CASE WHEN NiveauCriticitePiece LIKE N'%tandard%' THEN 0 ELSE 1 END, IsActif DESC, IDCriticitePiece DESC);

    IF @famille IS NOT NULL AND @criticite IS NOT NULL
    INSERT INTO Pieces (CodePiece, Designation, Description, IDFamillePiece, IDConstructeur, IDCriticitePiece,
                        Quantite_Stock, SeuilMinimum, PrixUnitaire, DateCreation, IsActif,
                        TypeArticle, Unite, IdMagasin, IdFournisseur)
    SELECT LEFT(s.Code, 50), LEFT(s.Description, 100), N'Repris de l''ancien module Stock', @famille, NULL, @criticite,
           0, 0, 0, s.CreatedOn, CASE WHEN s.IsDeleted = 1 THEN 0 ELSE 1 END,
           N'Consommable', N'lot',
           (SELECT m.Id FROM Magasins m WHERE m.Id = s.StockEntitiesId),
           (SELECT f.Id FROM Fournisseurs f WHERE f.Id = s.StockSupplierId)
    FROM Stocks s
    WHERE NOT EXISTS (SELECT 1 FROM Pieces p WHERE p.CodePiece = LEFT(s.Code, 50));
END");

            // Opening balance: one movement per article that already holds stock
            migrationBuilder.Sql(@"
INSERT INTO MouvementsStock (IdPiece, Type, Quantite, StockApres, PrixUnitaire, Date, Motif)
SELECT p.IDPiece, N'Inventaire initial', p.Quantite_Stock, p.Quantite_Stock, p.PrixUnitaire, p.DateCreation,
       N'Reprise du stock existant'
FROM Pieces p
WHERE p.Quantite_Stock <> 0
  AND NOT EXISTS (SELECT 1 FROM MouvementsStock m WHERE m.IdPiece = p.IDPiece);");

            // Accent left over by the earlier encoding repair (micro sign)
            migrationBuilder.Sql(@"
UPDATE Pieces SET Designation = REPLACE(Designation COLLATE Latin1_General_BIN, NCHAR(194) + NCHAR(181), NCHAR(181))
WHERE CHARINDEX(NCHAR(194) + NCHAR(181), Designation COLLATE Latin1_General_BIN) > 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DemandeInterventions_PlansPreventifs_IdPlanPreventif",
                table: "DemandeInterventions");

            migrationBuilder.DropForeignKey(
                name: "FK_Equipments_Fournisseurs_IdFournisseur",
                table: "Equipments");

            migrationBuilder.DropForeignKey(
                name: "FK_Pieces_Fournisseurs_IdFournisseur",
                table: "Pieces");

            migrationBuilder.DropForeignKey(
                name: "FK_Pieces_Magasins_IdMagasin",
                table: "Pieces");

            migrationBuilder.DropTable(
                name: "BonCommandeLignes");

            migrationBuilder.DropTable(
                name: "Budgets");

            migrationBuilder.DropTable(
                name: "DemandeAchatLignes");

            migrationBuilder.DropTable(
                name: "InterventionPieces");

            migrationBuilder.DropTable(
                name: "InterventionTaches");

            migrationBuilder.DropTable(
                name: "InterventionTemps");

            migrationBuilder.DropTable(
                name: "JournalActivites");

            migrationBuilder.DropTable(
                name: "Magasins");

            migrationBuilder.DropTable(
                name: "MouvementsStock");

            migrationBuilder.DropTable(
                name: "ParametresApplication");

            migrationBuilder.DropTable(
                name: "PiecesJointes");

            migrationBuilder.DropTable(
                name: "PlanPreventifTaches");

            migrationBuilder.DropTable(
                name: "BonsCommande");

            migrationBuilder.DropTable(
                name: "PlansPreventifs");

            migrationBuilder.DropTable(
                name: "DemandesAchat");

            migrationBuilder.DropTable(
                name: "Fournisseurs");

            migrationBuilder.DropIndex(
                name: "IX_Pieces_IdFournisseur",
                table: "Pieces");

            migrationBuilder.DropIndex(
                name: "IX_Pieces_IdMagasin",
                table: "Pieces");

            migrationBuilder.DropIndex(
                name: "IX_Equipments_IdFournisseur",
                table: "Equipments");

            migrationBuilder.DropIndex(
                name: "IX_DemandeInterventions_DatePlanifiee",
                table: "DemandeInterventions");

            migrationBuilder.DropIndex(
                name: "IX_DemandeInterventions_IdPlanPreventif",
                table: "DemandeInterventions");

            migrationBuilder.DropColumn(
                name: "Specialite",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TauxHoraire",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Telephone",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DelaiApproJours",
                table: "Pieces");

            migrationBuilder.DropColumn(
                name: "Emplacement",
                table: "Pieces");

            migrationBuilder.DropColumn(
                name: "IdFournisseur",
                table: "Pieces");

            migrationBuilder.DropColumn(
                name: "IdMagasin",
                table: "Pieces");

            migrationBuilder.DropColumn(
                name: "ReferenceFournisseur",
                table: "Pieces");

            migrationBuilder.DropColumn(
                name: "StockMaximum",
                table: "Pieces");

            migrationBuilder.DropColumn(
                name: "TypeArticle",
                table: "Pieces");

            migrationBuilder.DropColumn(
                name: "Unite",
                table: "Pieces");

            migrationBuilder.DropColumn(
                name: "Emplacement",
                table: "Equipments");

            migrationBuilder.DropColumn(
                name: "IdFournisseur",
                table: "Equipments");

            migrationBuilder.DropColumn(
                name: "Cause",
                table: "DemandeInterventions");

            migrationBuilder.DropColumn(
                name: "CoutExterne",
                table: "DemandeInterventions");

            migrationBuilder.DropColumn(
                name: "DatePlanifiee",
                table: "DemandeInterventions");

            migrationBuilder.DropColumn(
                name: "DureeEstimeeMinutes",
                table: "DemandeInterventions");

            migrationBuilder.DropColumn(
                name: "IdPlanPreventif",
                table: "DemandeInterventions");

            migrationBuilder.DropColumn(
                name: "Remede",
                table: "DemandeInterventions");

            migrationBuilder.AlterColumn<int>(
                name: "IDConstructeur",
                table: "Pieces",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);
        }
    }
}
