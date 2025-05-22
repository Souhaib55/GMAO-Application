using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDatePriseEnChargeAndDateResolutionToDemandeIntervention : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DatePriseEnCharge",
                table: "DemandeInterventions",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DateResolution",
                table: "DemandeInterventions",
                type: "datetime",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DatePriseEnCharge",
                table: "DemandeInterventions");

            migrationBuilder.DropColumn(
                name: "DateResolution",
                table: "DemandeInterventions");
        }
    }
}
