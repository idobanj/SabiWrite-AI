import assert from "node:assert/strict";
import {test} from "node:test";
import {
  acceptReviewedQuestions,
  buildReviewPrompt,
  generateVerifiedQuestions,
  normaliseQuestion,
  parseModelObject,
  QuizQualityError,
} from "../supabase/functions/generate-quiz/quiz-quality.ts";
import type {QuizQuestion} from "../supabase/functions/generate-quiz/quiz-quality.ts";

const example = (prompt = "She ___ to work every day.") => ({
  id: "untrusted-author-id",
  prompt,
  options: ["walk", "walks", "walking", "have walked"],
  answer_index: 1,
  explanation: "UNTRUSTED EXPLANATION",
});
const question = normaliseQuestion(example(), "candidate-1-1")!;
const goodReview = {
  id: question.id,
  correct_indices: [1],
  explanation: "The singular subject 'she' takes 'walks' in the present simple.",
};
const batch = (questions: unknown[]) => JSON.stringify({questions});
const candidatesIn = (prompt: string): QuizQuestion[] => JSON.parse(prompt.split("Candidate data:\n")[1]);
const approve = async (prompt: string) => JSON.stringify({
  reviews: candidatesIn(prompt).map(({id}) => ({...goodReview, id})),
});

test("rejects the exact reported 'pass me the their' question before AI review", () => {
  assert.equal(normaliseQuestion({
    ...example("Can you pass me the ___? I need to write it down."),
    options: ["there", "their", "they're", "thier"],
  }, "reported-defect"), null);
});

test("allows a possessive before its noun and singular nouns ending in s", () => {
  assert.ok(normaliseQuestion({
    ...example("Can you pass me ___ pen?"),
    options: ["they", "their", "them", "theirs"],
  }, "possessive"));
  assert.ok(normaliseQuestion({
    ...example("She bought ___ for the party."),
    options: ["dress a", "a dress", "an dress", "dress"],
  }, "singular-dress"));
});

for (const index of [null, "1", true, -1, 4, 1.5]) {
  test(`rejects malformed answer index ${JSON.stringify(index)}`, () => {
    assert.equal(normaliseQuestion({...example(), answer_index: index}, "bad-index"), null);
  });
}

test("rejects duplicate or empty options and malformed blanks", () => {
  assert.equal(normaliseQuestion({...example(), options: ["walk", "walks", " walk ", "walked"]}, "duplicate"), null);
  assert.equal(normaliseQuestion({...example(), options: ["walk", "walks", "", "walked"]}, "empty"), null);
  assert.equal(normaliseQuestion(example("___ ___ to work."), "two-blanks"), null);
  assert.equal(normaliseQuestion(example("She __ to work."), "short-blank"), null);
});

test("reviewer receives all completed options without the author's answer key or explanation", () => {
  const prompt = buildReviewPrompt("Subject-Verb Agreement", [question]);
  const data = candidatesIn(prompt);
  assert.equal("answer_index" in data[0], false);
  assert.equal("explanation" in data[0], false);
  assert.equal(prompt.includes("UNTRUSTED EXPLANATION"), false);
  assert.deepEqual((data[0] as unknown as {completed_sentences: string[]}).completed_sentences, [
    "She walk to work every day.", "She walks to work every day.",
    "She walking to work every day.", "She have walked to work every day.",
  ]);
});

test("uses the reviewer's fresh explanation after answer-key agreement", () => {
  const approved = acceptReviewedQuestions([question], [goodReview]);
  assert.equal(approved.length, 1);
  assert.equal(approved[0].explanation, goodReview.explanation);
  assert.notEqual(approved[0].explanation, example().explanation);
});

for (const indices of [[], [0], [1, 2], [1, 1], ["1"], null]) {
  test(`withholds absent, ambiguous, or disagreeing review ${JSON.stringify(indices)}`, () => {
    assert.deepEqual(acceptReviewedQuestions([question], [{...goodReview, correct_indices: indices}]), []);
  });
}

test("withholds missing, duplicate, unrelated, or unexplained verdicts", () => {
  for (const reviews of [
    [], [goodReview, goodReview], [{...goodReview, id: "unrelated"}],
    [{...goodReview, explanation: ""}], [{...goodReview, explanation: "word ".repeat(36)}],
    {reviews: [goodReview]},
  ]) assert.deepEqual(acceptReviewedQuestions([question], reviews), []);
});

test("matches verdicts by candidate id rather than array position", () => {
  const other = {...question, id: "candidate-1-2", answer_index: 2};
  const reviews = [{...goodReview, id: other.id, correct_indices: [2]}, goodReview];
  assert.equal(acceptReviewedQuestions([question, other], reviews).length, 2);
});

