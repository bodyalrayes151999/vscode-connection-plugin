// Test SAP connection with actual system details
const https = require('https');
const http = require('http');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// System details from SAP GUI
const systemConfig = {
    description: 'Amer - DEV',
    host: '172.20.1.8',
    instanceNumber: '10',
    systemId: 'ECD',
    saprouter: '/H/54.75.63.76',
    secure: true  // Try HTTPS first
};

// Calculate port from instance number
const port = systemConfig.secure ? 
    (3300 + parseInt(systemConfig.instanceNumber)) : 
    (3200 + parseInt(systemConfig.instanceNumber));

console.log('='.repeat(80));
console.log('SAP Connection Test');
console.log('='.repeat(80));
console.log('\nSystem Details:');
console.log(`  Description: ${systemConfig.description}`);
console.log(`  Host: ${systemConfig.host}`);
console.log(`  Instance Number: ${systemConfig.instanceNumber}`);
console.log(`  System ID: ${systemConfig.systemId}`);
console.log(`  SAP Router: ${systemConfig.saprouter}`);
console.log(`  Port (calculated): ${port}`);
console.log(`  Protocol: ${systemConfig.secure ? 'HTTPS' : 'HTTP'}`);
console.log('='.repeat(80));

rl.question('\nEnter SAP Username: ', (username) => {
    rl.question('Enter SAP Password: ', (password) => {
        rl.close();
        
        console.log('\n' + '='.repeat(80));
        console.log('Testing Connection...');
        console.log('='.repeat(80));
        
        testConnection(username, password);
    });
});

function testConnection(username, password) {
    const protocol = systemConfig.secure ? https : http;
    
    const options = {
        hostname: systemConfig.host,
        port: port,
        path: '/sap/bc/ping',
        method: 'GET',
        rejectUnauthorized: false,
        timeout: 30000,
        headers: {
            'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
        }
    };

    console.log(`\n1. Attempting connection to ${systemConfig.host}:${port}...`);
    console.log(`   Endpoint: ${systemConfig.secure ? 'https' : 'http'}://${systemConfig.host}:${port}/sap/bc/ping`);
    console.log(`   Username: ${username}`);
    console.log(`   Timeout: 30 seconds\n`);

    const startTime = Date.now();

    const req = protocol.request(options, (res) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(`✅ Response received in ${elapsed}s`);
        console.log(`   Status Code: ${res.statusCode} ${res.statusMessage}`);
        console.log(`   Headers:`, res.headers);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('\n' + '='.repeat(80));
            if (res.statusCode === 200) {
                console.log('✅ SUCCESS! Connection to SAP system is working!');
            } else if (res.statusCode === 401) {
                console.log('⚠️  Authentication required but connection works!');
                console.log('   (Check username/password)');
            } else {
                console.log(`ℹ️  Response Code: ${res.statusCode}`);
            }
            console.log('='.repeat(80));
            
            if (data) {
                console.log('\nResponse Body:');
                console.log(data.substring(0, 500));
            }
            
            // Now test with HTTP if HTTPS was used
            if (systemConfig.secure) {
                console.log('\n\nTrying HTTP connection as fallback...\n');
                testHttpConnection(username, password);
            }
        });
    });

    req.on('error', (error) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n❌ Connection failed after ${elapsed}s`);
        console.log(`   Error: ${error.message}`);
        console.log(`   Code: ${error.code}`);
        
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
            console.log('\nPossible Issues:');
            console.log('  1. SAP Router may be blocking direct connection');
            console.log('  2. VPN connection might be required');
            console.log('  3. Firewall blocking the port');
            console.log('  4. Host/port might be incorrect');
        }
    });

    req.on('timeout', () => {
        console.log('\n❌ Connection timeout (30 seconds)');
        console.log('\nThis usually means:');
        console.log('  - SAP Router configuration is required');
        console.log('  - Network/VPN is not connected');
        console.log('  - Firewall is blocking the connection');
        req.destroy();
    });

    req.end();
}

function testHttpConnection(username, password) {
    const httpPort = 3200 + parseInt(systemConfig.instanceNumber);
    
    const options = {
        hostname: systemConfig.host,
        port: httpPort,
        path: '/sap/bc/ping',
        method: 'GET',
        timeout: 30000,
        headers: {
            'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
        }
    };

    console.log(`Attempting HTTP connection to ${systemConfig.host}:${httpPort}...`);

    const req = http.request(options, (res) => {
        console.log(`\n✅ HTTP Response: ${res.statusCode}`);
        if (res.statusCode === 200 || res.statusCode === 401) {
            console.log('✅ HTTP connection works! Use secure: false in config');
        }
    });

    req.on('error', (error) => {
        console.log(`❌ HTTP also failed: ${error.message}`);
    });

    req.on('timeout', () => {
        console.log('❌ HTTP timeout as well');
        req.destroy();
    });

    req.end();
}
