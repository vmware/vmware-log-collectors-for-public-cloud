/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

/* eslint-disable no-console */
const aws = require('aws-sdk');
const {
  gzipLogs,
  gunzipData,
  LIntHttpEnv,
  Collector,
  flattenJson,
} = require('./lint');

/* eslint-disable no-param-reassign */
const flattenUserIdentity = (cloudTrailLogRecords) => {
  for (const record of cloudTrailLogRecords) {
    if (record.userIdentity) {
      for (const property of Object.keys(record.userIdentity)) {
        const newPropName = `userIdentity${property.charAt(0).toUpperCase()}${property.substr(1)}`;
        record[newPropName] = record.userIdentity[property];
      }
      delete record.userIdentity;
    }
  }
};

class CloudTrailHttpCollector extends Collector {
  constructor(lintEnv) {
    super('simple', lintEnv);
  }

  /* eslint-disable no-param-reassign */
  processLogsJson(logsJson) {
    if (!logsJson.Records) {
      throw new Error('JSON blob does not have log records. Skip processing the blob.');
    }

    flattenUserIdentity(logsJson.Records);
    return JSON.stringify(logsJson.Records);
  }
}

class CloudTrailKafkaCollector extends Collector {
  constructor(lintEnv) {
    super('simple', lintEnv);
  }

  /* eslint-disable no-param-reassign */
  processLogsJson(logsJson) {
    if (!logsJson.Records) {
      throw new Error('JSON blob does not have log records. Skip processing the blob.');
    }

    flattenUserIdentity(logsJson.Records);
    logsJson.structure = this.structure;
    // rename the field 'Records' to 'logs'.
    logsJson.logs = logsJson.Records;
    delete logsJson.Records;
    return gzipLogs(logsJson);
  }
}

const extractTags = (logText, tagRegexMap) => {
  let text = logText;
  if (!(logText instanceof String)) {
    text = JSON.stringify(logText);
  }
  const tags = {};
  tagRegexMap.forEach((fieldRegex, fieldName) => {
    const result = text.match(fieldRegex);
    if (result) {
      tags[fieldName] = result[0];
    }
  });
  return tags;
};

const processLogTextAsJson = (logText) => {
  try {
    let textJson = JSON.parse(logText);
    textJson = flattenJson(textJson);
    if ((textJson.timestamp) &&
        (typeof textJson.timestamp === 'string')) {
      const numericTimestamp = parseInt(textJson.timestamp, 10);
      textJson.timestamp = numericTimestamp || textJson.timestamp;
    }
    return textJson;
  } catch (e) {
    return {};
  }
};

/* eslint-disable no-param-reassign */
const processLogText = (cloudWatchLogs, tagRegexMap) => {
  for (const logEvent of cloudWatchLogs.logEvents) {
    if ((logEvent.message) && (!logEvent.text)) {
      logEvent.text = logEvent.message;
      delete logEvent.message;
    }

    if (logEvent.text) {
      const tags = extractTags(logEvent.text, tagRegexMap);
      const textJson = processLogTextAsJson(logEvent.text);
      Object.assign(logEvent, tags, textJson);
    }
  }
};

class CloudWatchHttpCollector extends Collector {
  constructor(lintEnv, tagRegexMap) {
    super('cloudwatch', lintEnv);
    this.tagRegexMap = tagRegexMap;
  }

  /* eslint-disable no-param-reassign */
  processLogsJson(logsJson) {
    processLogText(logsJson, this.tagRegexMap);
    delete logsJson.subscriptionFilters;
    return JSON.stringify(logsJson);
  }
}

class CloudWatchKafkaCollector extends Collector {
  constructor(lintEnv, tagRegexMap) {
    super('cloudwatch', lintEnv);
    this.tagRegexMap = tagRegexMap;
  }

  /* eslint-disable no-param-reassign */
  processLogsJson(logsJson) {
    processLogText(logsJson, this.tagRegexMap);
    logsJson.structure = this.structure;
    delete logsJson.subscriptionFilters;
    // rename the field 'logEvents' to 'logs'.
    logsJson.logs = logsJson.logEvents;
    delete logsJson.logEvents;
    return gzipLogs(logsJson);
  }
}

const sendLogs = (zippedLogs, collector) => gunzipData(zippedLogs)
  .then(unzippedData => collector.processLogsJson(JSON.parse(unzippedData.toString('utf-8'))))
  .then(data => collector.postDataToStream(data));

const handleResult = (result, context) => {
  context.succeed();
  console.log(result);
};

const handleError = (error, context) => {
  context.fail(error);
  console.log(error);
};

const handleCloudWatchLogs = (event, context, lintEnv, tagRegexMap) => {
  const collector = new CloudWatchHttpCollector(lintEnv, tagRegexMap);
  const zippedLogs = Buffer.from(event.awslogs.data, 'base64');

  sendLogs(zippedLogs, collector)
    .then(result => handleResult(result, context))
    .catch(error => handleError(error, context));
};

const getS3Object = (Bucket, Key) => new Promise((resolve, reject) => {
  const s3 = new aws.S3();

  s3.getObject(
    { Bucket, Key },
    (error, data) => (error ? reject(error) : resolve(data)),
  );
});

const handleCloudTrailLogs = (event, context, lintEnv) => {
  const collector = new CloudTrailHttpCollector(lintEnv);
  const srcBucket = event.Records[0].s3.bucket.name;
  const srcKey = event.Records[0].s3.object.key;

  getS3Object(srcBucket, srcKey)
    .then(s3Object => sendLogs(s3Object.Body, collector))
    .then(result => handleResult(result, context))
    .catch(error => handleError(error, context));
};

const handler = (event, context) => {
  const apiToken = process.env.LogIntelligence_API_Token;
  if (!apiToken) {
    handleError('The API token is missing. Please configure it in an environment variable of the lambda function');
    return;
  }

  const ingestionUrl = process.env.LogIntelligence_API_Url || 'https://data.cloud.symphony-dev.com/le-mans/v1/streams/ingestion-pipeline-stream';

  const tagRegexMap = new Map();
  Object.getOwnPropertyNames(process.env).forEach((v) => {
    if (v.startsWith('Tag_')) {
      tagRegexMap.set(v.substring(4), new RegExp(process.env[v], 'i'));
    }
  });

  const lintEnv = new LIntHttpEnv(`Bearer ${apiToken}`, ingestionUrl);

  if (event.awslogs) {
    handleCloudWatchLogs(event, context, lintEnv, tagRegexMap);
  }

  if (event.Records) {
    handleCloudTrailLogs(event, context, lintEnv);
  }
};

module.exports = {
  handler,
  sendLogs,
  CloudTrailHttpCollector,
  CloudTrailKafkaCollector,
  CloudWatchHttpCollector,
  CloudWatchKafkaCollector,
  processLogTextAsJson,
};
