import * as vscode from 'vscode';
import vueConfig from "./vue.provider.json";

type ConfigItem = {
  name: string, // 引入的函数名
  label?: string, //匹配名
  labelDesc?: string, // 匹配名描述
  labelDetail?: string, // 匹配细节
  insertText: string,
  detail?: string,
  filterText: string
};


/**
 * In order to sort top suggestions. 
 */
const VUE_TRIGGER_CHARACTER = "v";

// cache latest document.
let _cacheDocument: vscode.TextDocument | null = null;

const cacheMaps = new Map();

// cache all completions items


function initCompletionItem(item: ConfigItem, config: {
  import?: boolean,
  triggerCharacters?: string,
}): vscode.CompletionItem {

  const defaultConfig = {
    import: true,
    triggerCharacters: '',
  };
  const options = Object.assign(defaultConfig, config);
  item.label = options.triggerCharacters + (item.label || item.name);
  item.filterText = item.label + " " + item.filterText;

  const completionItem = new vscode.CompletionItem({
    label: item.label ,
    description: item.labelDesc && "  " + item.labelDesc, //格式化空格
    detail: item.labelDetail &&  "  " +  item.labelDetail   //格式化
  }, vscode.CompletionItemKind.Function);

  completionItem.insertText = new vscode.SnippetString(item.insertText);
  completionItem.documentation = item.detail ? item.detail + "\n\n" + item.insertText : item.insertText;
  completionItem.filterText = item.filterText;
  if (options?.import) {
    // 当用户选择这个补全项时，触发的代码
    completionItem.command = {
      command: 'extension.addImport',
      title: "Vue import",
      arguments: [item.name || '']
    };
  }
  return completionItem;
}

export function getProvideCompletionItems(key: string, jsonConfig: any) {
  try {
    const _cacheItems = cacheMaps.get(key);
    if (Array.isArray(_cacheItems) && _cacheItems.length > 0) {
      return _cacheItems;
    }
    const items: vscode.CompletionItem[] = [];

    const configs: {
      [key: string]: ConfigItem
    } = jsonConfig;
    for (let key of Object.keys(configs)) {
      const config = configs[key];
      const item = initCompletionItem(config,
        {
          triggerCharacters: VUE_TRIGGER_CHARACTER
        }
      );
      items.push(item);
    }
    cacheMaps.set(key, items)
    return items;
  } catch (err) {
    return [];
  }
}



function getCurrentScope(document: vscode.TextDocument, position: vscode.Position): 'template' | 'script' | 'style' | 'other' {
  const text = document.getText();
  const offset = document.offsetAt(position);

  const templateStart = text.lastIndexOf('<template', offset);
  const templateEnd = text.indexOf('</template>', offset);

  const scriptStart = text.lastIndexOf('<script', offset);
  const scriptEnd = text.indexOf('</script>', offset);

  const styleStart = text.lastIndexOf('<style', offset);
  const styleEnd = text.indexOf('</style>', offset);

  if (templateStart !== -1 && templateEnd !== -1 && templateStart < offset && offset < templateEnd) {
    return 'template';
  } else if (scriptStart !== -1 && scriptEnd !== -1 && scriptStart < offset && offset < scriptEnd) {
    return 'script';
  } else if (styleStart !== -1 && styleEnd !== -1 && styleStart < offset && offset < styleEnd) {
    return 'style';
  } else {
    return 'other';
  }
}


export function initProvider() {
  getProvideCompletionItems('vue', vueConfig);
  // 预先初始化配置
  return vscode.languages.registerCompletionItemProvider('vue', {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
      _cacheDocument = document;
      const scope = getCurrentScope(document,position)
      if(scope === 'script') {
        return getProvideCompletionItems('vue', vueConfig);
      }
      return []
    }
  });
}

export function initImport() {
  return vscode.commands.registerCommand('extension.addImport', async (methodName: string) => {
    const uri = _cacheDocument?.uri;
    if(!uri) {
      return;
    }
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

export function clean() {
  _cacheDocument = null;
  cacheMaps.clear();
}

