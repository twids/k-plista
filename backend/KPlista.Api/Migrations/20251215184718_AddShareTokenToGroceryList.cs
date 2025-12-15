using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KPlista.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddShareTokenToGroceryList : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ShareToken",
                table: "GroceryLists",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_GroceryLists_ShareToken",
                table: "GroceryLists",
                column: "ShareToken",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_GroceryLists_ShareToken",
                table: "GroceryLists");

            migrationBuilder.DropColumn(
                name: "ShareToken",
                table: "GroceryLists");
        }
    }
}
