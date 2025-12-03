# Diff-Focus VS Code Extension

VS Code extension for diff analysis. Analyze code changes directly in your editor and get instant context cards for code reviews.

## Features

- 🔍 **Diff Analysis**: Analyze any file or selection in VS Code
- 🎯 **Risk Assessment**: Get instant risk level categorization
- 📋 **Context Cards**: View analysis results in a side panel
- 🚩 **Smart Flags**: Automatic detection of dangerous operations and patterns

## Installation

1. Clone this repository
2. Run `npm install`
3. Press `F5` to open a new Extension Development Host window
4. Use the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run "Analyze Diff"

## Building

```bash
npm install
npm run compile
```

## Packaging

```bash
npm install -g vsce
vsce package
```

## Usage

1. Open any file in VS Code
2. Use Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Run "Diff-Focus: Analyze Diff"
4. View the analysis in the side panel

## License

MIT

