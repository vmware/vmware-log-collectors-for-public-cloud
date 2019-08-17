/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const { lintTestEnv } = require('../test/helper.test');
const { kinesisSample1 } = require('./sample_files/kinesis_testdata');

const {
  KinesisHttpCollector,
} = require('../src/index');

describe('KinesisHttpCollector', () => {
  const collector = new KinesisHttpCollector(lintTestEnv);

  describe('processLogsJson', () => {
    it('should process logs JSON', () => {
      const logsJson = kinesisSample1();
      collector.processLogsJson(logsJson);
      expect(logsJson).toMatchSnapshot();
    });
  });
});

