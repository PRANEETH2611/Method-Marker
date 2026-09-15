import * as assert from 'assert';
import * as vscode from 'vscode';
import { markMethods, supportedLanguages } from '../methodMarkerProvider';

async function documentFor(language: string, contents: string): Promise<vscode.TextDocument> {
    return vscode.workspace.openTextDocument({ language, content: contents });
}

function markerFor(language: string, name: string): string {
    return `${supportedLanguages[language].commentPrefix} ===== ${name} =====`;
}

suite('Method Markers', () => {
    let symbolProvider: vscode.Disposable;

    setup(() => {
        symbolProvider = vscode.languages.registerDocumentSymbolProvider(Object.keys(supportedLanguages), {
            provideDocumentSymbols(document) {
                const symbols: vscode.DocumentSymbol[] = [];
                const classSymbols: vscode.DocumentSymbol[] = [];

                for (let line = 0; line < document.lineCount; line += 1) {
                    const text = document.lineAt(line).text;
                    const match = text.match(/symbol:(\w+)(?::(constructor|nested))?/);
                    if (!match) {
                        continue;
                    }

                    const name = match[1];
                    const previousLine = line > 0 ? document.lineAt(line - 1).text.trim() : '';
                    const rangeStart = previousLine === markerFor(document.languageId, name) ? line - 1 : line;
                    const range = new vscode.Range(rangeStart, 0, line, text.length);
                    const selectionRange = new vscode.Range(line, 0, line, text.length);
                    const kind = match[2] === 'constructor' ? vscode.SymbolKind.Constructor : vscode.SymbolKind.Function;
                    const symbol = new vscode.DocumentSymbol(name, '', kind, range, selectionRange);

                    if (match[2] === 'nested') {
                        classSymbols.push(symbol);
                    } else {
                        symbols.push(symbol);
                    }
                }

                if (classSymbols.length > 0) {
                    const range = new vscode.Range(0, 0, document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
                    const container = new vscode.DocumentSymbol('Container', '', vscode.SymbolKind.Class, range, range);
                    container.children = classSymbols;
                    symbols.push(container);
                }
                return symbols;
            },
        });
    });

    teardown(() => symbolProvider.dispose());

    test('marks Java methods, constructors, and overloads', async () => {
        const document = await documentFor('java', [
            'public class Sample {',
            '    public Sample() {} // symbol:Sample:constructor',
            '    public void upload() {} // symbol:upload',
            '    public void upload(String path) {} // symbol:upload',
            '}',
        ].join('\n'));

        await markMethods(document);
        assert.match(document.getText(), / {4}\/\/ ===== Sample =====\r?\n {4}public Sample/);
        assert.strictEqual((document.getText().match(/===== upload =====/g) ?? []).length, 2);
    });

    test('uses hash markers for Python functions and nested class methods', async () => {
        const document = await documentFor('python', [
            'def upload_document(): # symbol:upload_document',
            '    pass',
            '',
            'class Service:',
            '    def create_user(self): # symbol:create_user:nested',
            '        pass',
        ].join('\n'));

        await markMethods(document);
        assert.match(document.getText(), /^# ===== upload_document =====\r?\ndef upload_document/m);
        assert.match(document.getText(), / {4}# ===== create_user =====\r?\n {4}def create_user/);
    });

    test('marks JavaScript, TypeScript, and C functions with slash markers', async () => {
        for (const [language, declaration, name] of [
            ['javascript', 'function fetchUser() {}', 'fetchUser'],
            ['typescript', 'async function loadUser(): Promise<void> {}', 'loadUser'],
            ['c', 'int calculate_total(void) { return 0; }', 'calculate_total'],
        ]) {
            const document = await documentFor(language, `${declaration} // symbol:${name}`);
            await markMethods(document);
            assert.match(document.getText(), new RegExp(`^// ===== ${name} =====\\r?\\n`));
        }
    });

    test('configures every supported language with the correct marker prefix', () => {
        const hashCommentLanguages = ['python', 'ruby', 'shellscript'];
        const expectedLanguages = [
            'c', 'cpp', 'csharp', 'go', 'java', 'javascript', 'javascriptreact', 'kotlin', 'php',
            'python', 'ruby', 'rust', 'shellscript', 'typescript', 'typescriptreact',
        ];

        assert.deepStrictEqual(Object.keys(supportedLanguages).sort(), expectedLanguages);
        for (const [language, config] of Object.entries(supportedLanguages)) {
            assert.strictEqual(config.commentPrefix, hashCommentLanguages.includes(language) ? '#' : '//', language);
        }
    });

    test('does not duplicate markers when a symbol range includes the existing marker', async () => {
        const document = await documentFor('java', [
            'public class Sample {',
            '    // ===== run =====',
            '    public void run() {} // symbol:run',
            '}',
        ].join('\n'));

        await markMethods(document);
        await markMethods(document);
        assert.strictEqual((document.getText().match(/===== run =====/g) ?? []).length, 1);
    });

    test('preserves existing user comments', async () => {
        const document = await documentFor('python', [
            '# A user comment',
            'def calculate_total(): # symbol:calculate_total',
            '    pass',
        ].join('\n'));

        await markMethods(document);
        assert.match(document.getText(), /# A user comment\r?\n# ===== calculate_total =====\r?\ndef calculate_total/);
    });

    test('is idempotent across repeated marker operations', async () => {
        const document = await documentFor('typescript', 'function run() {} // symbol:run');
        await markMethods(document);
        const onceMarked = document.getText();
        await markMethods(document);
        assert.strictEqual(document.getText(), onceMarked);
    });

    test('ignores unsupported languages', async () => {
        const document = await documentFor('json', '{ "value": true }');
        assert.strictEqual(await markMethods(document), false);
        assert.strictEqual(document.getText(), '{ "value": true }');
    });
});
