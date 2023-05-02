/* eslint no-underscore-dangle: ["error", { "allow": ["_id", "__v"] }] */

// ===============
// DEPENDENCIES
// ===============

/**
 * Internal dependencies.
 */

const config = require("../config");
const { framework: mongoose, logger } = require("../services/database");

// ===============
// DATABASE
// ===============

// database definition
const options = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "title",
        "description",
        "startDate",
        "endDate",
        "minRequired",
        "postedBy",
      ],
      properties: {
        title: {
          bsonType: "string",
          description: "is required, must be a string",
        },
        description: {
          bsonType: "string",
          description: "is required, must be a string",
        },
        startDate: {
          bsonType: "date",
          description: "is required, must be a string",
        },
        endDate: {
          bsonType: "date",
          description: "is required, must be a string",
        },
        minRequired: {
          bsonType: "number",
          description: "is required, must be a string",
        },
        postedBy: {
          bsonType: "string",
          description: "is required, must be a string",
        },
        deletedAt: {
          bsonType: "date",
        },
      },
    },
  },
  validationAction: "error",
  validationLevel: "strict",
};

// create table if not created
mongoose.connection.on("open", () => {
  mongoose.connection.db
    .createCollection(config.dbTableName, options)
    .then((collection) => {
      collection.createIndex({ title: 1 });
      collection.createIndex({ deletedAt: 1 });
    })
    .catch((err) => {
      /* istanbul ignore else */
      if (err.code === 48) {
        // ignore if table already exists
      } else {
        logger.error(err);
      }
    });
});

// ===============
// MONGOOSE
// ===============

// mongoose schema
const schema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    minRequired: {
      type: Number,
      required: true,
    },
    postedBy: {
      type: String,
      required: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    shardKey: { deletedAt: 1 },
    timestamps: true,
  }
);

// define Entity model (will create table & indexes if autoCreate & autoIndex not disabled)
// https://mongoosejs.com/docs/api/mongoose.html#Mongoose.prototype.model()
const Entity = mongoose.model(config.dbModelName, schema, config.dbTableName);

// ===============
// CRUD
// ===============

const incDeletedCondition = (incDeleted) =>
  incDeleted ? {} : { deletedAt: { $exists: false } };

// (C)REATE
exports.createEntity = (data) => {
  const entity = new Entity(data);
  return entity.save();
};

// (R)ETRIEVE
exports.getEntity = (query, incDeleted = false) => {
  const condition = incDeletedCondition(incDeleted);
  if (typeof query === "string") {
    condition._id = query;
    return Entity.findOne(condition).then((result) => result);
  }
  return Entity.find(condition).then((result) => result);
};
exports.getEntities = (incDeleted = false) => {
  const condition = incDeletedCondition(incDeleted);
  return Entity.find(condition)
    .select("_id")
    .lean()
    .then((result) => result.map((doc) => doc._id));
};

// (U)PDATE
exports.updateEntity = (id, data) => {
  // current and new version for optimistic concurrency
  const { __v } = data;
  data.__v += 1;

  // atomic operation with optimistic concurrency
  return Entity.findOneAndUpdate(
    {
      _id: id,
      __v,
    },
    data,
    { new: true }
  );
};

// (D)ELETE
// do not expose hard-delete
/*
exports.removeEntity = (id, data) => {
  // current version for optimistic concurrency
  const { __v } = data;

  // atomic operation with optimistic concurrency
  return Entity.findOneAndDelete(
    {
      _id: id,
      __v,
    }
  );
};
*/
