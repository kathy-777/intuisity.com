const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const legal = path.join(root, "legal");

const pages = [
  { from: path.join(legal, "privacy.html"), to: path.join(dist, "privacy.html") },
  { from: path.join(legal, "terms.html"), to: path.join(dist, "terms.html") },
  { from: path.join(legal, "robots.txt"), to: path.join(dist, "robots.txt") },
  { from: path.join(legal, "sitemap.xml"), to: path.join(dist, "sitemap.xml") }
];

if (!fs.existsSync(dist)) {
  throw new Error("dist folder was not found. Run the Expo web export before copying legal pages.");
}

for (const page of pages) {
  fs.copyFileSync(page.from, page.to);
}
