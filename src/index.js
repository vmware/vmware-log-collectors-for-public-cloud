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
} = require('./lint');

/* eslint-disable no-param-reassign */
const flattenUserIdentity = (cloudTrailLogs) => {
  for (const record of cloudTrailLogs.Records) {
    if (record.userIdentity) {
      for (const property of Object.keys(record.userIdentity)) {
        const newPropName = 'userIdentity' + property.charAt(0).toUpperCase() + property.substr(1);
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
    flattenUserIdentity(logsJson);
    return JSON.stringify(logsJson.Records);
  }
}

class CloudTrailKafkaCollector extends Collector {
  constructor(lintEnv) {
    super('simple', lintEnv);
  }

  /* eslint-disable no-param-reassign */
  processLogsJson(logsJson) {
    flattenUserIdentity(logsJson);
    logsJson.structure = this.structure;
    // rename the field 'Records' to 'logs'.
    logsJson.logs = logsJson.Records;
    delete logsJson.Records;
    return gzipLogs(logsJson);
  }
}

/* eslint-disable no-param-reassign */
const renameMessageToText = (cloudWatchLogs) => {
  for (const logEvent of cloudWatchLogs.logEvents) {
    if ((logEvent.message) && (!logEvent.text)) {
      logEvent.text = logEvent.message;
      delete logEvent.message;
    }
  }
};

class CloudWatchHttpCollector extends Collector {
  constructor(lintEnv) {
    super('cloudwatch', lintEnv);
  }

  /* eslint-disable no-param-reassign */
  processLogsJson(logsJson) {
    renameMessageToText(logsJson);
    delete logsJson.subscriptionFilters;
    return JSON.stringify(logsJson);
  }
}

class CloudWatchKafkaCollector extends Collector {
  constructor(lintEnv) {
    super('cloudwatch', lintEnv);
  }

  /* eslint-disable no-param-reassign */
  processLogsJson(logsJson) {
    renameMessageToText(logsJson);
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

const handleCloudWatchLogs = (event, context, lintEnv) => {
  const collector = new CloudWatchHttpCollector(lintEnv);
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
  const ingestionUrl = process.env.LogIntelligence_API_Url || 'https://data.cloud.symphony-dev.com/le-mans/v1/streams/ingestion-pipeline-stream';
  if (!apiToken || !ingestionUrl) {
    context.fail(error);
    console.log(error);
    return;
  }
  
  const lintEnv = new LIntHttpEnv(
    'Bearer ' + apiToken,
    ingestionUrl
  );

  if (event.awslogs) {
    handleCloudWatchLogs(event, context, lintEnv);
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
};
