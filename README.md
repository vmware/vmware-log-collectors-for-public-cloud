# vmware-log-collectors-for-aws

## Overview
The project provides an AWS Lambda function for collecting CloudWatch and CloudTrail logs
and sending the logs to VMware Log Intelligence.

## Try it out
To try out the project, you need to do two things:
1. Deploy the code of this project as a Lambda function in your AWS environment.
2. Configure the Lambda function to collect CloudWatch or CloudTrail logs or both.

The following sections describe each of the above two steps in detail.

### Deploy the Lambda function
1. In the AWS Web Console, create a new Lambda function in AWS.
2. Select Node.js 8.10 as the runtime. Set the 'Handler' field to 'index.handler'. Set the timeout of the Lambda function to 40 seconds.
3. In the AWS Web Console, create two code files lint.js and index.js for the Lambda function.
4. Copy the code in lint.js and paste it into the lint.js code file of the Lambda function.
5. Copy the code in index.js and paste it into the index.js code file of the Lambda function.

### Configure the Lambda function
1. In the AWS Web Console, configure an environment variable for the Lambda function. The key of the environment variable should be 'LogIntelligence_API_Token'. The value of the environment variable should be a valid VMware Log Intelligence API token.
2. If you want to collect CloudWatch logs, then in the AWS Web Console, add a 'CloudWatch Logs' trigger for the Lambda function. In the configurations of the trigger, specify the CloudWatch log group whose logs you want to collect and send to VMware Log Intelligence. You can add more 'CloudWatch Logs' triggers if you want to send logs of multiple log groups through the Lambda function to VMware Log Intelligence.
3. If you want to collect CloudTrail logs, then you need to configure CloudTrail to send logs to an S3 bucket. Then in the AWS Web Console, add an 'S3' trigger for the Lambda function. In the configurations of the trigger, specify the S3 bucket to which the CloudTrail logs are sent. Once the trigger is configured and enabled, whenever logs go from CloudTrail to the S3 bucket, the Lambda function will be invoked and the logs will be sent to VMware Log Intelligence. You can refer to https://docs.aws.amazon.com/lambda/latest/dg/with-cloudtrail.html for more details.

## Contributing

The vmware-log-collectors-for-aws project team welcomes contributions from the community. If you wish to contribute code and you have not
signed our contributor license agreement (CLA), our bot will update the issue when you open a Pull Request. For any
questions about the CLA process, please refer to our [FAQ](https://cla.vmware.com/faq). For more detailed information,
refer to [CONTRIBUTING.md](CONTRIBUTING.md).

## License
Please see [LICENSE.txt](LICENSE.txt).
