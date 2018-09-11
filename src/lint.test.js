/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const nock = require('nock');
const { sendLogs } = require('./index');

const {
  gzipLogs,
  gunzipData,
  sendHttpRequest,
  LIntHttpEnv,
  LIntKafkaEnv,
} = require('./lint');

const lintTestEnv = new LIntHttpEnv(
  'Bearer mocktoken',
  'https://data.mock.symphony.com/le-mans/v1/streams/ingestion-pipeline-stream',
);

const sendLogsAndVerify = (done, collector, logsJson, expectedReqBody, expectedReqHeaders) => {
  nock('https://data.mock.symphony.com', expectedReqHeaders)
    .post(
      '/le-mans/v1/streams/ingestion-pipeline-stream',
      JSON.stringify(logsJson.Records),
    )
    .reply(200);

  gzipLogs(logsJson)
    .then(zippedData => sendLogs(zippedData, collector))
    .then(() => done())
    .catch(error => done.fail(error));
};

describe('LIntHttpEnv', () => {
  it('should create options for the HTTP stream', () => {
    const STRUCTURE = 'cloudwatch';
    const options = lintTestEnv.createRequestOptions(STRUCTURE);
    expect(options.headers.structure).toBe(STRUCTURE);
    expect(options.headers.Authorization).toBe('Bearer mocktoken');
    expect(options.method).toBe('POST');
    expect(options.hostname).toBe('data.mock.symphony.com');
    expect(options.path).toBe('/le-mans/v1/streams/ingestion-pipeline-stream');
  });
});

describe('LIntKafkaEnv', () => {
  const STRUCTURE = 'cloudwatch';
  const kafkaTestEnv = new LIntKafkaEnv(
    'Bearer SomeDummyToken',
    'https://data.test.com/le-mans/v1/streams/logiq-rawlogs',
  );

  it('should create options for the Kafka stream', () => {
    const options = kafkaTestEnv.createRequestOptions(STRUCTURE);
    expect(options.headers.Authorization).toBe('Bearer SomeDummyToken');
    expect(options.method).toBe('POST');
    expect(options.hostname).toBe('data.test.com');
    expect(options.path).toBe('/le-mans/v1/streams/logiq-rawlogs');
  });
});

describe('gzipLogs and gunzipData', () => {
  const logsJson = {
    logGroup: '/aws/lambda/runbook',
    subscriptionFilters: [
      'LambdaStream_CloudWatchLogCollector',
    ],
    logEvents: [
      {
        id: '340519224639822107344896',
        timestamp: 1526941013834,
      },
    ],
  };

  it('should zip and unzip data', (done) => {
    gzipLogs(logsJson)
      .then(zippedData => gunzipData(zippedData))
      .then(unzippedData => expect(unzippedData.toString('utf-8')).toBe(JSON.stringify(logsJson)))
      .then(() => done())
      .catch(error => done.fail(error));
  });
});

describe('sendHttpRequest', () => {
  it('should be able to send a request', (done) => {
    nock('https://test.com')
      .get('/test')
      .reply(200);

    const options = {
      hostname: 'test.com',
      path: '/test',
      method: 'GET',
    };

    sendHttpRequest(options, null)
      .then(
        () => done(),
        error => done.fail(error),
      );
  });
});

module.exports = {
  lintTestEnv,
  sendLogsAndVerify,
};
