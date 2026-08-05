using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Andookhte.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AccountTypeDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CryptoSymbol",
                table: "Accounts",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GoldItemType",
                table: "Accounts",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GoldPurity",
                table: "Accounts",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "GoldWeightGrams",
                table: "Accounts",
                type: "numeric(10,3)",
                precision: 10,
                scale: 3,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "Accounts",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CryptoSymbol",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "GoldItemType",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "GoldPurity",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "GoldWeightGrams",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "Note",
                table: "Accounts");
        }
    }
}
