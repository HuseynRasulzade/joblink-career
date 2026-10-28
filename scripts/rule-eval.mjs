// Runs the fixed evaluation set through the rule-based fit and prints how often it
// reaches the decision an HR manager would.
//   node --experimental-strip-types scripts/rule-eval.mjs
import { match } from "../lib/model.ts";
import { BLIND_CASES, EVAL_CASES, categoryForScore } from "../tests/fixtures/eval-set.mjs";

const order = { reject: 0, consider: 1, interview: 2 };
function run(title, cases) {
  let right = 0, severe = 0;
  console.log(`\n== ${title}`);
  for (const c of cases) {
    const score = match(c.profile, c.job).score;
    const got = categoryForScore(score);
    const ok = got === c.expected;
    if (ok) right++;
    else if (Math.abs(order[got] - order[c.expected]) === 2) severe++;
    console.log(`${ok ? "ok  " : "MISS"} ${String(score).padStart(3)} ${got.padEnd(9)} (gözlənilən ${c.expected.padEnd(9)}) ${c.id}: ${c.note}`);
  }
  console.log(`Düzgün: ${right}/${cases.length} (${Math.round((right / cases.length) * 100)}%), ciddi səhv (müsahibə↔uyğun deyil): ${severe}`);
}
run("Əsas dəst (qaydalar bu dəstə görə tənzimlənib)", EVAL_CASES);
run("İkinci dəst (tənzimləmədə istifadə olunmayıb)", BLIND_CASES);
