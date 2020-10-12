/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: 'MIT
*/

const SNSsample = () => ({
  Records: [{
    EventSource: 'aws:sns',
    EventVersion: '1.0',
    EventSubscriptionArn: 'arn:aws:sns:us-west-2:792677813823:aws-rds-vmwatm-Snapshots:2f3cf643-6854-475e-9f95-676fd3cc7bd9',
    Sns: {
      Type: 'Notification',
      MessageId: 'd51c16ad-b8e7-5bb2-b52d-437e954de8a6',
      TopicArn: 'arn:aws:sns:us-west-2:792677813823:aws-rds-vmwatm-Snapshots',
      Subject: 'RDS Notification Message',
      Message: '{"Event Source":"db-snapshot","Event Time":"2019-08-18 10:41:43.322","Identifier Link":"https://console.aws.amazon.com/rds/home?region=us-west-2#snapshot:id=rds:vmwatm-2019-08-18-10-36","Source ID":"rds:vmwatm-2019-08-18-10-36","Event ID":"http://docs.amazonwebservices.com/AmazonRDS/latest/UserGuide/USER_Events.html#RDS-EVENT-0091","Event Message":"Automated snapshot created"}',
      Timestamp: '2019-08-18T10:41:46.451Z',
      SignatureVersion: '1',
      Signature: 'WRuDAQyv4ePQy/Kvo7JY1A7tblKN6DreM17vr3m/a7eNKioDBLfCPZnyzrpZXiC61avOmPoAAfN3V8cwvJuLkjINa0MXx3XypQN5lCTxJi0CkDHnxkm4s8YdArWvTXaqIQiLm6MhN9l9c7O3x96hyA5rwGfvrs1Isz70TCHHiyiEqenQCW7O/7tZSCgg4+HxyaE0UjD6BA3ZJE1qD+kWg4nVBk65MIXnWCxDGARzgc6Jyo9ZTTV9etcU71yb1dFkg4ZrPOOFmUQJ9ktmmFG1iHaF1Ve+eGDK9/x01MVokC3YifdU/uwBaU8EhDpsHEnpFVCKY7Q/8GfKgtFfr+x1JQ==',
      SigningCertUrl: 'https://sns.us-west-2.amazonaws.com/SimpleNotificationService-6aad65c2f9911b05cd53efda11f913f9.pem',
      UnsubscribeUrl: 'https://sns.us-west-2.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-west-2:792677813823:aws-rds-vmwatm-Snapshots:2f3cf643-6854-475e-9f95-676fd3cc7bd9',
      MessageAttributes: '{}',
    },
  },
  {
    EventVersion: '1.0',
    EventSubscriptionArn: 'arn:aws:sns:us-east-2:123456789012:sns-lambda:21be56ed-a058-49f5-8c98-aedd2564c486',
    EventSource: 'aws:sns',
    Sns: {
    SignatureVersion: '1',
      Timestamp: '2019-01-02T12:45:07.000Z',
      Signature: 'tcc6faL2yUC6dgZdmrwh1Y4cGa/ebXEkAi6RibDsvpi+tE/1+82j...65r==',
      SigningCertUrl: 'https://sns.us-east-2.amazonaws.com/SimpleNotificationService-ac565b8b1a6c5d002d285f9598aa1d9b.pem',
      MessageId: '95df01b4-ee98-5cb9-9903-4c221d41eb5e',
      Message: 'Hello from SNS!',
      MessageAttributes: {
      Test: {
        Type: 'String',
        Value: 'TestString',
      },
      TestBinary: {
        Type: 'Binary',
        Value: 'TestBinary',
      }
    },
    Type: 'Notification',
      UnsubscribeUrl: 'https://sns.us-east-2.amazonaws.com/?Action=Unsubscribe&amp;SubscriptionArn=arn:aws:sns:us-east-2:123456789012:test-lambda:21be56ed-a058-49f5-8c98-aedd2564c486',
      TopicArn: 'arn:aws:sns:us-east-2:123456789012:sns-lambda',
      Subject: 'TestInvoke',
  }
  },
  ]
});

module.exports = {
  SNSsample,
};
