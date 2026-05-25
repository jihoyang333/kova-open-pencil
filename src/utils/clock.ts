// Indirection over `new Date()` so tests can mock the clock without
// stubbing globals.
export const now = (): Date => new Date()
