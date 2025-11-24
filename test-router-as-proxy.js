// Test SAP Router as HTTP proxy
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');

const config = {
    routerHost: '54.75.63.76',
    routerPort: 3299,
    targetHost: '172.20.1.8',
    targetPort: 3210,
    username: 'CIC.ELRAYES',
    password: 'A@123456'
};

console.log('Testing SAP Router as HTTP CONNECT Proxy...\n');
console.log(`Proxy: http://${config.routerHost}:${config.routerPort}`);
console.log(`Target: http://${config.targetHost}:${config.targetPort}/sap/bc/ping\n`);

const proxyUrl = `http://${config.routerHost}:${config.routerPort}`;
const agent = new HttpsProxyAgent(proxyUrl);

const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');

const options = {
    hostname: config.targetHost,
    port: config.targetPort,
    path: '/sap/bc/ping',
    method: 'GET',
    agent: agent,
    headers: {
        'Authorization': `Basic ${auth}`
    },
    timeout: 30000
};

console.log('Sending request through proxy...\n');

const req = https.request(options, (res) => {
    console.log(`✅ Response received!`);
    console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('\nResponse body:', data.substring(0, 200));
        
        if (res.statusCode === 200 || res.statusCode === 401) {
            console.log('\n✅ SUCCESS! SAP Router works as HTTP proxy!');
        }
    });
});

req.on('error', (error) => {
    console.log(`\n❌ Error: ${error.message}`);
    console.log(`Code: ${error.code}`);
});

req.on('timeout', () => {
    console.log('\n❌ Timeout');
    req.destroy();
});

req.end();
