// Zod v4 speeds up object parsing with a JIT that compiles validators via
// `new Function`. The production Content-Security-Policy (issue #101,
// `require-trusted-types-for 'script'`) blocks that call: Zod catches the
// rejection and falls back to its interpreter, but Chrome still logs
// "This document requires 'TrustedScript' assignment" on every page, which
// fails Lighthouse's errors-in-console gate in CI.
//
// `jitless` is Zod's documented switch for eval-disallowing environments
// ($ZodConfig.jitless): it skips the `new Function` probe entirely and
// always uses the interpreter, so the strict policy stays intact. The cost
// is slower schema parsing (no compiled validators) — acceptable for this
// app's request/parse volumes.
//
// This module must stay the FIRST import of src/main.tsx: ES modules run
// their imports in order, so the config is set before any other module can
// construct or invoke a schema.
import { config } from 'zod';

config({ jitless: true });
