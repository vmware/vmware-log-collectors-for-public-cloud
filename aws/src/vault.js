const http = require('http');

const readVaultData = (options) => new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
        const body = [];
        res.on('data', chunk => body.push(chunk));
        res.on('end', () => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                reject(new Error(`statusCode: ${res.statusCode}, response: ${Buffer.concat(body).toString()}`));
            } else {
                resolve(JSON.parse(Buffer.concat(body).toString()).data.data.VRLIC_API_Token);
            }
        });
    });
    req.on('error', error => reject(error));
    req.end();
});

module.exports = {
    readVaultData
};