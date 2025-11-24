import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SapToolkitProvider, SapComponentItem } from './providers/SapToolkitProvider';
import { BspApplicationProvider, BspApplicationItem } from './providers/BspApplicationProvider';
import { ProjectGenerator } from './generators/ProjectGenerator';
import { SapConnectionManager, BspApplication } from './managers/SapConnectionManager';
import { ConnectionUIProvider } from './ui/ConnectionUIProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('SAP Development Toolkit is now active!');

	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

	// Initialize components
	const connectionManager = new SapConnectionManager(context);
	const sapProvider = new SapToolkitProvider(workspaceRoot);
	const bspProvider = new BspApplicationProvider(connectionManager);
	const projectGenerator = new ProjectGenerator();
	const connectionUI = new ConnectionUIProvider(context, connectionManager);
	
	// Register tree data providers
	vscode.window.registerTreeDataProvider('sapToolkitExplorer', sapProvider);
	vscode.window.registerTreeDataProvider('bspApplicationExplorer', bspProvider);
	
	// Register SAP connection commands
	const connectCommand = vscode.commands.registerCommand('sapToolkit.connectToSap', async () => {
		const connection = await connectionUI.showConnectionDialog();
		if (connection) {
			bspProvider.refresh();
		}
	});
	
	const selectConnectionCommand = vscode.commands.registerCommand('sapToolkit.selectConnection', async () => {
		await connectionUI.showConnectionList();
		bspProvider.refresh();
	});
	
	// Register BSP application commands
	const refreshBspCommand = vscode.commands.registerCommand('sapToolkit.refreshBspApplications', () => {
		bspProvider.refresh();
		vscode.window.showInformationMessage('BSP Applications refreshed!');
	});
	
	const downloadBspCommand = vscode.commands.registerCommand('sapToolkit.downloadBspApplication', async (item: BspApplicationItem) => {
		if (!item || !item.application) {
			return;
		}

		const connection = connectionManager.getActiveConnection();
		if (!connection) {
			vscode.window.showErrorMessage('No active SAP connection');
			return;
		}

		const uri = await vscode.window.showOpenDialog({
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			openLabel: 'Select Download Location'
		});

		if (uri && uri[0]) {
			const targetPath = path.join(uri[0].fsPath, item.application.name);
			
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: `Downloading ${item.application.name}...`,
				cancellable: false
			}, async (progress) => {
				try {
					await connectionManager.downloadBspApplication(connection, item.application.name, targetPath);
					vscode.window.showInformationMessage(`Downloaded ${item.application.name} to ${targetPath}`,
						'Open Folder'
					).then(selection => {
						if (selection === 'Open Folder') {
							vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(targetPath));
						}
					});
				} catch (error) {
					vscode.window.showErrorMessage(`Download failed: ${error}`);
				}
			});
		}
	});
	
	const uploadBspCommand = vscode.commands.registerCommand('sapToolkit.uploadBspApplication', async (item: BspApplicationItem) => {
		if (!item || !item.application) {
			return;
		}

		const connection = connectionManager.getActiveConnection();
		if (!connection) {
			vscode.window.showErrorMessage('No active SAP connection');
			return;
		}

		const answer = await vscode.window.showWarningMessage(
			`Upload changes to ${item.application.name}?`,
			{ modal: true },
			'Upload'
		);

		if (answer === 'Upload') {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: `Uploading ${item.application.name}...`,
				cancellable: false
			}, async (progress) => {
				try {
					const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
					await connectionManager.uploadBspApplication(connection, item.application.name, workspaceFolder);
					vscode.window.showInformationMessage(`Successfully uploaded ${item.application.name}`);
				} catch (error) {
					vscode.window.showErrorMessage(`Upload failed: ${error}`);
				}
			});
		}
	});
	
	const openBspCommand = vscode.commands.registerCommand('sapToolkit.openBspApplication', async (application: BspApplication) => {
		vscode.window.showInformationMessage(`Open BSP Application: ${application.name}`);
	});
	
	// Register refresh command
	const refreshCommand = vscode.commands.registerCommand('sapToolkit.refreshEntry', () => {
		sapProvider.refresh();
		vscode.window.showInformationMessage('SAP Toolkit refreshed!');
	});
	
	// Register install component command
	const installCommand = vscode.commands.registerCommand('sapToolkit.installComponent', (item: SapComponentItem) => {
		if (item && item.component) {
			sapProvider.installComponent(item.component);
		}
	});
	
	// Register show component details command
	const showDetailsCommand = vscode.commands.registerCommand('sapToolkit.showComponentDetails', (item: SapComponentItem) => {
		if (item && item.component) {
			showComponentDetails(item.component);
		}
	});
	
	// Register create project command
	const createProjectCommand = vscode.commands.registerCommand('sapToolkit.createProject', async () => {
		const templates = projectGenerator.getTemplates();
		const selected = await vscode.window.showQuickPick(
			templates.map(t => ({
				label: t.name,
				description: t.description,
				template: t
			})),
			{ placeHolder: 'Select a project template' }
		);
		
		if (selected) {
			const name = await vscode.window.showInputBox({
				prompt: 'Enter project name',
				placeHolder: 'my-sapui5-app',
				validateInput: (value: string) => {
					return value && value.length > 0 ? null : 'Project name is required';
				}
			});
			
			if (name) {
				const uri = await vscode.window.showOpenDialog({
					canSelectFiles: false,
					canSelectFolders: true,
					canSelectMany: false,
					openLabel: 'Select Location'
				});
				
				if (uri && uri[0]) {
					const projectPath = path.join(uri[0].fsPath, name);
					await projectGenerator.createProject(selected.template, projectPath, name);
				}
			}
		}
	});
	
	// Register debugging command
	const debugCommand = vscode.commands.registerCommand('sapToolkit.startDebugging', () => {
		vscode.window.showInformationMessage('SAP Debugging feature coming soon!');
	});
	
	// Create status bar item
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = '$(package) SAP Toolkit';
	statusBarItem.tooltip = 'SAP Development Toolkit - Click to select connection';
	statusBarItem.command = 'sapToolkit.selectConnection';
	statusBarItem.show();
	
	// Add to subscriptions
	context.subscriptions.push(
		connectCommand,
		selectConnectionCommand,
		refreshBspCommand,
		downloadBspCommand,
		uploadBspCommand,
		openBspCommand,
		refreshCommand,
		installCommand,
		showDetailsCommand,
		createProjectCommand,
		debugCommand,
		statusBarItem
	);
	
	// Show welcome message
	vscode.window.showInformationMessage('SAP Development Toolkit activated successfully!');
}

