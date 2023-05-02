/* eslint-disable global-require */

// ===============
// DEPENDENCIES
// ===============

/**
 * Node dependencies.
 */

const { exec } = require("child_process");
const process = require("node:process");

// ===============
// VARIABLES
// ===============

process.env.NODE_ENV = "test";

const clearRequireCache = function () {
  Object.keys(require.cache).forEach((key) => {
    delete require.cache[key];
  });
};

// ===============
// TESTS
// ===============

// using defaults from config
exec("mongo namespace --eval 'db.entities.drop()'");
delete process.env.PORT;
process.env.DB_TABLENAME = "entities";
process.env.DB_MODELNAME = "Entity";
clearRequireCache();
require("./core"); /* eslint-disable-line import/newline-after-import */
exec("mongo namespace --eval 'db.entities.drop()'");
