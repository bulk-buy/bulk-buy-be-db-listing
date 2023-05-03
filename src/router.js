// ===============
// DEPENDENCIES
// ===============

/**
 * Module dependencies.
 */

const express = require("express");

/**
 * Internal dependencies.
 */

const config = require("./config");
const controller = require("./entity/controller");
const { name, version } = require("../package.json");

// ===============
// ROUTES
// ===============

const router = express.Router();

// endpoint: /
router.get("/", (req, res) => {
  res.send({ name, version });
});

// endpoint: /entities
router.post(`/${config.dbTableName}`, [controller.create]);

// endpoint: /entities
// possible URL path params: incDeleted:boolean & getIds:boolean
// defaults to /entities?incDeleted=false&getIds=false
router.get(`/${config.dbTableName}`, [controller.get]);

// endpoint: /entities/{id}
router.get(`/${config.dbTableName}/:id`, [controller.getById]);

// endpoint: /entities/{id}
router.patch(`/${config.dbTableName}/:id`, [controller.updateById]);

// endpoint: /entities/{id}
router.delete(`/${config.dbTableName}/:id`, [controller.removeById]);

// ===============
// EXPORTS
// ===============

module.exports = router;
