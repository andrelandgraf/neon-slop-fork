/**
 * Connection snippets from the Neon Console's Connect dialog. The templates
 * are the Console's own (mustache), copied verbatim so the output matches
 * what users see on console.neon.tech, except where a comment marks a fix.
 */

export interface ConnectionParts {
  role: string;
  /** `null` renders a placeholder; the password is revealed on demand. */
  password: string | null;
  host: string;
  poolerHost: string;
  database: string;
}

export interface ConnectTab {
  label: string;
  template: TemplateName;
  hasSecrets?: boolean;
}

export interface ConnectLanguage {
  value: string;
  label: string;
  tabs: ConnectTab[];
}

export const TEMPLATES = {
  "_connstring": "postgresql://{{{pgEncodedRole}}}{{#storePasswords}}{{#pgEncodedPasswordOrPlaceholder}}:{{{pgEncodedPasswordOrPlaceholder}}}{{/pgEncodedPasswordOrPlaceholder}}{{/storePasswords}}@{{#preferPooled}}{{{poolerHost}}}{{/preferPooled}}{{^preferPooled}}{{{host}}}{{/preferPooled}}/{{{pgEncodedDatabase}}}?sslmode=require{{#channelBinding}}&channel_binding=require{{/channelBinding}}",
  "_connstring_dotnet": "Host={{#preferPooled}}{{{poolerHost}}}{{/preferPooled}}{{^preferPooled}}{{{host}}}{{/preferPooled}}; Database={{{pgEncodedDatabase}}}; Username={{{pgEncodedRole}}}; {{#storePasswords}}{{#pgEncodedPasswordOrPlaceholder}}Password={{{pgEncodedPasswordOrPlaceholder}}}; {{/pgEncodedPasswordOrPlaceholder}}{{/storePasswords}}SSL Mode=VerifyFull;{{#channelBinding}} Channel Binding=Require;{{/channelBinding}}",
  "psql": "psql '{{> connstring}}'",
  "psql_passwordless": "psql -h pg.neon.tech",
  // The Console percent-encodes the database here, but shell variables are
  // read literally, so this uses the raw name.
  "parameters": "{{#preferPooled}}\nPGHOST='{{{poolerHost}}}'\n{{/preferPooled}}\n{{^preferPooled}}\nPGHOST='{{{host}}}'\n{{/preferPooled}}\nPGDATABASE='{{{pgDatabase}}}'\nPGUSER='{{{pgRole}}}'\n{{#pgPasswordOrPlaceholder}}PGPASSWORD='{{{pgPasswordOrPlaceholder}}}'{{/pgPasswordOrPlaceholder}}\nPGSSLMODE='require'\n{{#channelBinding}}PGCHANNELBINDING='require'{{/channelBinding}}",
  "nextjs": "// app/actions.ts\n\"use server\";\nimport { neon } from \"@neondatabase/serverless\";\n\nexport async function getData() {\n    const sql = neon(process.env.DATABASE_URL);\n    const data = await sql`...`;\n    return data;\n}",
  "nextjs_env": "# keep Neon credentials secure: do not expose them to client-side code\n\nDATABASE_URL='{{> connstring}}'",
  "prismajs": "// prisma/schema.prisma\ndatasource db {\n  provider  = \"postgresql\"\n  url  \t    = env(\"DATABASE_URL\")\n  // uncomment next line if you use Prisma <5.10\n  // directUrl = env(\"DATABASE_URL_UNPOOLED\")\n}",
  "prismajs_env": "DATABASE_URL=\"postgresql://{{{pgEncodedRole}}}{{#storePasswords}}:{{{pgEncodedPasswordOrPlaceholder}}}{{/storePasswords}}@{{{poolerHost}}}/{{{pgEncodedDatabase}}}?sslmode=require{{#channelBinding}}&channel_binding=require{{/channelBinding}}\"\n# uncomment next line if you use Prisma <5.10\n# DATABASE_URL_UNPOOLED=\"postgresql://{{{pgEncodedRole}}}{{#storePasswords}}:{{{pgEncodedPasswordOrPlaceholder}}}{{/storePasswords}}@{{{host}}}/{{{pgEncodedDatabase}}}?sslmode=require{{#channelBinding}}&channel_binding=require{{/channelBinding}}\"",
  "nodejs": "require(\"dotenv\").config();\n\nconst http = require(\"http\");\nconst { neon } = require(\"@neondatabase/serverless\");\n\nconst sql = neon(process.env.DATABASE_URL);\n\nconst requestHandler = async (req, res) => {\n  const result = await sql`SELECT version()`;\n  const { version } = result[0];\n  res.writeHead(200, { \"Content-Type\": \"text/plain\" });\n  res.end(version);\n};\n\nhttp.createServer(requestHandler).listen(3000, () => {\n  console.log(\"Server running at http://localhost:3000\");\n});",
  "nodejs_env": "DATABASE_URL='{{> connstring}}'",
  "dotnet_ssl": "\"{{> connstring_dotnet }}\"",
  "dotnet_appsettings": "{\n  ...\n  \"ConnectionStrings\": {\n    \"DefaultConnection\": \"{{> connstring_dotnet }}\"\n  },\n  ...\n}",
  "django": "# Add these at the top of your settings.py\nimport os\nfrom dotenv import load_dotenv\nfrom urllib.parse import urlparse, parse_qsl\n\nload_dotenv()\n\n# Replace the DATABASES section of your settings.py with this\ntmpPostgres = urlparse(os.getenv(\"DATABASE_URL\"))\n\nDATABASES = {\n    'default': {\n        'ENGINE': 'django.db.backends.postgresql',\n        'NAME': tmpPostgres.path.replace('/', ''),\n        'USER': tmpPostgres.username,\n        'PASSWORD': tmpPostgres.password,\n        'HOST': tmpPostgres.hostname,\n        'PORT': 5432,\n        'OPTIONS': dict(parse_qsl(tmpPostgres.query)),\n    }\n}",
  "django_env": "DATABASE_URL='{{> connstring}}'",
  "sql_alchemy": "import os\nimport asyncio\nimport re\nfrom sqlalchemy import text\nfrom dotenv import load_dotenv\nfrom sqlalchemy.ext.asyncio import create_async_engine\n\nload_dotenv()\n\nasync def async_main() -> None:\n    engine = create_async_engine(re.sub(r'^postgresql:', 'postgresql+psycopg:', os.getenv('DATABASE_URL')), echo=True)\n    async with engine.connect() as conn:\n        result = await conn.execute(text(\"select 'hello world'\"))\n        print(result.fetchall())\n    await engine.dispose()\n\nawait async_main()",
  "sql_alchemy_env": "DATABASE_URL='{{> connstring}}'",
  "java": "jdbc:postgresql://{{#preferPooled}}{{{poolerHost}}}{{/preferPooled}}{{^preferPooled}}{{{host}}}{{/preferPooled}}/{{{pgEncodedDatabase}}}?user={{{pgEncodedRole}}}{{#storePasswords}}&password={{{pgEncodedPasswordOrPlaceholder}}}{{/storePasswords}}&sslmode=require{{#channelBinding}}&channelBinding=require{{/channelBinding}}",
  "symfony": "# cat .env | grep DATABASE_URL\nDATABASE_URL=\"{{> connstring}}&charset=utf8\"",
  "go": "package main\n\nimport (\n\t\"context\"\n\t\"fmt\"\n\t\"log\"\n\t\"os\"\n\n\t\"github.com/jackc/pgx/v5\"\n\t\"github.com/joho/godotenv\"\n)\n\nfunc main() {\n\terr := godotenv.Load()\n\tif err != nil {\n\t\tlog.Fatal(\"Error loading .env file\")\n\t}\n\tconnStr := os.Getenv(\"DATABASE_URL\")\n\tconn, err := pgx.Connect(context.Background(), connStr)\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\tdefer conn.Close(context.Background())\n\t_, err = conn.Exec(context.Background(), \"CREATE TABLE IF NOT EXISTS playing_with_neon(id SERIAL PRIMARY KEY, name TEXT NOT NULL, value REAL);\")\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\t_, err = conn.Exec(context.Background(), \"INSERT INTO playing_with_neon(name, value) SELECT LEFT(md5(i::TEXT), 10), random() FROM generate_series(1, 10) s(i);\")\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\trows, err := conn.Query(context.Background(), \"SELECT * FROM playing_with_neon\")\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\tdefer rows.Close()\n\tfor rows.Next() {\n\t\tvar id int32\n\t\tvar name string\n\t\tvar value float32\n\t\tif err := rows.Scan(&id, &name, &value); err != nil {\n\t\t\tpanic(err)\n\t\t}\n\t\tfmt.Printf(\"%d | %s | %f\\n\", id, name, value)\n\t}\n}",
  "go_env": "DATABASE_URL='{{> connstring}}'",
  // The Console calls `sql('SELECT …')`, which @neondatabase/serverless 1.x
  // rejects; it only accepts tagged templates.
  "serverless_http": "import { neon } from '@neondatabase/serverless';\n\nconst sql = neon('{{> connstring}}');\n\nconst posts = await sql`SELECT * FROM posts`;\n\n// See https://neon.com/docs/serverless/serverless-driver\n// for more information",
  "serverless_web_sockets": "import { Pool } from '@neondatabase/serverless';\n\nconst pool = new Pool({ connectionString: '{{> connstring}}' });\n\nconst { rows: [post] } = await pool.query('SELECT * FROM posts');\n\npool.end();",
  "nestjs": "// database.service.ts\nimport { neon } from '@neondatabase/serverless';\nimport { Injectable } from '@nestjs/common';\nimport { ConfigService } from '@nestjs/config';\n\n@Injectable()\nexport class DatabaseService {\n    private readonly sql;\n\n    constructor(private configService: ConfigService) {\n        const databaseUrl = this.configService.get('DATABASE_URL');\n        this.sql = neon(databaseUrl);\n    }\n        async getData() {\n        const data = await this.sql`...`;\n        return data;\n    }\n}",
  "nestjs_env": "# keep Neon credentials secure: do not expose them to client-side code\n\nDATABASE_URL='{{> connstring}}'",
} as const;

