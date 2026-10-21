// Manual smoke check: sends six short, non-private examples to the configured
// deployed function. Run with Node.js 24 and --env-file=.env. Keys are never logged.
const base = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!base || !key) throw new Error("The Supabase URL and public API key are required.");

const plans = new Set([
  "I'm going there tomorrow.", "I am going there tomorrow.",
  "I'll go there tomorrow.", "I will go there tomorrow.",
  "I'm going to go there tomorrow.", "I am going to go there tomorrow.",
]);
const cases = [
  {name: "reported future plan", input: "i go there tomorrow", valid: (body) => plans.has(body.corrected_sentence?.replace(/[‘’]/g, "'"))},
  {name: "past-tense correction", input: "Yesterday, he go to school.", valid: (body) => body.corrected_sentence === "Yesterday, he went to school."},
  ...[
    ["fixed timetable", "The train leaves tomorrow at six."],
    ["explicit itinerary", "According to the itinerary, I go there tomorrow."],
    ["already-correct future plan", "I'm going there tomorrow."],
    ["already-correct present", "She goes to work every day."],
  ].map(([name, input]) => ({name, input, valid: (body) => body.corrected_sentence === input && body.mistakes?.length === 0})),
];

let failures = 0;
const args = process.argv.slice(2);
const stream = args.includes("--stream");
const caseName = args.find((arg) => arg !== "--stream");
const selected = cases.filter((entry) => !caseName || entry.name === caseName);
if (selected.length === 0) throw new Error("No matching live-check case.");
for (const entry of selected) {
  const response = await fetch(`${base.replace(/\/$/, "")}/functions/v1/analyze-text`, {
    method: "POST",
    headers: {"Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}`},
    body: JSON.stringify({text: entry.input, stream}),
    signal: AbortSignal.timeout(90000),
  });
  let body;
  if (response.headers.get("Content-Type")?.includes("text/event-stream")) {
    const events = (await response.text()).trim().split("\n\n").filter((line) => line.startsWith("data: ")).map((line) => JSON.parse(line.slice(6)));
    body = events.find((event) => event.type === "complete")?.result ?? events.find((event) => event.type === "error") ?? {};
  } else {
    body = await response.json();
  }
  const passed = response.ok && entry.valid(body);
  if (!passed) failures++;
  console.log(JSON.stringify({
    case: entry.name, stream, status: response.status, passed,
    corrected: body.corrected_sentence,
    explanation: body.explanation,
    types: Array.isArray(body.mistakes) ? body.mistakes.map(({type}) => type) : undefined,
    errorCode: passed ? undefined : body.code ?? `HTTP_${response.status}`,
    reason: passed ? undefined : body.reason,
    validationIssue: passed ? undefined : body.validationIssue,
  }));
  if (response.status === 401 || response.status === 403) {
    console.log("A signed-in session is required to continue the live checks; no authentication settings were changed.");
    break;
  }
}
if (failures) process.exitCode = 1;
