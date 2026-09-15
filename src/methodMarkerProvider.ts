import * as vscode from 'vscode';

interface LanguageConfig {
    readonly commentPrefix: '//' | '#';
}

export const supportedLanguages: Readonly<Record<string, LanguageConfig>> = {
    java: { commentPrefix: '//' },
    javascript: { commentPrefix: '//' },
    typescript: { commentPrefix: '//' },
    javascriptreact: { commentPrefix: '//' },
    typescriptreact: { commentPrefix: '//' },
    c: { commentPrefix: '//' },
    cpp: { commentPrefix: '//' },
    csharp: { commentPrefix: '//' },
    go: { commentPrefix: '//' },
    rust: { commentPrefix: '//' },
    kotlin: { commentPrefix: '//' },
    php: { commentPrefix: '//' },
    python: { commentPrefix: '#' },
    ruby: { commentPrefix: '#' },
    shellscript: { commentPrefix: '#' },
};

// ===== markerFor =====
function markerFor(name: string, config: LanguageConfig): string {
    return `${config.commentPrefix} ===== ${name} =====`;
}

// ===== collectMethodSymbols =====
function collectMethodSymbols(symbols: readonly vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
    const methods: vscode.DocumentSymbol[] = [];

    for (const symbol of symbols) {
        if (
            symbol.kind === vscode.SymbolKind.Method ||
            symbol.kind === vscode.SymbolKind.Function ||
            symbol.kind === vscode.SymbolKind.Constructor
        ) {
            methods.push(symbol);
        }
        methods.push(...collectMethodSymbols(symbol.children));
    }

    return methods;
}

// ===== declarationLine =====
function declarationLine(
    document: vscode.TextDocument,
    method: vscode.DocumentSymbol,
    config: LanguageConfig,
): number {
    let inBlockComment = false;
    const lastLine = Math.min(method.selectionRange.start.line, method.range.end.line);

    for (let line = method.range.start.line; line <= lastLine; line += 1) {
        const text = document.lineAt(line).text.trim();
        if (inBlockComment) {
            inBlockComment = !text.includes('*/');
            continue;
        }
        if (!text || text.startsWith(config.commentPrefix)) {
            continue;
        }
        if (config.commentPrefix === '//' && text.startsWith('/*')) {
            inBlockComment = !text.includes('*/');
            continue;
        }
        return line;
    }

    return method.range.start.line;
}

// ===== markMethods =====
export async function markMethods(document: vscode.TextDocument): Promise<boolean> {
    const config = supportedLanguages[document.languageId];
    if (!config) {
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
        const methodLine = declarationLine(document, method, config);
        const marker = markerFor(method.name, config);
        const precedingLine = methodLine > 0 ? document.lineAt(methodLine - 1).text.trim() : '';
        if (precedingLine !== marker) {
            const indentation = document.lineAt(methodLine).text.match(/^\s*/)?.[0] ?? '';
            edit.insert(document.uri, new vscode.Position(methodLine, 0), `${indentation}${marker}\n`);
        }
    }

    return edit.size > 0 && vscode.workspace.applyEdit(edit);
}
