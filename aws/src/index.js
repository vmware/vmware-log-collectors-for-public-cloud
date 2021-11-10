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
const zlib = require('zlib');
const readline = require('readline');
const unzip = require('unzip-stream');
const tar = require('tar-stream');
const {
readVaultData
} =require('./vault');

const batch_size = 0.9 * 1024 * 1024;

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

/**
 * This code flatten MSK Object
 * @param {*} record 
 */
const flattenMSKObject = (record) => {
  const array = [];
  for (let key in record.records) {
    record.records[key].map((mskrecord) => {
      for (const property of Object.keys(mskrecord)) {
        const newPropName = `${property}`;
        if (`${property}` === 'value') {
          mskrecord[newPropName] = Buffer.from(mskrecord[property], 'base64').toString();
        } else {
          mskrecord[newPropName] = mskrecord[property];
        }
      }
      array.push(mskrecord);
    })
  }
  delete record.records;
  for (const key of Object.keys(record)) {
    var attributName = `${key}`;

    for (const property of Object.keys(array)) {
      array[property][attributName] = record[key];
    }
    delete record[attributName];
  }

  record.Records = array;
};

/* eslint-disable no-param-reassign */
const processCloudTrailLogs = (cloudTrailLogRecords) => {
  const ingestionTime = Date.now();
  for (const record of cloudTrailLogRecords) {
    record.text = JSON.stringify(record);
    if (record.requestParameters) {
      Object.assign(record, flattenJson(record.requestParameters, 'requestParameters'));
      delete record.requestParameters;
    }
    if (record.userIdentity) {
      Object.assign(record, flattenJson(record.userIdentity, 'userIdentity'));
      delete record.userIdentity;
    }
    record.ingest_timestamp = ingestionTime;
    record.log_type = 'aws_cloud_trail';
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
  mergedRecords.text = logText;
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
      mergedRecords[key] = value;
    });
    return mergedRecords;
  } catch (e) {
    return mergedRecords;
  }
};

const processSNSLogs = (SNSLogRecords) => {
  const ingestionTime = Date.now();
  for (const record of SNSLogRecords) {
    record.ingest_timestamp = ingestionTime;
    record.log_type = 'aws_sns';
    flattenSNSObject(record);
  }
};

/**
 * This code process EventBridge Logs
 * @param {*} EventBridgeLogRecords 
 */
const processEventBridgeLogs = (EventBridgeLogRecords) => {
  const ingestionTime = Date.now();
  EventBridgeLogRecords.ingest_timestamp = ingestionTime;
  EventBridgeLogRecords.log_type = 'aws_eventbridge';
};

/**
 * This code process CodeCommit Logs
 * @param {*} CodeCommitLogRecords 
 */
const processCodeCommitLogs = (codeCommitLogRecords) => {
  const ingestionTime = Date.now();
  for (const record of codeCommitLogRecords) {
    record.ingest_timestamp = ingestionTime;
    record.log_type = 'aws_codecommit';
  }
};

/**
 * This code process MSK Logs
 * @param {*} MSKLogRecords 
 */
