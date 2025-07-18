import * as vscode from "vscode";
import configVue from "./vue.provider.json";
import configElement from "./element-plus.provider.json";
import * as parser from "@babel/parser";
import * as t from "@babel/types";
import generate from "@babel/generator";

type ConfigItem = {
  name: string; // 引入的函数名
  label?: string; //匹配名
  labelDesc?: string; // 匹配名描述
  labelDetail?: string; // 匹配细节
  insertText: string | string[];
  detail?: string;
  filterText: string;
};
type CompletionItemConfig = {
  import?: boolean;
  triggerCharacters?: string;
};

// vue pre character. example: vref
const VUE_TRIGGER_CHARACTER = "v";
const ELEMENT_TRIGGER_CHARACTER = "el.";

// cache latest document.
let _cacheDocument: vscode.TextDocument | null = null;
const cacheMaps = new Map();

function initCompletionItem(
  item: ConfigItem,
  config: CompletionItemConfig
): vscode.CompletionItem {
  const defaultConfig = {
    import: false,
    triggerCharacters: "",
  };

  const options = Object.assign(defaultConfig, config);
  item.label = options.triggerCharacters + (item.label || item.name);
  item.filterText = item.label + " " + item.filterText;

  const completionItem = new vscode.CompletionItem(
    {
      label: item.label,
      description: item.labelDesc && "  " + item.labelDesc, //格式化空格
      detail: item.labelDetail && "  " + item.labelDetail, //格式化
    },
    vscode.CompletionItemKind.Function
  );

  if (Array.isArray(item.insertText)) {
    completionItem.insertText = new vscode.SnippetString(
      item.insertText.join("\n")
    );
  } else {
    completionItem.insertText = new vscode.SnippetString(item.insertText);
  }
  completionItem.documentation = item.detail
    ? item.detail + "\n\n" + completionItem.insertText.value
    : completionItem.insertText.value;
  completionItem.filterText = item.filterText;
  if (options?.import) {
    // 当用户选择这个补全项时，触发的代码
    completionItem.command = {
      command: "extension.addImport",
      title: "Vue import",
      arguments: [item.name || ""],
    };
  }
  return completionItem;
}

export function getProvideCompletionItems(
  key: string,
  jsonConfig: any,
  optionConfig: CompletionItemConfig
) {
  try {
    // get suggest from cache
    const _cacheItems = cacheMaps.get(key);
    if (Array.isArray(_cacheItems) && _cacheItems.length > 0) {
      return _cacheItems;
    }
    const items: vscode.CompletionItem[] = [];
    const jsonConfigs: {
      [key: string]: ConfigItem;
    } = jsonConfig;
    for (let key of Object.keys(jsonConfigs)) {
      const config = jsonConfigs[key];
      const item = initCompletionItem(config, optionConfig);
      items.push(item);
    }
    cacheMaps.set(key, items);
    return items;
  } catch (err) {
    return [];
  }
}

/**
 * @description Get current code container.
 * @param document vscode doc
 * @param position  vscode current position
 * @returns template | script | style | other
 * @author elicxh
 */
function getCurrentScope(
  document: vscode.TextDocument,
  position: vscode.Position
): "template" | "script" | "style" | "other" {
  const text = document.getText();
  const offset = document.offsetAt(position);

  const templateStart = text.lastIndexOf("<template", offset);
  const templateEnd = text.indexOf("</template>", offset);

  const scriptStart = text.lastIndexOf("<script", offset);
  const scriptEnd = text.indexOf("</script>", offset);

  const styleStart = text.lastIndexOf("<style", offset);
  const styleEnd = text.indexOf("</style>", offset);

  if (
    templateStart !== -1 &&
    templateEnd !== -1 &&
    templateStart < offset &&
    offset < templateEnd
  ) {
    return "template";
  } else if (
    scriptStart !== -1 &&
    scriptEnd !== -1 &&
    scriptStart < offset &&
    offset < scriptEnd
  ) {
    return "script";
  } else if (
    styleStart !== -1 &&
    styleEnd !== -1 &&
    styleStart < offset &&
    offset < styleEnd
  ) {
    return "style";
  } else {
    return "other";
  }
}

export function initProvider() {
  const completionVue = getProvideCompletionItems("vue", configVue, {
    import: true,
    triggerCharacters: VUE_TRIGGER_CHARACTER,
  });
  const completionElement = getProvideCompletionItems(
    "element-plus",
    configElement,
    { import: false, triggerCharacters: ELEMENT_TRIGGER_CHARACTER }
  );
  // 预先初始化配置
  return vscode.languages.registerCompletionItemProvider("vue", {
    provideCompletionItems(
      document: vscode.TextDocument,
      position: vscode.Position,
      token: vscode.CancellationToken,
      context: vscode.CompletionContext
    ) {
      _cacheDocument = document;
      let result: any[] = [];

      const scope = getCurrentScope(document, position);

      if (scope === "script") {
        result = [...result, ...completionVue];
      }

      if (scope === "script") {
        result = [...result, ...completionElement];
      }

      return result;
    },
  });
}

