using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DevAssess.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddVerificationEmailCooldown : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastVerificationEmailSentAt",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastVerificationEmailSentAt",
                table: "AspNetUsers");
        }
    }
}
