/** Exhaustiveness check for a `switch` over a union: adding a member without a case fails to compile. */
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${String(value)}`)
}
