const { SapRouterTunnel } = require('./out/utils/SapRouterTunnel');

async function testPort(port, protocol = 'HTTP') {
    console.log(`\n=== Testing port ${port} (${protocol}) ===`);
    
    const routerString = '/H/54.75.63.76';
    const targetHost = '172.20.1.8';
    
    const tunnel = new SapRouterTunnel(routerString, targetHost, port);
    
    try {
        console.log(`Establishing tunnel to ${targetHost}:${port}...`);
        await tunnel.connect(10000);
        console.log(`✅ Tunnel established to port ${port}!`);
        
        // Try a simple HTTP request
        const headers = {
            'Authorization': 'Basic ' + Buffer.from('CIC.ELRAYES:A@123456').toString('base64'),
            'Accept': 'application/json'
        };
        
        const response = await tunnel.sendHttpRequest('GET', '/sap/public/info', headers);
        console.log(`✅ HTTP Response: ${response.statusCode}`);
        console.log(`Headers:`, Object.keys(response.headers));
        
        tunnel.close();
        return { port, success: true, statusCode: response.statusCode };
        
    } catch (error) {
        tunnel.close();
        
        // Check if it's a connection timeout (backend not responding)
        if (error.message.includes('cannot reach target')) {
            console.log(`❌ Port ${port}: Backend not responding (wrong port or service not running)`);
            return { port, success: false, error: 'not responding' };
        } else if (error.message.includes('Router error')) {
            console.log(`❌ Port ${port}: Router rejected (${error.message})`);
            return { port, success: false, error: 'router rejected' };
        } else {
            console.log(`❌ Port ${port}: ${error.message}`);
            return { port, success: false, error: error.message };
        }
    }
}

async function testCommonPorts() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Testing Common SAP HTTP/HTTPS Ports Through Router       ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    // Common SAP ports
    const ports = [
        { port: 8000, desc: 'HTTP - Standard SAP ICM' },
        { port: 8001, desc: 'HTTP - Alternative ICM' },
        { port: 443, desc: 'HTTPS - Standard' },
        { port: 44300, desc: 'HTTPS - SAP Standard' },
        { port: 50000, desc: 'HTTP - SAP NetWeaver' },
        { port: 50001, desc: 'HTTP - SAP NetWeaver Alt' }
    ];
    
    console.log('\nNote: Port 3210 is for SAP GUI (RFC protocol), not HTTP!');
    console.log('We need to find the HTTP/HTTPS port for web services.\n');
    
    const results = [];
    
    for (const { port, desc } of ports) {
        console.log(`\n[${ ports.indexOf({ port, desc }) + 1 }/${ports.length}] ${desc}`);
        const result = await testPort(port, desc);
        results.push(result);
        
        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  SUMMARY                                                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    const successful = results.filter(r => r.success);
    const notResponding = results.filter(r => r.error === 'not responding');
    
    if (successful.length > 0) {
        console.log('✅ WORKING PORTS:');
        successful.forEach(r => {
            console.log(`   Port ${r.port}: HTTP ${r.statusCode}`);
        });
    } else {
        console.log('❌ No working HTTP ports found');
    }
    
    console.log(`\n📊 Results:`);
    console.log(`   - Successful: ${successful.length}`);
    console.log(`   - Not responding: ${notResponding.length}`);
    console.log(`   - Other errors: ${results.length - successful.length - notResponding.length}`);
    
    if (successful.length === 0) {
        console.log('\n💡 WHAT TO DO:');
        console.log('   1. Log into SAP GUI (which works on port 3210)');
        console.log('   2. Run transaction: SMICM');
        console.log('   3. Menu: Goto → Services');
        console.log('   4. Look for HTTP or HTTPS entries');
        console.log('   5. Note the port number (e.g., 8000, 44300)');
        console.log('   6. Tell me that port number!');
    }
}

testCommonPorts().catch(console.error);
