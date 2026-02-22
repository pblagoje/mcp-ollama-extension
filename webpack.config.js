//@ts-check

'use strict';

const path = require('path');

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  mode: isProduction ? 'production' : 'development', // Environment-based mode for proper optimizations

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'out' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. In addition, you might want to exclude other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: isDevelopment, // Faster compilation in development
              compilerOptions: {
                module: 'commonjs',
                target: 'es2020',
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true
              }
            }
          }
        ]
      }
    ]
  },
  // Environment-specific source maps
  devtool: isProduction ? 'source-map' : 'eval-source-map',

  infrastructureLogging: {
    level: isDevelopment ? "log" : "error", // Verbose logging in dev, errors only in prod
  },

  // Filesystem caching for faster rebuilds
  cache: {
    type: 'filesystem',
    version: '1.0'
  },

  // Performance hints
  performance: {
    hints: isProduction ? 'warning' : false,
    maxAssetSize: 1000000, // 1MB - VS Code extensions can be larger than web apps
    maxEntrypointSize: 1000000
  },

  // Production optimizations
  optimization: isProduction ? {
    minimize: true,
    moduleIds: 'deterministic'
    // Note: splitChunks is disabled because VS Code extensions must be a single bundle
  } : {
    minimize: false
  }
};

/**
 * Validates webpack configuration
 * @param {import('webpack').Configuration} config
 * @returns {import('webpack').Configuration}
 */
function validateConfig(config) {
  if (!config.entry) {
    throw new Error('Webpack entry point is required');
  }
  if (!config.output?.path) {
    throw new Error('Webpack output path is required');
  }
  if (config.devtool && config.devtool.includes('eval') && isProduction) {
    console.warn('Warning: eval source maps should not be used in production');
  }
  return config;
}

module.exports = validateConfig(config);
