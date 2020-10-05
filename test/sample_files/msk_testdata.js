/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const mskSampleData = () => ({
    "eventSource": "aws:kafka",
    "eventSourceArn": "arn:aws:kafka:us-east-2:827066587692:cluster/MyCluster/1cbf212b-3937-4536-a3b0-c09868d7e5f5-4",
    "records": {
        "mytopic-0": [
            {
                "topic": "mytopic",
                "partition": 0,
                "offset": 6,
                "timestamp": 1601289409497,
                "timestampType": "CREATE_TIME",
                "value": "TWVzc2FnZSAjNw=="
            }
        ]
    }
});

module.exports = {
    mskSampleData,
};