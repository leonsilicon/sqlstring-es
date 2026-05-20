# sqlstring-es

ESM-only port of [`sqlstring`](https://www.npmjs.com/package/sqlstring) with
inlined TypeScript types and no `node:buffer` dependency, so it works in
browsers, React Native, Cloudflare Workers, Bun, Deno, and Node alike.

API is the same as `sqlstring`, but exposed as named ESM exports.

## Install

```sh
npm install sqlstring-es
```

## Usage

```ts
import { escape, escapeId, format, raw } from "sqlstring-es";

escape("O'Reilly");                       // "'O\\'Reilly'"
escapeId("posts.title");                  // "`posts`.`title`"
format("SELECT * FROM ?? WHERE id = ?",
       ["posts", 42]);                    // "SELECT * FROM `posts` WHERE id = 42"
raw("NOW()");                             // { toSqlString: () => "NOW()" }
```

## Differences from `sqlstring`

- ESM only (no CommonJS entry).
- No `node:buffer` import; buffers are detected via duck typing
  (`val.constructor?.name === "Buffer"` or a `readUInt8` method), so passing
  Node `Buffer` instances still works without bundling `node:buffer` into
  non-Node targets.
- TypeScript declarations are shipped inline (`index.d.ts`).

## License

MIT. Derived from `mysqljs/sqlstring`; see `LICENSE` for full attribution.
