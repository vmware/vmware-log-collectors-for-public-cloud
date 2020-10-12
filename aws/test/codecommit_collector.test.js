/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/
const { lintTestEnv } = require('./helper.test');
const { codeCommitSampleData } = require('./sample_files/codecommit_testdata');

const {
  CodeCommitHttpCollector,
} = require('../src/index');


describe('CodeCommitHttpCollector', () => {
  const collector = new CodeCommitHttpCollector(lintTestEnv);

  describe('processLogsJson', () => {
    it('should process logs JSON', () => {
      const logsJson = codeCommitSampleData();
      collector.processLogsJson(logsJson);
      expect(logsJson).toMatchSnapshot();
    });
  });
});

