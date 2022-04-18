module.exports = {
  env: {
    browser: true,
    es2015: true,
//    es2021: true,
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: "latest"
  },
  rules: {
    "no-debugger": 0,
    "no-irregular-whitespace": 0,
    "no-mixed-spaces-and-tabs": 1,
    "no-extra-semi": 1,
    "no-unused-vars": 1,
    "no-useless-escape": 1,
  },
  globals: {
    "$": true,
    "_": true,
  }
}
