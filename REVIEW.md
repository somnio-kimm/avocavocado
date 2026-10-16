# AI Code Review Process

This document defines the minimum review standards that `Claude` and GitHub `Copilot` review must follow when reviewing a feature PR or a feature change.

## Review Goal

- Before evaluating implementation quality, first verify that the scope and structure of the change are appropriate.
- Ensure that the new feature does not impose unnecessary burden on the team-wide codebase or the collaboration flow.
- Ensure that tests are always included when a feature is added.

## Required Checks

### 1. Test Coverage Is Mandatory For Features

- If a feature is added, test code must be included.
- Tests must verify the core path of the newly added behavior and the main failure cases.
- Tests must be written so that the input and the expected output are visible at a glance during review.
- If a feature change has no tests, default to `Request Changes`.

Questions:
- Have tests that actually verify the new feature been added?
- Are the tests directly connected to the implemented behavior?
- Are the tests not too broad or too heavy, and are they focused on the scope of this change?
- Reading only the test, is it clear what output is expected for what input?

### 2. Test Code Review Rules

- Review test code just like production code.
- Tests must verify externally observable behavior and contracts, not implementation details.
- When verifying the same rule across multiple data cases, consider `@pytest.mark.parametrize` first.
- When inputs and outputs cannot be naturally expressed with `@pytest.mark.parametrize`, it is acceptable to split them into scenario-based tests.
- Even when objects appear as inputs or outputs, prefer verifying key fields, state transitions, and observable results over comparing full object equality.
- Use fixtures, helpers, and factories only when they better reveal the test's intent; do not over-abstract simple cases.
- Reading only the test name should be enough to understand which scenario it verifies.
- If the test code is unnaturally complex or excessively hard to write, examine whether the problem lies not only in the test but also in the design of the production code.
- If the test is hard to write because of the design, do not stop at simply requesting more tests — suggest where the code can be split into smaller pieces or propose a more appropriate structure.

Questions:
- Does this test verify the actual behavioral contract rather than internal implementation?
- Are cases that share the same pattern unnecessarily duplicated across individual tests?
- Conversely, are complex object compositions or scenario semantics being forced into `@pytest.mark.parametrize` in a way that hurts readability?
- Are assertions avoiding over-reliance on full object comparison and revealing the key results?
- Are fixtures or helpers making the test harder to understand rather than making it shorter?
- Is the test hard to write because of excessive responsibilities in a function/class, strong coupling, or excessive side effects?
- Is a structural suggestion needed — such as splitting into smaller units or clarifying boundaries — to resolve the testing difficulty?

### 3. PR Scope Must Stay Small

- As a principle, a feature PR should add exactly one feature at a time.
- When changes with different purposes are mixed, review difficulty and regression risk grow, so they must be separated.
- When a feature addition is bundled with large refactors, folder reorganizations, or changes to shared structures, suspect scope overreach.
- If changes not directly required to implement or verify the current feature are mixed in, treat it as a scope violation.
- Classify scope violations as `Required Changes`, not `Suggestions`, and request separation.

Questions:
- Does this PR add only a single feature?
- Does this change include structural changes or cleanup not directly required by it?
- Are there changes that should have been split into a separate PR?

### 4. Chosen Structure Must Not Harm Other Branches

- Check whether the current structural choice is likely to cause conflicts with the work branches of other team members.
- Watch for unnecessary concentration of changes in shared entry points, large central registries, large enum/switch blocks, or global config files.
- Even when an extension point is needed, prefer a structure that keeps the conflict surface as small as possible.

Questions:
- Does this structure excessively raise the likelihood of merge conflicts with other branches?
- Have shared files been enlarged unnecessarily to accommodate the new feature?
- Could the same goal have been achieved by adding a more localized file or module?

### 5. New Files Must Be Placed In The Right Location

- If a feature was added, confirm that the new files are placed in a location consistent with the project's separation of responsibilities and directory conventions.
- Compare first with where similar existing files live before making a judgment.
- Do not justify a location merely by "it works here."

Questions:
- Are the new files in the same layer as existing code with the same responsibility?
- Are there files placed in ambiguous locations because they feel temporary?
- Does the placement harm future discoverability and maintainability?

