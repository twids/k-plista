using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KPlista.Api.Migrations
{
    /// <inheritdoc />
    public partial class ChangeAutoRemoveDelayToNonNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "AutoRemoveBoughtItemsDelayMinutes",
                table: "GroceryLists",
                type: "integer",
                nullable: false,
                defaultValue: 360,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "AutoRemoveBoughtItemsDelayMinutes",
                table: "GroceryLists",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");
        }
    }
}
