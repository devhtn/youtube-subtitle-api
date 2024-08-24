// Must reload window to apply config

/** @type {import("prettier").Config} */
// eslint-disable-next-line no-undef
module.exports = {
  // Standard prettier options
  // Override options of prettier extension
  semi: false,
  singleQuote: true,
  trailingComma: 'none',
  // Since prettier 3.0, manually specifying plugins is required
  plugins: ['@ianvs/prettier-plugin-sort-imports'],
  // This plugin's options
  // import 'c' không thuộc nhóm nào => Phải thủ công đưa lên cùng
  importOrder: [
    '<BUILTIN_MODULES>',
    '',
    '<THIRD_PARTY_MODULES>',
    '',
    '^[.~].*/([A-Z].*)$',
    '',
    '^[.~].*/([a-z].*)$'
  ]
}