const processMSKLogs = (mskLogData) => {
  flattenMSKObject(mskLogData);
  for (const record of mskLogData.Records) {
    const ingestionTime = Date.now();
    record.ingest_timestamp = ingestionTime;
    record.log_type = 'aws_msk';
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
const processS3Line = (bucketName, region, sourceIPAddress, fileName, s3LogString) => {
  const ingestionTime = Date.now();
  const parsedRecord = processLogTextAsJson(s3LogString);
  parsedRecord.ingest_timestamp = ingestionTime;
  parsedRecord.bucket_name = bucketName;
  parsedRecord.log_type = 'aws_s3_data';
  parsedRecord.region = region;
  parsedRecord.source_ip_addr = sourceIPAddress;
  parsedRecord.file_name = fileName;
  return parsedRecord;
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

/**
 * This code send EventBridge Logs on vrli
 * @param {*} EventBridgeLogs 
 * @param {*} collector 
 */
const sendEventBridgeLogs = (EventBridgeLogs, collector) => {
  const data = collector.processLogsJson(EventBridgeLogs);
  return collector.postDataToStream(data);
};

/**
 * This code send CodeCommit Logs on vrli
 * @param {*} CodeCommitLogs 
 * @param {*} collector 
 */
const sendCodeCommitLogs = (codeCommitLogs, collector) => {
  const data = collector.processLogsJson(codeCommitLogs);
  return collector.postDataToStream(data);
};

/**
 * This code send MSK Logs on vrli
 * @param {*} MSKLogs 
 * @param {*} collector 
 */
const sendMSKLogs = (mskLogs, collector) => {
  const data = collector.processLogsJson(mskLogs);
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

class EventBridgeHttpCollector extends Collector {
  constructor(lintEnv) {
    super('simple', lintEnv);
  }

  /**
   * This code process EventBridge Logs
   * @param {*} logsJson 
   */
  processLogsJson(logsJson) {
    processEventBridgeLogs(logsJson);
    return JSON.stringify(logsJson);
  }
}


class CodeCommitHttpCollector extends Collector {
  constructor(lintEnv) {
    super('simple', lintEnv);
  }

  /**
   * This code process CodeCommit Logs
   * @param {*} logsJson 
   */
  processLogsJson(logsJson) {
    if (!logsJson.Records) {
      throw new Error('JSON blob does not have log records. Skip processing the blob.');
    }

    processCodeCommitLogs(logsJson.Records);
    return JSON.stringify(logsJson.Records);
  }
}

class MSKHttpCollector extends Collector {
  constructor(lintEnv) {
    super('simple', lintEnv);
  }

  /**
   * This code process MSK Logs
   * @param {*} logsJson 
   */
  processLogsJson(logsJson) {
    processMSKLogs(logsJson);
    if (!logsJson.Records) {
      throw new Error('JSON blob does not have log records. Skip processing the blob.');
    }
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

function getBatchSizeInBytes(batch) {
  const g = batch.replace(/[[\],"]/g, '');
  return g.length;
}

function readDataStream(collector, lineReader, Bucket, region, sourceIPAddress, Key) {
  let currBatch = [];
  lineReader.on('line', function (line) {
    const parsedLine = processS3Line(Bucket, region, sourceIPAddress, Key, line);
    const sizeInBytes = getBatchSizeInBytes(JSON.stringify(currBatch) + JSON.stringify(parsedLine));
    if (sizeInBytes > (batch_size)) {
      collector.postDataToStream(JSON.stringify(currBatch));
      currBatch = [];
    }
    currBatch.push(parsedLine);
  }).on('close', function () {
    if (currBatch.length > 0) {
      collector.postDataToStream(JSON.stringify(currBatch));
    }
  });
}

function readAndPushZipLogs(collector, logStream, Bucket, region, sourceIPAddress, Key) {
  const lineReader = [];
  let i = 0;
  logStream.pipe(unzip.Parse())
    .on('entry', function (entry) {
      lineReader[i] = readline.createInterface({ input: entry });
      readDataStream(collector, lineReader[i], Bucket, region, sourceIPAddress, (Key, '/', entry.path));
      i += 1;
    });
}

function readAndPushTarGZLogs(collector, logStream, Bucket, region, sourceIPAddress, Key) {
  const lineReader = [];
  let i = 0;
  logStream.pipe(zlib.createGunzip())
    .pipe(tar.extract())
    .on('entry', function (header, stream, next) {
      lineReader[i] = readline.createInterface({ input: stream });
      readDataStream(collector, lineReader[i], Bucket, region, sourceIPAddress, (Key, '/', header.name));
      i += 1;
    });
}

const sendS3ContentLogs = (collector, contentType, event) => {
  const Bucket = event.Records[0].s3.bucket.name;
  //Code for decoding the specific character 
  const srcKey = (event.Records[0].s3.object.key).replace(/\+/g, " "); 
  const Key = decodeURIComponent(srcKey);
  const region = event.Records[0].awsRegion;
  const sourceIPAddress = event.Records[0].requestParameters.sourceIPAddress;
  const s3 = new aws.S3();
  const logStream = s3.getObject({ Bucket, Key }).createReadStream();
  let lineReader = null;
  switch (contentType) {
    case 'application/zip':
      readAndPushZipLogs(collector, logStream, Bucket, region, sourceIPAddress, Key);
      break;
    case 'application/x-gzip':
      if (Key.endsWith('.tar.gz') || Key.endsWith('.tgz')) {
        readAndPushTarGZLogs(collector, logStream, Bucket, region, sourceIPAddress, Key);
      } else {
        lineReader = readline.createInterface({ input: logStream.pipe(zlib.createGunzip()) });
        readDataStream(collector, lineReader, Bucket, region, sourceIPAddress, Key);
      }
      break;
    default:
    //Code for processing .gz logs
     if (Key.endsWith('.gz')) {
        lineReader = readline.createInterface({ input: logStream.pipe(zlib.createGunzip()) });
        readDataStream(collector, lineReader, Bucket, region, sourceIPAddress, Key);
     } else {
        lineReader = readline.createInterface({ input: logStream });
        readDataStream(collector, lineReader, Bucket, region, sourceIPAddress, Key);
     }
  }
};

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

const getS3HeadObject = (Bucket, Key) => new Promise((resolve, reject) => {
  const s3 = new aws.S3();
  s3.headObject(
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

const handleS3logs = (event, context, lintEnv) => {
  const collector = new S3HttpCollector(lintEnv);
  // eslint-disable-next-line prefer-destructuring
  const processS3BucketLogs = process.env.S3Bucket_Logs;
  if (process.env.CloudTrail_Logs === 'true') {
    handleCloudTrailLogs(event, context, lintEnv);
  } else if (processS3BucketLogs === 'true') {
    const srcBucket = event.Records[0].s3.bucket.name;
    //Code for decoding the specific character 
    const key = (event.Records[0].s3.object.key).replace(/\+/g, " "); 
    const srcKey = decodeURIComponent(key);
    getS3HeadObject(srcBucket, srcKey)
      .then((s3Metadata) => {
        sendS3ContentLogs(collector, s3Metadata.ContentType, event);
      });
  } else {
    sendS3Logs(event, collector);
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

/**
 * This code handle EventBridge Logs
 * @param {*} event 
 * @param {*} context 
 * @param {*} lintEnv 
 */
const handleEventBridgelogs = (event, context, lintEnv) => {
  const collector = new EventBridgeHttpCollector(lintEnv);
  sendEventBridgeLogs(event, collector);
};

/**
 * This code handle CodeCommit Logs
 * @param {*} event 
 * @param {*} context 
 * @param {*} lintEnv 
 */
const handleCodeCommitlogs = (event, context, lintEnv) => {
  const collector = new CodeCommitHttpCollector(lintEnv);
  sendCodeCommitLogs(event, collector)
    .then(result => handleResult(result, context))
    .catch(error => handleError(error, context));
};

/**
 * This code handle MSK Logs
 * @param {*} event 
 * @param {*} context 
 * @param {*} lintEnv 
 */
const handleMSKlogs = (event, context, lintEnv) => {
  const collector = new MSKHttpCollector(lintEnv);
  sendMSKLogs(event, collector)
    .then(result => handleResult(result, context))
    .catch(error => handleError(error, context));
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

function getEventSource(event) {
  let source = '';
  if (event.eventSource && event.eventSource === 'aws:kafka') {
    source = event.eventSource;
  } else {
    source = event.Records[0].eventSource;
    if (event.Records[0].EventSource) {
      source = event.Records[0].EventSource;
    }
  }
  return source;
}

const handleRecords = (event, context, lintEnv) => {

  switch (getEventSource(event)) {
    case 'aws:s3': handleS3logs(event, context, lintEnv);
      break;
    case 'aws:dynamodb': handleDynamoDBlogs(event, context, lintEnv);
      break;
    case 'aws:sqs': handleSQSlogs(event, context, lintEnv);
      break;
    case 'aws:kinesis': handleKinesisLogs(event, context, lintEnv);
      break;
    case 'aws:sns': handleSNSlogs(event, context, lintEnv);
      break;
    case 'aws:codecommit': handleCodeCommitlogs(event, context, lintEnv);
      break;
    case 'aws:kafka': handleMSKlogs(event, context, lintEnv);
      break;
    default: handleDefaultRecords(event, context, lintEnv);
      break;
  }
};

const handler = (event, context) => {
    let apiToken = null;
    let lintEnv = null;
    const ingestionUrl = process.env.VRLIC_API_Url || 'https://data.mgmt.cloud.vmware.com/le-mans/v1/streams/ingestion-pipeline-stream';

    const tagRegexMap = new Map();
    Object.getOwnPropertyNames(process.env).forEach((v) => {
        if (v.startsWith('Tag_')) {
            tagRegexMap.set(v.substring(4), new RegExp(process.env[v], 'i'));
        }
    });
    if (process.env.VAULT_ADDR || process.env.VLE_VAULT_ADDR) {
        const options = {
            hostname: '127.0.0.1',
            port: 8200,
            path: '/v1/' + process.env.KV_SECRET_PATH,
            method: 'GET'
        }
        readVaultData(options).then(function(token) {
            apiToken = token;
            if (!apiToken) {
                handleError('The API token is missing in vault.');
                return;
            }
            lintEnv = new LIntHttpEnv(`Bearer ${apiToken}`, ingestionUrl);

            if (event.awslogs) {
                handleCloudWatchLogs(event, context, lintEnv, tagRegexMap);
            }

            if (event.Records || event.records) {
                handleRecords(event, context, lintEnv);
            }

            if (process.env.EventBridge_Logs === 'true') {
                handleEventBridgelogs(event, context, lintEnv);
            }
        }).catch( error => { handleError(error, context)});

    } else if (process.env.VRLIC_API_Token) {
        apiToken = process.env.VRLIC_API_Token;
        if (!apiToken) {
            handleError('The API token is missing. Please configure it in an environment variable of the lambda function');
            return;
        }
        lintEnv = new LIntHttpEnv(`Bearer ${apiToken}`, ingestionUrl);

        if (event.awslogs) {
            handleCloudWatchLogs(event, context, lintEnv, tagRegexMap);
        }

        if (event.Records || event.records) {
            handleRecords(event, context, lintEnv);
        }

        if (process.env.EventBridge_Logs === 'true') {
            handleEventBridgelogs(event, context, lintEnv);
        }
    } else {
        console.log('Please configure required environment variable of the lambda function');
    }
};

module.exports = {
  handler,
  sendLogs,
  sendS3ContentLogs,
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
  EventBridgeHttpCollector,
  CodeCommitHttpCollector,
  MSKHttpCollector,
};
