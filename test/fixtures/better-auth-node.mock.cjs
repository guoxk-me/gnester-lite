'use strict';

// AI modified: unit tests need only the Node-handler contract; production smoke tests load the real package.
module.exports = {
  toNodeHandler() {
    return async (_request, response) => {
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ ok: true }));
    };
  },
};
