const ExtractTextPlugin = require("extract-text-webpack-plugin");
const extractCSS = new ExtractTextPlugin('[name].css');

module.exports = {
  entry: {
    client: [
      './client.built.js',
    ],
    page: [
      './scss/page.scss',
    ],
    range: [
      './scss/InputRange.scss',
    ],
  },
  output: {
    path: './static',
    filename: "[name].js",
  },
  module: {
    loaders: [
      {
        test: /\.scss$/,
        loader: extractCSS.extract(['css', 'sass'])
      },
    ],
  },
  plugins: [
    extractCSS
  ],
}
