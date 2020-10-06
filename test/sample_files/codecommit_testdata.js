/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const codeCommitSampleData = () => ({
    "Records": [
        {
            "awsRegion": "us-east-2",
            "codecommit": {
                "references": [
                    {
                        "commit": "694e945e6f475db634090f35386f72b9d5279ae4",
                        "created": true,
                        "ref": "refs/heads/Test"
                    }
                ]
            },
            "customData": null,
            "eventId": "15382760-edef-487d-97d8-de1b976fca4b",
            "eventName": "ReferenceChanges",
            "eventPartNumber": 1,
            "eventSource": "aws:codecommit",
            "eventSourceARN": "arn:aws:codecommit:us-east-2:827066587692:codepipe",
            "eventTime": "2020-09-22T12:32:45.075+0000",
            "eventTotalParts": 1,
            "eventTriggerConfigId": "897e3f3f-aaec-442a-851e-e668502c46aa",
            "eventTriggerName": "codeCommitTrigger",
            "eventVersion": "1.0",
            "userIdentityARN": "arn:aws:iam::827066587692:user/sample_iam_user"
        }
    ]
});

module.exports = {
    codeCommitSampleData,
};