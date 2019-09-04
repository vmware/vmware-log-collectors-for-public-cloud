/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const { lintTestEnv } = require('../test/helper.test');
const { s3SampleData } = require('./sample_files/s3_testdata');
const { s3SampleFileContent } = require('./sample_files/s3_testdata');
const { s3SampleRawLogs } = require('./sample_files/s3_testdata');

const {
  S3HttpCollector,
} = require('../src/index');

describe('S3HttpCollector', () => {
  const tagRegexMap = new Map(Object.entries({
    tag1: new RegExp('c(k+)c', 'i'),
  }));
  const collector = new S3HttpCollector(lintTestEnv, tagRegexMap);

  describe('processLogsJson', () => {
    it('should process logs JSON', () => {
      const logsJson = s3SampleData();
      collector.processLogsJson(logsJson);
      expect(logsJson)
        .toMatchSnapshot();
    });
  });

  describe('processS3Data', () => {
    it('should process JSON data', () => {
      const logsJson = s3SampleFileContent();
      const data = collector.processS3Data('test', JSON.stringify(logsJson));
      expect(data)
        .toMatchSnapshot();
    });

    it('should process PlainText data', () => {
      const rawLogs = s3SampleRawLogs();
      const data = collector.processS3Data('test', JSON.stringify(rawLogs));
      expect(data)
        .toMatchSnapshot();
    });
  });
});
