/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const zlib = require('zlib');
const url = require('url');
const https = require('https');
const http = require('http');

const flattenJsonSeperator = '_';

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
      path: this.httpStreamUrl.path,
      port: this.httpStreamUrl.port,
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

function processResult(res, reject, resolve) {
  const body = [];
  res.on('data', chunk => body.push(chunk));
  res.on('end', () => {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      reject(new Error(`statusCode: ${res.statusCode}, response: ${Buffer.concat(body).toString()}`));
    } else {
      resolve('Log sent successfully!');
    }
  });
}

const sendHttpRequest = (options, postData) => new Promise((resolve, reject) => {
  const req = http.request(options, (res) => {
    processResult(res, reject, resolve);
  });
  req.on('error', error => reject(error));

  if (postData) {
    req.write(postData);
  }

  req.end();
});

const sendHttpsRequest = (options, postData) => new Promise((resolve, reject) => {
  const req = https.request(options, (res) => {
    processResult(res, reject, resolve);
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
    if (this.lintEnv.httpStreamUrl.protocol === 'http:') {
      return sendHttpRequest(options, data);
    }
    return sendHttpsRequest(options, data);
  }
}

/* eslint-disable no-param-reassign */
const flattenJson = (jsonObject, parentKey = null, level = 1, result = {}) => {
  Object.keys(jsonObject).forEach((fieldKey) => {
    const fieldValue = jsonObject[fieldKey];
    const newFieldKey = parentKey ? `${parentKey}${flattenJsonSeperator}${fieldKey}` : fieldKey;

    if (fieldValue instanceof Array) {
      result[newFieldKey] = fieldValue;
    } else {
      if ((level < 8) && (fieldValue instanceof Object)) { // 8 is the max level
        flattenJson(fieldValue, newFieldKey, level + 1, result);
      } else {
        result[newFieldKey] = fieldValue;
      }
    }
  });

  return result;
};

const shortenKey = (key) => {
  key = key.replace(/[\\/\\.\\-\\\\ ]/, flattenJsonSeperator);
  return key;
};

module.exports = {
  shortenKey,
  flattenJson,
  sendHttpRequest,
  sendHttpsRequest,
  gzipLogs,
  gunzipData,
  LIntHttpEnv,
  LIntKafkaEnv,
  Collector,
};
