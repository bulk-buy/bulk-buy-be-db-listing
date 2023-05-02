// ===============
// DEPENDENCIES
// ===============

/**
 * Node dependencies.
 */

const process = require("node:process");
const path = require("node:path");

/**
 * Module dependencies.
 */

const { v4: uuidv4 } = require("uuid");

// ===============
// VARIABLES
// ===============

const uuid = uuidv4();

// ===============
// EXPORTS
// ===============

module.exports = {
  get env() {
    return process.env.NODE_ENV;
  },
  get port() {
    return process.env.PORT || "3000";
  },

  get instanceId() {
    return process.env.INSTANCE_ID || uuid;
  },
  get logPath() {
    return (
      process.env.LOG_PATH ||
      path.resolve(__dirname, "../logs", this.instanceId)
    );
  },

  get dbEndpoint() {
    return process.env.DB_ENDPOINT || "mongodb://127.0.0.1:27017/namespace";
  },
  get dbTableName() {
    return process.env.DB_TABLENAME || /* istanbul ignore next */ "entities";
  },
  get dbModelName() {
    return process.env.DB_MODELNAME || /* istanbul ignore next */ "Entity";
  },
};
