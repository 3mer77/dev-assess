using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DevAssess.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEvaluationAndSkillEvidence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Evaluations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LearningSessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NextFocus = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ChallengeFeedbackJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReviewerModel = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Evaluations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Evaluations_LearningSessions_LearningSessionId",
                        column: x => x.LearningSessionId,
                        principalTable: "LearningSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserSkillEvidence",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LearningSessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SkillKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Signal = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Confidence = table.Column<double>(type: "float", nullable: false),
                    Evidence = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSkillEvidence", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserSkillEvidence_LearningSessions_LearningSessionId",
                        column: x => x.LearningSessionId,
                        principalTable: "LearningSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Evaluations_LearningSessionId",
                table: "Evaluations",
                column: "LearningSessionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserSkillEvidence_LearningSessionId",
                table: "UserSkillEvidence",
                column: "LearningSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserSkillEvidence_UserId_SkillKey",
                table: "UserSkillEvidence",
                columns: new[] { "UserId", "SkillKey" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Evaluations");

            migrationBuilder.DropTable(
                name: "UserSkillEvidence");
        }
    }
}
