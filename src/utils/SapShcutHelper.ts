import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface SapShcutConnection {
    system: string;
    client: string;
    user: string;
    password: string;
    language?: string;
}

export class SapShcutHelper {
    private sapShcutPath: string = '';

    constructor() {
        this.findSapShcut();
    }

    private findSapShcut(): void {
        const possiblePaths = [
            'C:\\Program Files (x86)\\SAP\\FrontEnd\\SapGui\\sapshcut.exe',
            'C:\\Program Files\\SAP\\FrontEnd\\SapGui\\sapshcut.exe',
            path.join(process.env.ProgramFiles || 'C:\\Program Files', 'SAP', 'FrontEnd', 'SapGui', 'sapshcut.exe'),
            path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'SAP', 'FrontEnd', 'SapGui', 'sapshcut.exe')
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                this.sapShcutPath = p;
                console.log(`Found sapshcut.exe at: ${p}`);
                break;
            }
        }
    }

    hasSapShcut(): boolean {
        return this.sapShcutPath !== '' && fs.existsSync(this.sapShcutPath);
    }

    /**
     * Launch SAP GUI connection using sapshcut
     * This leverages SAP GUI's native router handling
     */
    async connectWithSapShcut(systemId: string, client: string, user: string): Promise<boolean> {
        if (!this.hasSapShcut()) {
            throw new Error('sapshcut.exe not found. Please install SAP GUI.');
        }

        return new Promise((resolve, reject) => {
            // sapshcut parameters:
            // -system=<system_id> - System ID from SAPUILandscape.xml
            // -client=<client> - Client number
            // -user=<username> - Username
            // -pw=<password> - Password (optional, will prompt)
            // -language=EN - Language
            
            const args = [
                `-system=${systemId}`,
                `-client=${client}`,
                `-user=${user}`,
                `-language=EN`
            ];

            console.log(`Launching SAP GUI: ${this.sapShcutPath} ${args.join(' ')}`);

            const child = cp.spawn(this.sapShcutPath, args, {
                detached: true,
                stdio: 'ignore'
            });

            child.unref();

            // Give it a moment to start
            setTimeout(() => {
                resolve(true);
            }, 1000);

            child.on('error', (error) => {
                console.error('sapshcut error:', error);
                reject(error);
            });
        });
    }

    /**
     * Get system ID from connection name by looking up in SAPUILandscape.xml
     */
    getSystemIdFromName(systemName: string): string | undefined {
        // This would need to parse the XML or use the SapGuiReader
        // For now, return the system name as-is
        return systemName;
    }
}
