'use strict';

// AI modified: Jest keeps the native ESM bridge at the same boundary while inspecting deterministic auth options.
exports.loadBetterAuthModules = async function loadBetterAuthModules() {
  return {
    ...require('./better-auth.mock.cjs'),
    ...require('./better-auth-node.mock.cjs'),
  };
};