### 6. Added Folder Structure Must Be Justified

- Add a new folder only when there is clear responsibility and a concrete future need for extension.
- Do not add unnecessary depth for just 1–2 files, and do not introduce naming rules that diverge from the existing structure.
- If a new folder is introduced, it must be possible to explain why this folder is needed within the current codebase.

Questions:
- Is the new folder really necessary?
- Could the same purpose have been served within the existing folder structure?
- Do the folder name and depth conflict with existing project conventions?

### 7. Existing File Structure Must Remain Coherent

- Check that this change does not damage the existing file structure and separation of responsibilities.
- Do not scatter logic into unrelated files for the sake of a feature addition, and do not push multiple responsibilities into a single file.
- If structural consistency is broken, flag it regardless of whether the feature works.

Questions:
- Has the responsibility of an existing file become blurred because of this change?
- Has feature logic been scattered across unrelated files?
- Has it become harder to know "where to look" during maintenance?

### 8. Branch, Commit, and PR Naming Must Follow Conventions

- Branches, commit messages, and PR titles must follow the naming rules below.
- When a name deviates from the rules, propose the correct form as a `Suggestion`; show the current name and the rule-conforming name side by side, and briefly explain why following the rule is preferable.

#### Branch Naming: `{type}/{issue-number}-{desc}`

| Type | Format | Example |
| --- | --- | --- |
| Feature | `feat/{issue-number}-{desc}` | `feat/1-uv-project-setup` |
| Bug fix | `fix/{issue-number}-{desc}` | `fix/12-login-error` |
| Docs | `docs/{issue-number}-{desc}` | `docs/7-update-readme` |
| Refactor | `refactor/{issue-number}-{desc}` | `refactor/15-package-structure` |
| Test | `test/{issue-number}-{desc}` | `test/21-add-basic-tests` |

#### Commit Message: `{type}: {description}`

| Type | Meaning | Example |
| --- | --- | --- |
| `feat` | New feature | `feat: initialize python project using uv` |
| `fix` | Bug fix | `fix: resolve import path issue` |
| `docs` | Documentation | `docs: update setup instructions` |
| `test` | Tests | `test: add project initialization tests` |
| `refactor` | Restructure | `refactor: reorganize package layout` |
| `chore` | Config/tooling | `chore: add editorconfig` |

#### PR Title: `{type}({scope}): {short description}`

Examples:
- `feat(classifier_free_guidance): implement classifier-free guidance (CFG) with modality-specific dropout`
- `feat(ai-review): add AI review policy and Claude PR workflow`
- `feat(save config): Store full training config`

Questions:
- Does the branch name follow the `{type}/{issue-number}-{desc}` format?
- Does the commit message follow the `{type}: {description}` format?
- Does the PR title follow the `{type}({scope}): {short description}` format?

### 9. Feature Usage Documentation Must Be Guided

- If a feature is added, also confirm where its usage should be documented.
- If the change needs detailed explanation — such as usage flow, constraints, or examples — instruct the author to add a document under the `docs` folder before the review proceeds.
- For simple changes such as adding a single config argument, where a brief usage note is enough, instruct the author to record it in the GitHub Wiki.
- Decide the documentation location based on the complexity of the change and where readers would realistically look.

Questions:
- Is this feature a change whose usage should be documented?
- If the change requires detailed explanation, has a document been added under the `docs` folder?
- If brief usage guidance is sufficient, is the GitHub Wiki the appropriate place?

### 10. Issue Reports Must Include Reproduction Context

- This section is the reviewer's standard for judging whether the linked issue contains enough information. Issue-writing rules are covered in `CONTRIBUTING.md`.
- The reviewer must confirm that the linked issue contains sufficient run instructions, reproduction steps, and error messages or logs.
- If relevant information is missing, request the author to supplement it via a PR comment or a comment on the linked issue.
- Also consider whether it is difficult to identify the root cause and prioritize when reproduction information is insufficient.

Questions:
- Does the linked issue include run instructions or reproduction steps?
- Are actual error messages or logs attached?
- If information is insufficient, has a request for more detail been left on the issue?
- Can the problem be reproduced or analyzed with the information currently available?

