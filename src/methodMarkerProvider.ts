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

const processingDocuments = new Set<string>();

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

function isGeneratedMarker(text: string, config: LanguageConfig): boolean {
    return text.startsWith(`${config.commentPrefix} ===== `) && text.endsWith(' =====');
}

function hasMarker(
    document: vscode.TextDocument,
    method: vscode.DocumentSymbol,
    declarationLine: number,
    marker: string,
    config: LanguageConfig,
): boolean {
    for (let line = declarationLine - 1; line >= 0; line -= 1) {
        const text = document.lineAt(line).text.trim();
        if (!isGeneratedMarker(text, config)) {
            break;
        }
        if (text === marker) {
            return true;
        }
    }

    const rangeEnd = Math.min(declarationLine - 1, method.range.end.line);
    for (let line = method.range.start.line; line <= rangeEnd; line += 1) {
        if (document.lineAt(line).text.trim() === marker) {
            return true;
        }
    }

    return false;
}

// ===== markMethods =====
export async function markMethods(document: vscode.TextDocument): Promise<boolean> {
    const config = supportedLanguages[document.languageId];
    if (!config) {
        return false;
    }

    const documentKey = document.uri.toString();
    if (processingDocuments.has(documentKey)) {
        return false;
    }

    processingDocuments.add(documentKey);
    try {
        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            document.uri,
        );
        if (!symbols?.length) {
            return false;
        }

        const edit = new vscode.WorkspaceEdit();
        const insertionLines = new Set<number>();
        for (const method of collectMethodSymbols(symbols)) {
            const methodLine = declarationLine(document, method, config);
            const marker = markerFor(method.name, config);
            if (!insertionLines.has(methodLine) && !hasMarker(document, method, methodLine, marker, config)) {
                const indentation = document.lineAt(methodLine).text.match(/^\s*/)?.[0] ?? '';
                edit.insert(document.uri, new vscode.Position(methodLine, 0), `${indentation}${marker}\n`);
                insertionLines.add(methodLine);
            }
        }

        return edit.size > 0 && vscode.workspace.applyEdit(edit);
    } finally {
        processingDocuments.delete(documentKey);
    }
}