test("parses wrapped JSON and rejects malformed responses", () => {
  assert.deepEqual(parseModelObject('<think>private reasoning</think>```json\n{"reviews":[]}\n```'), {reviews: []});
  for (const text of ["not JSON", "null", "[]", '{"reviews":']) {
    assert.throws(() => parseModelObject(text));
  }
});

test("retries generation when content is malformed, not only when the API throws", async () => {
  let calls = 0;
  const questions = await generateVerifiedQuestions({
    count: 1, topic: "Subject-Verb Agreement",
    generateCandidates: async () => ++calls === 1 ? "broken JSON" : batch([example()]),
    reviewCandidates: approve,
  });
  assert.equal(calls, 2);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].id, "q1");
});

test("retries after reviewer failure and never accepts unchecked output", async () => {
  let reviews = 0;
  const questions = await generateVerifiedQuestions({
    count: 1, topic: "Subject-Verb Agreement",
    generateCandidates: async () => batch([example()]),
    reviewCandidates: async (prompt) => {
      if (++reviews === 1) throw new Error("reviewer unavailable");
      return approve(prompt);
    },
  });
  assert.equal(reviews, 2);
  assert.equal(questions.length, 1);
});

test("fills rejected slots with newly reviewed questions and unique ids", async () => {
  const seen: number[] = [];
  const questions = await generateVerifiedQuestions({
    count: 2, topic: "Subject-Verb Agreement",
    generateCandidates: async (requested, attempt) => {
      seen.push(requested);
      return batch(attempt === 0 ? [example()] : [example(), example("He ___ to school every day.")]);
    },
    reviewCandidates: approve,
  });
  assert.deepEqual(seen, [4, 3]);
  assert.deepEqual(questions.map(({id}) => id), ["q1", "q2"]);
  assert.equal(new Set(questions.map(({prompt}) => prompt)).size, 2);
});

test("allows distinct full-sentence questions with the same instruction", async () => {
  const questions = await generateVerifiedQuestions({
    count: 2, topic: "Subject-Verb Agreement",
    generateCandidates: async () => batch([
      {...example("Choose the grammatically correct sentence."), options: ["She walk.", "She walks.", "She walking.", "She have walked."]},
      {...example("Choose the grammatically correct sentence."), options: ["He go.", "He goes.", "He going.", "He gone."]},
    ]),
    reviewCandidates: approve,
  });
  assert.equal(questions.length, 2);
});

for (const failure of ["unavailable", "malformed", "no-correct-answer", "wrong-key"]) {
  test(`fails closed after two attempts when review is ${failure}`, async () => {
    let attempts = 0;
    await assert.rejects(() => generateVerifiedQuestions({
      count: 1, topic: "Subject-Verb Agreement",
      generateCandidates: async () => {attempts++; return batch([example()]);},
      reviewCandidates: async (prompt) => {
        if (failure === "unavailable") throw new Error("offline");
        if (failure === "malformed") return "broken JSON";
        return JSON.stringify({reviews: candidatesIn(prompt).map(({id}) => ({
          ...goodReview, id, correct_indices: failure === "wrong-key" ? [0] : [],
        }))});
      },
    }), QuizQualityError);
    assert.equal(attempts, 2);
  });
}

test("withholds a partial quiz instead of returning fewer verified questions", async () => {
  await assert.rejects(() => generateVerifiedQuestions({
    count: 3, topic: "Subject-Verb Agreement",
    generateCandidates: async () => batch([example(), example()]),
    reviewCandidates: approve,
  }), QuizQualityError);
});

test("the reported bad item cannot reach review or a returned quiz", async () => {
  const bad = {...example("Can you pass me the ___? I need to write it down."), options: ["there", "their", "they're", "thier"]};
  const good = {...example("Please ___ the package tomorrow."), options: ["recieve", "receive", "receeve", "receve"]};
  const questions = await generateVerifiedQuestions({
    count: 1, topic: "Spelling",
    generateCandidates: async () => batch([bad, good]),
    reviewCandidates: async (prompt) => {
      assert.equal(candidatesIn(prompt).some(({prompt: stem}) => stem === bad.prompt), false);
      return JSON.stringify({reviews: candidatesIn(prompt).map(({id}) => ({
        id, correct_indices: [1], explanation: "'Receive' is the standard spelling of the verb.",
      }))});
    },
  });
  assert.equal(questions[0].prompt, good.prompt);
});
