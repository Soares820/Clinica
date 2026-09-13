// Gera db/config.js a partir de variáveis de ambiente
// (SUPABASE_URL, SUPABASE_ANON_KEY). db/config.js é gitignored — não
// existe num clone novo do repositório (ex: uma sessão de Claude Code
// na nuvem, ou qualquer CI). Localmente, continue preferindo copiar
// db/config.example.js à mão; este script é só para ambientes onde
// isso não é possível.
const { writeFileSync, existsSync } = require("fs");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (existsSync("db/config.js")) {
  console.log("db/config.js já existe — nada a fazer.");
  process.exit(0);
}

if (!url || !key) {
  console.error(
    "Faltam as variáveis de ambiente SUPABASE_URL e/ou SUPABASE_ANON_KEY.\n" +
      "Defina as duas (no ambiente da sessão na nuvem, ou no seu shell local) e rode de novo."
  );
  process.exit(1);
}

const conteudo = `// Gerado automaticamente por scripts/gerar-config.js a partir de
// variáveis de ambiente — não edite à mão. Para desenvolvimento local
// manual, prefira copiar db/config.example.js.
export const SUPABASE_URL = ${JSON.stringify(url)};
export const SUPABASE_ANON_KEY = ${JSON.stringify(key)};
`;

writeFileSync("db/config.js", conteudo);
console.log("db/config.js gerado a partir de variáveis de ambiente.");
