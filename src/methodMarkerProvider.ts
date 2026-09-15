import * as vscode from 'vscode';

const markerFor = (name: string): string => `// ===== ${name} =====`;

function collectMethodSymbols(symbols: readonly vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
    const methods: vscode.DocumentSymbol[] = [];

    for (const symbol of symbols) {
        if (symbol.kind === vscode.SymbolKind.Method || symbol.kind === vscode.SymbolKind.Constructor) {
            methods.push(symbol);
        }
        methods.push(...collectMethodSymbols(symbol.children));
    }

    return methods;
}

function declarationLine(document: vscode.TextDocument, method: vscode.DocumentSymbol): number {
    let inBlockComment = false;
    const lastLine = Math.min(method.selectionRange.start.line, method.range.end.line);

    for (let line = method.range.start.line; line <= lastLine; line += 1) {
        const text = document.lineAt(line).text.trim();
        if (inBlockComment) {
            inBlockComment = !text.includes('*/');
            continue;
        }
        if (!text || text.startsWith('//')) {
            continue;
        }
        if (text.startsWith('/*')) {
            inBlockComment = !text.includes('*/');
            continue;
        }
        return line;
    }

    return method.range.start.line;
}

export async function markMethods(document: vscode.TextDocument): Promise<boolean> {
    if (document.languageId !== 'java') {
        return false;
    }

    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        document.uri,
    );
    if (!symbols?.length) {
        return false;
    }

    const edit = new vscode.WorkspaceEdit();
    for (const method of collectMethodSymbols(symbols)) {
        const methodLine = declarationLine(document, method);
        if (methodLine === 0) {
            continue;
        }

        const marker = markerFor(method.name);
        const precedingLine = document.lineAt(methodLine - 1).text.trim();
        if (precedingLine !== marker) {
            const indentation = document.lineAt(methodLine).text.match(/^\s*/)?.[0] ?? '';
            edit.insert(document.uri, new vscode.Position(methodLine, 0), `${indentation}${marker}\n`);
        }
    }

    return edit.size > 0 && vscode.workspace.applyEdit(edit);
}
