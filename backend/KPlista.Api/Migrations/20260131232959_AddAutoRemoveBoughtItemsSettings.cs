∩╗┐using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KPlista.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAutoRemoveBoughtItemsSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AutoRemoveBoughtItemsDelayMinutes",
                table: "GroceryLists",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "AutoRemoveBoughtItemsEnabled",
                table: "GroceryLists",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AutoRemoveBoughtItemsDelayMinutes",
                table: "GroceryLists");

            migrationBuilder.DropColumn(
                name: "AutoRemoveBoughtItemsEnabled",
                table: "GroceryLists");
        }
    }
}
