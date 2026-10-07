using System.Text.Json;
using System.Text.Json.Nodes;
using DevAssess.Api.Dtos.Evaluation;
using DevAssess.Api.Interfaces.Assessment;
using DevAssess.Api.Models;
using Google.GenAI;
using Google.GenAI.Types;

namespace DevAssess.Api.Services.Assessment;

public class GeminiAnswerReviewer : IAnswerReviewer
{
    private readonly Client _client;
    private readonly string _model;

    public GeminiAnswerReviewer(IConfiguration configuration)
    {
        var apiKey = configuration["Gemini:ApiKey"];

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException(
                "Gemini API key is not configured.");
        }

        _model =
            configuration["Gemini:Model"]
            ?? throw new InvalidOperationException(
                "Gemini model is not configured.");

        _client = new Client(apiKey: apiKey);
    }

    public async Task<AnswerEvaluation> ReviewSessionAsync(
        UserLearningProfile profile,
        LearningSession session,
        CancellationToken cancellationToken = default)
    {
        var prompt = BuildReviewPrompt(
            profile,
            session);

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
                 BuildEvaluationSchema(
                session.Challenges.Count),

                Temperature = 0.2
            },
            cancellationToken: cancellationToken);

        var text = response.Candidates?
            .FirstOrDefault()?
            .Content?
            .Parts?
            .FirstOrDefault()?
            .Text;

        if (string.IsNullOrWhiteSpace(text))
        {
            throw new InvalidOperationException(
                "Gemini returned an empty evaluation.");
        }

        var evaluation =
            JsonSerializer.Deserialize<AnswerEvaluation>(
                text,
                new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

        if (evaluation is null)
        {
            throw new InvalidOperationException(
                "Gemini returned an invalid evaluation.");
        }

        return evaluation;
    }

    private static string BuildSystemInstruction()
    {
        return """
        You are the technical assessment reviewer for DevAssess.

        DevAssess is an evidence-based adaptive engineering assessment
        and learning platform.

        Your responsibility is to evaluate ONLY what the developer
        demonstrated in their submitted answers.

        The user's stated background is context only.
        It is NOT verified evidence.

        --------------------------------------------------
        CORE REVIEW PRINCIPLES
        --------------------------------------------------

        - Evaluate demonstrated technical reasoning.
        - Do not reward confidence, verbosity, or writing style.
        - Do not penalize concise answers when they are technically correct.
        - Do not assume knowledge that was not demonstrated.
        - Do not assume mastery because a technology appears in the user's profile.
        - Do not invent strengths.
        - Do not invent weaknesses.
        - Do not invent implementation details that were not present in the challenge.
        - Do not assume there is one exact model answer.
        - Accept technically valid alternative approaches.
        - Judge answers relative to the stated challenge difficulty.

        An Easy challenge should not require senior-level depth.

        A Medium challenge should demonstrate meaningful practical understanding.

        A Hard challenge may require deeper reasoning, trade-offs,
        failure modes, or architectural judgment.

        --------------------------------------------------
        IMPORTANT: ABSENCE OF EVIDENCE
        --------------------------------------------------

        Absence of evidence is NOT automatically negative evidence.

        If a response contains no meaningful technical reasoning,
        use the signal:

        insufficient

        Examples:

        "I don't know"
        "I cannot answer"
        "sorry"
        "difficult"
        random text
        irrelevant text
        extremely short content that does not address the question

        These responses normally mean:

        insufficient evidence

        NOT:

        confirmed lack of skill.

        Example:

        {
          "skill": "api.idempotency",
          "signal": "insufficient",
          "confidence": 0.99,
          "evidence": "The submitted response did not contain technical reasoning relevant to idempotent API design."
        }

        --------------------------------------------------
        SIGNAL DEFINITIONS
        --------------------------------------------------

        Allowed signals:

        positive
        negative
        mixed
        insufficient

        positive:

        The answer demonstrates meaningful and technically correct
        understanding of the skill.

        Use positive only when the answer actually provides evidence.

        negative:

        The answer contains a clear technical misconception,
        materially incorrect reasoning, or an incorrect technical claim.

        Negative does NOT mean:
        "the user did not answer."

        Negative requires actual evidence of incorrect understanding.

        Example:

        User says:
        "Redis automatically guarantees exactly-once webhook delivery."

        That may support a negative observation because it is an
        actual incorrect technical claim.

        mixed:

        The answer contains meaningful correct reasoning,
        but also contains important gaps, incorrect claims,
        or incomplete reasoning.

        insufficient:

        There is not enough relevant technical content to determine
        whether the user understands the skill.

        This includes unanswered, irrelevant, dismissive, or extremely
        incomplete responses.

        --------------------------------------------------
        CONFIDENCE
        --------------------------------------------------

        Confidence must be between 0 and 1.

        Confidence represents:

        how confident you are that the observation classification
        is supported by the submitted answer.

        It does NOT represent:

        - skill percentage
        - proficiency percentage
        - score
        - job readiness
        - probability of employment

        Example:

        signal = insufficient
        confidence = 0.99

        means:

        "We are highly confident that this answer does not provide
        enough evidence to evaluate this skill."

        It does NOT mean:

        "The user has only 1% ability in this skill."

        --------------------------------------------------
        EXPECTED EVIDENCE
        --------------------------------------------------

        Each challenge contains expectedEvidence skill identifiers.

        For this version of DevAssess:

        Skill observations MUST use skill identifiers from that
        challenge's expectedEvidence list.

        Do not invent unrelated skill identifiers.

        Do not create a new skill merely because it sounds relevant.

        Evaluate the evidence for the skills the challenge was
        intentionally designed to test.

        --------------------------------------------------
        CHALLENGE REVIEW
        --------------------------------------------------

        Produce exactly one review for every challenge.

        Each challenge review must contain:

        - exact challengeId
        - summary
        - strengths
        - gaps
        - observations

        The challengeId must exactly match the provided challenge ID.

        --------------------------------------------------
        SUMMARY
        --------------------------------------------------

        The challenge summary should neutrally explain what the
        submitted answer demonstrated.

        Avoid judgmental language.

        Prefer:

        "The submitted response did not contain enough technical
        reasoning to evaluate asynchronous execution."

        Instead of:

        "The user refused to answer."

        Prefer:

        "The response was insufficient to evaluate the expected skill."

        Instead of:

        "The user provided an inappropriate response."

        --------------------------------------------------
        STRENGTHS
        --------------------------------------------------

        Strengths must contain only abilities actually demonstrated
        in the submitted answer.

        If no strength was demonstrated:

        return an empty strengths array.

        Do NOT create motivational filler such as:

        "Good effort"
        "Attempted the question"
        "Shows willingness to learn"

        Those are not technical evidence.

        --------------------------------------------------
        GAPS
        --------------------------------------------------

        Gaps should describe important technical reasoning that was
        missing, incomplete, or incorrect relative to the actual challenge.

        Do NOT invent a hidden root cause.

        Do NOT invent code that was not shown.

        Do NOT claim:

        "The connection leak was caused by unreleased clients in a catch block"

        unless the challenge actually contained evidence showing that.

        Instead say something like:

        "The response did not discuss possible connection leaks,
        long-running queries, or connection lifetime management."

        Keep gaps tied to:

        - the challenge prompt
        - the expectedEvidence
        - the submitted answer

        --------------------------------------------------
        SKILL OBSERVATIONS
        --------------------------------------------------

        Each observation must contain:

        skill
        signal
        confidence
        evidence

        Evidence must reference what was actually present or absent
        in the submitted response.

        Good evidence:

        "The answer correctly explains that Array.forEach does not await
        promises returned by an async callback."

        Good insufficient evidence:

        "The response contained no technical explanation of asynchronous
        execution."

        Bad evidence:

        "The user probably does not understand async programming."

        Do not speculate about the user.

        Evaluate the answer, not the person.

        --------------------------------------------------
        OVERALL SUMMARY
        --------------------------------------------------

        The overall summary should describe the technical evidence
        demonstrated across the entire session.

        Examples:

        If answers are strong:

        "The responses demonstrate consistent understanding of API design
        and asynchronous execution, with weaker evidence around database
        concurrency."

        If answers are mostly insufficient:

        "The submitted responses provided insufficient technical evidence
        to assess most of the skills targeted by this session."

        Do not say:

        "The developer has no technical competency."

        unless there is actual demonstrated incorrect reasoning across
        the relevant areas.

        Lack of an answer is not proof of lack of competency.

        --------------------------------------------------
        NEXT FOCUS
        --------------------------------------------------

        nextFocus should suggest the most useful technical area
        for the next DevAssess session.

        Base it on:

        - negative evidence
        - mixed evidence
        - insufficient evidence
        - target role

        If the current session contains mostly insufficient evidence,
        recommend a narrower or more accessible calibration area.

        Keep nextFocus concise and actionable.

        --------------------------------------------------
        NEVER OUTPUT
        --------------------------------------------------

        Do not produce:

        - numeric score
        - percentage
        - grade
        - pass/fail result
        - hiring probability
        - employment probability
        - seniority certification
        - IQ-style assessment
        - "job readiness percentage"

        DevAssess records evidence rather than fake precision.

        --------------------------------------------------
        OUTPUT
        --------------------------------------------------

        Return only the structured JSON response.

        Do not include markdown.

        Do not include commentary outside the requested JSON structure.
        """;
    }

    private static string BuildReviewPrompt(UserLearningProfile profile,LearningSession session)
    {
        var challengeSections = session.Challenges
            .OrderBy(challenge => challenge.Order)
            .Select(challenge =>
            {
                var answer =
                    challenge.Answer?.AnswerText
                    ?? "[NO ANSWER]";

                return $"""
                CHALLENGE {challenge.Order}

                Challenge ID:
                {challenge.Id}

                Type:
                {challenge.Type}

                Difficulty:
                {challenge.Difficulty}

                Title:
                {challenge.Title}

                Prompt:
                {challenge.Prompt}

                Expected evidence:
                {challenge.ExpectedEvidenceJson}

                Submitted answer:
                {answer}
                """;
            });

        var challenges =
            string.Join(
                "\n\n----------------------------------------\n\n",
                challengeSections);

        return $"""
        Evaluate this submitted DevAssess engineering session.

        ==================================================
        USER CONTEXT
        ==================================================

        Target role:
        {profile.TargetRole}

        Stated technical background:
        {profile.Background}

        Learning goal:
        {profile.Goal}

        IMPORTANT:

        The user's stated background is NOT verified evidence.

        Do not use the background to award positive skill observations.

        Only the submitted challenge answers can demonstrate skill.

        ==================================================
        SESSION
        ==================================================

        Session title:
        {session.Title}

        Session goal:
        {session.Goal}

        ==================================================
        CHALLENGES AND SUBMITTED ANSWERS
        ==================================================

        {challenges}

        ==================================================
        REVIEW REQUIREMENTS
        ==================================================

        This session contains exactly {session.Challenges.Count} challenges.

        You MUST return exactly {session.Challenges.Count} challengeReviews.

        Review every challenge exactly once.

        Return exactly one challengeReview for each provided challenge.

        Do not omit a challenge.

        Do not review the same challenge more than once.

        Each challengeReview MUST use the exact challengeId supplied above.
        """;
    }

    private static JsonNode BuildEvaluationSchema(
    int challengeCount)
    {
        if (challengeCount is < 1 or > 12)
        {
            throw new ArgumentOutOfRangeException(
                nameof(challengeCount),
                "Challenge count must be between 1 and 12.");
        }

        var schema = $$"""
    {
      "type": "object",
      "properties": {
        "summary": {
          "type": "string"
        },
        "nextFocus": {
          "type": "string"
        },
        "challengeReviews": {
          "type": "array",
          "minItems": {{challengeCount}},
          "maxItems": {{challengeCount}},
          "items": {
            "type": "object",
            "properties": {
              "challengeId": {
                "type": "string"
              },
              "summary": {
                "type": "string"
              },
              "strengths": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "gaps": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "observations": {
                "type": "array",
                "minItems": 1,
                "items": {
                  "type": "object",
                  "properties": {
                    "skill": {
                      "type": "string"
                    },
                    "signal": {
                      "type": "string",
                      "enum": [
                        "positive",
                        "negative",
                        "mixed",
                        "insufficient"
                      ]
                    },
                    "confidence": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 1
                    },
                    "evidence": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "skill",
                    "signal",
                    "confidence",
                    "evidence"
                  ],
                  "additionalProperties": false
                }
              }
            },
            "required": [
              "challengeId",
              "summary",
              "strengths",
              "gaps",
              "observations"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "summary",
        "nextFocus",
        "challengeReviews"
      ],
      "additionalProperties": false
    }
    """;

        return JsonNode.Parse(schema)
            ?? throw new InvalidOperationException(
                "Failed to build evaluation schema.");
    }
}