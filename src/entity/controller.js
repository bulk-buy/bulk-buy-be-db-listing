/* eslint no-underscore-dangle: ["error", { "allow": ["_id", "__v"] }] */

// ===============
// DEPENDENCIES
// ===============

/**
 * Internal dependencies.
 */

const logger = require("../services/fileLogger").getLogger("controller");
const model = require("./model");

// ===============
// CONTROLLER
// ===============

// (C)REATE
exports.create = (req, res) => {
  model
    .createEntity(req.body)
    .then((created) => {
      res.status(201).send(created);
    })
    .catch(
      /* istanbul ignore next */ (err) => {
        res.sendStatus(500);
        logger.error(err);
      }
    );
};

// (R)ETRIEVE
exports.get = (req, res) => {
  if (!req.query.getIds) exports.getById(req, res);
  else {
    model
      .getEntities(req.query.incDeleted)
      .then((data) => {
        res.status(200).send(data);
      })
      .catch(
        /* istanbul ignore next */ (err) => {
          res.sendStatus(500);
          logger.error(err);
        }
      );
  }
};
exports.getById = (req, res) => {
  model
    .getEntity(req.params.id, req.query.incDeleted)
    .then((data) => {
      if (!data) {
        res.sendStatus(404);
      } else {
        res.status(200).send(data);
      }
    })
    .catch(
      /* istanbul ignore next */ (err) => {
        res.sendStatus(500);
        logger.error(err);
      }
    );
};

// (U)PDATE
exports.updateById = async (req, res) => {
  const exist = await model.getEntity(req.params.id);
  if (!exist) {
    res.sendStatus(404);
    return;
  }

  if (!("__v" in req.body) || req.body.__v === undefined) {
    res.sendStatus(400);
    return;
  }

  model
    .updateEntity(req.params.id, req.body)
    .then((updated) => {
      if (!updated) res.sendStatus(409);
      else res.status(200).send(updated);
    })
    .catch(
      /* istanbul ignore next */ (err) => {
        res.sendStatus(500);
        logger.error(err);
      }
    );
};

// (D)ELETE (soft-delete)
exports.removeById = async (req, res) => {
  req.body = { __v: req.body.__v, deletedAt: new Date() };
  exports.updateById(req, res);
};

// (D)ELETE (hard-delete)
// do not expose hard-delete
/*
exports.removeById = async (req, res) => {    
  const exist = await model.getEntity(req.params.id);
  if (!exist) {
    res.sendStatus(404);
    return;
  }

  if (!("__v" in req.body)) {
    res.sendStatus(400);
    return;
  }

  model
    .removeEntity(req.params.id, req.body)
    .then((deleted) => {
      res.sendStatus(!deleted ? 409 : 204);
    })
    .catch((err) => {
      res.sendStatus(500);
      logger.error(err);
    });
};
*/
