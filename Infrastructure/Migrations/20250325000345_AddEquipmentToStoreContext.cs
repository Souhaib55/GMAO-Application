using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEquipmentToStoreContext : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
{
    // Table already exists, so no action needed
    // migrationBuilder.CreateTable(
    //     name: "Equipments",
    //     columns: table => new
    //     {
    //         Id = table.Column<int>(type: "int", nullable: false)
    //             .Annotation("SqlServer:Identity", "1, 1"),
    //         Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
    //         Designation = table.Column<string>(type: "nvarchar(max)", nullable: false)
    //     },
    //     constraints: table =>
    //     {
    //         table.PrimaryKey("PK_Equipments", x => x.Id);
    //     });
}

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Equipments");
        }
    }
}
