import { readFileSync } from 'node:fs';

const containerDefinitionFiles = [
  'Dockerfile',
  'docker-compose.yml',
  '.github/workflows/ci.yml',
];
const immutableImageReference = /^[^@\s]+@sha256:[a-f0-9]{64}$/;
const mutableReferences = [];
let checkedReferenceCount = 0;

// AI modified: fail delivery when an external build or service image can drift behind a mutable tag.
for (const definitionFile of containerDefinitionFiles) {
  const definitionLines = readFileSync(definitionFile, 'utf8').split(/\r?\n/);
  const internalBuildStages = new Set();

  for (const [lineIndex, definitionLine] of definitionLines.entries()) {
    const buildStageMatch = definitionLine.match(
      /^\s*FROM\s+([^\s#]+)(?:\s+AS\s+([^\s#]+))?/i,
    );
    const serviceImageMatch = definitionLine.match(/^\s*image:\s+([^\s#]+)/);
    const containerReference = buildStageMatch?.[1] ?? serviceImageMatch?.[1];

    if (!containerReference) {
      continue;
    }

    if (
      !internalBuildStages.has(containerReference) &&
      !immutableImageReference.test(containerReference)
    ) {
      mutableReferences.push(
        `${definitionFile}:${lineIndex + 1} (${containerReference})`,
      );
    }

    if (!internalBuildStages.has(containerReference)) {
      checkedReferenceCount += 1;
    }

    if (buildStageMatch?.[2]) {
      internalBuildStages.add(buildStageMatch[2]);
    }
  }
}

if (mutableReferences.length > 0) {
  throw new Error(
    `Container references must include an immutable sha256 digest: ${mutableReferences.join(', ')}`,
  );
}

console.log(
  `Verified ${checkedReferenceCount} immutable container image references.`,
);
