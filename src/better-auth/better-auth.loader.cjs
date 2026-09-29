'use strict';

// AI modified: load Better Auth through native ESM imports while the surrounding Nest artifact remains CommonJS.
exports.loadBetterAuthModules = async function loadBetterAuthModules() {
  const [
    { betterAuth },
    { toNodeHandler },
    { admin },
    { defaultAc },
    { hashPassword },
  ] = await Promise.all([
    import('better-auth'),
    import('better-auth/node'),
    import('better-auth/plugins/admin'),
    import('better-auth/plugins/admin/access'),
    import('better-auth/crypto'),
  ]);

  return { betterAuth, toNodeHandler, admin, defaultAc, hashPassword };
};
