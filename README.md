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
In the AWS Web Console, configure an environment variable for the Lambda function. The key of the environment variable should be 'LogIntelligence_API_Token'. The value of the environment variable should be a valid VMware Log Intelligence API token.

#### 1. CloudWatch Logs
In AWS Web Console, add a 'CloudWatch Logs' trigger for the Lambda function. In the configurations of the trigger, specify the CloudWatch log group whose logs you want to collect and send to VMware Log Intelligence. You can add more 'CloudWatch Logs' triggers if you want to send logs of multiple log groups through the Lambda function to VMware Log Intelligence.

#### 2. CloudTrail Logs
If you want to collect CloudTrail logs, then you need to configure CloudTrail to send logs to an S3 bucket. Then in the AWS Web Console, add an 'S3' trigger for the Lambda function. In the configurations of the trigger, specify the S3 bucket to which the CloudTrail logs are sent. Once the trigger is configured and enabled, whenever logs go from CloudTrail to the S3 bucket, the Lambda function will be invoked and the logs will be sent to VMware Log Intelligence. You can refer to https://docs.aws.amazon.com/lambda/latest/dg/with-cloudtrail.html for more details.

#### 3. DynamoDB data
We can use a AWS Lambda function to process records in a Amazon DynamoDB Streams stream. With DynamoDB Streams, you can trigger a Lambda function to perform additional work each time a DynamoDB table is updated.
Lambda reads records from the stream and invokes your function synchronously with an event that contains stream records. Lambda reads records in batches and invokes your function to process records from the batch.
https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html This page explains the 
complete process on how to add trigger dynamoDB to lambda and adding appropriate 
execution roles to access dynamoDB.

#### 4. SQS data
We can use a AWS Lambda function to process data which is pushed to Amazon SQS. With Amazon SQS, you can offload tasks from one component of your application by sending them to a queue and processing them asynchronously.
Lambda polls the queue and invokes your function synchronously with an event that contains queue messages. Lambda reads messages in batches and invokes your function once for each batch. When your function successfully processes a batch, Lambda deletes its messages from the queue.
https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html This link helps in setting up SQS queue
and adding it as a trigger to our lambda function.

#### 5. Kinesis data
First you need to have kinesis stream created in AWS. From the stream created a producer should be registered which pushes the data to kinesis stream. You can build producers for Kinesis Data Streams using the AWS SDK for Java and the Kinesis Producer Library. 
Define specific roles for the kinesis stream to fetch the necessary data. Once the stream is ready we 
can you see this to add trigger to our lambda function. From creating streams to creating producers and pushing data to stream is described here https://docs.aws.amazon.com/streams/latest/dev/introduction.html.

## Contributing

The vmware-log-collectors-for-aws project team welcomes contributions from the community. Before you start working with vmware-log-collectors-for-aws, please read our [Developer Certificate of Origin](https://cla.vmware.com/dco). All contributions to this repository must be signed as described on that page. Your signature certifies that you wrote the patch or have the right to pass it on as an open-source patch. For more detailed information, refer to [CONTRIBUTING.md](CONTRIBUTING.md).

## License
Please see [LICENSE.txt](LICENSE.txt).
