const { SapRouterTunnel } = require('./out/utils/SapRouterTunnel');

async function testRouterTunnel() {
    console.log('=== SAP Router Tunnel Test ===\n');
    
    const routerString = '/H/54.75.63.76';
    const targetHost = '172.20.1.8';
    const targetPort = 3210;
    
    console.log(`Router: ${routerString}`);
    console.log(`Target: ${targetHost}:${targetPort}\n`);
    
    const tunnel = new SapRouterTunnel(routerString, targetHost, targetPort);
    
    try {
        console.log('Step 1: Establishing tunnel connection...');
        await tunnel.connect(30000);
        console.log('✅ Tunnel established!\n');
        
        console.log('Step 2: Sending HTTP request through tunnel...');
        const headers = {
            'Authorization': 'Basic ' + Buffer.from('CIC.ELRAYES:A@123456').toString('base64'),
            'Accept': 'application/json'
        };
        
        const response = await tunnel.sendHttpRequest('GET', '/sap/public/info', headers);
        
        console.log(`\n✅ Response received!`);
        console.log(`Status: ${response.statusCode}`);
        console.log(`Headers:`, response.headers);
        console.log(`\nBody preview (first 500 chars):`);
        console.log(response.data.substring(0, 500));
        
        tunnel.close();
        console.log('\n✅ Tunnel closed');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.stack) {
            console.error('\nStack trace:', error.stack);
        }
        tunnel.close();
    }
}

testRouterTunnel();
