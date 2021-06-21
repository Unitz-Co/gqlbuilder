const path = require('path');
const _ = require('lodash');

const config = {
  presets: [
    [
      '@babel/preset-env',
      {
        modules: false,
        targets: {
          browsers: 'ie >= 11',
        },
        // "targets": {
        //   "node": "current"
        // }
      },
    ],
  ],
  plugins: ['macros', '@babel/plugin-proposal-class-properties', '@babel/plugin-proposal-object-rest-spread'],
  env: {
    test: {
      presets: [['@babel/preset-env']],
    },
  },
};

module.exports = config;
