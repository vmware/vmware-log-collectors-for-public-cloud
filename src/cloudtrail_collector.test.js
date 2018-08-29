const lintEnv = require('./lint_env').lintTestEnv;
const { createSample1 } = require('./cloudtrail_testdata');
const { gzipLogs } = require('./lint');
const nock = require('nock');

const {
  sendLogs,
  CloudTrailHttpCollector,
  CloudTrailKafkaCollector,
} = require('./index');

describe('CloudTrailKafkaCollector', () => {
  const collector = new CloudTrailKafkaCollector(lintEnv);

  it('processLogsJson', () => {
    const logsJson = createSample1();
    collector.processLogsJson(logsJson);
    expect(logsJson.Records).toBe(undefined);
    expect(logsJson).toMatchSnapshot();
  });
});

describe('CloudTrailHttpCollector', () => {
  const collector = new CloudTrailHttpCollector(lintEnv);

  describe('processLogsJson', () => {
    it('should process logs JSON', () => {
      const logsJson = createSample1();
      collector.processLogsJson(logsJson);
      expect(logsJson).toMatchSnapshot();
    });
  });

  describe('sendLogs', () => {
    const sendData = (done) => {
      nock('https://data.mock.symphony.com')
        .post('/le-mans/v1/streams/ingestion-pipeline-stream')
        .reply(200, { message: 'ok' });

      const logsJson = createSample1();
      gzipLogs(logsJson)
        .then(zippedData => sendLogs(zippedData, collector))
        .then(() => done())
        .catch(error => done.fail(error));
    };

    it('should send request to the HTTP stream', (done) => {
      sendData(done);
    }, 10000);

    // it('should send request to the Kafka stream', (done) => {
    //   sendData(false, done);
    // }, 40000);
  });
});