function showComponentDetails(component: any) {
	const panel = vscode.window.createWebviewPanel(
		'sapComponentDetails',
		component.name,
		vscode.ViewColumn.One,
		{
			enableScripts: true
		}
	);

	panel.webview.html = getWebviewContent(component);
}

function getWebviewContent(component: any): string {
	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>${component.name}</title>
		<style>
			body {
				font-family: var(--vscode-font-family);
				padding: 20px;
				color: var(--vscode-foreground);
				background-color: var(--vscode-editor-background);
			}
			h1 { color: var(--vscode-textLink-activeForeground); }
			.info-grid {
				display: grid;
				grid-template-columns: 150px auto;
				gap: 10px;
				margin-top: 20px;
			}
			.label { font-weight: bold; }
			.status-installed { color: #4ec9b0; }
			.status-not-installed { color: #f48771; }
		</style>
	</head>
	<body>
		<h1>${component.name}</h1>
		<div class="info-grid">
			<div class="label">Version:</div>
			<div>${component.version}</div>
			
			<div class="label">Feature Group:</div>
			<div><code>${component.featureGroup}</code></div>
			
			<div class="label">Type:</div>
			<div>${component.type}</div>
			
			<div class="label">Status:</div>
			<div class="${component.installed ? 'status-installed' : 'status-not-installed'}">
				${component.installed ? '✅ Installed' : '⬇️ Not Installed'}
			</div>
			
			<div class="label">Description:</div>
			<div>${component.description || 'No description available'}</div>
		</div>
	</body>
	</html>`;
}

export function deactivate() {
	console.log('SAP Development Toolkit is deactivated');
}
