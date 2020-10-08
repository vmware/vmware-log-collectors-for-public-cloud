/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/
const nock = require('nock');
const { lintTestEnv } = require('./helper.test');
const { eventBridgeSampleData } = require('./sample_files/eventbridge_testdata');

const {
  EventBridgeHttpCollector,
} = require('../src/index');


describe('EventBridgeHttpCollector', () => {
  const collector = new EventBridgeHttpCollector(lintTestEnv);

  describe('processLogsJson', () => {
    it('should process logs JSON', () => {
      const logsJson = eventBridgeSampleData();
      collector.processLogsJson(logsJson);
      expect(logsJson).toMatchSnapshot();
    });
  });
});

