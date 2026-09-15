import * as vscode from 'vscode';
import { markMethods } from './methodMarkerProvider';

export function activate(context: vscode.ExtensionContext): void {
    const processingDocuments = new Set<string>();
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            const key = document.uri.toString();
            if (processingDocuments.has(key)) {
                return;
            }

            processingDocuments.add(key);
            try {
                await markMethods(document);
            } finally {
                processingDocuments.delete(key);
            }
        }),
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
