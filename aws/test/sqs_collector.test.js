/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const { lintTestEnv } = require('../test/helper.test');
const { SQSsample } = require('./sample_files/sqs_testdata');

const {
  SQSHttpCollector,
} = require('../src/index');


describe('SQSHttpCollector', () => {
  const collector = new SQSHttpCollector(lintTestEnv);

  describe('processLogsJson', () => {
    it('should process logs JSON', () => {
      const logsJson = SQSsample();
      collector.processLogsJson(logsJson);
      expect(logsJson)
        .toMatchSnapshot();
    });
  });
});
