import { runLinter } from './lint-schema-invariants.ts'
export { runLinter }
if (import.meta.main) process.exit(await runLinter())
