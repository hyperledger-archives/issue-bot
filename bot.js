//
var https = require('https');
var http = require('http');
var url = require('url');
var config = require('./config.js')
var createHandler = require('github-webhook-handler');
var handler = createHandler(config.webhook);
var host = (process.env.VCAP_APP_HOST || 'localhost');
var port = (process.env.VCAP_APP_PORT || 7777);
var please_post_jira = '\n\nWe use JIRA to track issues. we are using JIRA to \
track issues for the Hyperledger fabric project. You\'ll need a Linux ID (free) \
at [identity.linuxfoundation.org](https://identity.linuxfoundation.org/) and \
can post/track issues at [jira.hyperledger.org](http://jira.hyperledger.org). ';
var greeting = 'Hi ';
var thanks = ',\n\nThanks for submitting this issue!';
var signature = '\n\nhyperbot';

function postComment(payload, msg) {
  var tmp = {};
  tmp.body = greeting + payload.issue.user.login + thanks + msg + signature;
  var postData = JSON.stringify(tmp);
  var path = url.parse(payload.issue.comments_url).pathname;

  var options = {
    hostname: 'api.github.com',
    path: '/upload',
    method: 'POST',
    headers: {
      'User-Agent': 'hyper-issue-bot',
      'Content-Type': 'application/vnd.github.VERSION.text+json',
      'Content-Length': postData.length
    }
  };
  options.path = path;
  options.headers.Authorization = new String("token " + config.auth.secret);
  options.headers["User-Agent"] = config.auth.clientid;

  console.log('posting to: ' + path + ' data: ' + postData);

  var req = https.request(options, function(res) {
    console.log('STATUS: ' + res.statusCode);
    if (res.statusCode != 201) {
      console.log('HEADERS: ' + JSON.stringify(res.headers));
    };
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      //console.log('BODY: ' + chunk);
    });
  });

  req.on('error', function(e) {
    console.log('unable to post comment: ' + e.message);
  });

  // write data to request body
  req.write(postData);
  req.end();
}

// Start server
http.createServer(function (req, res) {
  handler(req, res, function (err) {
    res.statusCode = 404
    res.end('no such location');
    console.log("oops?");
    console.log(req.rawHeaders);
  });
}).listen(port, host);

handler.on('error', function (err) {
  console.error('Error:', err.message);
});

handler.on('issues', function (event) {
  if (event.payload.action != 'opened') {
    return;
  }
  console.log('Received an %s issue event for %s issue #%s',
    event.payload.action,
    event.payload.repository.name,
    event.payload.issue.number);
  postComment(
    event.payload,
    please_post_jira);
});
