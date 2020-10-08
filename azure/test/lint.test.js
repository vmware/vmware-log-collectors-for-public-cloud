/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

const nock = require('nock');

const {
  sendHttpRequest,
  flattenJson,
} = require('../src/lint');

describe('flattenJson', () => {
  it('should flatten arrays in JSON', () => {
    const exampleJson = ['a', 'b', 'c'];
    const result = flattenJson(exampleJson);
    expect(result).toMatchSnapshot();
  });

  it('should work when there is nothing to flatten', () => {
    const exampleJson = {
      field1: 'value1',
      field2: 'value2',
    };
    const result = flattenJson(exampleJson);
    expect(result).toMatchSnapshot();
  });

  it('should flatten nested arrays and objects', () => {
    const exampleJson = {
      field1: { field11: 'value11', field12: 'value12' },
      field2: 'value2',
      field3: 3,
      field4: { field41: ['a', 'b', 'c'] },
    };
    const result = flattenJson(exampleJson);
    expect(result).toMatchSnapshot();
  });
});

describe('sendHttpRequest', () => {
  it('should be able to send a request', (done) => {
    nock('https://test.com')
      .get('/test')
      .reply(200);

    const options = {
      hostname: 'test.com',
      path: '/test',
      method: 'GET',
    };

    sendHttpRequest(options, null)
      .then(
        () => done(),
        error => done.fail(error),
      );
  });
});
