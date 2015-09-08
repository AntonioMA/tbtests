// SW simple test server.
// It doesn't keep anything persistent, everything goes the way of the dodo
// when the server is shut down. Tough luck.

// Take a guess :P
var DEFAULT_SERVER_PORT = 8123;
var LIBS_PATH= './libs';

// What we offer:
//   * GET /about that just says hey, mom, it's me
//   * GET /anything/else Tries to find static/anything/else and serves
//         that file, or a 404 if the file does not exist
//   * POST /cspReport  Stores whatever is received as a CSP report and returns
//          a 200
//   * OPTIONS /anything logs the request and returns a 500
//   By default, we're not CORS friendly, not now at least
//   Anything else, returns a 404
var ServerMethods = require('./serverMethods.js').ServerMethods;

var httpServer = require('SimpleHTTPServer');
var SimpleHTTPServer = httpServer.SimpleHTTPServer;
var CommonMethods = httpServer.CommonMethods;

var SERVER_PATHS = {
  'GET': {
    '^/about(.html)?(/.*)?$': ServerMethods.getAboutPage,
    '^/presence?(/.*)?$': ServerMethods.getPresence,
    '.*': CommonMethods.serveStaticContent.
      bind(undefined, {STATIC_PREFIX: './static'})
  },
  'POST': {
    '^/cspReport$': ServerMethods.storeCSPReport,
    '.*': CommonMethods.goAway.bind(undefined, 403)
  },
  'OPTIONS': {
    '.*': ServerMethods.doOptions
  },
  'DEFAULT': {
    '.*': CommonMethods.goAway.bind(undefined, 404)
  }
};

console.log('ARGS: ' + JSON.stringify(process.argv) + '\n');
var server = new SimpleHTTPServer(process.argv[2] || DEFAULT_SERVER_PORT,
                                  SERVER_PATHS);

server.start();