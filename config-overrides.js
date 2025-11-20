const { override } = require("customize-cra");

module.exports = override((config) => {
  // ✅ JS bundle names
  config.output.filename = "static/js/[name].js";
  config.output.chunkFilename = "static/js/[name].chunk.js";

  // ✅ CSS bundle names (MiniCssExtractPlugin)
  config.plugins.forEach((plugin) => {
    if (plugin.constructor.name === "MiniCssExtractPlugin") {
      plugin.options.filename = "static/css/[name].css";
      plugin.options.chunkFilename = "static/css/[name].chunk.css";
    }
  });

  // ✅ Assets (images, fonts, etc.)
  config.module.rules.forEach((rule) => {
    if (rule.type === "asset/resource") {
      rule.generator.filename = "static/media/[name][ext]";
    }
  });

  return config;
});
