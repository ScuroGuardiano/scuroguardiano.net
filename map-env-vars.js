const { writeFileSync } = require("node:fs");
const { join } = require("node:path");

const envToMap = [
  "IMAGE_CONVERSION_API" // Nie dodawaj trailing `/`, bo Cię zmiecie z planszy
]

let contents = "";

envToMap.forEach(env => {
  let line = `export const ${env} = `;
  const value = process.env[env];

  line += `"${value ?? ''}";\n`;
  contents += line;
});

writeFileSync(join(__dirname, "src", "env-var.ts"), contents);
