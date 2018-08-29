/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const lintEnv = require('./lint_env').lintTestEnv;
const { createSample1 } = require('./cloudtrail_testdata');
const { gzipLogs } = require('./lint');
const nock = require('nock');

const {
  sendLogs,
  CloudTrailHttpCollector,
  CloudTrailKafkaCollector,
} = require('./index');

describe('CloudTrailKafkaCollector', () => {
  const collector = new CloudTrailKafkaCollector(lintEnv);

  it('processLogsJson', () => {
    const logsJson = createSample1();
    collector.processLogsJson(logsJson);
    expect(logsJson.Records).toBe(undefined);
    expect(logsJson).toMatchSnapshot();
  });
});

describe('CloudTrailHttpCollector', () => {
  const collector = new CloudTrailHttpCollector(lintEnv);

  describe('processLogsJson', () => {
    it('should process logs JSON', () => {
      const logsJson = createSample1();
      collector.processLogsJson(logsJson);
      expect(logsJson).toMatchSnapshot();
    });
  });

  describe('sendLogs', () => {
    const logsJson = {
      Records: [
        {
          id: 'id1',
          field1: 'value1',
        }
      ]
    };

    const expectedReqHeaders = {
      reqheaders: {
        "authorization": "Bearer mocktoken",
        "structure": "simple",
        "content-type": "application/json"
      }
    };

    const sendData = (done) => {
      nock('https://data.mock.symphony.com', expectedReqHeaders)
        .post('/le-mans/v1/streams/ingestion-pipeline-stream',
          JSON.stringify(logsJson.Records))
        .reply(200);

      gzipLogs(logsJson)
        .then(zippedData => sendLogs(zippedData, collector))
        .then(() => done())
        .catch(error => done.fail(error));
    };

    it('should send request to the HTTP stream', (done) => {
      sendData(done);
    }, 10000);
  });
});
