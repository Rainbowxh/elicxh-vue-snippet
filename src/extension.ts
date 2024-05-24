import * as vscode from 'vscode';
import { initImport, initProvider } from './provider';

export function activate(context: vscode.ExtensionContext) {
  // 注册一个提供补全项的命令
  const provider = initProvider();
  // 注册一个命令来添加 import 语句
  const addImportCommand = initImport();
  context.subscriptions.push(provider, addImportCommand);
}

export function deactivate() { }
