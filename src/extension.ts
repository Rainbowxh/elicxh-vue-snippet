import * as vscode from 'vscode';
import { initImport, initImportSort, initProvider } from './provider';

export function activate(context: vscode.ExtensionContext) {
  // 注册一个提供补全项的命令
  context.subscriptions.push(initProvider());
  context.subscriptions.push(initImport());
  /** 右键排序相应的import */
  context.subscriptions.push(initImportSort())
}



export function deactivate() { }
