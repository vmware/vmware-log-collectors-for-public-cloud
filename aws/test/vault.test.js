const nock = require('nock');
const { readVaultData } = require('../src/vault');
const { vaultObject } = require('./sample_files/vault_testdata');

const options = {
    hostname: 'vault.com',
    port: 8200,
    path: '/v1/secret/data/vrlic_secret',
    method: 'GET',
};

describe('readVaultData', () => {
    it('should be able to read secret from vault', () => {
        nock('http://vault.com:8200')
            .get('/v1/secret/data/vrlic_secret')
            .reply(200, vaultObject);
        readVaultData(options)
            .then(res => {
                expect(res).toEqual('vrlictoken')
            });
    });
});