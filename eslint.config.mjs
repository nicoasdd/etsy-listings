import { createRequire } from "module";

const require = createRequire(import.meta.url);
const nextConfig = require("eslint-config-next");

export default [
  ...nextConfig,
  {
    ignores: ["node_modules/", ".next/", "dist/", "build/", "data/"],
  },
];
