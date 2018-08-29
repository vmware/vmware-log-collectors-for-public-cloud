const createSample1 = () => ({
  messageType: 'DATA_MESSAGE',
  owner: '792677813823',
  logGroup: '/aws/lambda/runbook',
  logStream: 'unittest8',
  logEvents: [
    {
      id: '34051922485820161636472577410016310394916410432944603138',
      message: '2018-05-21T22:16:53.934Z\taab15e49-5d44-11e8-a7db-afa704cec35a\tStatus: 200\n',
    },
    {
      id: '001',
      message: 'message of 001',
      text: 'text of 001',
    },
    {
      id: '34051922485820161636472577410016310394916410432944603138',
      message: [
        {
          fielda: 'fielda',
        },
      ],
    },
  ],
});

module.exports = {
  createSample1,
};
