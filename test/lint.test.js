/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const nock = require('nock');
const { lintTestEnv } = require('./helper.test');

const {
  gzipLogs,
  gunzipData,
  sendHttpRequest,
  LIntKafkaEnv,
  flattenJson,
} = require('../src/lint');

describe('flattenJson', () => {
  it('should flatten arrays in JSON', () => {
    const exampleJson = ['a', 'b', 'c'];
    const result = flattenJson(exampleJson);
    expect(result).toMatchSnapshot();
  });

  it('should work when there is nothing to flatten', () => {
    const exampleJson = {
      field1: 'value1',
      field2: 'value2',
    };
    const result = flattenJson(exampleJson);
    expect(result).toMatchSnapshot();
  });

  it('should flatten nested arrays and objects', () => {
    const exampleJson = {
      field1: { field11: 'value11', field12: 'value12' },
      field2: 'value2',
      field3: 3,
      field4: { field41: ['a', 'b', 'c'] },
    };
    const result = flattenJson(exampleJson);
    expect(result).toMatchSnapshot();
  });
});

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
