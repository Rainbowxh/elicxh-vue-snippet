import * as vscode from 'vscode';
import { config } from "./templates/element-plus.config"

export function activate(context: vscode.ExtensionContext) {
  // 动态生成configs;
  const config = generateConfigs();

  const provider =
    vscode.languages.registerCompletionItemProvider('vue',
      {
        provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
          return config;
        },
      },
      'el.'
    );
  context.subscriptions.push(provider);
}

export function deactivate() { }

function generateConfigs(): vscode.CompletionItem[] {
  const completionItems: vscode.CompletionItem[] = [];
  const elementConfig = config;
  const keys = Object.keys(elementConfig)
  for (let i = 0; i < keys.length; i++) {
    const arr = elementConfig[keys[i]]
    if (Array.isArray(arr)) {
      for (let j = 0; j < arr.length; j++) {
        const item = arr[j]
        if (!item) {
          continue;
        }
        const myCompletionItem = new vscode.CompletionItem(item.pattern, vscode.CompletionItemKind.Function);
        myCompletionItem.insertText = new vscode.SnippetString(item.snippet);
        completionItems.push(myCompletionItem);
      }
    }
  }
  return completionItems;
}
