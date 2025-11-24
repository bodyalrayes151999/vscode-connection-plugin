import * as vscode from 'vscode';
import { SapConnectionManager, BspApplication } from '../managers/SapConnectionManager';

export class BspApplicationProvider implements vscode.TreeDataProvider<BspApplicationItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<BspApplicationItem | undefined | null | void> = new vscode.EventEmitter<BspApplicationItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<BspApplicationItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private applications: BspApplication[] = [];

    constructor(private connectionManager: SapConnectionManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: BspApplicationItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: BspApplicationItem): Promise<BspApplicationItem[]> {
        if (!element) {
            // Root level - show BSP applications
            const connection = this.connectionManager.getActiveConnection();
            
            if (!connection) {
                return [new BspApplicationItem({
                    name: 'No active connection',
                    description: 'Connect to SAP system first',
                    version: '',
                    url: '',
                    namespace: ''
                }, vscode.TreeItemCollapsibleState.None, true)];
            }

            try {
                this.applications = await this.connectionManager.fetchBspApplications(connection);
                
                if (this.applications.length === 0) {
                    return [new BspApplicationItem({
                        name: 'No BSP applications found',
                        description: '',
                        version: '',
                        url: '',
                        namespace: ''
                    }, vscode.TreeItemCollapsibleState.None, true)];
                }

                return this.applications.map(app => 
                    new BspApplicationItem(app, vscode.TreeItemCollapsibleState.None, false)
                );
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to fetch BSP applications: ${error}`);
                return [];
            }
        }

        return [];
    }

    getApplication(name: string): BspApplication | undefined {
        return this.applications.find(app => app.name === name);
    }
}

export class BspApplicationItem extends vscode.TreeItem {
    constructor(
        public readonly application: BspApplication,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        private readonly isPlaceholder: boolean = false
    ) {
        super(application.name, collapsibleState);
        
        if (!isPlaceholder) {
            this.description = `v${application.version}`;
            this.tooltip = this.makeTooltip();
            this.contextValue = 'bspApplication';
            this.iconPath = new vscode.ThemeIcon('file-code');
            
            // Add command to open/download on click
            this.command = {
                command: 'sapToolkit.openBspApplication',
                title: 'Open BSP Application',
                arguments: [this.application]
            };
        } else {
            this.iconPath = new vscode.ThemeIcon('info');
        }
    }

    private makeTooltip(): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${this.application.name}**\n\n`);
        md.appendMarkdown(`Description: ${this.application.description || 'N/A'}\n\n`);
        md.appendMarkdown(`Version: \`${this.application.version}\`\n\n`);
        md.appendMarkdown(`Namespace: \`${this.application.namespace}\`\n\n`);
        if (this.application.url) {
            md.appendMarkdown(`URL: \`${this.application.url}\`\n\n`);
        }
        return md;
    }
}
