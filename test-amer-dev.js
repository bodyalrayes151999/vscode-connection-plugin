// Direct test of Amer-DEV connection with VPN
const https = require('https');
const http = require('http');

// Amer-DEV details from XML
const config = {
    name: 'Amer - DEV',
    host: '172.20.1.8',
    port: 3210,  // From server="172.20.1.8:3210"
    client: '500',
    systemId: 'ECD',
    username: 'CIC.ELRAYES',
    password: 'A@123456',
    secure: false  // Try HTTP first (port 3210 is typically HTTP)
};

console.log('='.repeat(80));
console.log('Amer-DEV Direct Connection Test (VPN)');
console.log('='.repeat(80));
console.log('Host:', config.host);
console.log('Port:', config.port);
console.log('Client:', config.client);
console.log('System ID:', config.systemId);
console.log('Protocol:', config.secure ? 'HTTPS' : 'HTTP');
console.log('='.repeat(80));

function testConnection() {
    const protocol = config.secure ? https : http;
    
    const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    
    const options = {
        hostname: config.host,
        port: config.port,
        path: '/sap/bc/ping',
        method: 'GET',
        rejectUnauthorized: false,
        timeout: 30000,
        headers: {
            'Authorization': `Basic ${auth}`
        }
    };

    console.log('\nTesting connection...');
    console.log(`URL: ${config.secure ? 'https' : 'http'}://${config.host}:${config.port}/sap/bc/ping\n`);

    const startTime = Date.now();

    const req = protocol.request(options, (res) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(`\n✅ Response received in ${elapsed}s`);
        console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
        console.log('Headers:', res.headers);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('\n' + '='.repeat(80));
            
            if (res.statusCode === 200) {
                console.log('✅ SUCCESS! Connection works!');
            } else if (res.statusCode === 401) {
                console.log('⚠️  401 Unauthorized - Check credentials');
            } else if (res.statusCode === 403) {
                console.log('⚠️  403 Forbidden - Authentication issue');
            } else {
                console.log(`ℹ️  Status: ${res.statusCode}`);
            }
            
            console.log('='.repeat(80));
            
            if (data && data.length < 500) {
                console.log('\nResponse Body:');
                console.log(data);
            }
            
            // If HTTP failed, try HTTPS
            if (res.statusCode >= 400 && !config.secure) {
                console.log('\n\nHTTP failed, trying HTTPS on port 3310...\n');
                testHttps();
            }
        });
    });

    req.on('error', (error) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n❌ Connection failed after ${elapsed}s`);
        console.log(`Error: ${error.message}`);
        console.log(`Code: ${error.code}`);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\nPort might be wrong. Trying HTTPS on 3310...\n');
            testHttps();
        } else if (error.code === 'ETIMEDOUT') {
            console.log('\nPossible issues:');
            console.log('  - VPN not connected');
            console.log('  - Firewall blocking connection');
            console.log('  - SAP server is down');
        }
    });

    req.on('timeout', () => {
        console.log('\n❌ Timeout after 30 seconds');
        req.destroy();
    });

    req.end();
}

function testHttps() {
    const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    
    const options = {
        hostname: config.host,
        port: 3310,  // HTTPS port for instance 10
        path: '/sap/bc/ping',
        method: 'GET',
        rejectUnauthorized: false,
        timeout: 30000,
        headers: {
            'Authorization': `Basic ${auth}`
        }
    };

    console.log(`Testing HTTPS: https://${config.host}:3310/sap/bc/ping\n`);

    const req = https.request(options, (res) => {
        console.log(`\n✅ HTTPS Response: ${res.statusCode}`);
        
        if (res.statusCode === 200 || res.statusCode === 401) {
            console.log('✅ HTTPS works! Use port 3310 with secure: true');
        }
    });

    req.on('error', (error) => {
        console.log(`❌ HTTPS also failed: ${error.message}`);
    });

    req.end();
}

// Start test
testConnection();
