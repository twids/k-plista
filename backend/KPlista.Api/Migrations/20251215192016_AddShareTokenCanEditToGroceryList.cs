using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KPlista.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddShareTokenCanEditToGroceryList : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ShareTokenCanEdit",
                table: "GroceryLists",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShareTokenCanEdit",
                table: "GroceryLists");
        }
    }
}
