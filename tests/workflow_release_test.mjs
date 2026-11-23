// Një push në degë prove ose PR nuk duhet të zëvendësojë APK-në publike.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const workflow = readFileSync(".github/workflows/android.yml", "utf8");
const publish = workflow.match(/- name: Publikimi te «Releases»[^\n]*\n\s+if:\s*([^\n]+)/)?.[1].trim();
const summary = workflow.match(/PUBLISHED:\s*\$\{\{\s*(.*?)\s*\}\}/)?.[1].trim();
assert.ok(publish, "mungon kushti i publikimit");
assert.equal(summary, publish, "përmbledhja duhet të përdorë të njëjtin kusht si publikimi");
// Shprehja përdor vetëm një nënbashkësi të përbashkët të gjuhës së GitHub Actions dhe JavaScript.
assert.match(publish, /^github\.event_name\s*!=\s*'pull_request'\s*&&\s*github\.ref\s*==\s*'refs\/heads\/main'$/);
const cases = [
  ["push", "refs/heads/main", true],
  ["workflow_dispatch", "refs/heads/main", true],
  ["push", "refs/heads/arena/test", false],
  ["workflow_dispatch", "refs/heads/arena/test", false],
  ["pull_request", "refs/pull/1/merge", false],
  ["pull_request", "refs/heads/main", false],
  ["push", "refs/heads/master", false],
  ["push", "refs/tags/apk-latest", false],
];
for (const [event_name, ref, expected] of cases) {
  assert.equal(runInNewContext(publish, { github: { event_name, ref } }), expected, `${event_name} ${ref}`);
}
assert.match(workflow, /if:\s*failure\(\)\s*&&\s*github\.event_name\s*==\s*'pull_request'/, "komenti i logut është vetëm për PR");
assert.match(workflow, /PR_NUMBER:\s*\$\{\{\s*github\.event\.pull_request\.number\s*\}\}/, "logu shkon te PR-ja përkatëse");
assert.match(workflow, /gh pr comment "\$PR_NUMBER"/, "nuk komentohet një PR me numër fiks");
console.log(`${cases.length} skenarë të publikimit APK dhe kontrolli i komentit PR kaluan`);
