// Generates TypeScript types from this package's OpenAPI fixture.
//
// Run via `npm run generate:api` (also wired to `pretypecheck` / `prebuild`,
// so editing the fixture and then type-checking is enough to see drift as a
// compile error).
//
// Why a local generator instead of openapi-typescript: this repo's
// TypeScript is v7 (native), while openapi-typescript requires the v5
// compiler API. The fixture only uses a small, well-understood subset of
// OpenAPI — objects, arrays, enums, $ref, allOf, nullable, additionalProperties
// — so the generator stays small and dependency-free apart from the YAML
// parser. Generated output is committed but never hand-edited.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const specUrl = new URL('../openapi/docforum-core.openapi.yaml', import.meta.url);
const outUrl = new URL('../src/generated/schema.ts', import.meta.url);
const spec = parseYaml(readFileSync(specUrl, 'utf8'));
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const version = spec?.info?.version;
if (!version) {
  console.error(`✗ Could not read info.version from ${specUrl.pathname}`);
  process.exit(1);
}
if (version !== pkg.version) {
  console.error(
    `✗ Version mismatch: package.json is ${pkg.version}, OpenAPI info.version is ${version}.\n` +
      '  Bump both together (see packages/api-client/README.md).',
  );
  process.exit(1);
}

const schemas = spec?.components?.schemas ?? {};

/** Generate a TS type expression for an OpenAPI schema object. */
function typeOf(schema, indent = '  ') {
  if (!schema) return 'unknown';
  if (schema.$ref) {
    const name = schema.$ref.split('/').pop();
    if (!schemas[name]) {
      throw new Error(`Unresolved $ref "${schema.$ref}"`);
    }
    return `components["schemas"]["${name}"]`;
  }

  if (schema.allOf) {
    const parts = schema.allOf.map((part) => typeOf(part, indent)).filter((part) => part !== 'unknown');
    const base = parts.length === 1 ? parts[0] : parts.map((part) => (part.includes(' & ') ? `(${part})` : part)).join(' & ');
    return schema.nullable ? `(${base}) | null` : base;
  }

  if (schema.enum) {
    const literals = schema.enum.map((value) => JSON.stringify(value)).join(' | ');
    return schema.nullable ? `(${literals}) | null` : literals;
  }

  let type;
  switch (schema.type) {
    case 'string':
      type = 'string';
      break;
    case 'integer':
    case 'number':
      type = 'number';
      break;
    case 'boolean':
      type = 'boolean';
      break;
    case 'array':
      type = `Array<${typeOf(schema.items, indent)}>`;
      break;
    case 'object':
    case undefined:
      type = objectType(schema, indent);
      break;
    default:
      throw new Error(`Unsupported schema type "${schema.type}"`);
  }

  return schema.nullable ? `(${type}) | null` : type;
}

function objectType(schema, indent) {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const keys = Object.keys(properties);

  if (keys.length === 0) {
    if (schema.additionalProperties === true || schema.additionalProperties === undefined) {
      return '{ [key: string]: unknown }';
    }
    return 'Record<string, never>';
  }

  const inner = indent + '  ';
  const lines = keys.map((key) => {
    const optional = required.has(key) ? '' : '?';
    return `${inner}${JSON.stringify(key)}${optional}: ${typeOf(properties[key], inner)};`;
  });

  if (schema.additionalProperties === true) {
    lines.push(`${inner}[key: string]: unknown;`);
  }

  return `{\n${lines.join('\n')}\n${indent}}`;
}

function indentBlock(text, spaces) {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => pad + line)
    .join('\n');
}

const schemaLines = Object.keys(schemas).map((name) => {
  const schema = schemas[name];
  const doc = schema.description ? `/** ${String(schema.description).replace(/\*\//g, '*\\/')} */\n  ` : '';
  return `  ${doc}${JSON.stringify(name)}: ${typeOf(schema, '  ')};`;
});

const pathLines = Object.entries(spec.paths ?? {}).map(([path, item]) => {
  const operations = Object.entries(item)
    .filter(([method]) => ['get', 'post', 'patch', 'put', 'delete'].includes(method))
    .map(([method, operation]) => {
      const parts = [];
      if (operation.requestBody?.content?.['application/json']?.schema) {
        parts.push(
          `      requestBody: { content: { "application/json": ${typeOf(
            operation.requestBody.content['application/json'].schema,
            '      ',
          )} } };`,
        );
      }
      const responses = Object.entries(operation.responses ?? {})
        .filter(([, response]) => response?.content?.['application/json']?.schema)
        .map(([status, response]) => {
          return `        ${status}: { content: { "application/json": ${typeOf(
            response.content['application/json'].schema,
            '        ',
          )} } };`;
        });

      return `    ${method}: {\n${parts.join('\n')}${parts.length ? '\n' : ''}      responses: {\n${responses
        .map((line) => '  ' + line)
        .join('\n')}\n      };\n    };`;
    });

  return `  ${JSON.stringify(path)}: {\n${operations.join('\n')}\n  };`;
});

const output = `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Source: packages/api-client/openapi/docforum-core.openapi.yaml
 * API version: ${version}
 * Regenerate: npm run generate:api
 */

export interface components {
  schemas: {
${schemaLines.join('\n\n')}
  };
}

/** Only the operations this client exposes; responses carry success statuses. */
export interface paths {
${pathLines.join('\n\n')}
}
`;

mkdirSync(fileURLToPath(new URL('../src/generated/', import.meta.url)), { recursive: true });
writeFileSync(outUrl, output);
console.log(`✓ Generated ${fileURLToPath(outUrl)} from API v${version}`);
