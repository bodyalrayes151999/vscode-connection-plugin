import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "vscode-connection-plugin" is now active!');

	let disposable = vscode.commands.registerCommand('vscode-connection-plugin.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from VSCode Connection Plugin!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
