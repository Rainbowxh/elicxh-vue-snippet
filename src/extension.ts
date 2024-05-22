import * as vscode from 'vscode';
import { config } from "./templates/element-plus.config"

export function activate(context: vscode.ExtensionContext) {
  const initConfigs = () => {
    const completionItems: vscode.CompletionItem[] = [];
    let isCached = false;
    return () => {
      if(isCached) {
        return completionItems;
      }
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
      isCached = true;
      return completionItems;
    }
  }
  const cacheConfigsFunc = initConfigs();
  const provider = vscode.languages.registerCompletionItemProvider('vue', {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
      return cacheConfigsFunc();
    }
  });
  context.subscriptions.push(provider);
}

// This method is called when your extension is deactivated
export function deactivate() { }
