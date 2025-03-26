using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SeedDefaultFamille : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("INSERT INTO FamilleEquipments (LibelleFamille) VALUES ('coupeur');");
            migrationBuilder.Sql("INSERT INTO FamilleEquipments (LibelleFamille) VALUES ('electrique');");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM FamilleEquipments WHERE LibelleFamille IN ('coupeur', 'electrique');");
        }
}
}
