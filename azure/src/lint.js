/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const zlib = require('zlib');
const url = require('url');
const https = require('https');

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
  LIntHttpEnv,
  LIntKafkaEnv,
  Collector
};
