/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/
const { lintTestEnv } = require('./helper.test');
const { mskSampleData } = require('./sample_files/msk_testdata');

const {
  MSKHttpCollector,
} = require('../src/index');


describe('MSKHttpCollector', () => {
  const collector = new MSKHttpCollector(lintTestEnv);

  describe('processLogsJson', () => {
    it('should process logs JSON', () => {
      const logsJson = mskSampleData();
      collector.processLogsJson(logsJson);
      expect(logsJson).toMatchSnapshot();
    });
  });
});

