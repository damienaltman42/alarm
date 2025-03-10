module.exports = {
  root: true,
  extends: ['@react-native', 'prettier'],
  rules: {
    // Règles personnalisées pour réduire les avertissements
    'no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
  },
}; 