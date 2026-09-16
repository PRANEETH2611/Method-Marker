import * as vscode from 'vscode';
import { markMethods } from './methodMarkerProvider';

// ===== activate =====
export function activate(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        // ===== vscode.workspace.onDidSaveTextDocument() callback =====
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            await markMethods(document);
        }),
        // ===== vscode.commands.registerCommand('method-markers.markMethods') callback =====
        vscode.commands.registerCommand('method-markers.markMethods', async () => {
            const document = vscode.window.activeTextEditor?.document;
            if (document) {
                await markMethods(document);
            }
        }),
    );
}

// ===== deactivate =====
export function deactivate(): void {
    // No resources to dispose beyond extension subscriptions.
}
