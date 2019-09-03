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
const flattenRequestParameters = (record) => {
  if (record.requestParameters) {
    for (const property of Object.keys(record.requestParameters)) {
      const newPropName = `requestParameters_${property.charAt(0)
        .toUpperCase()}${property.substr(1)}`;
      record[newPropName] = record.requestParameters[property];
    }
    delete record.requestParameters;
  }
};

const flattenAttributes = (record) => {
  if (record.attributes) {
    for (const property of Object.keys(record.attributes)) {
      const newPropName = `attributes_${property}`;
      record[newPropName] = record.attributes[property];
    }
    delete record.attributes;
  }
};

/* eslint-disable no-param-reassign */
const flattenResponseElements = (record) => {
  if (record.responseElements) {
    for (const property of Object.keys(record.responseElements)) {
      const newPropName = `responseElements_${property.charAt(0)
        .toUpperCase()}${property.substr(1)}`;
      record[newPropName] = record.responseElements[property];
    }
    delete record.responseElements;
  }
};

const flattenKinesesObject = (record) => {
  if (record.kinesis) {
    for (const property of Object.keys(record.kinesis)) {
      const newPropName = `kinesis_${property}`;
      record[newPropName] = record.kinesis[property];
    }
    record.text = Buffer.from(record.kinesis_data, 'base64').toString('utf-8');
    delete record.kinesis;
    delete record.kinesis_data;
  }
};

