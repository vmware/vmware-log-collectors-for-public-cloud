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
  },
  {
    time: '17/May/2015:08:05:24 +0000',
    remote_ip: '80.91.33.133',
    remote_user: '-',
    request: 'GET /downloads/product_1 HTTP/1.1',
    response: 304,
    bytes: 0,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (0.8.16~exp12ubuntu10.17)',
  },
  {
    time: '17/May/2015:08:05:34 +0000',
    remote_ip: '217.168.17.5',
    remote_user: '-',
    request: 'GET /downloads/product_1 HTTP/1.1',
    response: 200,
    bytes: 490,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (0.8.10.3)',
  },
  {
    time: '17/May/2015:08:05:09 +0000',
    remote_ip: '217.168.17.5',
    remote_user: '-',
    request: 'GET /downloads/product_2 HTTP/1.1',
    response: 200,
    bytes: 490,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (0.8.10.3)',
  },
  {
    time: '17/May/2015:08:05:57 +0000',
    remote_ip: '93.180.71.3',
    remote_user: '-',
    request: 'GET /downloads/product_1 HTTP/1.1',
    response: 304,
    bytes: 0,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (0.8.16~exp12ubuntu10.21)',
  },
  {
    time: '17/May/2015:08:05:02 +0000',
    remote_ip: '217.168.17.5',
    remote_user: '-',
    request: 'GET /downloads/product_2 HTTP/1.1',
    response: 404,
    bytes: 337,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (0.8.10.3)',
  },
  {
    time: '17/May/2015:08:05:42 +0000',
    remote_ip: '217.168.17.5',
    remote_user: '-',
    request: 'GET /downloads/product_1 HTTP/1.1',
    response: 404,
    bytes: 332,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (0.8.10.3)',
  },
  {
    time: '17/May/2015:08:05:01 +0000',
    remote_ip: '80.91.33.133',
    remote_user: '-',
    request: 'GET /downloads/product_1 HTTP/1.1',
    response: 304,
    bytes: 0,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (0.8.16~exp12ubuntu10.17)',
  },
  {
    time: '17/May/2015:08:05:27 +0000',
    remote_ip: '93.180.71.3',
    remote_user: '-',
    request: 'GET /downloads/product_1 HTTP/1.1',
    response: 304,
    bytes: 0,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (0.8.16~exp12ubuntu10.21)',
  },
  {
    time: '17/May/2015:08:05:12 +0000',
    remote_ip: '217.168.17.5',
    remote_user: '-',
    request: 'GET /downloads/product_2 HTTP/1.1',
    response: 200,
    bytes: 3316,
    referrer: '-',
    agent: '-',
  },
  {
    time: '17/May/2015:08:05:49 +0000',
    remote_ip: '188.138.60.101',
    remote_user: '-',
    request: 'GET /downloads/product_2 HTTP/1.1',
    response: 304,
    bytes: 0,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (0.9.7.9)',
  },
  {
    time: '17/May/2015:08:05:14 +0000',
    remote_ip: '80.91.33.133',
    remote_user: '-',
    request: 'GET /downloads/product_1 HTTP/1.1',
    response: 304,
    bytes: 0,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (0.8.16~exp12ubuntu10.16)',
  },
  {
    time: '17/May/2015:08:05:45 +0000',
    remote_ip: '46.4.66.76',
    remote_user: '-',
    request: 'GET /downloads/product_1 HTTP/1.1',
    response: 404,
    bytes: 318,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (1.0.1ubuntu2)',
  },
  {
    time: '17/May/2015:08:05:26 +0000',
    remote_ip: '93.180.71.3',
    remote_user: '-',
    request: 'GET /downloads/product_1 HTTP/1.1',
    response: 404,
    bytes: 324,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (0.8.16~exp12ubuntu10.21)',
  },
  {
    time: '17/May/2015:08:05:22 +0000',
    remote_ip: '91.234.194.89',
    remote_user: '-',
    request: 'GET /downloads/product_2 HTTP/1.1',
    response: 304,
    bytes: 0,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (0.9.7.9)',
  },
  {
    time: '17/May/2015:08:05:07 +0000',
    remote_ip: '80.91.33.133',
    remote_user: '-',
    request: 'GET /downloads/product_1 HTTP/1.1',
    response: 304,
    bytes: 0,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (0.8.16~exp12ubuntu10.17)',
  },
  {
    time: '17/May/2015:08:05:38 +0000',
    remote_ip: '37.26.93.214',
    remote_user: '-',
    request: 'GET /downloads/product_2 HTTP/1.1',
    response: 404,
    bytes: 319,
    referrer: '-',
    agent: 'Go 1.1 package http',
  },
  {
    time: '17/May/2015:08:05:25 +0000',
    remote_ip: '188.138.60.101',
    remote_user: '-',
    request: 'GET /downloads/product_2 HTTP/1.1',
    response: 304,
    bytes: 0,
    referrer: '-',
    agent: 'Debian APT-HTTP/1.3 (0.9.7.9)',
  }]
);

module.exports = {
  s3SampleData,
  s3SampleFileContent,
};
