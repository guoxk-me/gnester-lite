import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

// AI modified: public identity entry points match IdentityModule's exported HTTP boundary; persistence types stay private.
export const businessPublicEntries = new Set([
  'modules/identity/identity.module.js',
  'modules/identity/session-auth.guard.js',
  'modules/identity/current-session-user.decorator.js',
  'modules/identity/session.types.js',
]);

export function sourceDependencies(sourceFile) {
  const dependencies = [];
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier
    ) {
      const bindings = ts.isImportDeclaration(node)
        ? node.importClause?.namedBindings
        : node.exportClause;
      dependencies.push({
        specifier: node.moduleSpecifier.text,
        isTypeOnly: Boolean(
          node.isTypeOnly ||
          node.importClause?.isTypeOnly ||
          (bindings &&
            (ts.isNamedImports(bindings) || ts.isNamedExports(bindings)) &&
            bindings.elements.length > 0 &&
            bindings.elements.every((binding) => binding.isTypeOnly)),
        ),
      });
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      dependencies.push({
        specifier: node.argument.literal.text,
        isTypeOnly: true,
      });
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'))
    ) {
      dependencies.push({
        specifier: node.arguments[0].text,
        isTypeOnly: false,
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return dependencies;
}

function ownerOf(file) {
  const segments = file.split('/');
  if (segments[0] === 'modules' && segments.length > 2)
    return `modules/${segments[1]}`;
  return segments[0];
}

// AI modified: location expresses ownership; pure types may stay next to their consumer without a central mirror tree.
export function inspectSourceBoundary(file, sourceText, resolveDependency) {
  const violations = [];
  const owner = ownerOf(file);
  if (
    [
      'types',
      'examples',
      'platform',
      'features',
      'contracts',
      'auth',
      'authorization',
      'database',
      'assistant',
      'user-management',
      'cache',
      'crypto',
      'csrf',
      'health',
      'http-client',
      'i18n',
      'logger',
      'queue',
      'rate-limit',
      'schedule',
      'sentry',
    ].includes(owner)
  ) {
    violations.push('file remains in a retired source layer');
  }
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );
  if (['infra', 'common'].includes(owner) && /@Global\s*\(/u.test(sourceText))
    violations.push(
      'infrastructure dependencies must be explicit, not @Global()',
    );
  for (const { specifier } of sourceDependencies(sourceFile)) {
    const dependency = resolveDependency
      ? resolveDependency(specifier)
      : specifier.startsWith('.')
        ? relative('/src', resolve('/src', dirname(file), specifier))
            .split(sep)
            .join('/')
        : null;
    if (!dependency) continue;
    const target = ownerOf(dependency);
    if (dependency.startsWith('../')) {
      violations.push(`dependency escapes source ownership: ${specifier}`);
      continue;
    }
    if (owner === 'common' && target !== 'common')
      violations.push(
        `common depends on runtime/application code: ${specifier}`,
      );
    if (owner === 'config' && target !== 'config')
      violations.push(
        `configuration depends on runtime/application code: ${specifier}`,
      );
    if (owner === 'infra' && !['infra', 'common', 'config'].includes(target))
      violations.push(
        `infrastructure depends on application code: ${specifier}`,
      );
    if (
      owner === 'bootstrap' &&
      !['bootstrap', 'infra', 'common', 'config'].includes(target)
    )
      violations.push(`bootstrap depends on business code: ${specifier}`);
    if (owner.startsWith('modules/')) {
      if (target === 'bootstrap')
        violations.push(`business depends on bootstrap: ${specifier}`);
      if (
        target.startsWith('modules/') &&
        target !== owner &&
        !businessPublicEntries.has(dependency.replace(/\.ts$/u, '.js'))
      )
        violations.push(
          `business imports another owner's private implementation: ${specifier}`,
        );
    }
  }
  return [...new Set(violations)];
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const file = resolve(directory, entry.name);
        return entry.isDirectory()
          ? sourceFiles(file)
          : file.endsWith('.ts')
            ? [file]
            : [];
      }),
    )
  ).flat();
}

export async function verifySourceBoundaries(projectRoot) {
  const sourceRoot = resolve(projectRoot, 'src');
  const configPath = ts.findConfigFile(
    projectRoot,
    ts.sys.fileExists,
    'tsconfig.json',
  );
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const options = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    projectRoot,
  ).options;
  const violations = [];
  const graph = new Map();
  const files = await sourceFiles(sourceRoot);
  for (const file of files) {
    if (/\.(spec|test|d)\.ts$/u.test(file)) continue;
    const sourceText = await readFile(file, 'utf8');
    const localPath = relative(sourceRoot, file).split(sep).join('/');
    const dependencies = [];
    const resolveDependency = (specifier) => {
      const resolved = ts.resolveModuleName(specifier, file, options, ts.sys)
        .resolvedModule?.resolvedFileName;
      // AI modified: local imports outside src must fail ownership checks; installed libraries remain external.
      if (!resolved || resolved.includes(`${sep}node_modules${sep}`))
        return null;
      const dependency = relative(sourceRoot, resolved).split(sep).join('/');
      dependencies.push(dependency);
      return dependency;
    };
    for (const violation of inspectSourceBoundary(
      localPath,
      sourceText,
      resolveDependency,
    ))
      violations.push(`${localPath}: ${violation}`);
    graph.set(localPath, dependencies);
  }
  // AI modified: type-only imports and aliases participate in cycle detection so compilation erasure cannot hide ownership loops.
  const visited = new Set();
  const active = new Set();
  const stack = [];
  function visit(file) {
    if (active.has(file)) {
      violations.push(
        `circular source dependency: ${[...stack.slice(stack.indexOf(file)), file].join(' -> ')}`,
      );
      return;
    }
    if (visited.has(file)) return;
    visited.add(file);
    active.add(file);
    stack.push(file);
    for (const dependency of graph.get(file) ?? []) visit(dependency);
    stack.pop();
    active.delete(file);
  }
  for (const file of graph.keys()) visit(file);
  return violations;
}
