import { access, readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const projectRoot = process.cwd();
const outputDirectory = join(projectRoot, 'dist');
// AI modified: guarded provision runs use the example-owned Demo migration from the compiled artifact.
const requiredArtifacts = [
  'dist/src/main.js',
  'dist/config/config.yaml',
  'dist/config/typeorm.data-source.js',
  'dist/src/migrations/1785801600000-CreateBetterAuthTables.js',
  'dist/src/platform/security/better-auth/better-auth.loader.cjs',
  'dist/src/examples/demo-database/migrations/1760000000000-CreateDemoTable.js',
];
const forbiddenArtifactPaths = new Set([
  join(projectRoot, 'dist/src/migrations/1760000000000-CreateDemoTable.js'),
]);

async function listFiles(directory) {
  const directoryEntries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    directoryEntries.map(async (directoryEntry) => {
      const entryPath = join(directory, directoryEntry.name);
      return directoryEntry.isDirectory() ? listFiles(entryPath) : [entryPath];
    }),
  );

  return nestedFiles.flat();
}

for (const requiredArtifact of requiredArtifacts) {
  await access(join(projectRoot, requiredArtifact));
}

const sourceLocaleDirectory = join(
  projectRoot,
  'src/platform/runtime/i18n/locales',
);
const outputLocaleDirectory = join(
  outputDirectory,
  'src/platform/runtime/i18n/locales',
);
const sourceLocaleFiles = (await listFiles(sourceLocaleDirectory)).filter(
  (filePath) => filePath.endsWith('.json'),
);
const outputLocaleFiles = (await listFiles(outputLocaleDirectory)).filter(
  (filePath) => filePath.endsWith('.json'),
);
const sourceLocalePaths = sourceLocaleFiles
  .map((filePath) => relative(sourceLocaleDirectory, filePath))
  .sort();
const outputLocalePaths = outputLocaleFiles
  .map((filePath) => relative(outputLocaleDirectory, filePath))
  .sort();

// AI modified: discover catalogs dynamically so every present and future locale asset is copied byte-for-byte.
if (JSON.stringify(outputLocalePaths) !== JSON.stringify(sourceLocalePaths)) {
  throw new Error(
    `Production locale assets differ from source catalogs.\nSource: ${sourceLocalePaths.join(', ')}\nOutput: ${outputLocalePaths.join(', ')}`,
  );
}

const changedLocalePaths = (
  await Promise.all(
    sourceLocalePaths.map(async (localePath) => {
      const [sourceContents, outputContents] = await Promise.all([
        readFile(join(sourceLocaleDirectory, localePath)),
        readFile(join(outputLocaleDirectory, localePath)),
      ]);

      return sourceContents.equals(outputContents) ? null : localePath;
    }),
  )
).filter((localePath) => localePath !== null);

if (changedLocalePaths.length > 0) {
  throw new Error(
    `Production locale assets do not match source: ${changedLocalePaths.join(', ')}`,
  );
}

const outputFiles = await listFiles(outputDirectory);
const forbiddenArtifacts = outputFiles.filter(
  (outputFile) =>
    outputFile.endsWith('.map') ||
    outputFile.endsWith('.spec.js') ||
    outputFile.endsWith('.spec.d.ts') ||
    forbiddenArtifactPaths.has(outputFile),
);

if (forbiddenArtifacts.length > 0) {
  const artifactList = forbiddenArtifacts
    .map((artifact) => relative(projectRoot, artifact))
    .join('\n');
  throw new Error(
    `Production build contains forbidden files:\n${artifactList}`,
  );
}
