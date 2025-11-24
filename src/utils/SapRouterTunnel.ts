import * as net from 'net';
import * as tls from 'tls';

/**
 * SAP Router Tunnel - Establishes a proper tunnel through SAP Router
 * This implementation creates a persistent connection through the SAP Router
 * that can be reused for multiple HTTP requests.
 */
export class SapRouterTunnel {
    private socket?: net.Socket | tls.TLSSocket;
    private routerHost: string;
    private routerPort: number;
    private targetHost: string;
    private targetPort: number;
    private connected: boolean = false;

    constructor(
        routerString: string,
        targetHost: string,
        targetPort: number
    ) {
        const parsed = this.parseRouterString(routerString);
        this.routerHost = parsed.routerHost;
        this.routerPort = parsed.routerPort;
        this.targetHost = targetHost;
        this.targetPort = targetPort;
    }

    private parseRouterString(routerString: string): { routerHost: string; routerPort: number } {
        // Parse SAP Router string format: /H/host or /H/host/S/port
        const match = routerString.match(/\/H\/([^\/]+)(?:\/S\/(\d+))?/);
        if (!match) {
            throw new Error(`Invalid SAP Router format: ${routerString}`);
        }

        return {
            routerHost: match[1],
            routerPort: match[2] ? parseInt(match[2]) : 3299
        };
    }

