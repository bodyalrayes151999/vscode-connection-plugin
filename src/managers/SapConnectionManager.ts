import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { SapRouterClient } from '../utils/SapRouterClient';

export interface SapConnection {
    name: string;
    host: string;
    port: number;
    client: string;
    systemId: string;
    saprouter?: string;
    secure: boolean;
    username?: string;
    password?: string;
}

export interface BspApplication {
    name: string;
    description: string;
    version: string;
    url: string;
    namespace: string;
}

export class SapConnectionManager {
    private connections: Map<string, SapConnection> = new Map();
    private activeConnection?: SapConnection;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadConnections();
    }

    private loadConnections() {
        const saved = this.context.globalState.get<SapConnection[]>('sapConnections', []);
        saved.forEach(conn => this.connections.set(conn.name, conn));
    }

    async saveConnections() {
        await this.context.globalState.update('sapConnections', Array.from(this.connections.values()));
    }

    async addConnection(connection: SapConnection): Promise<void> {
        this.connections.set(connection.name, connection);
        await this.saveConnections();
    }

    async removeConnection(name: string): Promise<void> {
        this.connections.delete(name);
        await this.saveConnections();
    }

    getConnections(): SapConnection[] {
        return Array.from(this.connections.values());
    }

    getActiveConnection(): SapConnection | undefined {
        return this.activeConnection;
    }

    async setActiveConnection(name: string): Promise<boolean> {
        const connection = this.connections.get(name);
        if (connection) {
            this.activeConnection = connection;
            return true;
        }
        return false;
    }

    async testConnection(connection: SapConnection): Promise<{ success: boolean; message: string }> {
        // If SAP Router is configured, use router client
        if (connection.saprouter) {
            return this.testConnectionThroughRouter(connection);
        }
        
        // Direct connection (no router)
        return new Promise((resolve) => {
            const protocol = connection.secure ? https : http;
            const options: any = {
                hostname: connection.host,
                port: connection.port,
                path: '/sap/bc/ping',
                method: 'GET',
                rejectUnauthorized: false,
                timeout: 30000  // Increased to 30 seconds for slow connections
            };

            if (connection.username && connection.password) {
                const auth = Buffer.from(`${connection.username}:${connection.password}`).toString('base64');
                options.headers = {
                    'Authorization': `Basic ${auth}`
                };
            }

            console.log(`Testing connection to ${connection.host}:${connection.port}...`);

            const req = protocol.request(options, (res) => {
                console.log(`Response status: ${res.statusCode}`);
                if (res.statusCode === 200 || res.statusCode === 401) {
                    resolve({ success: true, message: 'Connection successful' });
                } else {
                    resolve({ success: false, message: `Connection failed with status ${res.statusCode}` });
                }
            });

            req.on('error', (error) => {
                console.error('Connection error:', error);
                resolve({ success: false, message: `Connection error: ${error.message}` });
            });

            req.on('timeout', () => {
                console.error('Connection timeout');
                req.destroy();
                resolve({ success: false, message: 'Connection timeout - check if SAP Router is configured correctly' });
            });

            req.end();
        });
    }

    private async testConnectionThroughRouter(connection: SapConnection): Promise<{ success: boolean; message: string }> {
        try {
            console.log(`Testing connection through SAP Router: ${connection.saprouter}`);
            
            const headers: any = {};
            if (connection.username && connection.password) {
                const auth = Buffer.from(`${connection.username}:${connection.password}`).toString('base64');
                headers['Authorization'] = `Basic ${auth}`;
            }

            const response = await SapRouterClient.makeHttpRequest(
                connection.saprouter!,
                connection.host,
                connection.port,
                '/sap/bc/ping',
                'GET',
                headers,
                connection.secure
            );

            console.log(`Router response status: ${response.statusCode}`);
            
            if (response.statusCode === 200 || response.statusCode === 401) {
                return { success: true, message: 'Connection successful through SAP Router' };
            } else {
                return { success: false, message: `Connection failed with status ${response.statusCode}` };
            }
        } catch (error: any) {
            console.error('Router connection error:', error);
            
            // Check if it's a router permission error
            if (error.message.includes('invalid route') || error.message.includes('ECONNRESET')) {
                return {
                    success: false,
                    message: `SAP Router requires permission configuration.\n\n` +
                             `The SAP Router at ${connection.saprouter} is blocking the connection.\n` +
                             `Please contact your SAP Basis team to:\n` +
                             `  • Add route permissions for your machine\n` +
                             `  • Or connect via VPN and use direct connection (remove SAP Router)\n` +
                             `  • Or configure router authentication if required\n\n` +
                             `Technical error: ${error.message}`
                };
            }
            
            return { success: false, message: `SAP Router error: ${error.message}` };
        }
    }

    async fetchBspApplications(connection: SapConnection): Promise<BspApplication[]> {
        // If SAP Router is configured, use router client
        if (connection.saprouter) {
            return this.fetchBspApplicationsThroughRouter(connection);
        }
        
        // Direct connection (no router)
        return new Promise((resolve, reject) => {
            const protocol = connection.secure ? https : http;
            
            // SAP OData service endpoint for BSP applications
            const path = `/sap/opu/odata/sap/UI5_REPOSITORY_SRV/Repositories?$format=json`;
            
            const options: any = {
                hostname: connection.host,
                port: connection.port,
                path: path,
                method: 'GET',
                rejectUnauthorized: false,
                timeout: 30000,  // 30 seconds timeout
                headers: {
                    'x-csrf-token': 'fetch',
                    'Accept': 'application/json'
                }
            };

            if (connection.username && connection.password) {
                const auth = Buffer.from(`${connection.username}:${connection.password}`).toString('base64');
                options.headers.Authorization = `Basic ${auth}`;
            }

            console.log(`Fetching BSP applications from ${connection.host}:${connection.port}...`);

            const req = protocol.request(options, (res) => {
                console.log(`BSP fetch response status: ${res.statusCode}`);
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        const apps: BspApplication[] = [];
                        
                        if (json.d && json.d.results) {
                            json.d.results.forEach((repo: any) => {
                                apps.push({
                                    name: repo.Name,
                                    description: repo.Description || '',
                                    version: repo.Version || '1.0.0',
                                    url: repo.Url || '',
                                    namespace: repo.Namespace || ''
                                });
                            });
                        }
                        
                        console.log(`Found ${apps.length} BSP applications`);
                        resolve(apps);
                    } catch (error) {
                        console.error('Failed to parse BSP applications:', error);
                        reject(new Error('Failed to parse BSP applications'));
                    }
                });
            });

            req.on('error', (error) => {
                console.error('BSP fetch error:', error);
                reject(error);
            });

            req.on('timeout', () => {
                console.error('BSP fetch timeout');
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    private async fetchBspApplicationsThroughRouter(connection: SapConnection): Promise<BspApplication[]> {
        try {
            console.log(`Fetching BSP applications through SAP Router: ${connection.saprouter}`);
            
            const headers: any = {
                'x-csrf-token': 'fetch',
                'Accept': 'application/json'
            };
            
            if (connection.username && connection.password) {
                const auth = Buffer.from(`${connection.username}:${connection.password}`).toString('base64');
                headers['Authorization'] = `Basic ${auth}`;
            }

            const path = `/sap/opu/odata/sap/UI5_REPOSITORY_SRV/Repositories?$format=json`;
            
            const response = await SapRouterClient.makeHttpRequest(
                connection.saprouter!,
                connection.host,
                connection.port,
                path,
                'GET',
                headers,
                connection.secure
            );

            console.log(`BSP fetch response status: ${response.statusCode}`);
            
            const apps: BspApplication[] = [];
            
            if (response.statusCode === 200) {
                try {
                    const json = JSON.parse(response.data);
                    
                    if (json.d && json.d.results) {
                        json.d.results.forEach((repo: any) => {
                            apps.push({
                                name: repo.Name,
                                description: repo.Description || '',
                                version: repo.Version || '1.0.0',
                                url: repo.Url || '',
                                namespace: repo.Namespace || ''
                            });
                        });
                    }
                    
                    console.log(`Found ${apps.length} BSP applications through router`);
                } catch (error) {
                    console.error('Failed to parse BSP applications:', error);
                    throw new Error('Failed to parse BSP applications');
                }
            } else {
                throw new Error(`Failed to fetch BSP applications: HTTP ${response.statusCode}`);
            }
            
            return apps;
        } catch (error: any) {
            console.error('Router BSP fetch error:', error);
            throw error;
        }
    }

    async downloadBspApplication(connection: SapConnection, appName: string, targetPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const protocol = connection.secure ? https : http;
            
            // Download BSP application content
            const path = `/sap/opu/odata/sap/UI5_REPOSITORY_SRV/Repositories('${appName}')/Files?$format=json`;
            
            const options: any = {
                hostname: connection.host,
                port: connection.port,
                path: path,
                method: 'GET',
                rejectUnauthorized: false,
                headers: {
                    'Accept': 'application/json'
                }
            };

            if (connection.username && connection.password) {
                const auth = Buffer.from(`${connection.username}:${connection.password}`).toString('base64');
                options.headers.Authorization = `Basic ${auth}`;
            }

            const req = protocol.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        // Process and save files to targetPath
                        // This would be expanded to actually write files
                        resolve();
                    } catch (error) {
                        reject(new Error('Failed to download BSP application'));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.end();
        });
    }

    async uploadBspApplication(connection: SapConnection, appName: string, sourcePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const protocol = connection.secure ? https : http;
            
            // First, fetch CSRF token
            const tokenOptions: any = {
                hostname: connection.host,
                port: connection.port,
                path: '/sap/opu/odata/sap/UI5_REPOSITORY_SRV/',
                method: 'GET',
                rejectUnauthorized: false,
                headers: {
                    'x-csrf-token': 'fetch'
                }
            };

            if (connection.username && connection.password) {
                const auth = Buffer.from(`${connection.username}:${connection.password}`).toString('base64');
                tokenOptions.headers.Authorization = `Basic ${auth}`;
            }

            // This is a simplified version - full implementation would:
            // 1. Get CSRF token
            // 2. Read local files
            // 3. Upload each file using POST/PUT requests
            // 4. Handle file deletions
            
            resolve();
        });
    }
}
