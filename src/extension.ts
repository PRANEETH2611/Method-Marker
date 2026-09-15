import * as vscode from 'vscode';
import { markMethods } from './methodMarkerProvider';

export function activate(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((document) => void markMethods(document)),
        vscode.commands.registerCommand('method-markers.markMethods', async () => {
            const document = vscode.window.activeTextEditor?.document;
            if (document) {
                await markMethods(document);
            }
        }),
    );
}

export function deactivate(): void {
    // No resources to dispose beyond extension subscriptions.
}
