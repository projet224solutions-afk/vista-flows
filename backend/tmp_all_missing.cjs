const fs = require("fs");
const path = require("path");

const srcDir = "d:\\224Solutions\\vista-flows\\supabase\\functions";
const routeDir = "d:\\224Solutions\\vista-flows\\backend\\src\\routes\\edge-functions";

const source = fs
  .readdirSync(srcDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter(n => n !== "_shared" && n !== "deno.json" && n !== "create_agent_wallet.sql");

const files = fs.readdirSync(routeDir).filter((f) => f.endsWith(".ts"));
const routes = new Set();
const re = /router\.(get|post|put|delete|patch)\(\s*["']\/(?:[a-zA-Z0-9\-_/:]+)["']/g;

for (const f of files) {
  const content = fs.readFileSync(path.join(routeDir, f), "utf8");
  for (const match of content.matchAll(re)) {
    const parts = match[0].match(/["']\/([^"']+)["']/);
    if (parts && parts[1]) {
      const pathName = parts[1].replace(/:.*/, ""); // Remove :param
      routes.add(pathName);
    }
  }
}

const missing = source.filter((name) => !routes.has(name)).sort();
console.log(`source=${source.length} routes=${routes.size} missing=${missing.length}`);
console.log("MISSING:");
missing.forEach(m => console.log(m));
