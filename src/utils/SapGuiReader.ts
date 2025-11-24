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
    private sapLogonFilePath: string = '';
    private fileType: 'xml' | 'ini' | '' = '';

    constructor() {
        this.findSapLogonFile();
    }

    private findSapLogonFile(): void {
        // Check for XML format first (newer)
        const xmlPaths = [
            path.join(process.env.APPDATA || '', 'SAP', 'Common', 'SAPUILandscape.xml'),
            path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'SAP', 'Common', 'SAPUILandscape.xml'),
            'C:\\Users\\Public\\SAP\\Common\\SAPUILandscape.xml'
        ];

        for (const p of xmlPaths) {
            if (fs.existsSync(p)) {
                this.sapLogonFilePath = p;
                this.fileType = 'xml';
                console.log(`Found SAPUILandscape.xml at: ${p}`);
                return;
            }
        }

        // Fall back to INI format (older)
        const iniPaths = [
            path.join(process.env.APPDATA || '', 'SAP', 'Common', 'saplogon.ini'),
            path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'SAP', 'Common', 'saplogon.ini'),
            'C:\\Users\\Public\\SAP\\Common\\saplogon.ini',
            'C:\\ProgramData\\SAP\\saplogon.ini',
            path.join(process.env.SYSTEMROOT || 'C:\\Windows', 'saplogon.ini')
        ];

        for (const p of iniPaths) {
            if (fs.existsSync(p)) {
                this.sapLogonFilePath = p;
                this.fileType = 'ini';
                console.log(`Found saplogon.ini at: ${p}`);
                return;
            }
        }
    }

    async readSapGuiConnections(): Promise<SapGuiConnection[]> {
        if (!this.sapLogonFilePath || !fs.existsSync(this.sapLogonFilePath)) {
            return [];
        }

        try {
            const content = fs.readFileSync(this.sapLogonFilePath, 'utf-8');
            
            if (this.fileType === 'xml') {
                return this.parseSapUILandscapeXml(content);
            } else {
                return this.parseSapLogonIni(content);
            }
        } catch (error) {
            console.error('Error reading SAP Logon file:', error);
            return [];
        }
    }

    private parseSapUILandscapeXml(content: string): SapGuiConnection[] {
        const connections: SapGuiConnection[] = [];

        try {
            // Extract all <Service> entries with their properties
            const serviceRegex = /<Service[^>]*name="([^"]*)"[^>]*type="SAPGUI"[^>]*>([\s\S]*?)<\/Service>/gi;
            let serviceMatch;

            while ((serviceMatch = serviceRegex.exec(content)) !== null) {
                const serviceName = serviceMatch[1];
                const serviceContent = serviceMatch[2];

                // Helper to extract Item values
                const getValue = (key: string): string | undefined => {
                    const itemRegex = new RegExp(`<Item[^>]*name="${key}"[^>]*value="([^"]*)"`, 'i');
                    const match = serviceContent.match(itemRegex);
                    return match ? match[1] : undefined;
                };

                const systemId = getValue('SystemId') || getValue('SID') || getValue('sid');
                const server = getValue('Server') || getValue('server') || getValue('ashost');
                const systemNumber = getValue('SystemNumber') || getValue('systemnumber') || getValue('sysnr');
                const client = getValue('Client') || getValue('client');
                const router = getValue('Router') || getValue('router') || getValue('SAPRouter') || getValue('saprouter');
                const description = getValue('Description') || getValue('description');

                // Only add if we have minimum required fields
                if (systemId && server && systemNumber) {
                    connections.push({
                        name: serviceName,
                        description: description || serviceName,
                        application_server: server,
                        server: server,
                        system_number: systemNumber.padStart(2, '0'),
                        system_id: systemId.toUpperCase(),
                        client: client,
                        saprouter: router,
                        router: router
                    });
                }
            }
        } catch (error) {
            console.error('Error parsing SAPUILandscape.xml:', error);
        }

        return connections;
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
        return this.sapLogonFilePath;
    }

    hasSapGuiInstalled(): boolean {
        return this.sapLogonFilePath !== '' && fs.existsSync(this.sapLogonFilePath);
    }

    getFileType(): string {
        return this.fileType;
    }
}
