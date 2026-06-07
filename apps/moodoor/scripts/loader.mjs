// Dev-only loader: lets plain `node` resolve the app's extensionless relative TS
// imports (idiomatic for the Next bundler) so test scripts can import src/lib/*.ts
// directly. Node strips the types automatically (v22.18+).
import { register } from "node:module";
register("./resolve-hook.mjs", import.meta.url);
