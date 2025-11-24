// Test SAP Router connection
const { SapRouterClient } = require('./out/utils/SapRouterClient');

const routerString = '/H/54.75.63.76';
const targetHost = '172.20.1.8';
const targetPort = 3310; // Instance 10 HTTPS

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('='.repeat(80));
console.log('SAP Router Connection Test');
console.log('='.repeat(80));
console.log(`\nRouter: ${routerString}`);
console.log(`Target: ${targetHost}:${targetPort}`);
console.log('='.repeat(80));

rl.question('\nEnter SAP Username: ', (username) => {
    rl.question('Enter SAP Password: ', async (password) => {
        rl.close();
        
        try {
            console.log('\nTesting connection through SAP Router...\n');
            
            const headers = {
                'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
            };
            
            const response = await SapRouterClient.makeHttpRequest(
                routerString,
                targetHost,
                targetPort,
                '/sap/bc/ping',
                'GET',
                headers,
                true  // HTTPS
            );
            
            console.log('\n' + '='.repeat(80));
            console.log('✅ SUCCESS!');
            console.log('='.repeat(80));
            console.log(`Status Code: ${response.statusCode}`);
            console.log(`Headers:`, response.headers);
            console.log(`\nResponse: ${response.data.substring(0, 200)}`);
            
        } catch (error) {
            console.log('\n' + '='.repeat(80));
            console.log('❌ ERROR');
            console.log('='.repeat(80));
            console.error(error.message);
        }
    });
});
