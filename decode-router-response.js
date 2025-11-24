// Decode the router response
const hexData = '0000010c4e495f525445525200280000fffffffb000000f42a4552522a0031006336f6e6e656374696f6e2074696d6564206f7574207768696c652077616974696e6720666f7220636f6e6e656374206f6e2061646472657373203137322e32302e312e382f33323130';

const buffer = Buffer.from(hexData, 'hex');

console.log('Total length:', buffer.length);
console.log('\nFull hex dump:');
console.log(buffer.toString('hex'));

console.log('\n\nDecoding as ASCII/UTF-8:');
const text = buffer.toString('utf8').replace(/\0/g, '[NULL]');
console.log(text);

console.log('\n\nByte-by-byte analysis (first 50 bytes):');
for (let i = 0; i < Math.min(50, buffer.length); i++) {
    const byte = buffer[i];
    const char = (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
    console.log(`${i.toString().padStart(3)}: 0x${byte.toString(16).padStart(2, '0')} ${byte.toString().padStart(3)} '${char}'`);
}

console.log('\n\nLooking for error message:');
const errorStart = buffer.indexOf('ERR');
if (errorStart !== -1) {
    console.log(`Found ERR at position ${errorStart}`);
    const errorMessage = buffer.slice(errorStart).toString('utf8').split('\0')[0];
    console.log(`Error message: ${errorMessage}`);
}

// Try different interpretations
console.log('\n\nPossible structures:');
console.log('As 32-bit int at offset 0:', buffer.readInt32BE(0));
console.log('As 32-bit int at offset 4:', buffer.readInt32BE(4));
console.log('As 32-bit int at offset 8:', buffer.readInt32BE(8));
console.log('As 32-bit int at offset 12:', buffer.readInt32BE(12));
