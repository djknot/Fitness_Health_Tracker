# Claude Code Memory Bank & GitHub Workflow Instructions

You are operating with a persistent project Memory Bank. Before executing any tasks, creating code, or responding, you must synchronize your active state with the local `memory-bank/` directory.

## 🧠 Memory Bank Architecture
The memory bank consists of 5 core Markdown files located in the `memory-bank/` directory. You are required to read them to understand context and update them when changes occur.

* **productContext.md**: Why this project exists, target problems, and core product requirements.
* **systemPatterns.md**: System architecture, design patterns, technology choices, and component interactions.
* **activeContext.md**: Current focus, what you are working on right now, and active session obstacles.
* **progress.md**: What is built, what is left to build, and milestone tracking.
* **decisionLog.md**: Historical record of critical technical tradeoffs and architectural choices.

## 🔄 Memory Synchronization Protocol
1. **On Session Start / Initialization**:
   - Check if `memory-bank/` exists. If files are empty or missing, ask the user to help populate `productContext.md` and `systemPatterns.md`.
   - Read all files to rebuild your mental model of the codebase before writing code.
2. **During the Session**:
   - Maintain state changes in memory. Do not let documentation drift from reality.
3. **Before Task Completion / Session Wrap-up**:
   - Update `activeContext.md` with the new current state and next immediate steps.
   - Update `progress.md` with completed features and pending roadmap items.
   - Log any foundational technical changes into `decisionLog.md`.

## 🐙 Git & GitHub Integration Rules
When interacting with GitHub or making local commits, you must adhere strictly to these constraints:

1. **Branch Isolation**:
   - Always read the active git branch before editing code.
   - Update `activeContext.md` with the active branch name to maintain branch-aware memory context.
2. **Atomic Commits**:
   - Pair memory bank documentation updates directly inside the git commits that introduce code changes.
   - Format commit messages cleanly using conventional commit syntax (e.g., `feat:`, `fix:`, `docs:`).
3. **Pull Request Construction**:
   - Before drafting a PR summary, read `progress.md` and `decisionLog.md` to collect context on the "why" and "how".
   - Never commit raw session cache logs to remote main branches; keep the `memory-bank/` strictly clean, human-readable markdown.

## 🚫 Critical Constraints (Do Not Violate)
- Do not let files inside `memory-bank/` grow past 200 lines. If a file becomes bloated, spin off specialized sub-files (e.g., `memory-bank/architecture/db-schema.md`) and keep the core bank slim to save tokens.
- Never write code that contradicts established design choices recorded in `systemPatterns.md`. If a change is necessary, update the pattern and log it in `decisionLog.md` first.
