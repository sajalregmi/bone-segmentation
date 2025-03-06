// craco.config.js
module.exports = {
    webpack: {
      configure: (webpackConfig) => {
        webpackConfig.resolve.fallback = {
          ...webpackConfig.resolve.fallback,
          fs: false, // We do not want to bundle 'fs'
          path: require.resolve('path-browserify'), // Provide 'path-browserify' for 'path'
        };
        return webpackConfig;
      },
    },
  };
  