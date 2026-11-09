# De-sloppifying interface copy

## Decision

Treat “AI slop” as a usability problem, not a provenance verdict: copy is slop when it makes a simple task less specific, less scannable, or less actionable. For the retro console app, use short, concrete, system-like language that names the thing, state, and action. Preserve deliberate period flavour where it adds meaning; remove generic polish that could describe any product.

## What the evidence actually supports

There is a real, measured *corpus-level* lexical shift. Kobak et al. analysed 15.1 million PubMed abstracts (2010–24) and found hundreds of abrupt post-ChatGPT increases, disproportionately style verbs/adjectives rather than topic nouns; examples include *delves*, *underscores*, *showcasing*, *potential*, *findings*, and *crucial*. Their design estimates at least 13.5% of 2024 abstracts were LLM-processed, but explicitly **cannot identify any individual abstract**. [Science Advances, 2025](https://doi.org/10.1126/sciadv.adt3813)

That distinction matters: these are useful revision *prompts*, not an “AI word” blacklist. An ACL study of arXiv abstracts found that words publicly called out as ChatGPT-like (including *delve*) later declined, while others (including *significant*) rose—evidence that the signals are social, model-, time-, and editor-dependent. [Geng & Trotta, ACL Findings 2025](https://aclanthology.org/2025.findings-acl.657/). Do not flag a contributor or reject copy merely for a word, an em dash, a heading pattern, or smooth grammar. In a cross-domain test, leading automated detectors could have a true-positive rate of 0% at a 1% false-positive rate in some settings. [Tufts, Zhao & Li, NAACL Findings 2025](https://aclanthology.org/2025.findings-naacl.271/)

The stronger standard is whether the copy helps someone use the app. GOV.UK advises one idea per sentence, key words first, and no explanatory text unless research shows it is needed; if copy must explain the UI, improve the UI. [GOV.UK: writing for interfaces](https://www.gov.uk/service-manual/design/writing-for-user-interfaces). Microsoft likewise says users scan UI text and that text should state the user’s objective, not merely narrate controls. [Microsoft UI text guidance](https://learn.microsoft.com/en-us/windows/win32/uxguide/text-ui). NN/g’s eyetracking programme—three studies, 500+ participants, 750+ hours—also finds people scan rather than read online. [NN/g evidence](https://www.nngroup.com/reports/how-people-read-online-eyetracking-evidence/)

## Copy changes to make

| Remove or rewrite | Prefer |
| --- | --- |
| Grand, generic praise: “a seamless, immersive experience”; “the ultimate way to play” | A verifiable feature or nothing: “Save states” / “2 players” |
| Abstract promises: “unlock the nostalgia”; “bring classics to life” | The direct action: “Start game”, “Load cartridge”, “Choose system” |
| Thesaurus verbs and vague significance: “delve into”, “showcase”, “underscores”, “pivotal”, “robust”, “transform” | Plain verbs tied to the UI: “browse”, “load”, “save”, “change”, “fix” |
| Warm-up and conclusion padding: “Whether you’re…”, “Get ready to…”, “In short…” | Lead with the noun/action; delete the rest unless it changes a decision |
| Generic labels: “Explore”, “Learn more”, “Get started” | Destination labels: “Game library”, “Controller setup”, “Read controls” |
| Rhetorical questions and featureless lore | One short line of useful context, only when it helps selection or recovery |

Use terminology consistently (one name for the same console, control, and saved state) and make links understandable out of context. Avoid unexplained acronyms. These are plain-language/accessibility choices, not a mandate to erase legitimate technical terms or the app’s voice. [GOV.UK clear-language guidance](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/)

## Editorial pass

For every string: (1) What can the player do after reading it? (2) Could another game site say this unchanged? (3) Does each adjective distinguish a real capability? Delete copy that fails all three. Keep a distinctive phrase only when it is intentional, specific to this product, and does not hide the next action. Test revised labels and errors with players; readability scores and word lists are triage aids, not acceptance criteria.
