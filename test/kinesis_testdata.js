/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const kinesisSample1 = () => ({
  Records: [
    {
      kinesis: {
        kinesisSchemaVersion: '1.0',
        partitionKey: '1',
        sequenceNumber: '49590338271490256608559692538361571095921575989136588898',
        data: 'ewkic2Vuc29ySWQiOiA0MCwJImN1cnJlbnRUZW1wZXJhdHVyZSI6IDc2LAkic3RhdHVzIjogIk9LIn0K',
        approximateArrivalTimestamp: 1545084650.987,
      },
      eventSource: 'aws:kinesis',
      eventVersion: '1.0',
      eventID: 'shardId-000000000006:49590338271490256608559692538361571095921575989136588898',
      eventName: 'aws:kinesis:record',
      invokeIdentityArn: 'arn:aws:iam::123456789012:role/lambda-kinesis-role',
      awsRegion: 'us-east-2',
      eventSourceARN: 'arn:aws:kinesis:us-east-2:123456789012:stream/lambda-stream',
    },
    {
      kinesis: {
        kinesisSchemaVersion: '2.0',
        partitionKey: '2',
        sequenceNumber: '49590338271490256608559692538361571095921575989136588898',
        data: 'aGVsbG8gd29ybGQ=',
        approximateArrivalTimestamp: 1545084650.987,
      },
      eventSource: 'aws:kinesis',
      eventVersion: '1.0',
      eventID: 'shardId-000000000006:49590338271490256608559692538361571095921575989136588898',
      eventName: 'aws:kinesis:record',
      invokeIdentityArn: 'arn:aws:iam::123456789012:role/lambda-kinesis-role',
      awsRegion: 'us-east-2',
      eventSourceARN: 'arn:aws:kinesis:us-east-2:123456789012:stream/lambda-stream',
    },
    {
      kinesis: {
        kinesisSchemaVersion: '3.0',
        partitionKey: '3',
        sequenceNumber: '49590338271490256608559692538361571095921575989136588898',
        data: 'ewoJImxvZyI6ICIyMDE0LzA5LzI1IDIxOjE1OjAzIEkgYW0gc2FtcGxlIGxvZyBtZXNzYWdlXG4iLAoJInN0cmVhbSI6ICJzdGRlcnIiLAoJInRpbWUiOiAiMjAxOOKAkzA54oCTMTJUMTA6MjU6NDEuNDk5MTg1MDI2WiIsCgkia3ViZXJuZXRlcyI6IHsKCQkibmFtZXNwYWNlX25hbWUiOiAiZGVmYXVsdCIsCgkJInBvZF9uYW1lIjogInVzZXItc2VydmljZS0wZDI1YmFmIiwKCQkiY29udGFpbmVyX25hbWUiOiAidXNlci1zZXJ2aWNlIgoJfSwKCSJkb2NrZXIiOiB7CgkJImNvbnRhaW5lcl9pZCI6ICI0NjY3YWE4ZTM2ZmY4YzllZDlkMjhhMjI3ZTkzYTY3MThlYjY0OThlYWQ1ODA3ZDRjNGQ1MTUzMzgwNDFiYWVlIgoJfQp9',
        approximateArrivalTimestamp: 1545084650.987,
      },
      eventSource: 'aws:kinesis',
      eventVersion: '1.0',
      eventID: 'shardId-000000000006:49590338271490256608559692538361571095921575989136588898',
      eventName: 'aws:kinesis:record',
      invokeIdentityArn: 'arn:aws:iam::123456789012:role/lambda-kinesis-role',
      awsRegion: 'us-east-2',
      eventSourceARN: 'arn:aws:kinesis:us-east-2:123456789012:stream/lambda-stream',
    },
  ],
});

module.exports = {
  kinesisSample1,
};
