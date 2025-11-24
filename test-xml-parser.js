// Test script to verify XML parser works
const fs = require('fs');
const path = require('path');

const xmlPath = 'C:\\Users\\Abdelrahman\\AppData\\Roaming\\SAP\\Common\\SAPUILandscape.xml';

console.log('Testing XML Parser...\n');
console.log('Reading file:', xmlPath);

if (!fs.existsSync(xmlPath)) {
    console.error('ERROR: File not found!');
    process.exit(1);
}

const content = fs.readFileSync(xmlPath, 'utf-8');
console.log('File size:', content.length, 'bytes\n');

// Parse services
const serviceRegex = /<Service[^>]*type="SAPGUI"[^>]*>/gi;
const matches = content.match(serviceRegex);

console.log('Found', matches ? matches.length : 0, 'SAP GUI services\n');

if (matches) {
    console.log('First 5 systems:');
    console.log('=' .repeat(80));
    
    for (let i = 0; i < Math.min(5, matches.length); i++) {
        const serviceTag = matches[i];
        
        const nameMatch = serviceTag.match(/name="([^"]*)"/i);
        const systemIdMatch = serviceTag.match(/systemid="([^"]*)"/i);
        const serverMatch = serviceTag.match(/server="([^"]*)"/i);
        const routerIdMatch = serviceTag.match(/routerid="([^"]*)"/i);
        
        console.log(`\n${i + 1}. ${nameMatch ? nameMatch[1] : 'N/A'}`);
        console.log(`   System ID: ${systemIdMatch ? systemIdMatch[1] : 'N/A'}`);
        console.log(`   Server: ${serverMatch ? serverMatch[1] : 'N/A'}`);
        
        if (routerIdMatch) {
            const routerId = routerIdMatch[1];
            const routerRegex = new RegExp(`<Router[^>]*uuid="${routerId}"[^>]*router="([^"]*)"`, 'i');
            const routerMatch = content.match(routerRegex);
            if (routerMatch) {
                console.log(`   Router: ${routerMatch[1]}`);
            }
        }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\nTotal systems found: ${matches.length}`);
    console.log('\n✅ Parser is working correctly!');
} else {
    console.error('\n❌ ERROR: No services found!');
}
