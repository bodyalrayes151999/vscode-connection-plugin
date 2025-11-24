import * as vscode from 'vscode';
import { SapConnectionManager, SapConnection } from '../managers/SapConnectionManager';
import { SapGuiReader } from '../utils/SapGuiReader';
import { SapShcutHelper } from '../utils/SapShcutHelper';

export class ConnectionUIProvider {
    private sapGuiReader: SapGuiReader;
    private sapShcutHelper: SapShcutHelper;

    constructor(
        private context: vscode.ExtensionContext,
        private connectionManager: SapConnectionManager
    ) {
        this.sapGuiReader = new SapGuiReader();
        this.sapShcutHelper = new SapShcutHelper();
    }

    async showConnectionDialog(): Promise<SapConnection | undefined> {
        // First, check if SAP GUI is installed and offer to import
        if (this.sapGuiReader.hasSapGuiInstalled()) {
            const action = await vscode.window.showInformationMessage(
                'SAP GUI installation detected. Would you like to import connections from SAP Logon?',
                'Import from SAP GUI',
                'Manual Entry'
            );

            if (action === 'Import from SAP GUI') {
                return await this.showSapGuiImportDialog();
            }
        }

        return await this.showManualConnectionDialog();
    }

    private async showSapGuiImportDialog(): Promise<SapConnection | undefined> {
        const guiConnections = await this.sapGuiReader.readSapGuiConnections();
        
        if (guiConnections.length === 0) {
            vscode.window.showWarningMessage('No SAP GUI connections found. Using manual entry.');
            return await this.showManualConnectionDialog();
        }

        const items = guiConnections.map(conn => ({
            label: conn.description || conn.name,
            description: `${conn.server || conn.application_server} (${conn.system_id})`,
            detail: conn.saprouter ? `SAP Router: ${conn.saprouter}` : undefined,
            connection: conn
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select SAP system from SAP Logon'
        });

        if (!selected) {
            return undefined;
        }

        // Ask for client number
        const client = await vscode.window.showInputBox({
            prompt: 'Enter SAP Client (Mandant)',
            placeHolder: '500',
            value: selected.connection.client || '500',
            validateInput: (value) => {
                if (!value || !/^\d{3}$/.test(value)) {
                    return 'Client must be a 3-digit number (e.g., 500)';
                }
                return null;
            }
        });

        if (!client) {
            return undefined;
        }

        // Ask for username and password
        const username = await vscode.window.showInputBox({
            prompt: 'Enter your SAP username',
            placeHolder: 'SAP_USER'
        });

        if (!username) {
            return undefined;
        }

        const password = await vscode.window.showInputBox({
            prompt: 'Enter your SAP password',
            password: true
        });

        if (!password) {
            return undefined;
        }

        // Convert to VSCode connection
        const partialConnection = this.sapGuiReader.convertToVSCodeConnection(selected.connection, username);
        const connection: SapConnection = {
            name: partialConnection.name || selected.connection.name,
            host: partialConnection.host || '',
            port: partialConnection.port || 443,
            client: client,  // Use the client entered by user
            systemId: partialConnection.systemId || '',
            saprouter: partialConnection.saprouter,
            secure: partialConnection.secure !== undefined ? partialConnection.secure : true,
            username: username,
            password: password
        };

        // If SAP Router is configured, ask user if they want to use it
        if (connection.saprouter) {
            const choice = await vscode.window.showQuickPick(
                [
                    { 
                        label: '$(desktop-download) Open in SAP GUI', 
                        description: 'Use SAP GUI to handle the connection (Recommended)',
                        value: 'sapgui' 
                    },
                    { 
                        label: '$(globe) Direct Connection (VPN)', 
                        description: 'Skip SAP Router if you are on VPN', 
                        value: 'direct' 
                    },
                    {
                        label: '$(debug-disconnect) Try SAP Router Protocol',
                        description: 'Experimental - may require router permissions',
                        value: 'router'
                    }
                ],
                {
                    placeHolder: `This system uses SAP Router: ${connection.saprouter}`
                }
            );

            if (!choice) {
                return undefined;
            }

            if (choice.value === 'sapgui') {
                // Use SAP GUI to connect
                if (this.sapShcutHelper.hasSapShcut()) {
                    try {
                        await this.sapShcutHelper.connectWithSapShcut(
                            selected.connection.name,
                            client,
                            username
                        );
                        vscode.window.showInformationMessage(`Launched SAP GUI for ${connection.name}`);
                        // Don't test connection since we're using SAP GUI
                        return connection;
                    } catch (error: any) {
                        vscode.window.showErrorMessage(`Failed to launch SAP GUI: ${error.message}`);
                        return undefined;
                    }
                } else {
                    vscode.window.showErrorMessage('SAP GUI (sapshcut.exe) not found. Please install SAP GUI.');
                    return undefined;
                }
            } else if (choice.value === 'direct') {
                delete connection.saprouter;
                vscode.window.showInformationMessage('SAP Router disabled. Using direct connection.');
            }
            // If 'router', keep the saprouter and continue to test
        }

        // Test and save connection
        const result = await this.connectionManager.testConnection(connection);
        
        if (result.success) {
            await this.connectionManager.addConnection(connection);
            await this.connectionManager.setActiveConnection(connection.name);
            vscode.window.showInformationMessage(`Connected to SAP system: ${connection.name}`);
            return connection;
        } else {
            vscode.window.showErrorMessage(`Connection failed: ${result.message}`);
            return undefined;
        }
    }

    private async showManualConnectionDialog(): Promise<SapConnection | undefined> {
        const panel = vscode.window.createWebviewPanel(
            'sapConnection',
            'SAP System Connection',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getConnectionFormHtml();

        return new Promise((resolve) => {
            panel.webview.onDidReceiveMessage(
                async (message) => {
                    switch (message.command) {
                        case 'connect':
                            const connection: SapConnection = {
                                name: message.data.name,
                                host: message.data.host,
                                port: parseInt(message.data.port),
                                client: message.data.client,
                                systemId: message.data.systemId,
                                secure: message.data.secure,
                                username: message.data.username,
                                password: message.data.password
                            };

                            // Test connection
                            const result = await this.connectionManager.testConnection(connection);
                            
                            if (result.success) {
                                await this.connectionManager.addConnection(connection);
                                await this.connectionManager.setActiveConnection(connection.name);
                                panel.dispose();
                                vscode.window.showInformationMessage(`Connected to SAP system: ${connection.name}`);
                                resolve(connection);
                            } else {
                                panel.webview.postMessage({
                                    command: 'error',
                                    message: result.message
                                });
                            }
                            break;
                        
                        case 'cancel':
                            panel.dispose();
                            resolve(undefined);
                            break;
                    }
                },
                undefined,
                this.context.subscriptions
            );
        });
    }

    private getConnectionFormHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SAP Connection</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        
        h1 {
            color: var(--vscode-textLink-activeForeground);
            border-bottom: 1px solid var(--vscode-textSeparator-foreground);
            padding-bottom: 10px;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        
        input[type="text"],
        input[type="password"],
        input[type="number"] {
            width: 100%;
            padding: 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
        }
        
        input[type="checkbox"] {
            margin-right: 5px;
        }
        
        .button-group {
            margin-top: 20px;
            display: flex;
            gap: 10px;
        }
        
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: 13px;
        }
        
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .error {
            color: var(--vscode-errorForeground);
            margin-top: 10px;
            padding: 10px;
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 2px;
            display: none;
        }
        
        .info-text {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <h1>Connect to SAP System</h1>
    
    <form id="connectionForm">
        <div class="form-group">
            <label for="name">Connection Name:</label>
            <input type="text" id="name" required placeholder="Production System" />
            <div class="info-text">A friendly name for this connection</div>
        </div>
        
        <div class="form-group">
            <label for="host">Host:</label>
            <input type="text" id="host" required placeholder="sap.company.com" />
            <div class="info-text">SAP server hostname or IP address</div>
        </div>
        
        <div class="form-group">
            <label for="port">Port:</label>
            <input type="number" id="port" value="443" required />
            <div class="info-text">Typically 443 for HTTPS or 8000 for HTTP</div>
        </div>
        
        <div class="form-group">
            <label for="client">Client:</label>
            <input type="text" id="client" required placeholder="100" maxlength="3" />
            <div class="info-text">SAP client number (3 digits)</div>
        </div>
        
        <div class="form-group">
            <label for="systemId">System ID:</label>
            <input type="text" id="systemId" required placeholder="PRD" maxlength="3" />
            <div class="info-text">SAP System ID (SID)</div>
        </div>
        
        <div class="form-group">
            <label for="saprouter">SAP Router (Optional):</label>
            <input type="text" id="saprouter" placeholder="/H/router.company.com/S/3299" />
            <div class="info-text">SAP Router string (e.g., /H/host/S/port/H/host2)</div>
        </div>
        
        <div class="form-group">
            <label>
                <input type="checkbox" id="secure" checked />
                Use HTTPS (Secure Connection)
            </label>
        </div>
        
        <div class="form-group">
            <label for="username">Username:</label>
            <input type="text" id="username" required placeholder="SAP_USER" />
        </div>
        
        <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" required />
            <div class="info-text">Your SAP password (stored securely)</div>
        </div>
        
        <div id="errorMessage" class="error"></div>
        
        <div class="button-group">
            <button type="submit" class="btn-primary">Connect</button>
            <button type="button" class="btn-secondary" onclick="cancel()">Cancel</button>
        </div>
    </form>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        document.getElementById('connectionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('name').value,
                host: document.getElementById('host').value,
                port: document.getElementById('port').value,
                client: document.getElementById('client').value,
                systemId: document.getElementById('systemId').value,
                saprouter: document.getElementById('saprouter').value.trim() || undefined,
                secure: document.getElementById('secure').checked,
                username: document.getElementById('username').value,
                password: document.getElementById('password').value
            };
            
            vscode.postMessage({
                command: 'connect',
                data: formData
            });
            
            // Show loading state
            document.querySelector('.btn-primary').textContent = 'Connecting...';
            document.querySelector('.btn-primary').disabled = true;
        });
        
        function cancel() {
            vscode.postMessage({ command: 'cancel' });
        }
        
        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.command === 'error') {
                const errorDiv = document.getElementById('errorMessage');
                errorDiv.textContent = message.message;
                errorDiv.style.display = 'block';
                
                document.querySelector('.btn-primary').textContent = 'Connect';
                document.querySelector('.btn-primary').disabled = false;
            }
        });
    </script>
</body>
</html>`;
    }

    async showConnectionList(): Promise<void> {
        const connections = this.connectionManager.getConnections();
        
        if (connections.length === 0) {
            const action = await vscode.window.showInformationMessage(
                'No SAP connections configured',
                'Add Connection'
            );
            
            if (action === 'Add Connection') {
                await this.showConnectionDialog();
            }
            return;
        }

        const items = connections.map(conn => ({
            label: conn.name,
            description: `${conn.host}:${conn.port} (Client: ${conn.client})`,
            detail: `System ID: ${conn.systemId}`,
            connection: conn
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select SAP connection'
        });

        if (selected) {
            await this.connectionManager.setActiveConnection(selected.connection.name);
            vscode.window.showInformationMessage(`Active connection: ${selected.connection.name}`);
        }
    }
}
