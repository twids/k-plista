using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KPlista.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddIconToItemGroup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Icon",
                table: "ItemGroups",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Icon",
                table: "ItemGroups");
        }
    }
}
