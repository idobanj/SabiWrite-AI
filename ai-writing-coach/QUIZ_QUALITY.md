# Quiz quality gate

Practice questions must pass structural validation and a separate review before they are returned to the browser.

1. Generate candidate questions with lower randomness and explicit sentence-completion rules.
2. Reject invalid answer indices, duplicate options, malformed blanks, and the reported determiner/possessive defect ("the their").
3. Send the prompt, options, and all completed sentences to a fresh AI review call. The author's answer key and explanation are withheld.
4. Accept a question only when the reviewer finds exactly one correct option and it agrees with the author's key. Use the reviewer's fresh, sentence-specific explanation.
5. Replace rejected questions in one further attempt. Return the full requested number of approved questions, or return HTTP 503 with `QUIZ_QUALITY_CHECK_FAILED`. Never fall back to unchecked questions or a partial quiz.

Question ids are assigned by the server. Missing, duplicated, ambiguous, malformed, or disagreeing review results cannot approve a question. Logs record candidate/approval counts and failed attempts without logging quiz text or the writer's mistakes.

The browser shows a retry message when quality checks cannot complete. A failed quiz does not enter the active quiz flow or record an attempt.

## Verification

Build the frontend with:

```sh
npm run build
```

## Release and remaining limits

Deploy the updated `generate-quiz` Supabase Edge Function, including its imported `quiz-quality.ts` module, and release the client update. A frontend build alone does not update the remote quiz generator.

The review uses the existing configured AI service in a separate call; it is not a human review or a guarantee that every answer is correct. It adds an AI call to a successful quiz and up to four calls across the two attempts, before provider-level fallbacks. Check live accuracy, completion rates, latency, and cost before a broad release.

For higher assurance, maintain a question bank approved by a qualified English reviewer, run a fixed evaluation set when models or prompts change, and review reported items before admitting them to scored practice. Quiz questions, answers, and results stay in the current Practice screen and are not saved as attempt history.
