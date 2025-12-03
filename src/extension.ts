import * as vscode from 'vscode';

interface AnalysisResult {
  riskLevel: 'Low' | 'Medium' | 'High';
  summary: string[];
  flags: Array<{ type: string; msg: string }>;
  fileTypes: string[];
}

function analyzeDiff(diffText: string): AnalysisResult {
  const analysis: AnalysisResult = {
    riskLevel: 'Low',
    summary: [],
    flags: [],
    fileTypes: []
  };

  const fileTypesSet = new Set<string>();
  const filePattern = /diff --git a\/([^\s]+)/g;
  let match;
  
  while ((match = filePattern.exec(diffText)) !== null) {
    const filepath = match[1];
    if (filepath.endsWith('.jsx') || filepath.endsWith('.tsx')) {
      fileTypesSet.add('React Component');
    } else if (filepath.endsWith('.hh') || filepath.endsWith('.php')) {
      fileTypesSet.add('Hack/PHP Backend');
    } else if (filepath.endsWith('.py')) {
      fileTypesSet.add('Python');
    } else if (filepath.endsWith('.sql')) {
      fileTypesSet.add('SQL Migration');
    } else if (filepath.endsWith('.css') || filepath.endsWith('.scss')) {
      fileTypesSet.add('Styling');
    }
  }
  
  analysis.fileTypes = Array.from(fileTypesSet);
  let riskScore = 0;
  
  if (/DROP\s+TABLE|ALTER\s+TABLE|DELETE\s+FROM|TRUNCATE/i.test(diffText)) {
    analysis.flags.push({ type: 'danger', msg: 'Destructive database operation detected.' });
    riskScore += 5;
  }
  
  if (/Auth::|PrivacyCheck|ViewerContext|\.env|config\.|secrets/i.test(diffText)) {
    analysis.flags.push({ type: 'warning', msg: 'Authentication, privacy, or config change.' });
    riskScore += 2;
  }
  
  if (/torch\.(nn\.|optim|load|save)/i.test(diffText)) {
    analysis.flags.push({ type: 'warning', msg: 'PyTorch model logic modified (FAIR team relevance).' });
    riskScore += 2;
  }
  
  if (/console\.log|var_dump|print_r|pdb\.set_trace/i.test(diffText)) {
    analysis.flags.push({ type: 'info', msg: 'Debug artifact (console.log, var_dump, etc.) left in code.' });
  }
  
  if (fileTypesSet.has('React Component') && /useEffect|useState|useContext/.test(diffText)) {
    analysis.summary.push('Modifies React component logic or hooks.');
  }
  
  if (fileTypesSet.has('Styling') && riskScore === 0) {
    analysis.summary.push('Primarily a CSS/styling update.');
  }
  
  if (fileTypesSet.has('Python') && /class.*\(nn\.Module\)/.test(diffText)) {
    analysis.summary.push('Defines or modifies a PyTorch neural network module.');
  }
  
  if (/^\+\s*\/\/\s*TODO:|^#\s*TODO:/m.test(diffText)) {
    analysis.summary.push('Contains TODO comments – may indicate incomplete work.');
  }
  
  if (analysis.summary.length === 0) {
    analysis.summary.push('General code update with no clear pattern.');
  }
  
  if (riskScore >= 5) {
    analysis.riskLevel = 'High';
  } else if (riskScore >= 2) {
    analysis.riskLevel = 'Medium';
  } else {
    analysis.riskLevel = 'Low';
  }
  
  return analysis;
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('diff-focus.analyze', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found');
      return;
    }

    const document = editor.document;
    const text = document.getText();
    
    if (!text.trim()) {
      vscode.window.showWarningMessage('No content to analyze');
      return;
    }

    const analysis = analyzeDiff(text);
    
    const panel = vscode.window.createWebviewPanel(
      'diffFocus',
      'Diff-Focus Analysis',
      vscode.ViewColumn.Beside,
      {}
    );

    const riskColor = analysis.riskLevel === 'High' ? 'red' : 
                     analysis.riskLevel === 'Medium' ? 'orange' : 'green';

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: var(--vscode-font-family); padding: 20px; }
    .risk-badge { display: inline-block; padding: 8px 16px; border-radius: 4px; 
                  background: ${riskColor === 'red' ? '#fee' : riskColor === 'orange' ? '#ffe' : '#efe'};
                  color: ${riskColor === 'red' ? '#c00' : riskColor === 'orange' ? '#c60' : '#060'};
                  font-weight: bold; margin-bottom: 20px; }
    .section { margin: 20px 0; }
    .file-type { display: inline-block; padding: 4px 8px; background: #e3f2fd; 
                 border-radius: 4px; margin: 4px; }
    .flag { padding: 8px; margin: 8px 0; border-left: 3px solid #ccc; }
    .flag.danger { border-color: #c00; background: #fee; }
    .flag.warning { border-color: #c60; background: #ffe; }
    .flag.info { border-color: #06c; background: #eef; }
  </style>
</head>
<body>
  <h1>Diff-Focus Analysis</h1>
  <div class="risk-badge">Risk Level: ${analysis.riskLevel}</div>
  
  ${analysis.fileTypes.length > 0 ? `
    <div class="section">
      <h2>File Types</h2>
      ${analysis.fileTypes.map(t => `<span class="file-type">${t}</span>`).join('')}
    </div>
  ` : ''}
  
  ${analysis.summary.length > 0 ? `
    <div class="section">
      <h2>Summary</h2>
      <ul>
        ${analysis.summary.map(s => `<li>${s}</li>`).join('')}
      </ul>
    </div>
  ` : ''}
  
  ${analysis.flags.length > 0 ? `
    <div class="section">
      <h2>Flags</h2>
      ${analysis.flags.map(f => `
        <div class="flag ${f.type}">
          <strong>${f.type.toUpperCase()}:</strong> ${f.msg}
        </div>
      `).join('')}
    </div>
  ` : ''}
</body>
</html>`;
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

