import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';

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
        return new Promise((resolve) => {
            const protocol = connection.secure ? https : http;
            const options: any = {
                hostname: connection.host,
                port: connection.port,
                path: '/sap/bc/ping',
                method: 'GET',
                rejectUnauthorized: false,
                timeout: 5000
            };

            if (connection.username && connection.password) {
                const auth = Buffer.from(`${connection.username}:${connection.password}`).toString('base64');
                options.headers = {
                    'Authorization': `Basic ${auth}`
                };
            }

            const req = protocol.request(options, (res) => {
                if (res.statusCode === 200 || res.statusCode === 401) {
                    resolve({ success: true, message: 'Connection successful' });
                } else {
                    resolve({ success: false, message: `Connection failed with status ${res.statusCode}` });
                }
            });

            req.on('error', (error) => {
                resolve({ success: false, message: `Connection error: ${error.message}` });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ success: false, message: 'Connection timeout' });
            });

            req.end();
        });
    }

    async fetchBspApplications(connection: SapConnection): Promise<BspApplication[]> {
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
                headers: {
                    'x-csrf-token': 'fetch',
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
                        
                        resolve(apps);
                    } catch (error) {
                        reject(new Error('Failed to parse BSP applications'));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.end();
        });
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
