/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

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

const createSample2 = () => ({
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
      message: '{"field1": "unittest8", "field2": "unittest8"}',
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

const kubernetesLogSample = () => ({
  messageType: 'DATA_MESSAGE',
  owner: '792677813823',
  logGroup: '/aws/lambda/runbook',
  logStream: 'unittest8',
  logEvents: [
    {
      id: '34051922485820161636472577410016310394916410432944603138',
      message: '{\n' +
        '    "log": "INFO: 2017/10/02 06:44:13.214543 Discovered remote MAC 62:a1:3d:f6:eb:65 at 62:a1:3d:f6:eb:65(kube-235)\\n",\n' +
        '    "stream": "stderr",\n' +
        '    "docker": {\n' +
        '        "container_id": "5b15e87886a7ca5f7ebc73a15aa9091c9c0f880ee2974515749e16710367462c"\n' +
        '    },\n' +
        '    "kubernetes": {\n' +
        '        "container_name": "weave",\n' +
        '        "namespace_name": "kube-system",\n' +
        '        "pod_name": "weave-net-4n4kc",\n' +
        '        "pod_id": "ac4bdfc1-9dc0-11e7-8b62-005056b549b6",\n' +
        '        "labels": {"controller-revision-hash": "2720543195","name": "weave-net","pod-template-generation": "1"},\n' +
        '        "host": "kube-234",\n' +
        '        "master_url": "https://10.96.0.1:443/api"\n' +
        '    }\n' +
        '}',
    },
  ],
});

module.exports = {
  createSample1,
  createSample2,
  kubernetesLogSample,
};
