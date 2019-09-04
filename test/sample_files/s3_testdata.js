/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const s3SampleData = () => ({
  Records: [
    {
      eventVersion: '2.0',
      eventSource: 'aws:s3',
      awsRegion: 'us-west-2',
      eventTime: '1970-01-01T00:00:00.000Z',
      eventName: 'ObjectCreated:Put',
      userIdentity: {
        principalId: 'AIDAJDPLRKLG7UEXAMPLE'
      },
      requestParameters: {
        sourceIPAddress: '127.0.0.1'
      },
      responseElements: {
        xamzrequestid: 'C3D13FE58DE4C810',
        xamzid2: 'FMyUVURIY8/IgAtTv8xRjskZQpcIZ9KG4V5Wp6S7S/JRWeUWerMUE5JgHvANOjpD'
      },
      s3: {
        s3SchemaVersion: '1.0',
        configurationId: 'testConfigRule',
        bucket: {
          name: 'sourcebucket',
          ownerIdentity: {
            principalId: 'A3NL1KOZZKExample'
          },
          arn: 'arn:aws:s3:::sourcebucket'
        },
        object: {
          key: 'HappyFace.jpg',
          size: 1024,
          eTag: 'd41d8cd98f00b204e9800998ecf8427e',
          versionId: '096fKKXTRTtl3on89fVO.nfljtsv6qko'
        },
      },
    },
  ],
});

const s3SampleFileContent = () => (
  [{
    time: '17/May/2015:08:05:32 +0000',
    remote_ip: '93.180.71.3',
    remote_user: '-',
    request: 'GET /downloads/product_1 HTTP/1.1',
    response: 304,
    bytes: 0,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (0.8.16~exp12ubuntu10.21)',
  },
  {
    time: '17/May/2015:08:05:23 +0000',
    remote_ip: '93.180.71.3',
    remote_user: '-',
    request: 'GET /downloads/product_1 HTTP/1.1',
    response: 304,
    bytes: 0,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (0.8.16~exp12ubuntu10.21)',
  }]
);

const s3SampleRawLogs = () => (['83.149.9.216 - - [17/May/2015:10:05:03 +0000] "GET /presentations/logstash-monitorama-2013/images/kibana-search.png ' +
  'HTTP/1.1" 200 203023 "http://semicomplete.com/presentations/logstash-monitorama-2013/" ' +
  '"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.77 Safari/537.36"',
'83.149.9.216 - - [17/May/2015:10:05:43 +0000] "GET /presentations/logstash-monitorama-2013/images/kibana-dashboard3.png ' +
  'HTTP/1.1" 200 171717 "http://semicomplete.com/presentations/logstash-monitorama-2013/" ' +
  '"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.77 Safari/537.36"']
);

module.exports = {
  s3SampleData,
  s3SampleFileContent,
  s3SampleRawLogs,
};