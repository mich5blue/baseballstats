const serverless = require('serverless-http');
const { initDb } = require('../../server/db/database');
const app = require('../../server/app');

let isInitialised = false;

module.exports.handler = async (event, context) => {
  // Keep connections warm between invocations
  context.callbackWaitsForEmptyEventLoop = false;

  if (!isInitialised) {
    await initDb();
    isInitialised = true;
  }

  return serverless(app)(event, context);
};