export type TemplateName = keyof typeof TEMPLATES;

export const CONNECT_LANGUAGES: ConnectLanguage[] = [
  {
    value: "connection_string",
    label: "Connection string",
    tabs: [{ label: "Connection string", template: "_connstring", hasSecrets: true }],
  },
  {
    value: "psql",
    label: "psql",
    tabs: [
      { label: "connection string", template: "psql", hasSecrets: true },
      { label: "passwordless auth", template: "psql_passwordless" },
    ],
  },
  {
    value: "parameters_only",
    label: "Parameters only",
    tabs: [{ label: "Parameters only", template: "parameters", hasSecrets: true }],
  },
  {
    value: "nextjs",
    label: "Next.js",
    tabs: [
      { label: "actions.ts", template: "nextjs" },
      { label: ".env", template: "nextjs_env", hasSecrets: true },
    ],
  },
  {
    value: "prismajs",
    label: "Prisma",
    tabs: [
      { label: "schema.prisma", template: "prismajs" },
      { label: ".env", template: "prismajs_env", hasSecrets: true },
    ],
  },
  {
    value: "nodejs",
    label: "Node.js",
    tabs: [
      { label: "src/app.js", template: "nodejs" },
      { label: ".env", template: "nodejs_env", hasSecrets: true },
    ],
  },
  {
    value: "dotnet",
    label: ".NET",
    tabs: [
      { label: "Connection string", template: "dotnet_ssl", hasSecrets: true },
      {
        label: "Entity Framework (appsettings.json)",
        template: "dotnet_appsettings",
        hasSecrets: true,
      },
    ],
  },
  {
    value: "django",
    label: "Django",
    tabs: [
      { label: "settings.py", template: "django" },
      { label: ".env", template: "django_env", hasSecrets: true },
    ],
  },
  {
    value: "sql_alchemy",
    label: "SQLAlchemy",
    tabs: [
      { label: "SQLAlchemy", template: "sql_alchemy" },
      { label: ".env", template: "sql_alchemy_env", hasSecrets: true },
    ],
  },
  {
    value: "java",
    label: "Java",
    tabs: [{ label: "Java", template: "java", hasSecrets: true }],
  },
  {
    value: "symfony",
    label: "Symfony",
    tabs: [{ label: "Symfony", template: "symfony", hasSecrets: true }],
  },
  {
    value: "go",
    label: "Go",
    tabs: [
      { label: "Go", template: "go" },
      { label: ".env", template: "go_env", hasSecrets: true },
    ],
  },
  {
    value: "serverless",
    label: "Neon Serverless Driver",
    tabs: [
      { label: "HTTP (Recommended)", template: "serverless_http", hasSecrets: true },
      { label: "WebSockets", template: "serverless_web_sockets", hasSecrets: true },
    ],
  },
  {
    value: "nestjs",
    label: "NestJS",
    tabs: [
      { label: "database.service.ts", template: "nestjs" },
      { label: ".env", template: "nestjs_env", hasSecrets: true },
    ],
  },
];

