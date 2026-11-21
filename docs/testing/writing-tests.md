# Writing tests that catch faults and run fast

Read this before adding or changing any test. It is the detail behind [`AGENTS.md`](../../AGENTS.md) sections 14 and 17. It applies to every agent and every package.

The rules come from what the mutation runs and the speed work measured: see [mutation-testing.md](./mutation-testing.md), the [triage ledger](./mutation-triage.md) and the [test speed baseline](./test-speed-baseline.md). In the first runs, tests that executed the code but did not check its result let 30 to 40% of small faults through in `apps/web` and `packages/ui`.

## 1. A test must fail when the code is wrong

A mutation run makes one small fault at a time (`>` becomes `>=`, `+` becomes `-`, a condition becomes `true`, a block is emptied, a call is removed) and expects a test to fail. Write each test so it would.

1. **Check the result, not that the code ran.** Every test asserts a specific value, output, state or call. `toBeDefined`, `toBeTruthy`, `not.toThrow` and a snapshot are never the only assertion on a behaviour.
2. **Test every edge of a comparison.** For each `<`, `<=`, `>`, `>=`, threshold, band edge or date limit: one case exactly on the edge, one just below and one just above.
3. **Take every branch both ways.** Each `if`, ternary, `&&`, `||`, `??` and optional chain has a case for each side. In a compound condition, each part decides the outcome in at least one case.
4. **Pick inputs that tell operators apart.** Avoid 0, 1 and equal operands in arithmetic (2 + 2 equals 2 × 2). Give different fields different values, so swapped arguments or the wrong field give a different answer.
5. **Work the expected value out by hand.** Never from the function under test, and never by copying its formula into the test (section 14). For money and tax, show the working in a comment.
6. **Cover the empty and the missing.** A list with none, one and several items; a missing, `null` and `undefined` input wherever the code has a default or fallback. Where order matters, assert the order. For a filter, include one item that passes and one that does not.
7. **Check what a mock was called with.** Assert the arguments and the number of calls, and assert that the call which must not happen did not. Mock only at the boundary (network, clock, storage, another module's side effects), never the code under test.
8. **Check failures fully.** Assert the error type and its code or message, and that nothing was saved, sent or changed on the way.
9. **For UI, assert what the user gets.** Find elements by role and name; assert the text, value or state shown, that the handler received the right value, and that something hidden is absent. Take each conditional render both ways. Do not assert class names, style objects or internal state.
10. **See the test fail.** Before trusting a new or changed test, break the code it covers (flip the comparison, change the operator, return early) and watch it fail, then put the code back. A bug-fix test must fail before the fix.
11. **Import the source statically.** Stryker finds a file's tests through static imports. A test that loads its subject with `await import(...)` is invisible to it unless the test is about module loading itself.
12. **Do not test source text.** A test that reads a source file and searches it proves nothing about behaviour.
13. **Never weaken a test to make it pass.** Loosening an assertion, widening a tolerance, deleting a case or adding `.skip` needs the reason in the PR description. `.only` and `.skip` are not committed.

### When to run Stryker on your change

Mutation testing is a local check, never a CI job (owner decision, 20 November 2026). You do not run a whole package for a normal change. Run it on the files you changed when the change adds or alters logic in:

- `packages/finance-engine` (money and tax maths), or
- `apps/backend` guards, interceptors, auth or `security/`.

```bash
cd <package> && node ../../node_modules/@stryker-mutator/core/bin/stryker.js run --force --mutate "src/path/file.ts"
```

A line range keeps it short (`"src/path/file.ts:20-44"`). Do not edit or commit files in that package while it runs: Stryker writes faults into the real files and restores them at the end. For every fault that survives, write the missing test, or add a row to the [triage ledger](./mutation-triage.md) with a proof that it is equivalent or a real reason it is not worth killing. "Hard to kill" is not a reason. The PR description says what was run and how many faults survived.

Everywhere else, rule 10 is the check, and the PR description says it was done.

## 2. A test must be quick

In `apps/web`, only about a fifth of test time is the tests themselves; the rest is imports, building the environment and set-up. So the rules are mostly about what a test file loads and waits for.

1. **Use the node environment when there is no DOM.** A test file whose test and source touch no DOM starts with `// @vitest-environment node`. The exact conditions are in the [test speed baseline](./test-speed-baseline.md#test-environment-node-or-happy-dom-e41-p3). A file that later needs the DOM drops the line; do not stub the DOM.
2. **No real waiting.** No `setTimeout` sleeps and no real timers: use fake timers and advance them. Use `findBy` and `waitFor` only for work that is truly asynchronous. Never raise a timeout to make a test pass.
3. **No real network, database or clock in a unit test.** Database specs belong to the backend's database project. Fix the date with fake timers where the code reads it.
4. **Load only what the test needs.** Import the module under test directly, not through a barrel that pulls in a whole package. Render the component under test, not the page or the app shell, unless the page is the subject.
5. **Test logic without rendering.** Put calculation and decision logic in plain functions and test those directly; keep render tests for what only a render can show.
6. **Use tables for many inputs.** `test.each` over one cheap set-up, not a render per assertion.
7. **Keep tests independent and repeatable.** No state shared between tests, no reliance on order, no `Math.random` or the current time. Property tests use a fixed seed and a bounded number of runs. Sample ids and tokens are built at run time from a counter or `node:crypto` (section 15); the security scan rejects `Math.random`.
8. **No wall-clock assertions.** Do not assert that code finished within some number of milliseconds; it fails on a busy machine and proves nothing.
9. **Measure a slow file.** Run `bunx vitest run <file>` in the package and read the time. A unit test file that takes more than 5 seconds on its own needs the reason in the PR description. `bun scripts/test-timings.ts run <package-dir>` lists the slowest files in a package.

## 3. What the PR description says

Under "Tests": which behaviours the new or changed tests cover, how each was seen to fail (by hand, or the Stryker command and its survivor count), any test weakened, skipped or removed and why, and any file over the 5 second mark.
