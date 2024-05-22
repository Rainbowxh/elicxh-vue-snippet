import * as vscode from 'vscode';

// 树节点
export class EntryItem extends vscode.TreeItem {
}

//树的内容组织管理
export class EntryList implements vscode.TreeDataProvider<EntryItem> {
  #records=[]

  onDidChangeTreeData?: vscode.Event<void | EntryItem | null | undefined> | undefined;

  getTreeItem(element: EntryItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }
  getChildren(element?: EntryItem): vscode.ProviderResult<EntryItem[]> {
    return [new vscode.TreeItem("test", vscode.TreeItemCollapsibleState.Collapsed)];
  }
}
