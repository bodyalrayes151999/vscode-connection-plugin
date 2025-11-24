import * as vscode from 'vscode';
import { SapConnectionManager, SapConnection } from '../managers/SapConnectionManager';

export class ConnectionUIProvider {
    constructor(
        private context: vscode.ExtensionContext,
        private connectionManager: SapConnectionManager
    ) {}

    async showConnectionDialog(): Promise<SapConnection | undefined> {
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