export const PASSWORD_MASK = "********";

type View = Record<string, string | boolean>;

/** Raw values only appear inside `'…'` in the shell `parameters` snippet. */
function shellQuoted(value: string): string {
  return value.replace(/'/g, `'\\''`);
}

/** .NET connection strings sit in double quotes and are never percent-decoded. */
const DOTNET_TEMPLATES = new Set<TemplateName>(["dotnet_ssl", "dotnet_appsettings"]);

function view(parts: ConnectionParts, pooled: boolean, template: TemplateName): View {
  // Role and database names are user-chosen and land inside single-quoted
  // shell and JavaScript strings, which `encodeURIComponent` doesn't protect
  // because it leaves `'` alone.
  const encode = DOTNET_TEMPLATES.has(template)
    ? encodeURIComponent
    : (value: string) => encodeURIComponent(value).replace(/'/g, "%27");
  const password = parts.password ?? PASSWORD_MASK;
  return {
    pgEncodedRole: encode(parts.role),
    pgRole: shellQuoted(parts.role),
    pgEncodedPasswordOrPlaceholder: parts.password === null ? password : encode(password),
    pgPasswordOrPlaceholder: shellQuoted(password),
    pgEncodedDatabase: encode(parts.database),
    pgDatabase: shellQuoted(parts.database),
    host: parts.host,
    poolerHost: parts.poolerHost,
    preferPooled: pooled,
    storePasswords: true,
    channelBinding: true,
  };
}

const PARTIALS: Record<string, TemplateName> = {
  connstring: "_connstring",
  connstring_dotnet: "_connstring_dotnet",
};

/**
 * The subset of mustache the Console templates use: `{{{var}}}`,
 * `{{#flag}}…{{/flag}}`, `{{^flag}}…{{/flag}}`, and `{{> partial}}`.
 * Sections are flat (never nested with the same name), so a lazy match per
 * name is exact.
 */
export function renderTemplate(template: string, values: View): string {
  let out = template.replace(/\{\{>\s*(\w+)\s*\}\}/g, (_, name: string) => {
    const partial = PARTIALS[name];
    if (!partial) throw new Error(`Unknown connect partial: ${name}`);
    return TEMPLATES[partial];
  });
  // Mustache drops a line that holds nothing but a section tag.
  out = out.replace(/^[ \t]*(\{\{[#^/]\w+\}\})[ \t]*\n/gm, "$1");
  out = out.replace(
    /\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g,
    (_, kind: string, name: string, body: string) => {
      const on = Boolean(values[name]);
      return (kind === "#") === on ? body : "";
    }
  );
  // A second pass resolves sections that only appeared after a partial was
  // inlined inside another section.
  out = out.replace(
    /\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g,
    (_, kind: string, name: string, body: string) => {
      const on = Boolean(values[name]);
      return (kind === "#") === on ? body : "";
    }
  );
  return out
    .replace(/\{\{\{(\w+)\}\}\}/g, (_, name: string) => String(values[name] ?? ""))
    .trim();
}

export function renderSnippet(
  template: TemplateName,
  parts: ConnectionParts,
  pooled: boolean
): string {
  return renderTemplate(TEMPLATES[template], view(parts, pooled, template));
}

/** Splits a Neon connection URI into the parts the templates need. */
export function parseConnectionUri(
  unpooledUri: string,
  pooledUri: string
): ConnectionParts {
  const direct = new URL(unpooledUri);
  const pooled = new URL(pooledUri);
  return {
    role: decodeURIComponent(direct.username),
    password: decodeURIComponent(direct.password),
    host: direct.hostname,
    poolerHost: pooled.hostname,
    database: decodeURIComponent(direct.pathname.slice(1)),
  };
}