export function initImport() {
  return vscode.commands.registerCommand(
    "extension.addImport",
    async (methodName: string) => {
      const uri = _cacheDocument?.uri;
      if (!uri) {
        return;
      }
      const edit = new vscode.WorkspaceEdit();
      const document = vscode.workspace.textDocuments.find(
        (doc) => doc.uri.toString() === uri.toString()
      );
      if (!document) {
        return;
      }
      const text = document.getText();
      const scriptTagRegex = /<script.*?>/;
      const importRegex = /import\s*{([^}]*)}\s*from\s*['"]vue['"]/;
      const scriptTagMatch = scriptTagRegex.exec(text);
      if (!scriptTagMatch) {
        vscode.window.showInformationMessage(
          "No <script> tag found. Import statement not added."
        );
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
        const importRange = new vscode.Range(
          document.positionAt(importStart),
          document.positionAt(importEnd)
        );
        let existingImports = importMatch[1]
          .split(",")
          .map((imp) => imp.trim())
          .filter((item) => !!item);

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
          if (importMatch[0].includes("\n")) {
            // 多行格式
            const formattedImports = `import {\n  ${existingImports.join(
              ",\n  "
            )}\n} from 'vue'`;
            edit.replace(uri, importRange, formattedImports);
          } else {
            // 单行格式
            const formattedImports = `import { ${existingImports.join(
              ", "
            )} } from 'vue'`;
            edit.replace(uri, importRange, formattedImports);
          }
        }
      }
      await vscode.workspace.applyEdit(edit);
    }
  );
}

export function clean() {
  _cacheDocument = null;
  cacheMaps.clear();
}

/**
 * import 排序插件，用于将多个import 进行分组调整
 * 
 * 优先级
 *  1. vue vuex element-plus ... 第三方引用
 *  2. api
 *  3. .vue
 *  4. @/../../.. 
 *  5. ./ ../ 
 *  
 * 相同优先级下
 *  1. default import 
 *  2. {} import 
 * 
 * @returns 
 */
export function initImportSort() {
  function organizeImportsViaAST(selectedCode: string): string {
    let ast;
    try {
      ast = parser.parse(selectedCode, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });
    } catch (err) {
      return selectedCode; 
    }

    const imports: t.ImportDeclaration[] = [];

    for (const node of ast.program.body) {
      if (t.isImportDeclaration(node)) {
        imports.push(node);
      } else {
        return selectedCode;
      }
    }

    if (imports.length === 0) {
      return selectedCode;
    }

    /** .vue结尾 */
    const vueImports: t.ImportDeclaration[] = [];
    /** .api结尾 */
    const apiImports: t.ImportDeclaration[] = [];
    /** 未明分类 */
    const otherImports: t.ImportDeclaration[] = [];
    /** @/xxx 分类 */
    const atImports: t.ImportDeclaration[] = [];
    /** ./ ../ 分类 */
    const pathImports: t.ImportDeclaration[] = [];

    for (const imp of imports) {
      const source = imp.source.value;
      if (source.endsWith(".vue")) {
        vueImports.push(imp);
      } else if (source.includes(".api")) {
        apiImports.push(imp);
      } else if (source.startsWith("@")) {
        atImports.push(imp);
      } else if (source.startsWith("./") || source.startsWith("../")) {
        pathImports.push(imp);
      } else {
        otherImports.push(imp);
      }
    }

    const serializeGroup = (group: t.ImportDeclaration[]): string => {

      const getLanes = (importDeclaration: t.ImportDeclaration) => {
        const str = importDeclaration.source.value;
        let num = 1;

        if(str.startsWith('./') || str.startsWith('../')) {
          num = num | 1 << 10;
        }else if(str.startsWith('@')) {
          num = num | 1 << 9;
        }else  {
          num = num | 1 << 11;
        }

        if(importDeclaration.specifiers.length > 0) {
          const type = importDeclaration.specifiers[0].type;
          const isDefault = type === "ImportDefaultSpecifier";
          if(isDefault) {
            num = num | 1 << 8;
          }
        }
        return num;
      }

      return group
        .sort((a, b) => {
          const aLanes = getLanes(a);
          const bLanes = getLanes(b);

          if(aLanes !== bLanes) {
            return bLanes - aLanes
          }

          return a.source.value.localeCompare(b.source.value);
        })
        .map((imp) => generate(imp).code).join("\n"); 
    }

    const groupStrings: string[] = [];

    if (otherImports.length > 0) {
      groupStrings.push(serializeGroup(otherImports));
    }
    if (apiImports.length > 0) {
      groupStrings.push(serializeGroup(apiImports));
    }
    if (vueImports.length > 0) {
      groupStrings.push(serializeGroup(vueImports));
    }

    if (atImports.length > 0) {
      groupStrings.push(serializeGroup(atImports));
    }

    if (pathImports.length > 0) {
      groupStrings.push(serializeGroup(pathImports));
    }

    const importSection = groupStrings.join("\n\n"); // ← 每组之间加一个空行

    return importSection;
  }
  return vscode.commands.registerCommand(
    "extension.organizeImportsGroup",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);

      const result = organizeImportsViaAST(text);

      editor.edit((editBuilder) => {
        editBuilder.replace(selection, result);
      });
    }
  );
}
