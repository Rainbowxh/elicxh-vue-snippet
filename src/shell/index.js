const functions = [
  "ref()",
  "computed()",
  "reactive()",
  "readonly()",
  "watchEffect()",
  "watchPostEffect()",
  "watchSyncEffect()",
  "watch()"
];

const result = {};

const from = 'Reactivity: Core'

functions.forEach(func => {
  const functionName = func.replace("()", "");
  const key = `Vue import ${functionName}` + " [" + from + "]";
  const prefix = `vi${functionName}`;
  const body = `import { ${functionName} } from "vue";`;

  result[key] = {
    prefix: [prefix],
    body: body
  };
});

console.log(JSON.stringify(result, null, 2));
