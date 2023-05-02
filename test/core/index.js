/* eslint-disable global-require */
/* eslint no-underscore-dangle: ["error", { "allow": ["_id", "__v"] }] */

// ===============
// DEPENDENCIES
// ===============

/**
 * Node dependencies.
 */

const assert = require("node:assert").strict;
const { exec } = require("child_process");
const process = require("node:process");
const os = require("node:os");

/**
 * Module dependencies.
 */

const request = require("supertest");

/**
 * Internal dependencies.
 */

const app = require("../../src/app");
const config = require("../../src/config");

// ===============
// TESTS
// ===============

describe(`express (NODE_ENV=${process.env.NODE_ENV})`, () => {
  describe("startup", () => {
    before((done) => {
      app.server.once("closed", () => {
        done();
      });

      process.emit("SIGTERM");
    });

    describe("app.server.start() when server is not running", () => {
      it("should start listening", (done) => {
        assert.equal(app.server.listening, false, "should not be listening");

        app.server.start((err) => {
          assert.ifError(err, "callback should not have error param");
          assert.equal(app.server.listening, true, "should be listening");
          done();
        });
      });
    });

    describe("app.server.start() called when server is running", () => {
      it("should not throw error", (done) => {
        assert.equal(app.server.listening, true, "should be listening");

        app.server.start((err) => {
          assert.ok(err, "callback should have error param");
          assert.equal(app.server.listening, true, "should be listening");
          done();
        });
      });
    });
  });

  describe("routing", () => {
    describe("database not connected", () => {
      before((done) => {
        app.database.disconnect().then(done);
      });

      describe("favicon", () => {
        it("should return 204", (done) => {
          request(app.server).get("/favicon.ico").expect(204, done);
        });
      });

      describe("path found", () => {
        it("should return 503", (done) => {
          request(app.server).get("/").expect(503, done);
        });
      });

      describe("path not found", () => {
        it("should return 503", (done) => {
          request(app.server).get("/random").expect(503, done);
        });
      });
    });

    describe("database connected", () => {
      before((done) => {
        app.database.connectWithRetry().then(done);
      });

      describe("favicon", () => {
        it("should return 204", (done) => {
          request(app.server).get("/favicon.ico").expect(204, done);
        });
      });

      describe("path found", () => {
        it("should return 200", (done) => {
          request(app.server).get("/").expect(200, done);
        });
      });

      describe("path not found", () => {
        it("should return 404", (done) => {
          request(app.server).get("/random").expect(404, done);
        });
      });
    });
  });

  describe("graceful shutdown", () => {
    describe("SIGTERM when server is running", () => {
      it("should stop listening", (done) => {
        assert.equal(app.server.listening, true, "should be listening");

        app.server.once("closed", (err) => {
          assert.ifError(err, "callback should not have error param");
          assert.equal(app.server.listening, false, "should not be listening");
          done();
        });

        process.emit("SIGTERM");
      });
    });

    describe("SIGTERM when server is not running", () => {
      it("should not throw error", (done) => {
        assert.equal(app.server.listening, false, "should not be listening");

        app.server.once("closed", (err) => {
          assert.ok(err, "callback should have error param");
          assert.equal(app.server.listening, false, "should not be listening");
          done();
        });

        process.emit("SIGTERM");
      });
    });
  });

  after((done) => {
    app.server.once("closed", () => {
      done();
    });

    process.emit("SIGTERM");
  });
});

const describeGitHubActions =
  process.env.GITHUB_ACTIONS || os.platform() === "linux"
    ? describe
    : describe.skip;

