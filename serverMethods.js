// Note: Since I'm not putting the TB key and data here, and don't really want
// to have a not-checked-in file for that either, I'm just going to store them
// on redis (and assume they're already stored when this runs).
// Just run:
// redis-cli set tb_api_key yourkeyhere
// redis-cli set tb_api_secret yoursecrethere
// Once before trying to run this
function ServerMethods() {
  'use strict';


  var returnData = require('SimpleHTTPServer').CommonMethods.returnData;
  var Logger = require('SimpleHTTPServer').HTTPLogger;
  var logger = new Logger("ServerMethods", true);

  // Add some persistence...
  var Redis = require('ioredis');
  var redis = new redis();


// This should work but doesn't
// redis.get('tb_api_key').get('tb_api_secret').then(function(err, results) { console.log("ERR: ", JSON.stringify(err), ":: results: ", JSON.stringify(results))});
  var serveStaticContent =
    require('SimpleHTTPServer').CommonMethods.serveStaticContent;

  function doOptions(aReq, aRes, aPathname) {
    logger.log("doOptions: " + aPathname);
    returnData(aRes, 500, "Not supported", "text/html");
  }

  // Returns a nice HTML about page
  function getAboutPage(aReq, aRes, aParsedURL) {
    logger.log("aboutPage");
    serveStaticContent(aReq, aRes, {pathname: "/about.html"});
  }

  function storeCSPReport(aReq, aRes, aParsedURL) {
    aReq.on('readable', function() {
      aReq.setEncoding('ascii');
      var report = aReq.read();
      logger.log("Got a report: " + report + " from " +
          JSON.stringify(aReq.headers) + " on " + aParsedURL.pathname);
      returnData(aRes, 200, "Success", "text/html");
    });
  }

  function getPresence(aReq, aRes, aParsedURL) {
    logger.log("getPresence()", JSON.stringify(aParsedURL));
    returnData(aRes, 200, "Success", "text/html");
  }

  return {
    getAboutPage: getAboutPage,
    doOptions: doOptions,
    storeCSPReport: storeCSPReport,
    getPresence: getPresence
  };

};

module.exports.ServerMethods = new ServerMethods();