const flattenSNSObject = (record) => {
  if (record.Sns) {
    for (const property of Object.keys(record.Sns)) {
      const newPropName = `Sns_${property}`;
      record[newPropName] = record.Sns[property];
    }
    record.text = record.Sns_Message;
    delete record.Sns_Message;
    delete record.Sns;
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

/* eslint-disable no-param-reassign */
const processDynamoDBLogs = (dynamoDBLogRecords) => {
  const ingestionTime = Date.now();
  for (const record of dynamoDBLogRecords) {
    record.ingest_timestamp = ingestionTime;
    record.log_type = 'aws_dynamoDB';
    record.text = JSON.stringify(record.dynamodb);
    delete record.dynamodb;
  }
};

const processSQSLogs = (SQSLogRecords) => {
  const ingestionTime = Date.now();
  for (const record of SQSLogRecords) {
    record.ingest_timestamp = ingestionTime;
    record.log_type = 'aws_sqs';
    record.text = record.body;
    delete record.body;
    flattenAttributes(record);
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

class DynamoDBHttpCollector extends Collector {
  constructor(lintEnv) {
    super('simple', lintEnv);
  }

  /* eslint-disable no-param-reassign */
  processLogsJson(logsJson) {
    if (!logsJson.Records) {
      throw new Error('JSON blob does not have log records. Skip processing the blob.');
    }

    processDynamoDBLogs(logsJson.Records);
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
    if ((textJson.timestamp) &&
      (typeof textJson.timestamp === 'string')) {
      const numericTimestamp = parseInt(textJson.timestamp, 10);
      textJson.timestamp = numericTimestamp || textJson.timestamp;
    }
    Object.keys(textJson).forEach((key) => {
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
    if (log !== '') {
      mergedRecords.text = log;
    }
    return mergedRecords;
  } catch (e) {
    return {};
  }
};

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

const processSNSLogs = (SNSLogRecords) => {
  const ingestionTime = Date.now();
  for (const record of SNSLogRecords) {
    record.ingest_timestamp = ingestionTime;
    record.log_type = 'aws_sns';
    flattenSNSObject(record);
  }
};

/* eslint-disable no-param-reassign */
const processS3Logs = (s3LogRecords) => {
  const ingestionTime = Date.now();
  for (const record of s3LogRecords) {
    record.ingest_timestamp = ingestionTime;
    record.log_type = 'aws_s3';
    flattenUserIdentity(record);
    flattenRequestParameters(record);
    flattenResponseElements(record);
    const textJson = processLogTextAsJson(JSON.stringify(record.s3));
    textJson.text = record.s3;
    delete record.s3;
    Object.assign(record, textJson);
  }
};

/* eslint-disable no-param-reassign */
const processS3File = (bucketName, s3LogString) => {
  let parsedS3Records = [];
  let s3LogRecords = s3LogString.split(/\r?\n/);
  const ingestionTime = Date.now();
  for (const record of s3LogRecords) {
    let parsedRecord = {};
    let textJson = processLogTextAsJson(record);
    if (isEmpty(textJson)) {
      textJson = record;
    }
    parsedRecord.ingest_timestamp = ingestionTime;
    parsedRecord.bucket_name = bucketName;
    parsedRecord.log_type = 'aws_s3data';
    parsedRecord.text = textJson;
    parsedS3Records.push(parsedRecord);
  }
  return parsedS3Records;
};

class S3HttpCollector extends Collector {
  constructor(lintEnv) {
    super('simple', lintEnv);
  }

  /* eslint-disable no-param-reassign */
  processLogsJson(logsJson) {
    if (!logsJson.Records) {
      throw new Error('JSON blob does not have log records. Skip processing the blob.');
    }
    processS3Logs(logsJson.Records);
    return JSON.stringify(logsJson.Records);
  }

  /* eslint-disable no-param-reassign */
  processS3Data(bucketName, s3Records) {
    if (!s3Records) {
      throw new Error('JSON blob does not have log records. Skip processing the blob.');
    }
    let processedLogs = processS3File(bucketName, s3Records);
    return processedLogs;
  }
}

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

const sendSQSLogs = (SQSLogs, collector) => {
  const data = collector.processLogsJson(SQSLogs);
  return collector.postDataToStream(data);
};

const sendSNSLogs = (SNSLogs, collector) => {
  const data = collector.processLogsJson(SNSLogs);
  return collector.postDataToStream(data);
};

class SQSHttpCollector extends Collector {
  constructor(lintEnv) {
    super('simple', lintEnv);
  }

  /* eslint-disable no-param-reassign */
  processLogsJson(logsJson) {
    if (!logsJson.Records) {
      throw new Error('JSON blob does not have log records. Skip processing the blob.');
    }

    processSQSLogs(logsJson.Records);
    return JSON.stringify(logsJson.Records);
  }
}

class SNSHttpCollector extends Collector {
  constructor(lintEnv) {
    super('simple', lintEnv);
  }

  /* eslint-disable no-param-reassign */
  processLogsJson(logsJson) {
    if (!logsJson.Records) {
      throw new Error('JSON blob does not have log records. Skip processing the blob.');
    }

    processSNSLogs(logsJson.Records);
    return JSON.stringify(logsJson.Records);
  }
}

/* eslint-disable no-param-reassign */
const processKinesislLogs = (kinesisLogRecords) => {
  const ingestionTime = Date.now();
  for (const record of kinesisLogRecords) {
    record.ingest_timestamp = ingestionTime;
    record.log_type = 'aws_kinesis';
    flattenKinesesObject(record);
    const textJson = processLogTextAsJson(record.text);
    Object.assign(record, textJson);
  }
};

class KinesisHttpCollector extends Collector {
  constructor(lintEnv) {
    super('simple', lintEnv);
  }

  /* eslint-disable no-param-reassign */
  processLogsJson(logsJson) {
    if (!logsJson.Records) {
      throw new Error('JSON blob does not have log records. Skip processing the blob.');
    }

    processKinesislLogs(logsJson.Records, this.tagRegexMap);
    return JSON.stringify(logsJson.Records);
  }
}

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

const sendS3Logs = (s3Logs, collector) => {
  const data = collector.processLogsJson(s3Logs);
  return collector.postDataToStream(data);
};

const sendLogs = (zippedLogs, collector) => gunzipData(zippedLogs)
  .then(unzippedData => collector.processLogsJson(JSON.parse(unzippedData.toString('utf-8'))))
  .then(data => collector.postDataToStream(data));

const sendS3ContentLogs = (logs, collector, contentType, bucketName) => {
  let batchSize = 300;
  switch (contentType) {
    case 'application/x-gzip':
      gunzipData(logs)
      .then(unzippedData => collector.processS3Data(bucketName, unzippedData.toString('utf-8')))
      .then(data => postDataToStreamInBatches(collector, data, batchSize));
      break;
    default:
      let data = collector.processS3Data(bucketName, logs.toString('utf-8'));
      // collector.postDataToStream(JSON.stringify(data));
      postDataToStreamInBatches(collector, data, batchSize);
  }
};

function postDataToStreamInBatches(collector, data, batchSize) {
  let numberOfBatches = Math.floor(data.length / batchSize);
  if ((data.length % batchSize) > 0) {
    numberOfBatches += 1;
  }

  var curr;
  for (curr=0; curr < numberOfBatches; curr++) {
    let end = (curr+1)*batchSize;
    if(end > data.length) {
      end = data.length;
    }
    let events = JSON.stringify(data.slice(curr*batchSize, end));
    collector.postDataToStream(events);
  }
}

const sendDynamoDBLogs = (dynameDBLogs, collector) => {
  const data = collector.processLogsJson(dynameDBLogs);
  return collector.postDataToStream(data);
};

const sendKinesisLogs = (kinesisLogs, collector) => {
  const data = collector.processLogsJson(kinesisLogs);
  return collector.postDataToStream(data);
};

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

const handleS3logs = (event, context, lintEnv, processS3BucketLogs) => {
  const collector = new S3HttpCollector(lintEnv);
  if (processS3BucketLogs == 'false'){
    sendS3Logs(event, collector);
  } else {
  const srcBucket = event.Records[0].s3.bucket.name;
  const srcKey = event.Records[0].s3.object.key;

  getS3Object(srcBucket, srcKey)
    .then(s3Object => sendS3ContentLogs(s3Object.Body,
    collector, s3Object.ContentType, srcBucket))
  }
};

const handleDynamoDBlogs = (event, context, lintEnv) => {
  const collector = new DynamoDBHttpCollector(lintEnv);
  sendDynamoDBLogs(event, collector);
};

const handleSQSlogs = (event, context, lintEnv) => {
  const collector = new SQSHttpCollector(lintEnv);
  sendSQSLogs(event, collector);
};

const handleSNSlogs = (event, context, lintEnv) => {
  const collector = new SNSHttpCollector(lintEnv);
  sendSNSLogs(event, collector);
};

const handleKinesisLogs = (event, context, lintEnv) => {
  const collector = new KinesisHttpCollector(lintEnv);
  if (!event.Records) {
    throw new Error('JSON blob does not have log records. Skip processing the blob.');
  }
  sendKinesisLogs(event, collector)
    .then(result => handleResult(result, context))
    .catch(error => handleError(error, context));
};

const handleDefaultRecords = (event, context, lintEnv) => {
  if (event.Records[0].eventSource.includes('amazonaws.com')) {
    handleCloudTrailLogs(event, context, lintEnv);
  }
};

const handleRecords = (event, context, lintEnv, processS3BucketLogs) => {
  let source = event.Records[0].eventSource;
  if (event.Records[0].EventSource) {
    source = event.Records[0].EventSource;
  }
  switch (source) {
    case 'aws:s3': handleS3logs(event, context, lintEnv, processS3BucketLogs);
      break;
    case 'aws:dynamodb': handleDynamoDBlogs(event, context, lintEnv);
      break;
    case 'aws:sqs': handleSQSlogs(event, context, lintEnv);
      break;
    case 'aws:kinesis': handleKinesisLogs(event, context, lintEnv);
      break;
    case 'aws:sns': handleSNSlogs(event, context, lintEnv);
      break;
    default: handleDefaultRecords(event, context, lintEnv);
      break;
  }
};

const handler = (event, context) => {
  const apiToken = process.env.LogIntelligence_API_Token;
  if (!apiToken) {
    handleError('The API token is missing. Please configure it in an environment variable of the lambda function');
    return;
  }

  const processS3BucketLogs = process.env.processS3BucketLogs || false;

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
    handleRecords(event, context, lintEnv, processS3BucketLogs);
  }
};

module.exports = {
  handler,
  sendLogs,
  CloudTrailHttpCollector,
  CloudTrailKafkaCollector,
  CloudWatchHttpCollector,
  CloudWatchKafkaCollector,
  S3HttpCollector,
  DynamoDBHttpCollector,
  SQSHttpCollector,
  KinesisHttpCollector,
  processLogTextAsJson,
  SNSHttpCollector,
  sendKinesisLogs,
};