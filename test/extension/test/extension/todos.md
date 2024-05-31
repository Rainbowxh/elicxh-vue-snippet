## vue composition v + xxx
1. 校验vue补齐内容仅在\<script setup>内容中生效


## function f + xxx
1. 支持常用函数快速模板
    1. function `vonX => const onClick${1} = () => {}`
    1. try catch finally
    1. loading
      1. loading function with init
    1. html dom ref



## element-plus el + xxx
1. 在vue文件中支持基础的快速样例补齐
  ```vue
  <!-- el-select -->
  <el-select v-model="_selectV" size="default" filterable remote clearable value-key="id" :remote-method="getList"
    placeholder="" :loading="" @change="">
    <el-option v-for="(item,_index) in _options" :key="_index" :label="item.label" :value="item.value"></el-option>
  </el-select>
  ```
1. 在vue文件中支持快速生成相对应的数据结构
```javascript
elselect.d 
const _selectV = ref("")
const _options = ref([{}])

```
1. 支持快速import  ???


### css
1. 常用css快速补齐

## javascript / typescirpt

## template
should support custom code template???
