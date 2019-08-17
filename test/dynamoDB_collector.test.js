/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const { lintTestEnv } = require('../test/helper.test');
const { dynamoDBSample } = require('./sample_files/dynamoDB_testdata');

const {
  DynamoDBHttpCollector,
} = require('../src/index');

describe('DynamoDBHttpCollector', () => {
  const tagRegexMap = new Map(Object.entries({
    tag1: new RegExp('c(k+)c', 'i'),
  }));
  const collector = new DynamoDBHttpCollector(lintTestEnv, tagRegexMap);

  describe('processLogsJson', () => {
    it('should process logs JSON', () => {
      const logsJson = dynamoDBSample();
      collector.processLogsJson(logsJson);
      expect(logsJson).toMatchSnapshot();
    });
  });
});
