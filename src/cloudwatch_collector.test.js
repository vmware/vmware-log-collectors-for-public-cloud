/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const lintEnv = require('./lint_env').lintTestEnv;
const { createSample1 } = require('./cloudwatch_testdata');
const { gzipLogs } = require('./lint');
const nock = require('nock');

const {
  sendLogs,
  CloudWatchHttpCollector,
  CloudWatchKafkaCollector,
} = require('./index');

describe('CloudWatchKafkaCollector', () => {
  const collector = new CloudWatchKafkaCollector(lintEnv, new Map());

  it('processLogsJson', () => {
    const logsJson = createSample1();
    collector.processLogsJson(logsJson);
    expect(logsJson.subscriptionFilters).toBe(undefined);
    expect(logsJson.logEvents).toBe(undefined);
    expect(logsJson).toMatchSnapshot();
  });
});

describe('CloudWatchHttpCollector', () => {
  const tagRegexMap = new Map(Object.entries({
    tag1: new RegExp('c(k+)c', 'i'),
  }));
  const collector = new CloudWatchHttpCollector(lintEnv, tagRegexMap);

  describe('processLogsJson', () => {
    it('should process logs JSON', () => {
      const logsJson = createSample1();
      collector.processLogsJson(logsJson);
      expect(logsJson).toMatchSnapshot();
    });

    it('should extract tags from text string', () => {
      const logsJson = {
        logEvents: [
          {
            id: 'id1',
            text: 'abCkKKkcde',
          },
        ],
      };

      collector.processLogsJson(logsJson);
      expect(logsJson).toMatchSnapshot();
    });

    it('should extract tags from text array', () => {
      const logsJson = {
        logEvents: [
          {
            id: 'id1',
            text: [{ field1: 'abckkkkcde' }],
          },
        ],
      };

      collector.processLogsJson(logsJson);
      expect(logsJson).toMatchSnapshot();
    });
  });

  describe('sendLogs', () => {
    const logsJson = {
      logEvents: [
        {
          id: 'id1',
          field1: 'value1',
        },
      ],
    };

    const expectedReqHeaders = {
      reqheaders: {
        authorization: 'Bearer mocktoken',
        structure: 'cloudwatch',
        'content-type': 'application/json',
      },
    };

    const sendData = (done) => {
      nock('https://data.mock.symphony.com', expectedReqHeaders)
        .post(
          '/le-mans/v1/streams/ingestion-pipeline-stream',
          JSON.stringify(logsJson),
        )
        .reply(200);

      gzipLogs(logsJson)
        .then(zippedData => sendLogs(zippedData, collector))
        .then(() => done())
        .catch(error => done.fail(error));
    };

    it('should send request to the HTTP stream', (done) => {
      sendData(done);
    });
  });
});
