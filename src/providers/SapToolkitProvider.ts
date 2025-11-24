import * as vscode from 'vscode';

export interface SapComponent {
    name: string;
    version: string;
    featureGroup: string;
    type: 'toolkit' | 'application' | 'runtime';
    installed: boolean;
    description?: string;
}

export class SapToolkitProvider implements vscode.TreeDataProvider<SapComponentItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SapComponentItem | undefined | null | void> = new vscode.EventEmitter<SapComponentItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SapComponentItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private components: SapComponent[] = [
        {
            name: 'UI development toolkit for HTML5 (Developer Edition)',
            version: '1.44.14',
            featureGroup: 'com.sap.ide.ui5.cloud.feature.feature.group',
            type: 'toolkit',
            installed: false,
            description: 'Core UI5 development toolkit for HTML5 applications'
        },
        {
            name: 'SAPUI5 Application Development (Developer Edition)',
            version: '1.44.14',
            featureGroup: 'com.sap.ide.ui5.app.feature.feature.group',
            type: 'application',
            installed: true,
            description: 'Application development tools for SAPUI5'
        },
        {
            name: 'SAPUI5 Runtime (Client-side Components)',
            version: '1.44.14',
            featureGroup: 'com.sap.ui5.uiLib.feature.feature.group',
            type: 'runtime',
            installed: false,
            description: 'Client-side runtime components for SAPUI5'
        },
        {
            name: 'SAPUI5 Runtime (Server-side Components)',
            version: '1.44.14',
            featureGroup: 'com.sap.ui5.runtime.feature.feature.group',
            type: 'runtime',
            installed: true,
            description: 'Server-side runtime components for SAPUI5'
        }
    ];

    constructor(private workspaceRoot: string | undefined) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SapComponentItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SapComponentItem): Thenable<SapComponentItem[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('No workspace opened');
            return Promise.resolve([]);
        }

        if (!element) {
            // Return root level items
            return Promise.resolve(this.components.map(comp => new SapComponentItem(
                comp,
                vscode.TreeItemCollapsibleState.None
            )));
        }

        return Promise.resolve([]);
    }

    async installComponent(component: SapComponent) {
        // Simulate installation
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Installing ${component.name}...`,
            cancellable: true
        }, async (progress, token) => {
            for (let i = 0; i <= 100; i += 10) {
                if (token.isCancellationRequested) {
                    break;
                }
                progress.report({ increment: 10, message: `${i}% complete` });
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            component.installed = true;
            this.refresh();
            vscode.window.showInformationMessage(`Successfully installed ${component.name}`);
        });
    }
}

export class SapComponentItem extends vscode.TreeItem {
    constructor(
        public readonly component: SapComponent,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(component.name, collapsibleState);
        
        const showVersion = vscode.workspace.getConfiguration('sapToolkit').get('showVersions', true);
        
        // Set the description (shows version and feature group)
        this.description = showVersion ? `v${component.version}` : '';
        
        // Set tooltip
        this.tooltip = this.makeTooltip();
        
        // Set context value for menu commands
        this.contextValue = 'component';
        
        // Set icon based on component type and installation status
        this.iconPath = this.getIcon();
    }

    private makeTooltip(): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${this.component.name}**\n\n`);
        md.appendMarkdown(`Version: \`${this.component.version}\`\n\n`);
        md.appendMarkdown(`Feature Group: \`${this.component.featureGroup}\`\n\n`);
        md.appendMarkdown(`Type: ${this.component.type}\n\n`);
        md.appendMarkdown(`Status: ${this.component.installed ? '✅ Installed' : '⬇️ Not Installed'}\n\n`);
        if (this.component.description) {
            md.appendMarkdown(`*${this.component.description}*`);
        }
        return md;
    }

    private getIcon(): vscode.ThemeIcon {
        if (this.component.installed) {
            return new vscode.ThemeIcon('verified-filled', new vscode.ThemeColor('charts.green'));
        }
        
        switch (this.component.type) {
            case 'toolkit':
                return new vscode.ThemeIcon('tools');
            case 'application':
                return new vscode.ThemeIcon('code');
            case 'runtime':
                return new vscode.ThemeIcon('server-process');
            default:
                return new vscode.ThemeIcon('package');
        }
    }
}
