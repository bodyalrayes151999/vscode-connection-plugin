import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SapConnection } from '../managers/SapConnectionManager';

interface SapGuiConnection {
    name: string;
    description: string;
    application_server?: string;
    system_number?: string;
    system_id?: string;
    saprouter?: string;
    client?: string;
    server?: string;
    router?: string;
}

export class SapGuiReader {
    private sapLogonIniPath: string = '';

    constructor() {
        this.findSapLogonIni();
    }

    private findSapLogonIni(): void {
        // Common SAP GUI installation paths
        const possiblePaths = [
            path.join(process.env.APPDATA || '', 'SAP', 'Common', 'saplogon.ini'),
            path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'SAP', 'Common', 'saplogon.ini'),
            'C:\\Users\\Public\\SAP\\Common\\saplogon.ini',
            'C:\\ProgramData\\SAP\\saplogon.ini',
            path.join(process.env.SYSTEMROOT || 'C:\\Windows', 'saplogon.ini')
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                this.sapLogonIniPath = p;
                console.log(`Found saplogon.ini at: ${p}`);
                break;
            }
        }
    }

    async readSapGuiConnections(): Promise<SapGuiConnection[]> {
        if (!this.sapLogonIniPath || !fs.existsSync(this.sapLogonIniPath)) {
            return [];
        }

        try {
            const content = fs.readFileSync(this.sapLogonIniPath, 'utf-8');
            return this.parseSapLogonIni(content);
        } catch (error) {
            console.error('Error reading saplogon.ini:', error);
            return [];
        }
    }

    private parseSapLogonIni(content: string): SapGuiConnection[] {
        const connections: SapGuiConnection[] = [];
        const lines = content.split('\n');
        let currentConnection: SapGuiConnection | null = null;

        for (let line of lines) {
            line = line.trim();

            // New connection section
            if (line.startsWith('[') && line.endsWith(']')) {
                if (currentConnection && currentConnection.name) {
                    connections.push(currentConnection);
                }
                const sectionName = line.substring(1, line.length - 1);
                currentConnection = {
                    name: sectionName,
                    description: sectionName
                };
            }
            // Parse connection properties
            else if (line.includes('=') && currentConnection) {
                const [key, value] = line.split('=').map(s => s.trim());
                
                switch (key.toLowerCase()) {
                    case 'description':
                        currentConnection.description = value;
                        break;
                    case 'server':
                    case 'ashost':
                        currentConnection.application_server = value;
                        currentConnection.server = value;
                        break;
                    case 'systemnumber':
                    case 'sysnr':
                        currentConnection.system_number = value;
                        break;
                    case 'systemid':
                    case 'sysid':
                        currentConnection.system_id = value;
                        break;
                    case 'saprouter':
                    case 'router':
                        currentConnection.saprouter = value;
                        currentConnection.router = value;
                        break;
                    case 'client':
                        currentConnection.client = value;
                        break;
                }
            }
        }

        // Add last connection
        if (currentConnection && currentConnection.name) {
            connections.push(currentConnection);
        }

        return connections.filter(conn => conn.application_server || conn.server);
    }

    convertToVSCodeConnection(guiConnection: SapGuiConnection, username?: string): Partial<SapConnection> {
        const server = guiConnection.application_server || guiConnection.server || '';
        let host = server;
        let saprouter = guiConnection.saprouter || guiConnection.router || '';

        // Parse SAP Router string if present
        // Format: /H/router_host/S/router_port/H/app_server/S/app_port
        if (saprouter) {
            const routerInfo = this.parseSapRouter(saprouter, server);
            host = routerInfo.finalHost;
        }

        // Calculate port from system number (default SAP ports)
        let port = 443; // Default HTTPS
        if (guiConnection.system_number) {
            const sysNum = parseInt(guiConnection.system_number);
            // SAP default: 32NN for HTTP, 33NN for HTTPS where NN is system number
            port = 3300 + sysNum; // HTTPS port
        }

        return {
            name: guiConnection.description || guiConnection.name,
            host: host,
            port: port,
            client: guiConnection.client || '',
            systemId: guiConnection.system_id || '',
            secure: true, // Default to HTTPS
            username: username
        };
    }

    private parseSapRouter(routerString: string, appServer: string): { finalHost: string; routerHost?: string; routerPort?: number } {
        // SAP Router format: /H/host1/S/port1/H/host2/S/port2
        const parts = routerString.split('/').filter(p => p);
        
        let finalHost = appServer;
        let routerHost: string | undefined;
        let routerPort: number | undefined;

        for (let i = 0; i < parts.length; i += 2) {
            if (parts[i] === 'H' && parts[i + 1]) {
                if (!routerHost) {
                    routerHost = parts[i + 1];
                } else {
                    finalHost = parts[i + 1];
                }
            } else if (parts[i] === 'S' && parts[i + 1]) {
                routerPort = parseInt(parts[i + 1]);
            }
        }

        return { finalHost, routerHost, routerPort };
    }

    getSapLogonIniPath(): string {
        return this.sapLogonIniPath;
    }

    hasSapGuiInstalled(): boolean {
        return this.sapLogonIniPath !== '' && fs.existsSync(this.sapLogonIniPath);
    }
}
