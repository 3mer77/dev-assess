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

    public async Task<SessionPlan> CreatePlanAsync(UserLearningProfile profile,  AssessmentBudget budget, IReadOnlyList<SkillEvidenceSummary> skillEvidence, CancellationToken cancellationToken = default)
    {
        var prompt = BuildPrompt(
      profile,
      budget,
      skillEvidence);

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
    BuildSessionPlanSchema(
        budget.TargetChallenges),

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
    learning goal, preferred session duration, and assessment budget.

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

    PREVIOUS SKILL EVIDENCE:

    The user prompt may contain verified skill evidence collected from
    previous completed assessment sessions.

    Use this evidence to make the next assessment adaptive.

    Evidence priorities mean:

    HIGH:
    The skill needs more assessment because previous evidence was
    insufficient, mixed, or negative.

    MEDIUM:
    Some positive evidence exists, but the skill should still be
    confirmed when relevant.

    LOW:
    Repeated positive evidence already exists. Avoid spending standalone
    basic challenges on this skill unless it is needed as part of a more
    advanced or integrated scenario.

    When previous evidence exists:

    - Prioritize HIGH priority skills that are relevant to the user's
      target role and learning goal.

    - Use new scenarios. Do not simply repeat previous questions.

    - Do not try to test every high-priority skill in one session.

    - Select the most relevant skills that fit the current assessment
      budget and session duration.

    - Skills with LOW priority may still appear inside integrated
      challenges, but should generally not receive basic standalone
      questions.

    - Previous positive evidence does not mean permanent mastery.
      It only means less assessment attention is currently required.

    When no previous verified skill evidence exists:

    - Treat the session as an INITIAL CALIBRATION SESSION.
    - Cover a broad but relevant selection of skills.


    INITIAL CALIBRATION RULES:

    - Generate exactly the number of challenges specified by the
      assessment budget in the user prompt.

    - Do not use a fixed challenge count.

    - Use a balanced difficulty progression appropriate to the user's
      background, target role, learning goal, and requested duration.

    - Difficulty should generally increase through the session.

    - Most challenges should normally be Medium difficulty, with easier
      calibration questions near the beginning and deeper challenges
      toward the end when appropriate.

    - Do not force a fixed number of Easy, Medium, or Hard challenges.

    - Hard challenges should probe depth but should not automatically
      require senior-level distributed systems expertise.

    - Do not generate an assessment consisting entirely of advanced
      architecture or systems-design problems.

    - Start with accessible but meaningful engineering reasoning.

    - Use transferable knowledge from technologies the user has worked with.

    Example:

    If someone has Node.js backend experience and is learning or using
    ASP.NET Core, you may use similarities and differences between those
    ecosystems to assess their backend understanding.

    - Do not ask extremely basic questions such as:
      "What is an API?"
      "What is a database?"
      "What is HTTP?"

      unless the user's profile strongly suggests they are a complete beginner.

    SESSION LENGTH:

    The entire assessment must realistically fit inside the user's
    preferred session duration.

    The assessment budget supplied in the user prompt determines the
    required challenge count.

    Generate exactly the target challenge count specified in the
    assessment budget.

    Scale the scope and expected answer depth of each challenge so that
    the complete assessment fits within the requested duration.

    Short sessions should use concise and focused challenges.

    Longer sessions may include deeper debugging scenarios, API design,
    architecture reasoning, and multi-step engineering problems.

    Do not require unnecessarily long essays or complete production
    architecture designs unless the requested duration and difficulty
    justify them.

    ASSESSMENT PHILOSOPHY:

    - Do not generate multiple-choice questions.
    - Do not create trivia questions.
    - Prefer reasoning over memorization.
    - Prefer realistic engineering scenarios.
    - Challenges should reveal how the user thinks.
    - Do not intentionally trick the user.
    - Do not require obscure framework trivia.
    - Prefer concepts relevant to the user's target role.
    - Prefer practical engineering decisions over textbook definitions.
    - Avoid asking multiple challenges that test essentially the same thing.

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
    - The user must be asked to explain the provided code, its behavior,
      consequences, or potential problems.

    If Type = Debugging:
    - Include concrete evidence such as code, an exception, logs,
      incorrect behavior, or a reproducible scenario.
    - The user should be required to diagnose the cause and explain
      a reasonable fix.

    Difficulty labels must reflect the knowledge actually required.

    Do not label nuanced runtime behavior, concurrency problems,
    transaction issues, or advanced framework behavior as Easy.

    Use multiple challenge types in a session.

    For very short sessions, use at least 2 different challenge types
    when possible.

    For larger sessions, use at least 3 different challenge types.

    CHALLENGE TYPE RULES:

    Debugging:
    Provide a concrete bug, error, code snippet, log, or failure scenario
    that the user must diagnose.

    CodeExplanation:
    Include an actual code snippet and ask the user to explain its
    behavior, consequences, execution, or potential problems.

    ApiDesign:
    Ask the user to design, improve, or critique concrete API behavior.

    Architecture:
    Ask about system-level decisions and trade-offs, while keeping the
    scope appropriate to the user's level and session duration.

    Concept:
    Test conceptual understanding through reasoning or a realistic
    scenario rather than simple definition recall.

    ALLOWED DIFFICULTY VALUES:

    Easy
    Medium
    Hard

    ORDERING:

    Challenge order must begin at 1.

    Challenge order must increase sequentially with no gaps.

    The final challenge order must equal the total number of generated
    challenges.

    For example, if the assessment budget requires 6 challenges,
    the challenge orders must be:

    1
    2
    3
    4
    5
    6

    EXPECTED EVIDENCE:

    Every expectedEvidence key must directly correspond to knowledge
    actually tested by that challenge.

    Do not add unrelated evidence keys merely because they are examples.

    Use 1-4 evidence keys per challenge.

    A single challenge may test multiple related engineering skills
    when doing so makes the scenario more realistic.

    Prefer reusable skill categories over extremely narrow identifiers.

    expectedEvidence must contain normalized technical skill identifiers.

        Every expectedEvidence key MUST contain a domain prefix followed by a dot.

    Valid examples:
    backend.concurrency
    backend.threading
    csharp.async-await
    csharp.threading
    api.rest-design
    api.http-semantics
    sql.transactions
    sql.performance
    efcore.change-tracking
    architecture.scalability
    architecture.caching

    Invalid examples:
    concurrency
    threading
    caching
    performance
    async

    Never return an unqualified single-word skill identifier.

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

    Return only the requested structured JSON response.

    Do not include markdown.

    Do not include commentary outside the structured response.
    """;
    }


    private static string BuildSkillEvidenceContext(
    IReadOnlyList<SkillEvidenceSummary> skillEvidence)
    {
        if (skillEvidence.Count == 0)
        {
            return """
        No previous verified skill evidence is available.

        Treat this as an initial calibration session.
        """;
        }

        var lines = skillEvidence
            .Take(12)
            .Select(summary =>
                $"- {summary.SkillKey} | " +
                $"state: {summary.State} | " +
                $"priority: {summary.Priority} | " +
                $"observations: {summary.EvidenceCount} | " +
                $"reason: {summary.Reason}");

        return string.Join(
            System.Environment.NewLine,
            lines);
    }

    private static string BuildPrompt(
     UserLearningProfile profile,
     AssessmentBudget budget,
     IReadOnlyList<SkillEvidenceSummary> skillEvidence)
    {
        var skillEvidenceContext =
            BuildSkillEvidenceContext(skillEvidence);

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

        Assessment budget:

        Duration:
        {budget.DurationMinutes} minutes

        Required challenge count:
        {budget.TargetChallenges}

        Generate exactly {budget.TargetChallenges} challenges
        for this assessment session.

                PREVIOUS VERIFIED SKILL EVIDENCE:

        {skillEvidenceContext}

        ADAPTIVE PLANNING INSTRUCTIONS:

        Use the previous skill evidence when deciding what this session
        should focus on.

        Prioritize relevant HIGH priority skills.

        Use MEDIUM priority skills when confirmation would be valuable.

        Avoid spending basic standalone challenges on LOW priority skills
        that already have repeated positive evidence.

        Do not mechanically create one question for every listed skill.

        Choose the strongest combination of challenges for the user's
        target role, learning goal, and available session duration.

        Do not repeat previous scenarios merely because a skill requires
        additional evidence.

        A challenge may assess multiple related skills when appropriate.

        Important:

        Adapt the assessment to what the user already knows.

        For example, if the user already has strong Node.js backend experience
        and is learning ASP.NET Core, do not ask basic questions like
        "What is an API?"

        Instead, assess transferable backend knowledge and the differences
        or deeper concepts relevant to the target ecosystem.
        """;
    }

    private static JsonNode BuildSessionPlanSchema(
    int targetChallenges)
    {
        if (targetChallenges is < 3 or > 12)
        {
            throw new ArgumentOutOfRangeException(
                nameof(targetChallenges),
                "Challenge count must be between 3 and 12.");
        }

        var schema = $$"""
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
          "minItems": {{targetChallenges}},
          "maxItems": {{targetChallenges}},
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
                "maximum": {{targetChallenges}}
              },
              "expectedEvidence": {
                "type": "array",
                "minItems": 1,
                "maxItems": 4,
                "items": {
                  "type": "string",
                 "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*(?:\\.[a-z0-9]+(?:-[a-z0-9]+)*)+$"
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

        return JsonNode.Parse(schema)
            ?? throw new InvalidOperationException(
                "Failed to build session plan schema.");
    }
}