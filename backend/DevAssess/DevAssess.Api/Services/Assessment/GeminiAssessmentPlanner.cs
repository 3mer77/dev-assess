using System.Text.Json;
using System.Text.Json.Nodes;
using DevAssess.Api.Dtos.Assessment;
using DevAssess.Api.Interfaces.Assessment;
using DevAssess.Api.Models;
using Google.GenAI;
using Google.GenAI.Types;

namespace DevAssess.Api.Services.Assessment;

public class GeminiAssessmentPlanner : IAssessmentPlanner
{
    private readonly Client _client;
    private readonly string _model;

    public GeminiAssessmentPlanner(IConfiguration configuration)
    {
        var apiKey = configuration["Gemini:ApiKey"];

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException(
                "Gemini API key is not configured.");
        }

        _model =
            configuration["Gemini:Model"]
            ?? "gemini-3.8-flash";

        _client = new Client(apiKey: apiKey);
    }

    public async Task<SessionPlan> CreatePlanAsync(UserLearningProfile profile,CancellationToken cancellationToken = default)
    {
        var prompt = BuildPrompt(profile);

        var response = await _client.Models.GenerateContentAsync(
            model: _model,
            contents: prompt,
            config: new GenerateContentConfig
            {
                SystemInstruction = new Content
                {
                    Parts =
                    [
                        new Part
                        {
                            Text = BuildSystemInstruction()
                        }
                    ]
                },

                ResponseMimeType = "application/json",

                ResponseJsonSchema =
                    JsonNode.Parse(SessionPlanSchema),

                Temperature = 0.4
            },
            cancellationToken: cancellationToken
        );

        var text =
            response.Candidates?
                .FirstOrDefault()?
                .Content?
                .Parts?
                .FirstOrDefault()?
                .Text;

        if (string.IsNullOrWhiteSpace(text))
        {
            throw new InvalidOperationException(
                "Gemini returned an empty response.");
        }

        var plan = JsonSerializer.Deserialize<SessionPlan>(
            text,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

        if (plan is null)
        {
            throw new InvalidOperationException(
                "Gemini returned an invalid session plan.");
        }

        return plan;
    }

    private static string BuildSystemInstruction()
    {
        return """
        You are the assessment planning engine for DevAssess.

        DevAssess creates personalized engineering assessments that
        identify a developer's strengths, gaps, and misconceptions.

        Your responsibility is to create a meaningful technical session
        based on the user's target role, stated technical background,
        learning goal, and preferred session duration.

        IMPORTANT CALIBRATION RULES:

        The user's stated background represents exposure or experience,
        not proven mastery.

        Never assume that listing a technology means the user has
        advanced or deep knowledge of that technology.

        The user's background should primarily help you:
        - choose relevant topics
        - avoid completely irrelevant beginner material
        - create scenarios that connect to technologies they have used

        It should NOT be treated as proof of proficiency.

        For this version of DevAssess, no previous verified skill evidence
        is provided to you.

        Therefore, treat this session as an INITIAL CALIBRATION SESSION.

        INITIAL CALIBRATION RULES:

        - Generate exactly 5 challenges.
        - Use exactly:
          1 Easy challenge
          3 Medium challenges
          1 Hard challenge.

        - Difficulty should generally increase through the session.
        - The Hard challenge should probe depth, not require senior-level
          distributed systems expertise.

        - Do not generate five advanced architecture or systems-design problems.

        - Start with accessible but meaningful engineering reasoning.

        - Use transferable knowledge from technologies the user has worked with.

        Example:
        If someone has Node.js backend experience and is learning or using
        ASP.NET Core, you may use similarities and differences between those
        ecosystems to assess understanding.

        - Do not ask extremely basic questions such as:
          "What is an API?"
          "What is a database?"
          "What is HTTP?"

        unless the user's profile strongly suggests they are a complete beginner.

        SESSION LENGTH:

        The entire assessment must realistically fit inside the user's
        preferred session duration.

        For a 20-minute session:
        - each challenge should normally take about 3-5 minutes
        - prompts should be concise
        - avoid requiring full production architecture designs
        - avoid questions that require long essays

        If the user's preferred duration differs, scale the depth and scope
        appropriately while still generating exactly 5 challenges.

        ASSESSMENT PHILOSOPHY:

        - Do not generate multiple-choice questions.
        - Do not create trivia questions.
        - Prefer reasoning over memorization.
        - Prefer realistic engineering scenarios.
        - Challenges should reveal how the user thinks.
        - Do not intentionally trick the user.
        - Do not require obscure framework trivia.
        - Prefer concepts relevant to the user's target role.

        ALLOWED CHALLENGE TYPES:

        Concept
        Debugging
        ApiDesign
        Architecture
        CodeExplanation

                STRICT CHALLENGE TYPE RULES:

        If Type = CodeExplanation:
        - The prompt MUST contain an actual code snippet.
        - Do not describe hypothetical code instead.
        - The user must be asked to explain the provided code.

        If Type = Debugging:
        - Include concrete evidence such as code, an exception,
          logs, incorrect behavior, or a reproducible scenario.

        Difficulty labels must reflect the knowledge actually required.
        Do not label nuanced runtime, concurrency, or framework behavior as Easy.

        Use at least 3 different challenge types in a session.

        CHALLENGE TYPE RULES:

        Debugging:
        Provide a concrete bug, error, code snippet, log, or failure scenario
        that the user must diagnose.

        CodeExplanation:
        Include an actual code snippet and ask the user to explain its
        behavior, consequences, or potential problems.

        ApiDesign:
        Ask the user to design, improve, or critique a concrete API behavior.

        Architecture:
        Ask about system-level decisions and trade-offs, but keep the scope
        appropriate for an initial calibration session.

        Concept:
        Test conceptual understanding through reasoning or a scenario,
        not simple definition recall.

        ALLOWED DIFFICULTY VALUES:

        Easy
        Medium
        Hard

        ORDERING:

        Challenge order must be exactly:
        1
        2
        3
        4
        5

        EXPECTED EVIDENCE:

        Every expectedEvidence key must directly correspond to knowledge
        actually tested by that challenge.

        Do not add unrelated evidence keys merely because they are examples.

        Use 1-4 evidence keys per challenge.

        Prefer reusable skill categories over extremely narrow identifiers.

        expectedEvidence must contain normalized technical skill identifiers.

        Prefer concise, reusable skill identifiers such as:

        aspnet.dependency-injection
        aspnet.service-lifetimes
        aspnet.middleware
        efcore.change-tracking
        efcore.transactions
        csharp.async-await
        api.rest-design
        api.http-semantics
        sql.indexes
        sql.transactions

        Do not create unnecessarily specific skill identifiers when a broader
        reusable skill identifier already describes the evidence being tested.

        OUTPUT:

        Return only the requested structured response.

        Do not include markdown.
        Do not include commentary outside the structured response.
        """;
    }

    private static string BuildPrompt(
        UserLearningProfile profile)
    {
        return $"""
        Create the next engineering assessment session for this user.

        Target role:
        {profile.TargetRole}

        Technical background:
        {profile.Background}

        Learning goal:
        {profile.Goal}

        Preferred session duration:
        {profile.PreferredSessionMinutes} minutes

        Important:

        Adapt the assessment to what the user already knows.

        For example, if the user already has strong Node.js backend experience
        and is learning ASP.NET Core, do not ask basic questions like
        "What is an API?"

        Instead, assess transferable backend knowledge and the differences
        or deeper concepts relevant to the target ecosystem.
        """;
    }

    private const string SessionPlanSchema =
        """
        {
          "type": "object",
          "properties": {
            "title": {
              "type": "string"
            },
            "goal": {
              "type": "string"
            },
            "reason": {
              "type": "string"
            },
            "challenges": {
              "type": "array",
              "minItems": 5,
              "maxItems": 5,
              "items": {
                "type": "object",
                "properties": {
                  "type": {
                    "type": "string",
                    "enum": [
                      "Concept",
                      "Debugging",
                      "ApiDesign",
                      "Architecture",
                      "CodeExplanation"
                    ]
                  },
                  "title": {
                    "type": "string"
                  },
                  "prompt": {
                    "type": "string"
                  },
                  "difficulty": {
                    "type": "string",
                    "enum": [
                      "Easy",
                      "Medium",
                      "Hard"
                    ]
                  },
                  "order": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 5
                  },
                  "expectedEvidence": {
                    "type": "array",
                    "minItems": 1,
                    "items": {
                      "type": "string"
                    }
                  }
                },
                "required": [
                  "type",
                  "title",
                  "prompt",
                  "difficulty",
                  "order",
                  "expectedEvidence"
                ],
                "additionalProperties": false
              }
            }
          },
          "required": [
            "title",
            "goal",
            "reason",
            "challenges"
          ],
          "additionalProperties": false
        }
        """;
}