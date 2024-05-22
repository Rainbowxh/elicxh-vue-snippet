
// button

import { SnippetString } from "vscode";

const ElBtnDefault = {
  type: 'string',
  pattern: 'el.btn.default',
  snippet: '<el-button>$0</el-button>'
}

const ElBtnSuccess = {
  type: 'string',
  pattern: 'el.btn.success',
  snippet: '<el-button type="success">$0</el-button>'
}

const ElBtnPrimary = {
  type: 'string',
  pattern: 'el.btn.primary',
  snippet: '<el-button type="success">$0</el-button>'
}

const ElBtnInfo = {
  type: 'string',
  pattern: 'el.btn.info',
  snippet: '<el-button type="info">$0</el-button>'
}

const ElBtnWarning = {
  type: 'string',
  pattern: 'el.btn.warning',
  snippet: '<el-button type="warning">$0</el-button>'
}

const ElBtnDanger = {
  type: 'string',
  pattern: 'el.btn.danger',
  snippet: '<el-button type="danger">$0</el-button>'
}


export const config: any = {
  "ElBtn": [
    ElBtnDefault,
    ElBtnPrimary,
    ElBtnSuccess,
    ElBtnInfo,
    ElBtnWarning,
    ElBtnDanger,
  ]
}
