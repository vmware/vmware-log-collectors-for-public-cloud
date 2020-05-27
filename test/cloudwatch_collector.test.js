/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const { lintTestEnv, sendLogsAndVerify } = require('../test/helper.test');
const { createSample1 } = require('./sample_files/cloudwatch_testdata');
const { kubernetesLogSample } = require('./sample_files/cloudwatch_testdata');

const {
  CloudWatchHttpCollector,
  CloudWatchKafkaCollector,
  processLogTextAsJson,
} = require('../src/index');

describe('processLogTextAsJson', () => {
  it('should process log text in JSON format', () => {
    const textJson = processLogTextAsJson(`
      { 
        "field1": { 
          "field11": "value11",
          "field12": "value12"
        },
        "field2": "value2", 
        "field3": 3,
        "field4": {
          "field41": ["a", "b", "c"]
        }
      }
    `);
    expect(textJson).toMatchSnapshot();
  });

  it('should process log text not in JSON format', () => {
    const textJson = processLogTextAsJson(' { "field2": "value2", field3: "value3" } ');
    expect(textJson).toMatchSnapshot();
  });
});

describe('CloudWatchKafkaCollector', () => {
  const collector = new CloudWatchKafkaCollector(lintTestEnv, new Map());

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
  const collector = new CloudWatchHttpCollector(lintTestEnv, tagRegexMap);

  describe('processLogsJson', () => {
    it('should process logs JSON', () => {
      const logsJson = createSample1();
      collector.processLogsJson(logsJson);
      expect(logsJson).toMatchSnapshot();
    });

    it('should merge in JSON fields if log text is in JSON format', () => {
      const logsJson = {
        logEvents: [
          {
            id: 'id1',
            text: ' { "timestamp": "1234", "field3": "value3" } ',
          },
        ],
      };

      collector.processLogsJson(logsJson);
      expect(logsJson).toMatchSnapshot();
    });

    it('should merge in JSON fields and extract tags', () => {
      const logsJson = {
        logEvents: [
          {
            id: 'id1',
            text: ' { "field2": "value2", "field3": "abCkKKkcde" } ',
          },
        ],
      };

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

    it('should process kubernetes logs', () => {
      const logsJson = kubernetesLogSample();
      collector.processLogsJson(logsJson);
      expect(logsJson).toMatchSnapshot();
    });

    it('should modify unsupported special characters in keys to support LINT', () => {
      const logsJson = {
        logEvents: [
          {
            id: 'id1',
            text: ' { "field2/": "value2", "field3.": "abCkKKkcde" } ',
          },
        ],
      };

      collector.processLogsJson(logsJson);
      expect(logsJson).toMatchSnapshot();
    });
  });

  describe('sendLogs', () => {
    it('should send request to the HTTP stream', (done) => {
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

      const expectedReqBody = {
        logEvents: [
          {
            id: 'id1',
            field1: 'value1',
            log_type: 'aws_cloud_watch',
          },
        ],
        ingest_timestamp: 1538769915817,
      };

      sendLogsAndVerify(done, collector, logsJson, expectedReqBody, expectedReqHeaders);
    });
  });
});
