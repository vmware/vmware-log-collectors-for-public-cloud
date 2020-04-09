const nock = require('nock');
const { sendLogs } = require('../src/index');

Date.now = jest.fn(() => 1538769915817);

const {
  gzipLogs,
  LIntHttpEnv,
} = require('../src/lint');

const lintTestEnv = new LIntHttpEnv(
  'Bearer mocktoken',
  'https://data.mock.symphony.com/le-mans/v1/streams/ingestion-pipeline-stream',
);

const sendLogsAndVerify = (done, collector, logsJson, expectedReqBody, expectedReqHeaders) => {
  nock('https://data.mock.symphony.com', expectedReqHeaders)
    .post(
      '/le-mans/v1/streams/ingestion-pipeline-stream',
      JSON.stringify(expectedReqBody),
    )
    .reply(200);

  gzipLogs(logsJson)
    .then(zippedData => sendLogs(zippedData, collector))
    .then(() => done())
    .catch(error => done.fail(error));
};

module.exports = {
  lintTestEnv,
  sendLogsAndVerify,
};
