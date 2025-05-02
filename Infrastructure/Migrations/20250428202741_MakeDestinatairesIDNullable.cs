using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MakeDestinatairesIDNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DemandeInterventions_Users_DestinatairesID",
                table: "DemandeInterventions");

            migrationBuilder.AlterColumn<int>(
                name: "DestinatairesID",
                table: "DemandeInterventions",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddForeignKey(
                name: "FK_DemandeInterventions_Users_DestinatairesID",
                table: "DemandeInterventions",
                column: "DestinatairesID",
                principalTable: "Users",
                principalColumn: "ID",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DemandeInterventions_Users_DestinatairesID",
                table: "DemandeInterventions");

            migrationBuilder.AlterColumn<int>(
                name: "DestinatairesID",
                table: "DemandeInterventions",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_DemandeInterventions_Users_DestinatairesID",
                table: "DemandeInterventions",
                column: "DestinatairesID",
                principalTable: "Users",
                principalColumn: "ID",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
