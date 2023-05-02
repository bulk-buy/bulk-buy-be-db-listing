#!/usr/bin/env node

// ===============
// DEPENDENCIES
// ===============

/**
 * Node dependencies.
 */

const process = require("node:process");

/**
 * Module dependencies.
 */

const express = require("express");
const cors = require("cors");
const compression = require("compression");

/**
 * Internal dependencies.
 */

const config = require("./config");
const database = require("./services/database");
const fileLogger = require("./services/fileLogger");
const router = require("./router");

// ===============
// VARIABLES
// ===============

const app = express();
const logger = fileLogger.getLogger("express");

// ===============
// EXPRESS CONFIG
// ===============

app.use(
  fileLogger.framework.connectLogger(fileLogger.getLogger("access"), {
    level: "auto",
    statusRules: [
      { from: 100, to: 399, level: "debug" },
      { from: 400, to: 499, level: "warn" },
      { from: 500, to: 599, level: "error" },
    ],
  })
);
app.use(express.json());
app.use(cors());
app.use(compression());

app.get("/favicon.ico", (req, res) => res.sendStatus(204));
app.use((req, res, next) => {
  if (database.isConnected()) next();
  else res.sendStatus(503);
});
app.use(router);

// ===============
// HTTP SERVER
// ===============

/**
 * Normalize a port into a number, string, or false.
 * @param {string} val
 */

/* istanbul ignore next */
const normalizePort = (val) => {
  const port = parseInt(val, 10);

  if (Number.isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
};

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(config.port);

/**
 * Listen on provided port, on all network interfaces.
 */

let server;
const start = (cb) => {
  if (server && server.listening) {
    // will throw error because server is already listening
    try {
      server.listen();
    } catch (err) {
      /* istanbul ignore else: there is no else path */
      if (typeof cb === "function") cb(err);
      return;
    }
  }
  server = app.listen(port, async () => {
    fileLogger.configure();
    await database.connectWithRetry();
    if (typeof cb === "function") cb();
  });
  server.start = start;

  /**
   * Event listener for HTTP server "error" event.
   * @param {Error} error
   */

  /* istanbul ignore next */
  server.on("error", (error) => {
    if (error.syscall !== "listen") {
      throw error;
    }

    const bind = typeof port === "string" ? `Pipe ${port}` : `Port ${port}`;

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case "EACCES":
        logger.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case "EADDRINUSE":
        logger.error(`${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  /**
   * Event listener for HTTP server "listening" event.
   */

  server.on("listening", () => {
    const addr = server.address();
    /* istanbul ignore next: not piping to file */
    const bind =
      typeof addr === "string" ? `Pipe ${addr}` : `Port ${addr.port}`;
    logger.info(`Listening on ${bind}`);
  });

  /**
   * Event listener for custom "closed" event.
   * @param {Error} err
   */

  server.on("closed", async (err) => {
    if (!err) {
      logger.info("HTTP server closed");
      await database.shutdown();
      fileLogger.shutdown();
    }
  });
};
start();

// ===============
// GRACEFUL SHUTDOWN
// ===============

process.on("SIGTERM", () => {
  logger.debug(
    `SIGTERM signal received: ${
      server.listening ? "closing HTTP server" : "HTTP server already closed"
    }`
  );

  server.close((err) => {
    // emit custom "closed" event as "close" event does not contain params
    server.emit("closed", err);
  });
});

// ===============
// EXPORTS
// ===============

module.exports = {
  get server() {
    return server;
  },
  get database() {
    return database;
  },
};
