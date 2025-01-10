import * as vscode from 'vscode';
import { initImport, initProvider } from './provider';

export function activate(context: vscode.ExtensionContext) {
  // 注册一个提供补全项的命令
  context.subscriptions.push(initProvider());
  context.subscriptions.push(initImport());
}

export function deactivate() { }
