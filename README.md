# Method Markers

Method Markers makes long Java classes easier to scan by placing a compact marker directly above every method and constructor.

It runs locally inside VS Code. It does not use AI, API keys, external services, or network requests.

## Before and After

Before saving:

```java
public class DocumentService {

    private String name;

    public DocumentService() {
    }

    public void uploadDocument() {
    }

    public void uploadDocument(String path) {
    }
}
```

After saving:

```java
public class DocumentService {

    private String name;

    // ===== DocumentService =====
    public DocumentService() {
    }

    // ===== uploadDocument =====
    public void uploadDocument() {
    }

    // ===== uploadDocument =====
    public void uploadDocument(String path) {
    }
}
```

## Use

### Automatically on Save

Open a Java file and save it with `Ctrl+S` (or `Cmd+S` on macOS). Method Markers finds Java method and constructor symbols, then adds any missing markers.

### Manually

Open the Command Palette with `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS), then run:

```
Method Markers: Mark Methods
```

The command processes the active editor only.

## Behavior and Safety

- Supports Java files only.
- Uses VS Code's built-in document-symbol provider to identify methods and constructors.
- Handles multiple methods, overloaded methods, and constructors.
- Uses a single VS Code `WorkspaceEdit` for all markers found during a run.
- Checks for the expected marker immediately above each declaration before inserting it, including when the Java language provider includes comments in a symbol range.
- Preserves user comments, source code, imports, method names, and formatting. Generated comments inherit the declaration's indentation.
- Does nothing when a Java document has no method symbols or when the active document is not Java.
- Never removes existing comments, including markers produced by an earlier version of the extension.

For method detection, VS Code needs Java language support to be active, such as the Java Extension Pack or another extension that provides Java document symbols.

## Run Locally During Development

1. Open this project folder in VS Code.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Press `F5` to start an Extension Development Host.
4. In that new VS Code window, open a Java file and save it.

## Development Commands

```bash
npm run compile
npm run lint
npm test
```

`npm test` starts a VS Code Extension Development Host and runs the extension test suite.

## Requirements

- VS Code 1.85 or later
- Java language support that provides document symbols

## License

MIT License

