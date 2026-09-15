import * as assert from 'assert';
import * as vscode from 'vscode';
import { markMethods } from '../methodMarkerProvider';

async function javaDocument(contents: string): Promise<vscode.TextDocument> {
    return vscode.workspace.openTextDocument({ language: 'java', content: contents });
}

suite('Method Markers', () => {
    let symbolProvider: vscode.Disposable;

    setup(() => {
        symbolProvider = vscode.languages.registerDocumentSymbolProvider('java', {
            provideDocumentSymbols(document) {
                const className = document.getText().match(/class\s+(\w+)/)?.[1] ?? '';
                const symbols: vscode.DocumentSymbol[] = [];
                const declaration = /^\s*(?:public|protected|private)?\s*(?:static\s+)?(?:[\w<>, ?]+\s+)?(\w+)\s*\([^;]*\)\s*{/;

                for (let line = 0; line < document.lineCount; line += 1) {
                    const name = document.lineAt(line).text.match(declaration)?.[1];
                    if (!name || name === 'if' || name === 'for' || name === 'while') {
                        continue;
                    }
                    const markerLine = line > 0 && document.lineAt(line - 1).text.trim() === `// ===== ${name} =====`;
                    const rangeStart = markerLine ? line - 1 : line;
                    const range = new vscode.Range(rangeStart, 0, line, document.lineAt(line).text.length);
                    const selectionRange = new vscode.Range(line, 0, line, document.lineAt(line).text.length);
                    const kind = name === className ? vscode.SymbolKind.Constructor : vscode.SymbolKind.Method;
                    symbols.push(new vscode.DocumentSymbol(name, '', kind, range, selectionRange));
                }
                return symbols;
            },
        });
    });

    teardown(() => symbolProvider.dispose());

    test('adds markers for methods and constructors', async function () {
        this.timeout(10000);
        const document = await javaDocument([
            'public class Sample {',
            '    public Sample() {}',
            '    public void first() {}',
            '    public void second(String value) {}',
            '}',
        ].join('\n'));

        await markMethods(document);
        assert.match(document.getText(), / {4}\/\/ ===== Sample =====\r?\n {4}public Sample/);
        assert.match(document.getText(), / {4}\/\/ ===== first =====\r?\n {4}public void first/);
        assert.match(document.getText(), / {4}\/\/ ===== second =====\r?\n {4}public void second/);
    });

    test('does not duplicate existing markers', async function () {
        this.timeout(10000);
        const document = await javaDocument([
            'public class Sample {',
            '    // ===== run =====',
            '    public void run() {}',
            '}',
        ].join('\n'));

        await markMethods(document);
        await markMethods(document);
        assert.strictEqual((document.getText().match(/===== run =====/g) ?? []).length, 1);
    });

    test('marks every overloaded method', async function () {
        this.timeout(10000);
        const document = await javaDocument([
            'public class Sample {',
            '    public void upload() {}',
            '    public void upload(String path) {}',
            '}',
        ].join('\n'));

        await markMethods(document);
        assert.strictEqual((document.getText().match(/===== upload =====/g) ?? []).length, 2);
    });

    test('preserves an existing user comment', async function () {
        this.timeout(10000);
        const document = await javaDocument([
            'public class Sample {',
            '    // A user comment',
            '    public void run() {}',
            '}',
        ].join('\n'));

        await markMethods(document);
        assert.match(document.getText(), /\/\/ A user comment\r?\n {4}\/\/ ===== run =====\r?\n {4}public void run/);
    });

    test('ignores non-Java documents', async () => {
        const document = await vscode.workspace.openTextDocument({ language: 'typescript', content: 'function run() {}' });
        assert.strictEqual(await markMethods(document), false);
        assert.strictEqual(document.getText(), 'function run() {}');
    });
});