    /**
     * Establish connection through SAP Router
     */
    async connect(timeout: number = 30000): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`Connecting to SAP Router ${this.routerHost}:${this.routerPort}...`);

            // Create connection to SAP Router
            this.socket = net.createConnection({
                host: this.routerHost,
                port: this.routerPort,
                timeout: timeout
            });

            this.socket.on('connect', () => {
                console.log('Connected to SAP Router, sending route request...');

                try {
                    // Send SAP Router NI protocol packet
                    const routePacket = this.createRoutePacket();
                    this.socket!.write(routePacket);
                } catch (error) {
                    reject(error);
                }
            });

            this.socket.on('data', (data) => {
                console.log(`\n=== Received ${data.length} bytes from router ===`);
                console.log(`Full hex dump:\n${data.toString('hex')}\n`);
                console.log(`As UTF-8:\n${data.toString('utf8')}\n`);

                // Parse SAP Router response
                if (data.length >= 4) {
                    const totalLength = data.readInt32BE(0);
                    console.log(`Total Length: ${totalLength}`);
                    
                    // Check for error response (NI_RTERR)
                    if (data.length >= 12) {
                        const packetType = data.slice(4, 12).toString('utf8');
                        console.log(`Packet Type: "${packetType}"`);
                        
                        if (packetType.includes('NI_RTERR')) {
                            // This is an error packet
                            console.log('\n⚠️  This is an NI_RTERR error packet');
                            console.log('This means the SAP Router accepted the route but cannot reach the target system.');
                            console.log('The backend SAP system may be:');
                            console.log('  - Down or not responding');
                            console.log('  - Blocking connections from the router');
                            console.log('  - Using a different port');
                            
                            this.socket?.destroy();
                            reject(new Error(
                                `SAP Router cannot reach target system ${this.targetHost}:${this.targetPort}.\n` +
                                `The router is working but the backend SAP system is not responding.\n` +
                                `Check that the system is running and accessible from the router.`
                            ));
                            return;
                        }
                    }
                    
                    // Check for success response (NI_PONG or similar)
                    if (data.length >= 16) {
                        const version = data.readInt32BE(8);
                        const responseCode = data.readInt32BE(12);
                        
                        console.log(`Version: ${version}`);
                        console.log(`Response Code: ${responseCode} (0x${responseCode.toString(16)})`);

                        if (responseCode === 0 || responseCode === 2) {
                            // Connection established (code 0 or 2 both indicate success)
                            console.log('✅ SAP Router tunnel established successfully');
                            this.connected = true;
                            resolve();
                        } else {
                            // Error codes
                            const errorMsg = this.getRouterErrorMessage(responseCode);
                            console.error(`SAP Router error: ${errorMsg} (code ${responseCode})`);
                            this.socket?.destroy();
                            reject(new Error(`SAP Router error: ${errorMsg}`));
                        }
                    }
                }
            });

            this.socket.on('error', (error) => {
                console.error('SAP Router connection error:', error);
                reject(error);
            });

            this.socket.on('timeout', () => {
                console.error('SAP Router connection timeout');
                this.socket?.destroy();
                reject(new Error('SAP Router connection timeout'));
            });

            this.socket.on('close', () => {
                console.log('SAP Router connection closed');
                this.connected = false;
            });
        });
    }

    /**
     * Create SAP Router NI protocol packet
     */
    private createRoutePacket(): Buffer {
        // SAP Router route string format: hostname/service_port
        const routeString = `${this.targetHost}/${this.targetPort}`;
        const routeBytes = Buffer.from(routeString, 'utf8');

        // NI packet structure:
        // 0-3: Total length (4 bytes, big-endian)
        // 4-7: Header length (4 bytes, big-endian) - always 16
        // 8-11: Version (4 bytes, big-endian) - 38 for SAP Router
        // 12-15: Type (4 bytes, big-endian) - 1 for route request
        // 16+: Route string

        const totalLength = 16 + routeBytes.length;
        const packet = Buffer.alloc(totalLength);

        packet.writeInt32BE(totalLength, 0);  // Total length
        packet.writeInt32BE(16, 4);           // Header length
        packet.writeInt32BE(38, 8);           // Version
        packet.writeInt32BE(1, 12);           // Type (route request)
        routeBytes.copy(packet, 16);          // Route string

        console.log(`Created SAP Router packet: ${packet.length} bytes, route: ${routeString}`);
        return packet;
    }

    /**
     * Get error message for SAP Router error code
     */
    private getRouterErrorMessage(code: number): string {
        const errorMessages: { [key: number]: string } = {
            78: 'NiRRouteRepl: invalid route received',
            79: 'NiRRouteRepl: access denied',
            80: 'NiRRouteRepl: maximum connections reached',
            81: 'NiRRouteRepl: connection refused',
            82: 'NiRRouteRepl: route not found',
            83: 'NiRRouteRepl: syntax error in route string'
        };

        if (code === -6) {
            return 'NI_EHOST: unknown host';
        }
        if (code === -1) {
            return 'NI_ERR: unspecified error';
        }

        return errorMessages[code] || `Unknown error code ${code}`;
    }

    /**
     * Send HTTP request through the tunnel
     */
    async sendHttpRequest(
        method: string,
        path: string,
        headers: { [key: string]: string },
        body?: string
    ): Promise<{ statusCode: number; headers: any; data: string }> {
        if (!this.connected || !this.socket) {
            throw new Error('Not connected to SAP Router');
        }

        const socket = this.socket; // Capture for type safety

        return new Promise((resolve, reject) => {
            let responseData = '';
            let statusCode = 0;
            let responseHeaders: any = {};
            let headersParsed = false;

            // Build HTTP request
            const requestLines = [
                `${method} ${path} HTTP/1.1`,
                `Host: ${this.targetHost}:${this.targetPort}`,
                ...Object.entries(headers).map(([key, value]) => `${key}: ${value}`),
                '',
                body || ''
            ];

            const request = requestLines.join('\r\n');
            console.log(`Sending HTTP request through tunnel:\n${request.substring(0, 200)}...`);

            // Set up response handler
            const dataHandler = (data: Buffer) => {
                const chunk = data.toString();
                responseData += chunk;

                if (!headersParsed) {
                    const headerEnd = responseData.indexOf('\r\n\r\n');
                    if (headerEnd !== -1) {
                        const headerSection = responseData.substring(0, headerEnd);
                        const lines = headerSection.split('\r\n');

                        // Parse status line
                        const statusMatch = lines[0].match(/HTTP\/\d\.\d (\d+)/);
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
                        console.log(`HTTP response status: ${statusCode}`);
                    }
                }

                // Check if we have complete response
                if (headersParsed) {
                    const contentLength = responseHeaders['content-length'];
                    if (contentLength) {
                        const headerEnd = responseData.indexOf('\r\n\r\n');
                        const bodyLength = responseData.length - (headerEnd + 4);
                        if (bodyLength >= parseInt(contentLength)) {
                            socket.removeListener('data', dataHandler);
                            resolve({ statusCode, headers: responseHeaders, data: responseData });
                        }
                    } else if (responseHeaders['transfer-encoding'] === 'chunked') {
                        // Handle chunked encoding - simplified check
                        if (responseData.endsWith('0\r\n\r\n')) {
                            socket.removeListener('data', dataHandler);
                            resolve({ statusCode, headers: responseHeaders, data: responseData });
                        }
                    }
                }
            };

            socket.on('data', dataHandler);

            // Send request
            socket.write(request);

            // Set timeout for response
            setTimeout(() => {
                socket.removeListener('data', dataHandler);
                reject(new Error('HTTP request timeout'));
            }, 30000);
        });
    }

    /**
     * Close the tunnel
     */
    close(): void {
        if (this.socket) {
            this.socket.destroy();
            this.socket = undefined;
            this.connected = false;
        }
    }

    isConnected(): boolean {
        return this.connected;
    }
}
