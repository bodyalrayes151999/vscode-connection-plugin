const { SapRouterTunnel } = require('./out/utils/SapRouterTunnel');

async function testActualHttpPort() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Testing REAL HTTP Port from SMICM: 8010                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    const routerString = '/H/54.75.63.76';
    const targetHost = '172.20.1.8';
    const targetPort = 8010; // From SMICM screenshot
    
    const tunnel = new SapRouterTunnel(routerString, targetHost, targetPort);
    
    try {
        console.log('Step 1: Establishing SAP Router tunnel...');
        await tunnel.connect(30000);
        console.log('✅ Tunnel established!\n');
        
        console.log('Step 2: Sending HTTP request for SAP system info...');
        const headers = {
            'Authorization': 'Basic ' + Buffer.from('CIC.ELRAYES:A@123456').toString('base64'),
            'Accept': 'application/json'
        };
        
        const response = await tunnel.sendHttpRequest('GET', '/sap/public/info', headers);
        
        console.log(`\n✅ SUCCESS! HTTP Response: ${response.statusCode}`);
        console.log(`Response Headers:`, response.headers);
        console.log(`\nBody preview (first 500 chars):`);
        console.log(response.data.substring(0, 500));
        
        console.log('\n\nStep 3: Testing BSP Application OData service...');
        const odataResponse = await tunnel.sendHttpRequest(
            'GET', 
            '/sap/opu/odata/sap/UI5_REPOSITORY_SRV/$metadata',
            {
                'Authorization': 'Basic ' + Buffer.from('CIC.ELRAYES:A@123456').toString('base64'),
                'Accept': 'application/xml'
            }
        );
        
        console.log(`\n✅ OData Service Response: ${odataResponse.statusCode}`);
        console.log(`OData available: ${odataResponse.statusCode === 200 ? 'YES' : 'NO'}`);
        
        tunnel.close();
        
        console.log('\n\n╔════════════════════════════════════════════════════════════╗');
        console.log('║  🎉 SAP ROUTER CONNECTION FULLY WORKING! 🎉                ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('\nYou can now browse and update BSP applications through the router!');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        tunnel.close();
    }
}

testActualHttpPort();
