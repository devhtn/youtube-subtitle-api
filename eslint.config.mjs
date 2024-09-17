import babelParser from '@babel/eslint-parser'
import pluginJs from '@eslint/js'
import globals from 'globals'

export default [
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaVersion: 'latest',
        parser: babelParser
      },
      globals: {
        ...globals.browser,
        process: 'readonly'
      }
    }
  },
  pluginJs.configs.recommended,
  {
    rules: {
      'no-console': 1,
      'no-extra-boolean-cast': 0,
      'no-lonely-if': 1,
      'no-unused-vars': 1,
      'no-trailing-spaces': 1,
      'no-multi-spaces': 1,
      'no-multiple-empty-lines': 1,
      'space-before-blocks': ['error', 'always'],
      'object-curly-spacing': [1, 'always'],
      semi: [1, 'never'],
      // quotes: ['error', 'single'],
      'array-bracket-spacing': 1,
      'linebreak-style': 0,
      'no-unexpected-multiline': 'warn',
      'keyword-spacing': 1,
      'comma-dangle': 1,
      'comma-spacing': 1,
      'arrow-spacing': 1
    }
  }
]
