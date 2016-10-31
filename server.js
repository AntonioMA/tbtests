// SW simple test server.
// What we offer:
//   * GET /session Returns the configuration data for the (single) session we serve
//   * GET /anything/else Tries to find static/anything/else and serves
//         that file, or a 404 if the file does not exist
//   We are very CORS friendly (as in we do not care where we're called from), at all

// Take a guess :P
var DEFAULT_SERVER_PORT = 8123;
var DEFAULT_STATIC_PATH = __dirname + '/sample';
var LIBS_PATH= './libs';

const TB_API_KEY = 'tb_api_key';
const TB_API_SECRET = 'tb_api_secret';
var env = process.env;

var Opentok = require('opentok');

// Add some persistence...
var Redis = require('ioredis');
var redis = new Redis(env.REDIS_URL || env.REDISTOGO_URL);

var promiscuousCORS = (aReq, aRes, aNext) => {
  aRes.header('Access-Control-Allow-Origin', '*');
  aRes.header('Access-Control-Allow-Methods', 'GET');
  aRes.header('Access-Control-Allow-Headers', 'Content-Type');
  aNext();
};

// /session/:sessionName

redis.pipeline().get(TB_API_KEY).get(TB_API_SECRET).exec().then(results => {
  // Results should be a two row array of two row arrays...
  var apiKey = results[0][1] || env.TB_API_KEY;
  var apiSecret = results[1][1] || env.TB_API_SECRET;
  if (apiKey && apiSecret) {
    return {
      apiKey: apiKey,
      instance: new Opentok(apiKey, apiSecret)
    };
  } else {
    throw('Cannot get the API key or API secret from redis');
  }
}).then(opentokData => {
  var otInstance = opentokData.instance;
  var apiKey = opentokData.apiKey;

  var getSessionByName = (aReq, aRes) => {
    var redisSessionKey = 'tbTests_Sess_' + aReq.params.sessionName;
    redis.get(redisSessionKey).then(sessData => new Promise((resolve, reject) => {
      if (sessData) {
        resolve(JSON.parse(sessData));
      } else {
        otInstance.createSession({ mediaMode: 'routed' }, (err, session) =>
          err && (reject(err) || true) || resolve({ sessionId: session.sessionId, apiKey: apiKey })
        );
      }
    }).then(sessData =>
      redis.setex(redisSessionKey, 3600, JSON.stringify(sessData)).then(() =>
        aRes.send({
          apiKey: sessData.apiKey,
          sessionId: sessData.sessionId,
          token: otInstance.generateToken(sessData.sessionId, {
            role: 'publisher',
            data: JSON.stringify({ userName: 'we could add data here' })
          })
        })
      ))
    ).catch(e => {
      aRes.status(500).send('Error creating session:' + e);
    });
  };


  var express = require('express');
  var app = express();

  // Promiscuous CORS
  app.use(promiscuousCORS);

  app.use(express.static(process.argv[3] || DEFAULT_STATIC_PATH));


  app.use('/session/:sessionName', getSessionByName);

  console.log('ARGS: ', JSON.stringify(process.argv));
  var httpServer = require('http');

  httpServer.createServer(app).listen(process.env.PORT || process.argv[2] || DEFAULT_SERVER_PORT);
}).catch(e => {
  console.error('Error configuring or launching the server:', e);
});
