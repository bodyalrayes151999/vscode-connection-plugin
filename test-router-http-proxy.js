// Test connecting through SAP Router as HTTP proxy
const http = require('http');
const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Amer - DEV system
const config = {
    routerHost: '54.75.63.76',
    routerPort: 3299,
    targetHost: '172.20.1.8',
    targetPort: 3210,
    targetPath: '/sap/bc/ping'
};

console.log('='.repeat(80));
console.log('SAP Router HTTP CONNECT Proxy Test');
console.log('='.repeat(80));
console.log(`Router: ${config.routerHost}:${config.routerPort}`);
console.log(`Target: ${config.targetHost}:${config.targetPort}`);
console.log('='.repeat(80));

rl.question('\nEnter SAP Username: ', (username) => {
    rl.question('Enter SAP Password: ', (password) => {
        rl.close();
        testHttpConnect(username, password);
    });
});

function testHttpConnect(username, password) {
    console.log('\nAttempting HTTP CONNECT through SAP Router...\n');

    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    // Try using SAP Router as HTTP CONNECT proxy
    const options = {
        host: config.routerHost,
        port: config.routerPort,
        method: 'CONNECT',
        path: `${config.targetHost}:${config.targetPort}`,
        headers: {
            'Host': `${config.targetHost}:${config.targetPort}`,
            'Proxy-Authorization': `Basic ${auth}`
        }
    };

    console.log('Sending CONNECT request...');
    const req = http.request(options);

    req.on('connect', (res, socket, head) => {
        console.log('✅ CONNECT successful!');
        console.log(`Status: ${res.statusCode}`);
        
        // Now send HTTP request through the tunnel
        const httpReq = [
            `GET ${config.targetPath} HTTP/1.1`,
            `Host: ${config.targetHost}:${config.targetPort}`,
            `Authorization: Basic ${auth}`,
            'Connection: close',
            '',
            ''
        ].join('\r\n');
        
        console.log('\nSending HTTP request through tunnel...');
        socket.write(httpReq);
        
        socket.on('data', (data) => {
            console.log('\n✅ Response received:');
            console.log(data.toString());
        });
        
        socket.on('end', () => {
            console.log('\nConnection closed');
        });
    });

    req.on('error', (err) => {
        console.log('\n❌ CONNECT failed:', err.message);
        console.log('\nTrying direct SAP NI protocol instead...\n');
        testSapNiProtocol(username, password);
    });

    req.end();
}

function testSapNiProtocol(username, password) {
    const net = require('net');
    
    const socket = new net.Socket();
    socket.setTimeout(30000);
    
    console.log(`Connecting to SAP Router ${config.routerHost}:${config.routerPort}...`);
    
    socket.connect(config.routerPort, config.routerHost, () => {
        console.log('Connected! Sending SAP NI route request...');
        
        // Try simpler route format without full NI packet
        const routeString = `/H/${config.targetHost}/S/${config.targetPort}\n`;
        socket.write(routeString);
        
        console.log(`Sent route: ${routeString.trim()}`);
    });
    
    socket.on('data', (data) => {
        console.log('\nReceived from router:');
        console.log('Length:', data.length);
        console.log('Hex:', data.slice(0, 50).toString('hex'));
        console.log('ASCII:', data.toString('utf8').substring(0, 200));
        
        // If looks like error, show it
        if (data.includes('ERR')) {
            console.log('\n❌ Router returned an error');
        }
    });
    
    socket.on('error', (err) => {
        console.log('\n❌ Socket error:', err.message);
    });
    
    socket.on('timeout', () => {
        console.log('\n❌ Timeout');
        socket.destroy();
    });
}
