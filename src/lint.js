/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const zlib = require('zlib');
const url = require('url');
const https = require('https');

class LIntKafkaEnv {
  constructor(authToken, kafkaStreamURL) {
    this.authToken = authToken;
    const streamURL = url.parse(kafkaStreamURL);
    this.kafkaStreamOptions = {
      hostname: streamURL.hostname,
      path: streamURL.pathname,
      method: 'POST',
      headers: {
        Authorization: this.authToken,
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/octet-stream',
      },
    };
  }

  createRequestOptions() {
    return this.kafkaStreamOptions;
  }
}

class LIntHttpEnv {
  constructor(authToken, httpStreamUrl) {
    this.authToken = authToken;
    this.httpStreamUrl = url.parse(httpStreamUrl);
  }

  createRequestOptions(structure) {
    return {
      hostname: this.httpStreamUrl.hostname,
      path: this.httpStreamUrl.pathname,
      method: 'POST',
      headers: {
        Authorization: this.authToken,
        'Cache-Control': 'no-cache',
        structure,
        'Content-Type': 'application/json',
      },
    };
  }
}

const sendHttpRequest = (options, postData) => new Promise((resolve, reject) => {
  const req = https.request(options, (res) => {
    const body = [];
    res.on('data', chunk => body.push(chunk));
    res.on('end', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`statusCode: ${res.statusCode}, response: ${Buffer.concat(body).toString()}`));
      } else {
        resolve('Log sent to Log Intelligence!');
      }
    });
  });

  req.on('error', error => reject(error));

  if (postData) {
    req.write(postData);
  }

  req.end();
});

const gunzipData = zippedData => new Promise((resolve, reject) => {
  zlib.gunzip(
    zippedData,
    (error, unzippedLogs) => (error ? reject(error) : resolve(unzippedLogs))
  );
});

const gzipLogs = logsJson => new Promise((resolve, reject) => {
  const logsBuffer = Buffer.from(JSON.stringify(logsJson), 'utf-8');
  zlib.gzip(
    logsBuffer,
    (error, zippedLogs) => (error ? reject(error) : resolve(zippedLogs))
  );
});

class Collector {
  constructor(structure, lintEnv) {
    this.structure = structure;
    this.lintEnv = lintEnv;
  }

  postDataToStream(data) {
    const options = this.lintEnv.createRequestOptions(this.structure);
    return sendHttpRequest(options, data);
  }
}

module.exports = {
  sendHttpRequest,
  gzipLogs,
  gunzipData,
  LIntHttpEnv,
  LIntKafkaEnv,
  Collector,
};