describeGitHubActions("database CRUD operations", () => {
  before((done) => {
    app.server.start(done);
  });

  const inputEntity = {
    title: "entityName",
    description: "description",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    minRequired: 100,
    postedBy: "111111111111111111111111",
  };
  let initialRecords;
  let createdEntity;
  const isSubset = (subset, superset) =>
    Object.keys(subset).every((key) => subset[key] === superset[key]);

  describe("create", () => {
    it("should retrieve existing records", (done) => {
      request(app.server)
        .get(`/${config.dbTableName}`)
        .expect(200)
        .end((err, res) => {
          if (err) done(err);
          else {
            assert.ok(Array.isArray(res.body), "should be Array");
            assert.ok(
              res.body.every((item) => typeof item === "object"),
              "should be Array of object"
            );
            initialRecords = res.body;
            done();
          }
        });
    });

    it("should create a new record", (done) => {
      request(app.server)
        .post(`/${config.dbTableName}`)
        .send(inputEntity)
        .expect(201)
        .end((err, res) => {
          if (err) done(err);
          else {
            // explicit keys
            assert.ok("title" in res.body, "should have title");

            // implicit keys
            assert.ok("_id" in res.body, "should have _id");
            assert.ok("__v" in res.body, "should have __v");
            assert.ok("createdAt" in res.body, "should have createdAt");
            assert.ok("updatedAt" in res.body, "should have updatedAt");

            createdEntity = res.body;
            done();
          }
        });
    });

    it("should increase records count by 1", (done) => {
      request(app.server)
        .get(`/${config.dbTableName}`)
        .expect(200)
        .end((err, res) => {
          if (err) done(err);
          else {
            assert.equal(
              res.body.length - initialRecords.length,
              1,
              "should be 1"
            );
            done();
          }
        });
    });

    it("should be able to retrieve the new record by id", (done) => {
      request(app.server)
        .get(`/${config.dbTableName}/${createdEntity._id}`)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            assert.ok(
              typeof res.body === "object" && !Array.isArray(res.body),
              "should be object"
            );
            assert.deepEqual(createdEntity, res.body, "should be equal");
            assert.ok(isSubset(inputEntity, res.body));
            done();
          }
        });
    });
  });

  describe("retrieve", () => {
    describe("record does not exist", () => {
      it("should return 404", (done) => {
        request(app.server)
          .get(`/${config.dbTableName}/111111111111111111111111`)
          .expect(404, done);
      });
    });

    describe("get all records", () => {
      let origRecordsExcDeleted;
      let origRecordsIncDeleted;

      before((done) => {
        // get original records (exc deleted)
        request(app.server)
          .get(`/${config.dbTableName}?getIds=true`)
          .expect(200)
          .end((err, res) => {
            origRecordsExcDeleted = res.body;
            done();
          });
      });

      before((done) => {
        // get original records (inc deleted)
        request(app.server)
          .get(`/${config.dbTableName}?getIds=true&incDeleted=true`)
          .expect(200)
          .end((err, res) => {
            if (err) done(err);
            else {
              origRecordsIncDeleted = res.body;
              done();
            }
          });
      });

      before((done) => {
        // create to-be-deleted entity
        request(app.server)
          .post(`/${config.dbTableName}`)
          .send(inputEntity)
          .expect(201)
          .end((err, res) => {
            if (err) done(err);
            else {
              const entityToBeDeleted = res.body;

              // delete to-be-deleted entity
              request(app.server)
                .delete(`/${config.dbTableName}/${entityToBeDeleted._id}`)
                .send({ __v: entityToBeDeleted.__v })
                .expect(200, done);
            }
          });
      });

      describe("excluding deleted", () => {
        it("should retrieve all records", (done) => {
          request(app.server)
            .get(`/${config.dbTableName}`)
            .expect(200)
            .end((err, res) => {
              if (err) done(err);
              else {
                assert.ok(Array.isArray(res.body), "should be Array");
                assert.ok(
                  res.body.every((item) => typeof item === "object"),
                  "should be Array of object"
                );
                assert.equal(
                  res.body.length,
                  origRecordsExcDeleted.length,
                  "should not increase records count"
                );
                done();
              }
            });
        });

        it("should retrieve all ids", (done) => {
          request(app.server)
            .get(`/${config.dbTableName}?getIds=true`)
            .expect(200)
            .end((err, res) => {
              if (err) done(err);
              else {
                assert.ok(Array.isArray(res.body), "should be Array");
                assert.ok(
                  res.body.every((item) => typeof item === "string"),
                  "should be Array of string"
                );
                assert.equal(
                  res.body.length,
                  origRecordsExcDeleted.length,
                  "should not increase records count"
                );
                done();
              }
            });
        });
      });

      describe("including deleted", () => {
        it("should retrieve all records", (done) => {
          request(app.server)
            .get(`/${config.dbTableName}?incDeleted=true`)
            .expect(200)
            .end((err, res) => {
              if (err) done(err);
              else {
                assert.ok(Array.isArray(res.body), "should be Array");
                assert.ok(
                  res.body.every((item) => typeof item === "object"),
                  "should be Array of object"
                );
                assert.equal(
                  res.body.length - origRecordsIncDeleted.length,
                  1,
                  "should increase records count by 1"
                );
                done();
              }
            });
        });

        it("should retrieve all ids", (done) => {
          request(app.server)
            .get(`/${config.dbTableName}?getIds=true&incDeleted=true`)
            .expect(200)
            .end((err, res) => {
              if (err) done(err);
              else {
                assert.ok(Array.isArray(res.body), "should be Array");
                assert.ok(
                  res.body.every((item) => typeof item === "string"),
                  "should be Array of string"
                );
                assert.equal(
                  res.body.length - origRecordsIncDeleted.length,
                  1,
                  "should increase records count by 1"
                );
                done();
              }
            });
        });
      });
    });
  });

  describe("update", () => {
    describe("missing __v", () => {
      it("should return 400", (done) => {
        request(app.server)
          .patch(`/${config.dbTableName}/${createdEntity._id}`)
          .send({ _id: `${createdEntity._id}`, title: "newName1" })
          .expect(400, done);
      });
    });

    describe("record does not exist", () => {
      it("should return 404", (done) => {
        request(app.server)
          .patch(`/${config.dbTableName}/111111111111111111111111`)
          .send({ _id: "111111111111111111111111", __v: 0, title: "newName" })
          .expect(404, done);
      });
    });

    describe("validated params", () => {
      it("should update", (done) => {
        request(app.server)
          .patch(`/${config.dbTableName}/${createdEntity._id}`)
          .send({
            _id: `${createdEntity._id}`,
            __v: createdEntity.__v,
            title: "newName1",
          })
          .expect(200)
          .end((err, res) => {
            if (err) done(err);
            else {
              // explicit keys
              assert.ok(res.body.title === "newName1", "should update title");

              // implicit keys
              assert.equal(
                res.body.__v - createdEntity.__v,
                1,
                "should increase version by 1"
              );

              createdEntity = res.body;
              done();
            }
          });
      });
    });

    describe("replay attack", () => {
      it("should conflict", (done) => {
        request(app.server)
          .patch(`/${config.dbTableName}/${createdEntity._id}`)
          .send({ _id: `${createdEntity._id}`, __v: 0, title: "newName2" })
          .expect(409, done);
      });
    });
  });

  describe("delete", () => {
    describe("missing __v", () => {
      it("should return 400", (done) => {
        request(app.server)
          .delete(`/${config.dbTableName}/${createdEntity._id}`)
          .expect(400, done);
      });
    });

    describe("record does not exist", () => {
      it("should return 404", (done) => {
        request(app.server)
          .delete(`/${config.dbTableName}/111111111111111111111111`)
          .send({ __v: 0 })
          .expect(404, done);
      });
    });

    describe("validated params", () => {
      it("should delete", (done) => {
        request(app.server)
          .delete(`/${config.dbTableName}/${createdEntity._id}`)
          .send({ __v: createdEntity.__v })
          .expect(200)
          .end((err, res) => {
            if (err) done(err);
            else {
              // implicit keys
              assert.equal(
                res.body.__v - createdEntity.__v,
                1,
                "should increase version by 1"
              );
              assert.ok("deletedAt" in res.body, "should have deletedAt");

              createdEntity = res.body;
              done();
            }
          });
      });
    });

    describe("replay attack", () => {
      it("should conflict", (done) => {
        request(app.server)
          .patch(`/${config.dbTableName}/${createdEntity._id}`)
          .send({ __v: 0 })
          .expect([404, 409], done);
      });
    });
  });

  after((done) => {
    app.server.once("closed", () => {
      done();
    });

    process.emit("SIGTERM");
  });
});

describeGitHubActions("auto-recover during database failover", () => {
  before((done) => {
    app.server.start(done);
  });

  describe("when database offline", () => {
    it("should return 503", (done) => {
      app.database.connection.once("disconnected", () => {
        request(app.server).get(`/${config.dbTableName}`).expect(503, done);
      });
      exec("sudo systemctl stop mongod");
    });
  });

  describe("when database recovers", () => {
    it("should return 200", function (done) {
      // takes up to 10 seconds to reconnect (default test timeout is 2000)
      this.timeout(12000);

      app.database.connection.once("reconnected", () => {
        request(app.server).get(`/${config.dbTableName}`).expect(200, done);
      });
      exec("sudo systemctl start mongod");
    });
  });

  after((done) => {
    app.server.once("closed", () => {
      done();
    });

    process.emit("SIGTERM");
  });
});
