import * as vscode from 'vscode';
import vueConfig from "./vue.provider.json";

type ConfigItem = {
  name: string,
  insertText: string,
  detail: string,
  filterText: string
}

const VUE_TRIGGER = "v"


function initItem(document: vscode.TextDocument, item: ConfigItem, config: {
  import: boolean,
} = { import: true }) {
  const completionItem = new vscode.CompletionItem({
    label: item.name || '',
    description: item.name
  }, vscode.CompletionItemKind.Function);
  completionItem.insertText = new vscode.SnippetString(item.insertText);
  completionItem.detail = item.detail;
  completionItem.filterText = item.filterText; // 设置前缀过滤

  if (config?.import) {
    // 当用户选择这个补全项时，触发的代码
    completionItem.command = {
      command: 'extension.addImport',
      title: 'Add Vue Import',
      arguments: [document.uri, item.name || '']
    };
  }
  return completionItem
}

function initItems(document: vscode.TextDocument, triggerCharacters: string = "") {
  const configs: {
    [key: string]: ConfigItem
  } = vueConfig;
  const items: vscode.CompletionItem[] = []

  for (let key of Object.keys(configs)) {
    const item = initItem(document, {
      ...configs[key],
      filterText: triggerCharacters + configs[key].filterText
    });
    items.push(item)
  }
  return items;
}

export function initProvider() {
  return vscode.languages.registerCompletionItemProvider('vue', {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
      // 示例补全项，设置 filterText 以实现前缀匹配
      return initItems(document, VUE_TRIGGER);
    }
  }, VUE_TRIGGER);
}

export function initImport() {
  return vscode.commands.registerCommand('extension.addImport', async (uri: vscode.Uri, methodName: string) => {
    const edit = new vscode.WorkspaceEdit();
    const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString());
    if (!document) { return; }
    const text = document.getText();
    const scriptTagRegex = /<script.*?>/;
    const importRegex = /import\s*{([^}]*)}\s*from\s*['"]vue['"]/;
    const scriptTagMatch = scriptTagRegex.exec(text);


    if (!scriptTagMatch) {
      vscode.window.showInformationMessage('No <script> tag found. Import statement not added.');
      return;
    }
    /**
     * <script setup lang="ts">
     * | <===== scirptTagEnd
     */
    const scriptTagEnd = scriptTagMatch.index + scriptTagMatch[0].length;
    const importMatch = importRegex.exec(text.slice(scriptTagEnd));

    if (!importMatch) {
      // 如果没有 import { ... } from "vue";，则在 <script> 标签后插入新的 import 语句
      const newImport = `\nimport { ${methodName} } from 'vue';`;
      edit.insert(uri, document.positionAt(scriptTagEnd), newImport);
    } else {
      // 如果已经有 import { ... } from "vue";，则添加方法到现有的 import 语句
      const importStart = scriptTagEnd + importMatch.index;
      const importEnd = importStart + importMatch[0].length;
      const importRange = new vscode.Range(document.positionAt(importStart), document.positionAt(importEnd));
      let existingImports = importMatch[1].split(',').map(imp => imp.trim()).filter(item => !!item);

      if (!existingImports.includes(methodName)) {
        existingImports.push(methodName);
        /**
         * 1. 如果原来的形式为 import { ref } from "vue"; 
         *    则转化为        import { ref, computed } from "vue";
         * 2. 如果原来的形式为 import { 
         *                       ref 
         *                    } from "vue"; 
         *    则转化为        import {
         *                       ref,
         *                       computed
         *                    } from "vue"
         */
        if (importMatch[0].includes('\n')) {
          // 多行格式
          const formattedImports = `import {\n  ${existingImports.join(',\n  ')}\n} from 'vue'`;
          edit.replace(uri, importRange, formattedImports);
        } else {
          // 单行格式
          const formattedImports = `import { ${existingImports.join(', ')} } from 'vue'`;
          edit.replace(uri, importRange, formattedImports);
        }
      }
    }
    await vscode.workspace.applyEdit(edit);
  });
}

