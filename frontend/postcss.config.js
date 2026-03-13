// postcss.config.js
export default {
  plugins: {
    "@tailwindcss/postcss": {}, // <--- Đổi dòng này (thêm @ và /postcss)
    autoprefixer: {},
  },
};
