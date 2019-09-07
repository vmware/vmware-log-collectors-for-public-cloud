/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const createSample1 = () => ({
  Records: [
    {
      eventVersion: '1.05',
      userIdentity: {
        type: 'IAMUser',
        principalId: 'AIDAIRUNBBKT2UKVMBDMM',
        arn: 'arn:aws:iam::792677813823:user/flands',
        accountId: '792677813823',
        accessKeyId: 'AKIAJDNI5LT67QRAUMIQ',
        userName: 'flands',
      },
      eventTime: '2018-06-14T17:17:56Z',
      eventSource: 'ec2.amazonaws.com',
      eventName: 'DescribeSubnets',
      awsRegion: 'ca-central-1',
      sourceIPAddress: '13.56.178.189',
      userAgent: 'aws-sdk-java/1.11.170 Linux/4.4.121-k8s Java_HotSpot(TM)_64-Bit_Server_VM/25.162-b31/1.8.0_162 scala/2.11.8',
      requestParameters: {
        subnetSet: {},
        filterSet: {
          items: [
            {
              name: 'vpc-id',
              valueSet: {
                items: [
                  {
                    value: 'vpc-04e3326d',
                  },
                ],
              },
            },
          ],
        },
      },
      responseElements: null,
      requestID: '03c4406b-42dc-4172-8beb-d76e15b9d69f',
      eventID: 'c9931287-acd4-478f-aa24-f77c8d297f71',
      eventType: 'AwsApiCall',
      recipientAccountId: 'unittest9',
    },
    { // This record misses the userIdentity field.
      eventVersion: '1.05',
      eventTime: '2018-06-14T17:17:56Z',
      eventSource: 'ec2.amazonaws.com',
      eventName: 'DescribeSubnets',
      awsRegion: 'ca-central-1',
      sourceIPAddress: '13.56.178.189',
      userAgent: 'aws-sdk-java/1.11.170 Linux/4.4.121-k8s Java_HotSpot(TM)_64-Bit_Server_VM/25.162-b31/1.8.0_162 scala/2.11.8',
      requestParameters: {
        availabilityZoneSet: {},
      },
      responseElements: null,
      requestID: '03c4406b-42dc-4172-8beb-d76e15b9d69f',
      eventID: 'c9931287-acd4-478f-aa24-f77c8d297f71',
      eventType: 'AwsApiCall',
      recipientAccountId: 'unittest9',
    },
    {
      eventVersion: '1.05',
      userIdentity: {
        type: 'IAMUser',
        principalId: 'AIDAIRUNBBKT2UKVMBDMM',
        arn: 'arn:aws:iam::792677813823:user/flands',
        accountId: '792677813823',
        accessKeyId: 'AKIAJDNI5LT67QRAUMIQ',
        userName: 'flands',
        sessionContext: {
          attributes: {
            mfaAuthenticated: 'false',
            creationDate: '20131102T010628Z'
          },
          sessionIssuer: {
            type: 'Role',
            principalId: 'AROAIDPPEZS35WEXAMPLE',
            arn: 'arn:aws:iam::123456789012:role/RoleToBeAssumed',
            accountId: '123456789012',
            userName: 'RoleToBeAssumed'
          }
        }
      },
      eventTime: '2018-06-14T17:17:56Z',
      eventSource: 'ec2.amazonaws.com',
      eventName: 'DescribeSubnets',
      awsRegion: 'ca-central-1',
      sourceIPAddress: '13.56.178.189',
      userAgent: 'aws-sdk-java/1.11.170 Linux/4.4.121-k8s Java_HotSpot(TM)_64-Bit_Server_VM/25.162-b31/1.8.0_162 scala/2.11.8',
      requestParameters: {
        host: [
          's3.us-west-2.amazonaws.com'
        ],
        bucketName: 'myawsbucket',
        versioning: [
          ''
        ]
      },
      responseElements: null,
      requestID: '03c4406b-42dc-4172-8beb-d76e15b9d69f',
      eventID: 'c9931287-acd4-478f-aa24-f77c8d297f71',
      eventType: 'AwsApiCall',
      recipientAccountId: 'unittest9',
    },
  ],
});

module.exports = {
  createSample1,
};
