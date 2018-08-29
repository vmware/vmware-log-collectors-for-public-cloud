const { LIntHttpEnv, LIntKafkaEnv } = require('./lint');

const lintTestEnv = new LIntHttpEnv(
  'Bearer mocktoken',
  'https://data.mock.symphony.com/le-mans/v1/streams/ingestion-pipeline-stream',
);

module.exports = {
  lintTestEnv,
};
