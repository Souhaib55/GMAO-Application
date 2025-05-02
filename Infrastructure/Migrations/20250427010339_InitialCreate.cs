using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecurityStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "bit", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "bit", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                });

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
                name: "Constructeurs",
                columns: table => new
                {
                    IDConstructeur = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NomConstructeur = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Contact = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Constructeurs", x => x.IDConstructeur);
                });

            migrationBuilder.CreateTable(
                name: "CriticitePieces",
                columns: table => new
                {
                    IDCriticitePiece = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NiveauCriticitePiece = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CriticitePieces", x => x.IDCriticitePiece);
                });

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

            migrationBuilder.CreateTable(
                name: "FamillePieces",
                columns: table => new
                {
                    IDFamillePiece = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NomFamille = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FamillePieces", x => x.IDFamillePiece);
                });

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

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    IDRole = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Libelle = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.IDRole);
                });

            migrationBuilder.CreateTable(
                name: "StockEntities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockEntities", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StockStatuses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockStatuses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StockSuppliers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SupplierName = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockSuppliers", x => x.Id);
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
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Pieces",
                columns: table => new
                {
                    IDPiece = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CodePiece = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Designation = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IDFamillePiece = table.Column<int>(type: "int", nullable: false),
                    IDConstructeur = table.Column<int>(type: "int", nullable: false),
                    IDCriticitePiece = table.Column<int>(type: "int", nullable: false),
                    Quantite_Stock = table.Column<int>(type: "int", nullable: false),
                    PrixUnitaire = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pieces", x => x.IDPiece);
                    table.ForeignKey(
                        name: "FK_Pieces_Constructeurs_IDConstructeur",
                        column: x => x.IDConstructeur,
                        principalTable: "Constructeurs",
                        principalColumn: "IDConstructeur",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Pieces_CriticitePieces_IDCriticitePiece",
                        column: x => x.IDCriticitePiece,
                        principalTable: "CriticitePieces",
                        principalColumn: "IDCriticitePiece",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Pieces_FamillePieces_IDFamillePiece",
                        column: x => x.IDFamillePiece,
                        principalTable: "FamillePieces",
                        principalColumn: "IDFamillePiece",
                        onDelete: ReferentialAction.Restrict);
                });

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
                        name: "FK_ModeleEquipements_EquipmentCriticites_IdCriticite",
                        column: x => x.IdCriticite,
                        principalTable: "EquipmentCriticites",
                        principalColumn: "IdCriticite",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ModeleEquipements_FamilleEquipements_IdFamille",
                        column: x => x.IdFamille,
                        principalTable: "FamilleEquipements",
                        principalColumn: "IdFamille",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ModeleEquipements_Marques_IdMarque",
                        column: x => x.IdMarque,
                        principalTable: "Marques",
                        principalColumn: "IdMarque",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Nom = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Prenom = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    IDRole = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.ID);
                    table.ForeignKey(
                        name: "FK_Users_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Users_Roles_IDRole",
                        column: x => x.IDRole,
                        principalTable: "Roles",
                        principalColumn: "IDRole",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Stocks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StockEntitiesId = table.Column<int>(type: "int", nullable: false),
                    StockStatusId = table.Column<int>(type: "int", nullable: false),
                    StockSupplierId = table.Column<int>(type: "int", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Stocks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Stocks_StockEntities_StockEntitiesId",
                        column: x => x.StockEntitiesId,
                        principalTable: "StockEntities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Stocks_StockStatuses_StockStatusId",
                        column: x => x.StockStatusId,
                        principalTable: "StockStatuses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Stocks_StockSuppliers_StockSupplierId",
                        column: x => x.StockSupplierId,
                        principalTable: "StockSuppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Equipments",
                columns: table => new
                {
                    IdEquipement = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CodeEquipement = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Designation = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IdCriticite = table.Column<int>(type: "int", nullable: true),
                    IdEtat = table.Column<int>(type: "int", nullable: true),
                    IdFamille = table.Column<int>(type: "int", nullable: true),
                    IdModele = table.Column<int>(type: "int", nullable: true),
                    IdGroupe = table.Column<int>(type: "int", nullable: true),
                    DateInstallation = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateMiseEnService = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NumeroSerie = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SousGarantie = table.Column<bool>(type: "bit", nullable: false),
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
                        name: "FK_Equipments_GroupeEquipements_IdGroupe",
                        column: x => x.IdGroupe,
                        principalTable: "GroupeEquipements",
                        principalColumn: "IdGroupe",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Equipments_ModeleEquipements_IdModele",
                        column: x => x.IdModele,
                        principalTable: "ModeleEquipements",
                        principalColumn: "IdModele",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DemandeInterventions",
                columns: table => new
                {
                    IdDemandeIntervention = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Titre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    FileData = table.Column<byte[]>(type: "varbinary(max)", nullable: true),
                    FileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    ContentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
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
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");

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
                name: "IX_Equipments_IdGroupe",
                table: "Equipments",
                column: "IdGroupe");

            migrationBuilder.CreateIndex(
                name: "IX_Equipments_IdModele",
                table: "Equipments",
                column: "IdModele");

            migrationBuilder.CreateIndex(
                name: "IX_ModeleEquipements_IdCriticite",
                table: "ModeleEquipements",
                column: "IdCriticite");

            migrationBuilder.CreateIndex(
                name: "IX_ModeleEquipements_IdFamille",
                table: "ModeleEquipements",
                column: "IdFamille");

            migrationBuilder.CreateIndex(
                name: "IX_ModeleEquipements_IdMarque",
                table: "ModeleEquipements",
                column: "IdMarque");

            migrationBuilder.CreateIndex(
                name: "IX_Pieces_CodePiece",
                table: "Pieces",
                column: "CodePiece",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Pieces_IDConstructeur",
                table: "Pieces",
                column: "IDConstructeur");

            migrationBuilder.CreateIndex(
                name: "IX_Pieces_IDCriticitePiece",
                table: "Pieces",
                column: "IDCriticitePiece");

            migrationBuilder.CreateIndex(
                name: "IX_Pieces_IDFamillePiece",
                table: "Pieces",
                column: "IDFamillePiece");

            migrationBuilder.CreateIndex(
                name: "IX_Stocks_StockEntitiesId",
                table: "Stocks",
                column: "StockEntitiesId");

            migrationBuilder.CreateIndex(
                name: "IX_Stocks_StockStatusId",
                table: "Stocks",
                column: "StockStatusId");

            migrationBuilder.CreateIndex(
                name: "IX_Stocks_StockSupplierId",
                table: "Stocks",
                column: "StockSupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_AppUserId",
                table: "Users",
                column: "AppUserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_IDRole",
                table: "Users",
                column: "IDRole");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "DemandeInterventions");

            migrationBuilder.DropTable(
                name: "Equipments");

            migrationBuilder.DropTable(
                name: "Pieces");

            migrationBuilder.DropTable(
                name: "Stocks");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

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

            migrationBuilder.DropTable(
                name: "EtatEquipements");

            migrationBuilder.DropTable(
                name: "GroupeEquipements");

            migrationBuilder.DropTable(
                name: "ModeleEquipements");

            migrationBuilder.DropTable(
                name: "Constructeurs");

            migrationBuilder.DropTable(
                name: "CriticitePieces");

            migrationBuilder.DropTable(
                name: "FamillePieces");

            migrationBuilder.DropTable(
                name: "StockEntities");

            migrationBuilder.DropTable(
                name: "StockStatuses");

            migrationBuilder.DropTable(
                name: "StockSuppliers");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "EquipmentCriticites");

            migrationBuilder.DropTable(
                name: "FamilleEquipements");

            migrationBuilder.DropTable(
                name: "Marques");
        }
    }
}
