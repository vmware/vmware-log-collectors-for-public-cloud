/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const { lintTestEnv, sendLogsAndVerify } = require('../test/helper.test');
const { createSample1 } = require('./sample_files/cloudtrail_testdata');

const {
  CloudTrailHttpCollector,
  CloudTrailKafkaCollector,
} = require('../src/index');

describe('CloudTrailKafkaCollector', () => {
  const collector = new CloudTrailKafkaCollector(lintTestEnv);

  it('processLogsJson', () => {
    const logsJson = createSample1();
    collector.processLogsJson(logsJson);
    expect(logsJson.Records).toBe(undefined);
    expect(logsJson).toMatchSnapshot();
  });
});

describe('CloudTrailHttpCollector', () => {
  const collector = new CloudTrailHttpCollector(lintTestEnv);

  describe('processLogsJson', () => {
    it('should process logs JSON', () => {
      const logsJson = createSample1();
      collector.processLogsJson(logsJson);
      expect(logsJson).toMatchSnapshot();
    });
  });

  describe('sendLogs', () => {
    it('should send request to the HTTP stream', (done) => {
      const logsJson = {
        Records: [
          {
            id: 'id1',
            field1: 'value1',
          },
        ],
      };

      const expectedReqHeaders = {
        reqheaders: {
          authorization: 'Bearer mocktoken',
          structure: 'simple',
          'content-type': 'application/json',
        },
      };

      const expectedReqBody = [{
        id: 'id1',
        field1: 'value1',
        text: '{"id":"id1","field1":"value1"}',
        ingest_timestamp: 1538769915817,
        log_type: 'aws_cloud_trail',
      }];

      sendLogsAndVerify(done, collector, logsJson, expectedReqBody, expectedReqHeaders);
    }, 10000);
  });
});
