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

function getBatchSizeInBytes(batch) {
  const g = JSON.stringify(batch).replace(/[[\],"]/g, '');
  return g.length;
}

function readDataStream(collector, lineReader, Bucket, region, sourceIPAddress, Key) {
  let currBatch = [];
  lineReader.on('line', function (line) {
    const parsedLine = processS3Line(Bucket, region, sourceIPAddress, Key, line);
    const sizeInBytes = getBatchSizeInBytes(currBatch + parsedLine);
    if (sizeInBytes > (batch_size)) {
      collector.postDataToStream(JSON.stringify(currBatch));
      currBatch = [];
    }
    currBatch.push(parsedLine);
  }).on('close', function() {
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
  const Key = event.Records[0].s3.object.key;
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
      lineReader = readline.createInterface({ input: logStream });
      readDataStream(collector, lineReader, Bucket, region, sourceIPAddress, Key);
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
    const srcKey = event.Records[0].s3.object.key;

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

const handleRecords = (event, context, lintEnv) => {
  let source = event.Records[0].eventSource;
  if (event.Records[0].EventSource) {
    source = event.Records[0].EventSource;
  }
  switch (source) {
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

  const ingestionUrl = process.env.LogIntelligence_API_Url || 'https://data.mgmt.cloud.vmware.com/le-mans/v1/streams/ingestion-pipeline-stream';

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
    handleRecords(event, context, lintEnv);
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
};
