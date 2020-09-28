/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const eventBridgeSampleData = () => ({
  "version": "0",
  "id": "8908e14b-ec95-cca1-c478-57ea5929f5e8",
  "detail-type": "Athena Query State Change",
  "source": "aws.athena",
  "account": "827066587692",
  "time": "2020-09-23T07:01:44Z",
  "region": "us-east-2",
  "resources": [],
  "detail": {
      "currentState": "QUEUED",
      "queryExecutionId": "f11ed4a0-7c17-4172-a04f-56f79646dbe9",
      "sequenceNumber": "1",
      "statementType": "DDL",
      "versionId": "0",
      "workgroupName": "primary"
  }
});

module.exports = {
  eventBridgeSampleData,
};