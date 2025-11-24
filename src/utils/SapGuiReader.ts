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
            // Extract all <Service> entries with type="SAPGUI"
            const serviceRegex = /<Service[^>]*type="SAPGUI"[^>]*>/gi;
            const matches = content.match(serviceRegex);

            if (!matches) {
                return connections;
            }

            for (const serviceTag of matches) {
                // Extract attributes from the Service tag
                const getName = (): string => {
                    const match = serviceTag.match(/name="([^"]*)"/i);
                    return match ? match[1] : '';
                };

                const getSystemId = (): string => {
                    const match = serviceTag.match(/systemid="([^"]*)"/i);
                    return match ? match[1] : '';
                };

                const getServer = (): { host: string; port: string } => {
                    const match = serviceTag.match(/server="([^"]*)"/i);
                    if (match && match[1]) {
                        const serverValue = match[1];
                        // Format: "host:port" or just "host"
                        if (serverValue.includes(':')) {
                            const [host, port] = serverValue.split(':');
                            return { host, port };
                        }
                        return { host: serverValue, port: '3200' };
                    }
                    return { host: '', port: '3200' };
                };

                const getRouterId = (): string | undefined => {
                    const match = serviceTag.match(/routerid="([^"]*)"/i);
                    return match ? match[1] : undefined;
                };

                const name = getName();
                const systemId = getSystemId();
                const serverInfo = getServer();
                const routerId = getRouterId();

                // Find router string if routerId exists
                let routerString: string | undefined;
                if (routerId) {
                    const routerRegex = new RegExp(`<Router[^>]*uuid="${routerId}"[^>]*router="([^"]*)"`, 'i');
                    const routerMatch = content.match(routerRegex);
                    if (routerMatch && routerMatch[1]) {
                        routerString = routerMatch[1].trim();
                    }
                }

                // Calculate system number from port (port format: 32NN where NN is system number)
                let systemNumber = '00';
                if (serverInfo.port) {
                    const portNum = parseInt(serverInfo.port);
                    if (portNum >= 3200 && portNum <= 3299) {
                        systemNumber = (portNum - 3200).toString().padStart(2, '0');
                    } else if (portNum >= 3300 && portNum <= 3399) {
                        systemNumber = (portNum - 3300).toString().padStart(2, '0');
                    }
                }

                // Only add if we have minimum required fields
                if (name && systemId && serverInfo.host) {
                    connections.push({
                        name: name,
                        description: name,
                        application_server: serverInfo.host,
                        server: serverInfo.host,
                        system_number: systemNumber,
                        system_id: systemId.toUpperCase(),
                        saprouter: routerString,
                        router: routerString
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