### 11. Naming Must Reflect Intent

- Class attribute names must begin with a noun expressing a role or a state.
- Class attributes holding boolean state may use adjective or judgment-style prefixes such as `is_*`, `has_*`, `can_*`, or `should_*`.
- Function and method names must begin with a verb expressing an action.

Questions:
- Does the class attribute name begin with a noun expressing a value, state, or concept?
- Does the function or method name begin with a verb describing an action?
- Is the name so ambiguous that the boundary between data and behavior becomes blurred?

### 12. AI Review Must Also Check Design Intent And Reviewer Context

- AI review must not stop at checking whether tests exist, types are correct, or errors are possible; it must also confirm design intent and PR context as a senior reviewer would.
- Even if the implementation itself is correct, also examine "why this structure was chosen," "whether it could have been integrated into an existing shared path," and "whether changes outside the scope of this PR were mixed in."
- If the rationale for the change is not self-evident from the code, request that the PR description be expanded to explain why the change is necessary.
- If similar logic has been duplicated along a new path, also review maintenance burden, reusability of shared logic, and the likelihood of future conflicts.
- Review naming, config fields, public APIs, and wrapper layers not only for "whether they work" but also with respect to team conventions and how well they convey intent.

Questions:
- Can it be explained why this change must take this specific structure?
- Could an existing shared path or shared API have been reused, or could a small branch have solved the problem?
- For a change whose rationale is unclear from the code alone, does the PR description sufficiently cover the background and necessity?
- Does this review comment go beyond pointing out basic implementation errors and also address design intent and maintainability?

## Review Decision Rules

- Prefer `Request Changes` if any one of the following applies.
- A feature is added but there are no tests.
- More than one feature is mixed into a single PR.
- Changes unrelated to the current feature implementation are included and should be split into a separate PR.
- The structural choice creates material disadvantages or conflict risk for teammates' branches.
- The location of new files or folders does not match the project structure.
- The file structure is damaged to the point that separation of responsibilities is visibly worse.
- The change requires documentation of feature usage, but there is no appropriate `docs` document or GitHub Wiki entry.

## Review Output Format

Write the review result concisely in the following form.

```md
## Review Findings

### Required Changes
- `test coverage`: A feature was added but there are no tests.
- `scope`: Multiple different features are included in a single PR.
- `scope`: Changes unrelated to the current feature are included and must be split into a separate PR.

### Suggestions
- `file placement`: The new adapter file should be moved under the existing adapter layer rather than kept in its current location.
- `test clarity`: Propose a test example like the one below where input and output are visible at a glance.
- `pr title`: Current `Add login` → `feat(auth): add login` — following the `{type}({scope}): {description}` format makes history search and release management easier.
- `branch naming` (recommended from the next PR onward): Current `feature/30-ai-review-policy` → `feat/30-ai-review-policy` makes the branch name shorter and consistent with the commit type.
- `commit message` (recommended from the next PR onward): Current `added login feature` → `feat: add login feature` makes changelog generation and history search easier.

```python
import pytest

@pytest.mark.parametrize(
    "raw_input, expected_output",
    [
        ("  Alice  ", "alice"),
        ("Bob", "bob"),
    ],
    ids=["trim-and-lowercase", "already-normalized"],
)
def test_normalize_name(raw_input, expected_output):
    result = normalize_name(raw_input)

    assert result == expected_output
```

### Final Verdict
- Approve / Request Changes
```

## Review Principles
- Prioritize structural issues and collaboration risks over minor style points.
- First understand "why was this location and structure chosen?", then make a judgment.
- Do not allow over-engineering.
- For feature development, permit only the minimum modifications required to implement that feature.
- When suggesting tests, include examples that clearly show the input and the expected output.
- Write review comments concretely and kindly so that the PR author can understand and fix them immediately.
- Write review results and suggestions in English.
- If the test code does not come out well, do not blame only the test author; also examine whether the design itself is testable.
- Even when a design suggestion is needed, do not propose a large redesign that goes beyond the scope of the current feature.
