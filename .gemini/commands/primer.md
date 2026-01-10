---
description: Prime Claude with comprehensive project context
argument-hint: [file_path]
allowed-tools: Read, Glob, Grep, Task
---

Prime Claude Code with comprehensive project context by systematically reading and analyzing key project files.

## Implementation Steps:
1. **Read the specified file** at path: $ARGUMENTS (if provided)
2. **Get understanding of project structure** by reading key files
3. **Read CLAUDE.md** if it exists to understand project commands
4. **Read context_engineering.md** to understand context engineering approach
5. **Read README.md** to understand project purpose and setup
6. **Read key files in src and root directory** including:
   - package.json (dependencies and scripts)
   - src/App.tsx (main application component)
   - src/types.ts (TypeScript definitions)
   - src/constants.ts (application constants)
   - src/services/geminiService.ts (AI service integration)
7. **Use Serena MCP** to search through codebase for additional context (retry with different serena tools if errors occur)

## Project Context:
**Parent Dome AI Strategy Hub** - React app helping parents develop strategic action plans for addressing antisemitism in K-12 education.

**Tech Stack**: React 19.1.1, TypeScript, Vite, TailwindCSS 4.1.11, Google Gemini AI

**Key Features**: Multi-step data collection, AI analysis, 5-module action plans, privacy-by-design architecture
