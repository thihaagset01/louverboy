module.exports = {
  webpack: {
    configure: {
      module: {
        rules: [
          {
            test: /\.csv$/,
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
            },
          },
        ],
      },
    },
  },
};
