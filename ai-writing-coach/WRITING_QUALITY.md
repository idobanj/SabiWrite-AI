# Writing Desk correction review

Both JSON and streaming `analyze-text` requests use the same pipeline: generate an analysis, validate all source edits, and review the complete original/corrected text in a fresh AI call. A reviewer may propose up to two complete repairs; the final repair requires another approval before the server returns it. Invalid reviewer edits receive validation feedback and another repair opportunity within that limit, rather than immediately ending the request.

The prompts check tense against time expressions, preserve meaning and valid English variants, and distinguish personal future plans from fixed future schedules. For the isolated draft `i go there tomorrow`, the coach should offer a natural personal-plan wording such as `I'm going there tomorrow.` and explain the contextual phrasing choice. It must preserve a clear scheduled use such as `According to the itinerary, I go there tomorrow.` See [Cambridge's explanation of present simple for future schedules](https://dictionary.cambridge.org/us/grammar/british-grammar/simple-future).

Malformed analyses, unknown mistake types, invalid empty/no-op edits, unmatched source spans, overlapping edits, and a declared corrected sentence that disagrees with the applied edits cannot receive a score or be returned as a valid result. Valid zero-width insertions require explicit in-bounds positions and are anchored to adjacent original text for highlighting and mistake memory. Known capitalization labels are normalized to punctuation. Scores and focus areas are calculated from the edits that actually produce the returned text.

If review fails, the JSON endpoint returns HTTP 503 with `ANALYSIS_QUALITY_CHECK_FAILED`; the SSE endpoint emits that code without a completed result. The client displays the quality failure without silently starting another paid analysis. Interrupted streams can still fall back once to the normal endpoint, which also performs review.

Run the regression tests with Node.js 24:

```sh
npm run test:analysis
npm run test:quiz
npm run build
```

The automated tests mock model responses and validate pipeline behavior, including recovery from a reviewer quoting corrected text instead of the original greeting `hi there how aare you`. They do not establish live-model accuracy. After deployment, check representative personal-plan, past-tense, fixed-schedule, greeting, and already-correct samples against the live endpoint. The extra review uses the same configured AI service; it reduces mistakes but cannot guarantee error-free language judgments. A successful check requires two AI calls, or up to four when repairs are needed, before provider-level fallbacks.

For a manual check of seven non-private examples against the configured live endpoint, run `node --env-file=.env scripts/check-analysis-live.mjs`. This makes real AI requests and is intentionally excluded from automated tests. If the public key cannot invoke the function, the check stops and a signed-in session must be used; it never changes authentication settings.

To check the route used by the Writing Desk, run `node --env-file=.env scripts/check-analysis-live.mjs "reported future plan" --stream`.

Deploy the `analyze-text` Edge Function with its imported `analysis-review.ts` and release the client update. Existing saved analyses are not regraded by this change.
