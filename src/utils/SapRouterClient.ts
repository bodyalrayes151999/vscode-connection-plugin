import * as net from 'net';
import * as tls from 'tls';

export interface SapRouterConfig {
    routerHost: string;
    routerPort: number;
    targetHost: string;
    targetPort: number;
}

export class SapRouterClient {
    
    /**
     * Parse SAP Router string and extract connection details
     * Format: /H/router_host/S/router_port or /H/router_host (default port 3299)
     */
    static parseSapRouterString(routerString: string, targetHost: string, targetPort: number): SapRouterConfig | null {
        if (!routerString || !routerString.startsWith('/H/')) {
            return null;
        }

        const parts = routerString.split('/').filter(p => p);
        let routerHost = '';
        let routerPort = 3299; // Default SAP Router port

        for (let i = 0; i < parts.length; i++) {
            if (parts[i] === 'H' && parts[i + 1]) {
                routerHost = parts[i + 1];
                i++;
            } else if (parts[i] === 'S' && parts[i + 1]) {
                routerPort = parseInt(parts[i + 1]);
                i++;
            }
        }

        if (!routerHost) {
            return null;
        }

        return {
            routerHost,
            routerPort,
            targetHost,
            targetPort
        };
    }

    /**
     * Create a connection through SAP Router
     */
    static async connectThroughRouter(config: SapRouterConfig, secure: boolean = true): Promise<net.Socket | tls.TLSSocket> {
        return new Promise((resolve, reject) => {
            console.log(`Connecting to SAP Router: ${config.routerHost}:${config.routerPort}`);
            
            // First connect to SAP Router
            const routerSocket = new net.Socket();
            routerSocket.setTimeout(30000);

            routerSocket.connect(config.routerPort, config.routerHost, () => {
                console.log('Connected to SAP Router, sending route request...');
                
                // SAP Router String format: /H/target_host/S/target_port
                const sapRouterString = `/H/${config.targetHost}/S/${config.targetPort}`;
                const stringBytes = Buffer.from(sapRouterString, 'utf8');
                
                // SAP NI packet header
                // Bytes 0-3: Length (network byte order - big endian)
                // Bytes 4-7: Eyecatcher "NI_ROUTE" or opcode
                // Then the router string
                
                const eyecatcher = 'NI_ROUTE';
                const eyecatcherBytes = Buffer.from(eyecatcher, 'utf8');
                
                const totalLength = eyecatcherBytes.length + 1 + stringBytes.length;
                const packet = Buffer.alloc(4 + totalLength);
                
                // Write packet length (big-endian, 32-bit)
                packet.writeUInt32BE(totalLength, 0);
                
                // Write eyecatcher
                eyecatcherBytes.copy(packet, 4);
                
                // Write null byte separator
                packet.writeUInt8(0, 4 + eyecatcherBytes.length);
                
                // Write router string
                stringBytes.copy(packet, 4 + eyecatcherBytes.length + 1);
                
                console.log(`Sending SAP Router packet: ${sapRouterString} (${packet.length} bytes)`);
                routerSocket.write(packet);
                
                // Wait for router to respond and establish route
                let responseReceived = false;
                
                routerSocket.once('data', (data) => {
                    console.log('Received response from SAP Router:', data.length, 'bytes');
                    console.log('Response header:', data.slice(0, Math.min(20, data.length)).toString('hex'));
                    responseReceived = true;
                    
                    // SAP Router response format:
                    // Bytes 0-3: Length
                    // Byte 4: Return code (0 = success, non-zero = error)
                    if (data.length >= 5) {
                        const returnCode = data.readUInt8(4);
                        console.log(`SAP Router return code: ${returnCode}`);
                        
                        if (returnCode === 0) {
                            console.log('✅ Route established successfully');
                            resolve(routerSocket);
                        } else {
                            // Try to extract error message
                            const errorMsg = data.slice(5).toString('utf8').trim();
                            console.error(`❌ Router error (code ${returnCode}): ${errorMsg}`);
                            routerSocket.destroy();
                            reject(new Error(`SAP Router error ${returnCode}: ${errorMsg || 'Unknown error'}`));
                        }
                    } else {
                        // Unexpected response, but try to continue anyway
                        console.log('Unexpected response format, attempting to continue...');
                        resolve(routerSocket);
                    }
                });
                
                // Fallback: if no response in 2 seconds, assume connected
                setTimeout(() => {
                    if (!responseReceived) {
                        console.log('No explicit response, assuming route established');
                        resolve(routerSocket);
                    }
                }, 2000);
            });

            routerSocket.on('error', (err) => {
                console.error('SAP Router connection error:', err);
                reject(new Error(`SAP Router error: ${err.message}`));
            });

            routerSocket.on('timeout', () => {
                console.error('SAP Router connection timeout');
                routerSocket.destroy();
                reject(new Error('SAP Router connection timeout'));
            });
        });
    }

    /**
     * Make HTTP request through SAP Router
     */
    static async makeHttpRequest(
        routerString: string,
        targetHost: string,
        targetPort: number,
        path: string,
        method: string = 'GET',
        headers: any = {},
        secure: boolean = true
    ): Promise<{ statusCode: number; headers: any; data: string }> {
        
        const routerConfig = this.parseSapRouterString(routerString, targetHost, targetPort);
        
        if (!routerConfig) {
            throw new Error('Invalid SAP Router string');
        }

        const socket = await this.connectThroughRouter(routerConfig, secure);

        return new Promise((resolve, reject) => {
            let responseData = '';
            let responseHeaders: any = {};
            let statusCode = 0;
            let headersParsed = false;
            let fullResponse = '';

            // Build HTTP request
            const httpRequest = [
                `${method} ${path} HTTP/1.1`,
                `Host: ${targetHost}:${targetPort}`,
                'Connection: close'
            ];

            // Add custom headers
            for (const [key, value] of Object.entries(headers)) {
                httpRequest.push(`${key}: ${value}`);
            }

            httpRequest.push('', ''); // Empty line to end headers
            
            const requestString = httpRequest.join('\r\n');
            console.log('Sending HTTP request through router...');
            
            socket.write(requestString);

            socket.on('data', (chunk) => {
                fullResponse += chunk.toString();
                
                if (!headersParsed) {
                    const headerEndIndex = fullResponse.indexOf('\r\n\r\n');
                    if (headerEndIndex !== -1) {
                        const headerSection = fullResponse.substring(0, headerEndIndex);
                        responseData = fullResponse.substring(headerEndIndex + 4);
                        
                        const lines = headerSection.split('\r\n');
                        const statusLine = lines[0];
                        const statusMatch = statusLine.match(/HTTP\/[\d.]+\s+(\d+)/);
                        if (statusMatch) {
                            statusCode = parseInt(statusMatch[1]);
                        }
                        
                        // Parse headers
                        for (let i = 1; i < lines.length; i++) {
                            const colonIndex = lines[i].indexOf(':');
                            if (colonIndex !== -1) {
                                const key = lines[i].substring(0, colonIndex).trim().toLowerCase();
                                const value = lines[i].substring(colonIndex + 1).trim();
                                responseHeaders[key] = value;
                            }
                        }
                        
                        headersParsed = true;
                    }
                } else {
                    responseData += chunk.toString();
                }
            });

            socket.on('end', () => {
                console.log(`Response complete: ${statusCode}`);
                resolve({
                    statusCode,
                    headers: responseHeaders,
                    data: responseData
                });
            });

            socket.on('error', (err) => {
                console.error('Socket error:', err);
                reject(err);
            });

            socket.setTimeout(30000);
            socket.on('timeout', () => {
                console.error('Request timeout');
                socket.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }
}
