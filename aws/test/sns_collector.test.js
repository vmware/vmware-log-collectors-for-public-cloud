/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const { lintTestEnv } = require('../test/helper.test');
const { SNSsample } = require('./sample_files/sns_testdata');

const {
  SNSHttpCollector,
} = require('../src/index');


describe('SNSHttpCollector', () => {
  const collector = new SNSHttpCollector(lintTestEnv);

  describe('processLogsJson', () => {
    it('should process logs JSON', () => {
      const logsJson = SNSsample();
      collector.processLogsJson(logsJson);
      expect(logsJson)
        .toMatchSnapshot();
    });
  });
});
