'use strict';

// AI modified: load Better Auth through native ESM imports while the surrounding Nest artifact remains CommonJS.
exports.loadBetterAuthModules = async function loadBetterAuthModules() {
  const [{ betterAuth }, { toNodeHandler }] = await Promise.all([
    import('better-auth'),
    import('better-auth/node'),
  ]);

  return { betterAuth, toNodeHandler };
};
