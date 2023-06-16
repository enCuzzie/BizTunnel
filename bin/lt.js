#!/usr/bin/env node
/* eslint-disable no-console */

const openurl = require("openurl");
const yargs = require("yargs");

const localtunnel = require("../localtunnel");
const { version } = require("../package");
require("dotenv").config();
var request = require("request");

const { argv } = yargs
  .usage("Usage: lt --port [num] <options>")
  .env(true)
  .option("p", {
    alias: "port",
    describe: "Internal HTTP server port",
  })
  .option("h", {
    alias: "host",
    describe: "Upstream server providing forwarding",
    default: "http://bizbox.ws",
  })
  .option("s", {
    alias: "subdomain",
    describe: "Request this subdomain",
    default: process.env.DEFAULT_SD,
  })
  .option("l", {
    alias: "local-host",
    describe:
      "Tunnel traffic to this host instead of localhost, override Host header to this host",
  })
  .option("local-https", {
    describe: "Tunnel traffic to a local HTTPS server",
  })
  .option("local-cert", {
    describe: "Path to certificate PEM file for local HTTPS server",
  })
  .option("local-key", {
    describe: "Path to certificate key file for local HTTPS server",
    default: process.env.REMOTE_KEY,
  })
  .option("local-ca", {
    describe: "Path to certificate authority file for self-signed certificates",
  })
  .option("allow-invalid-cert", {
    describe:
      "Disable certificate checks for your local HTTPS server (ignore cert/key/ca options)",
  })
  .options("o", {
    alias: "open",
    describe: "Opens the tunnel URL in your browser",
  })
  .option("print-requests", {
    describe: "Print basic request info",
  })
  .require("port")
  .boolean("local-https")
  .boolean("allow-invalid-cert")
  .boolean("print-requests")
  .help("help", "Show this help and exit")
  .version(version);

if (typeof argv.port !== "number") {
  yargs.showHelp();
  console.error("\nInvalid argument: `port` must be a number");
  process.exit(1);
}

(async () => {
  const tunnel = await localtunnel({
    port: argv.port,
    host: argv.host,
    subdomain: argv.subdomain,
    local_host: argv.localHost,
    local_https: argv.localHttps,
    local_cert: argv.localCert,
    local_key: argv.localKey,
    local_ca: argv.localCa,
    allow_invalid_cert: argv.allowInvalidCert,
  }).catch((err) => {
    throw err;
  });

  tunnel.on("error", (err) => {
    throw err;
  });

  console.log("your url is: %s", tunnel.url);

  //So we gonn send this stuff to bizbox cloud to keep user connected or so or whateva

  request.post(
    {
      url: "https://bizbox.encuzzie.com/api/auth/pingserver",
      body: {
        BizboxID: process.env.BIZBOX_ID,
        SSHURL: tunnel.url,
        HomeIP: process.env.HOME_IP,
        HomePort: process.env.HOME_PORT,
        RemoteType: "BIZTUNNEL",
        RemoteKey: process.env.REMOTE_KEY,
      },
      json: true,
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log("Success: " + body);
      } else {
        console.log(
          "Error: " + JSON.stringify(body) + JSON.stringify(error) + " error"
        );
      }
      console.log("API Status Code: " + response.statusCode);
    }
  );

  /**
   * `cachedUrl` is set when using a proxy server that support resource caching.
   * This URL generally remains available after the tunnel itself has closed.
   * @see https://github.com/localtunnel/localtunnel/pull/319#discussion_r319846289
   */
  if (tunnel.cachedUrl) {
    console.log("your cachedUrl is: %s", tunnel.cachedUrl);
  }

  if (argv.open) {
    openurl.open(tunnel.url);
  }

  if (argv["print-requests"]) {
    tunnel.on("request", (info) => {
      console.log(new Date().toString(), info.method, info.path);
    });
  }
})();
