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
  shortenKey,
} = require('./lint');

const logTextKeys = ['log', 'message', 'msg'];

/* eslint-disable no-param-reassign */
const flattenUserIdentity = (record) => {
  if (record.userIdentity) {
    for (const property of Object.keys(record.userIdentity)) {
      const newPropName = `userIdentity${property.charAt(0).toUpperCase()}${property.substr(1)}`;
      record[newPropName] = record.userIdentity[property];
    }
    delete record.userIdentity;
  }
};

/* eslint-disable no-param-reassign */
const processCloudTrailLogs = (cloudTrailLogRecords) => {
  const ingestionTime = Date.now();
  for (const record of cloudTrailLogRecords) {
    record.ingest_timestamp = ingestionTime;
    record.log_type = 'aws_cloud_trail';
    flattenUserIdentity(record);
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

    processCloudTrailLogs(logsJson.Records);
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

    processCloudTrailLogs(logsJson.Records);
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
  const keys = [];
  const mergedRecords = {};
  let log = '';
  try {
    let textJson = JSON.parse(logText);
    textJson = flattenJson(textJson);
    console.log(textJson);
    if ((textJson.timestamp) &&
        (typeof textJson.timestamp === 'string')) {
      const numericTimestamp = parseInt(textJson.timestamp, 10);
      textJson.timestamp = numericTimestamp || textJson.timestamp;
    }
    Object.keys(textJson).forEach((key) => {
      console.log(key);
      let value = textJson[key];
      if (value != null) {
        key = shortenKey(key);
        if (typeof keys[key] !== 'undefined') {
          value = `${mergedRecords[key]} ${value}`;
        }
        keys.push(key);
      }
      if (logTextKeys.includes(key)) {
        if (log !== value) {
          if (log === '') {
            log = value;
          } else {
            log = `${log}${value}`;
          }
        }
      } else {
        mergedRecords[key] = value;
      }
    });
    console.log(log);
    if (log !== '') {
      mergedRecords.text = log;
    }
    return mergedRecords;
  } catch (e) {
    return {};
  }
};

/* eslint-disable no-param-reassign */
const processLogText = (cloudWatchLogs, tagRegexMap) => {
  for (const logEvent of cloudWatchLogs.logEvents) {
    logEvent.log_type = 'aws_cloud_watch';
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
    logsJson.ingest_timestamp = Date.now();
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
    logsJson.ingest_timestamp = Date.now();
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
