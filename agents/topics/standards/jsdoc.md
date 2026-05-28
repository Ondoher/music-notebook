# JSDoc

Use this standard when documenting JavaScript code and its supporting
declaration files.

## Declaration Files

- Use `.d.ts` files to define reusable type vocabulary that makes JSDoc easier
  to write and read.
- Keep complex object shapes in `.d.ts` files so component JSDoc can reference
  concise named types.
- Types in `.d.ts` files do not need `import type` or `export type`.
- Keep value exports in component `.d.ts` files when they describe the actual
  JavaScript module API, such as `export default class` or named exported
  functions.

## Type Documentation

- Add JSDoc to every defined type.
- Add JSDoc to every property in object-shaped types.
- Prefer clear, short descriptions that work well in IDE hover text.
- Separate string unions into specific named types instead of repeating inline
  literal unions in props or state.
- When documenting string union types, start with a general description.
- Below the general description, add a markdown list for each allowed value.
- In that list, bold the string value, then follow it with a dash and a
  description of that value.

Example:

```ts
/**
 * Harmonic key mode used when resolving numeric chord degrees.
 *
 * - **major** - Resolves numeric chord degrees using major-key defaults.
 * - **minor** - Resolves numeric chord degrees using minor-key defaults.
 */
type KeyMode = 'major' | 'minor';
```

## Component JSDoc

- Reference named types from declaration files rather than rewriting complex
  shapes inline in component JSDoc.
- Keep component JSDoc focused on behavior and intent.
- Use declaration-file property comments for detailed prop field descriptions.
- Add JSDoc to every method and local helper function.
- Method JSDoc should include a short behavior description plus useful
  `@param` and `@returns` tags when the method accepts arguments or returns a
  meaningful value.
