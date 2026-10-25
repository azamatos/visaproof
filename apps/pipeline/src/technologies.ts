import { sql } from "./db.ts";
import { hash } from "./text.ts";

// The technologies a posting names, from a dictionary with aliases (Go = Golang, Kubernetes = k8s), so search can
// match "C++" or ".NET" exactly and "Java" never matches JavaScript. Stored per posting (posting.technologies) with
// the dictionary's version; `cli.ts technologies` reads the postings an older version read, and fills the
// technology table the site resolves a search against.
//
// A name matches as a whole word, in any case, unless:
// - exact: only in the case written here, for names that are also ordinary words ("Rust", "Swift", "Spark");
// - listed: only where a list of technologies would put it, for names that are letters or everyday words
//   ("Go", "R", "C"): after "in", "with", a comma or a slash, and before a comma, "and", or "programming".

type Technology = { key: string; label: string; names: string[]; exact?: boolean; listed?: boolean };

export const TECHNOLOGIES: Technology[] = [
  // languages
  { key: "javascript", label: "JavaScript", names: ["JavaScript", "JS", "ECMAScript", "ES6"] },
  { key: "typescript", label: "TypeScript", names: ["TypeScript"] },
  { key: "python", label: "Python", names: ["Python"] },
  { key: "java", label: "Java", names: ["Java"] },
  { key: "kotlin", label: "Kotlin", names: ["Kotlin"] },
  { key: "scala", label: "Scala", names: ["Scala"], exact: true },
  { key: "go", label: "Go", names: ["Golang"] },
  { key: "go", label: "Go", names: ["Go"], exact: true, listed: true },
  { key: "rust", label: "Rust", names: ["Rust"], exact: true },
  { key: "c", label: "C", names: ["C"], exact: true, listed: true },
  { key: "cpp", label: "C++", names: ["C++"] },
  { key: "csharp", label: "C#", names: ["C#", "C Sharp", "CSharp"] },
  { key: "fsharp", label: "F#", names: ["F#"], exact: true },
  // exact: a lower-case ".net" is a web address
  { key: "dotnet", label: ".NET", names: [".NET"], exact: true },
  { key: "dotnet", label: ".NET", names: ["dotnet"] },
  { key: "ruby", label: "Ruby", names: ["Ruby"], exact: true },
  { key: "php", label: "PHP", names: ["PHP"] },
  { key: "swift", label: "Swift", names: ["Swift"], exact: true },
  { key: "objective-c", label: "Objective-C", names: ["Objective-C", "ObjC"] },
  { key: "dart", label: "Dart", names: ["Dart"], exact: true },
  { key: "elixir", label: "Elixir", names: ["Elixir"], exact: true },
  { key: "erlang", label: "Erlang", names: ["Erlang"] },
  { key: "haskell", label: "Haskell", names: ["Haskell"] },
  { key: "clojure", label: "Clojure", names: ["Clojure"] },
  { key: "ocaml", label: "OCaml", names: ["OCaml"] },
  { key: "perl", label: "Perl", names: ["Perl"] },
  { key: "lua", label: "Lua", names: ["Lua"], exact: true },
  { key: "r", label: "R", names: ["R"], exact: true, listed: true },
  { key: "r", label: "R", names: ["RStudio", "R Shiny"] },
  { key: "matlab", label: "MATLAB", names: ["MATLAB"] },
  { key: "solidity", label: "Solidity", names: ["Solidity"] },
  { key: "sql", label: "SQL", names: ["SQL"] },
  // frontend
  { key: "react", label: "React", names: ["React", "ReactJS", "React.js"], exact: true },
  { key: "react-native", label: "React Native", names: ["React Native"] },
  { key: "vue", label: "Vue", names: ["Vue", "Vue.js", "VueJS"], exact: true },
  { key: "nuxt", label: "Nuxt", names: ["Nuxt", "Nuxt.js", "NuxtJS"] },
  { key: "angular", label: "Angular", names: ["Angular", "AngularJS"], exact: true },
  { key: "svelte", label: "Svelte", names: ["Svelte", "SvelteKit"] },
  { key: "nextjs", label: "Next.js", names: ["Next.js", "NextJS"] },
  { key: "redux", label: "Redux", names: ["Redux"] },
  { key: "tailwind", label: "Tailwind CSS", names: ["Tailwind", "TailwindCSS"], exact: true },
  { key: "graphql", label: "GraphQL", names: ["GraphQL"] },
  { key: "threejs", label: "Three.js", names: ["Three.js", "ThreeJS"] },
  // backend
  { key: "nodejs", label: "Node.js", names: ["Node.js", "NodeJS", "Node JS"] },
  { key: "nestjs", label: "NestJS", names: ["NestJS", "Nest.js"] },
  { key: "express", label: "Express", names: ["Express.js", "ExpressJS"] },
  { key: "django", label: "Django", names: ["Django"] },
  { key: "flask", label: "Flask", names: ["Flask"], exact: true },
  { key: "fastapi", label: "FastAPI", names: ["FastAPI", "Fast API"] },
  { key: "rails", label: "Ruby on Rails", names: ["Ruby on Rails", "RoR"] },
  { key: "rails", label: "Ruby on Rails", names: ["Rails"], exact: true },
  { key: "laravel", label: "Laravel", names: ["Laravel"] },
  { key: "symfony", label: "Symfony", names: ["Symfony"] },
  {
    key: "spring",
    label: "Spring",
    names: ["Spring Boot", "SpringBoot", "Spring Framework", "Spring Cloud", "Spring MVC", "Spring Data"],
  },
  { key: "grpc", label: "gRPC", names: ["gRPC"] },
  // mobile
  { key: "ios", label: "iOS", names: ["iOS"] },
  { key: "android", label: "Android", names: ["Android"] },
  { key: "swiftui", label: "SwiftUI", names: ["SwiftUI"] },
  { key: "jetpack-compose", label: "Jetpack Compose", names: ["Jetpack Compose"] },
  { key: "flutter", label: "Flutter", names: ["Flutter"], exact: true },
  // data
  { key: "postgresql", label: "PostgreSQL", names: ["PostgreSQL", "Postgres"] },
  { key: "mysql", label: "MySQL", names: ["MySQL"] },
  { key: "mariadb", label: "MariaDB", names: ["MariaDB"] },
  { key: "sql-server", label: "SQL Server", names: ["SQL Server", "MSSQL"] },
  { key: "mongodb", label: "MongoDB", names: ["MongoDB", "Mongo"] },
  { key: "redis", label: "Redis", names: ["Redis"] },
  { key: "elasticsearch", label: "Elasticsearch", names: ["Elasticsearch"] },
  { key: "opensearch", label: "OpenSearch", names: ["OpenSearch"] },
  { key: "cassandra", label: "Cassandra", names: ["Cassandra"] },
  { key: "dynamodb", label: "DynamoDB", names: ["DynamoDB"] },
  { key: "clickhouse", label: "ClickHouse", names: ["ClickHouse"] },
  { key: "kafka", label: "Kafka", names: ["Kafka"] },
  { key: "rabbitmq", label: "RabbitMQ", names: ["RabbitMQ"] },
  // listed: "Spark Capital", "Gemini Spark"
  { key: "spark", label: "Spark", names: ["Spark"], exact: true, listed: true },
  { key: "spark", label: "Spark", names: ["PySpark", "Apache Spark"] },
  { key: "flink", label: "Flink", names: ["Flink"] },
  { key: "hadoop", label: "Hadoop", names: ["Hadoop"] },
  { key: "airflow", label: "Airflow", names: ["Airflow"] },
  { key: "dbt", label: "dbt", names: ["dbt"], exact: true },
  { key: "snowflake", label: "Snowflake", names: ["Snowflake"], exact: true },
  { key: "bigquery", label: "BigQuery", names: ["BigQuery"] },
  { key: "databricks", label: "Databricks", names: ["Databricks"] },
  // machine learning
  { key: "pytorch", label: "PyTorch", names: ["PyTorch"] },
  { key: "tensorflow", label: "TensorFlow", names: ["TensorFlow"] },
  { key: "keras", label: "Keras", names: ["Keras"] },
  { key: "jax", label: "JAX", names: ["JAX"], exact: true, listed: true },
  { key: "scikit-learn", label: "scikit-learn", names: ["scikit-learn", "sklearn"] },
  { key: "pandas", label: "pandas", names: ["pandas"] },
  { key: "numpy", label: "NumPy", names: ["NumPy"] },
  { key: "cuda", label: "CUDA", names: ["CUDA"] },
  { key: "hugging-face", label: "Hugging Face", names: ["Hugging Face", "HuggingFace"] },
  { key: "langchain", label: "LangChain", names: ["LangChain"] },
  { key: "langgraph", label: "LangGraph", names: ["LangGraph"] },
  { key: "mlflow", label: "MLflow", names: ["MLflow"] },
  // cloud and infrastructure
  { key: "aws", label: "AWS", names: ["AWS", "Amazon Web Services"] },
  { key: "gcp", label: "Google Cloud", names: ["GCP", "Google Cloud"] },
  { key: "azure", label: "Azure", names: ["Azure"] },
  { key: "kubernetes", label: "Kubernetes", names: ["Kubernetes", "k8s"] },
  { key: "kubernetes", label: "Kubernetes", names: ["EKS", "GKE", "AKS"], exact: true },
  { key: "docker", label: "Docker", names: ["Docker"] },
  { key: "terraform", label: "Terraform", names: ["Terraform"] },
  { key: "opentofu", label: "OpenTofu", names: ["OpenTofu"] },
  { key: "pulumi", label: "Pulumi", names: ["Pulumi"] },
  { key: "ansible", label: "Ansible", names: ["Ansible"] },
  { key: "helm", label: "Helm", names: ["Helm"], exact: true },
  { key: "argocd", label: "Argo CD", names: ["Argo CD", "ArgoCD"] },
  { key: "linux", label: "Linux", names: ["Linux"] },
  { key: "jenkins", label: "Jenkins", names: ["Jenkins"], exact: true },
  { key: "github-actions", label: "GitHub Actions", names: ["GitHub Actions"] },
  { key: "prometheus", label: "Prometheus", names: ["Prometheus"] },
  { key: "grafana", label: "Grafana", names: ["Grafana"] },
  { key: "opentelemetry", label: "OpenTelemetry", names: ["OpenTelemetry"] },
  // testing
  { key: "playwright", label: "Playwright", names: ["Playwright"] },
  { key: "cypress", label: "Cypress", names: ["Cypress"] },
  { key: "selenium", label: "Selenium", names: ["Selenium"] },
  { key: "jest", label: "Jest", names: ["Jest"], exact: true },
  { key: "pytest", label: "pytest", names: ["pytest"] },
  // embedded and games
  { key: "rtos", label: "RTOS", names: ["RTOS", "FreeRTOS", "Zephyr RTOS"] },
  { key: "fpga", label: "FPGA", names: ["FPGA"] },
  { key: "verilog", label: "Verilog", names: ["Verilog", "SystemVerilog"] },
  { key: "vhdl", label: "VHDL", names: ["VHDL"] },
  { key: "yocto", label: "Yocto", names: ["Yocto"] },
  { key: "autosar", label: "AUTOSAR", names: ["AUTOSAR"] },
  // listed: Databricks' "Unity Catalog", and unity as a value
  { key: "unity", label: "Unity", names: ["Unity", "Unity3D"], exact: true, listed: true },
  { key: "unreal", label: "Unreal Engine", names: ["Unreal Engine", "UE5"] },
  { key: "unreal", label: "Unreal Engine", names: ["Unreal"], exact: true },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// "in" or "In": the words around a listed name match in either case, even when the name itself must be exact.
const either = (words: string[]) =>
  words
    .map((w) => `[${w.charAt(0).toLowerCase()}${w.charAt(0).toUpperCase()}]${escape(w.slice(1))}`)
    .join("|");
const WORD = String.raw`[\p{L}\p{N}_]`;
// Where a list of technologies puts a name: after one of these, and before one of the others. Or just before a
// word that says what it is: "Go developer", "R programming".
const BEFORE = String.raw`(?:^|[,/(|;:•·&]\s*|\b(?:${either(["in", "with", "and", "or", "using", "use", "of", "like", "e.g.", "including", "plus", "as", "ANSI", "embedded"])})\s+)`;
const AFTER = String.raw`(?=\s*(?:$|[,/)|;:.]|\s(?:and|or)\b))`;
const SAYS = String.raw`(?=\s+(?:${either(["developer", "engineer", "programming", "language", "code", "backend", "services", "microservices"])})\b)`;

function patternOf(name: string, t: Technology): string {
  // A name that starts or ends with a letter or digit needs a word edge there. One that ends in a symbol may run on
  // ("C++17"). Listed names don't run into a hyphen either ("C-level", "Objective-C", "go-to-market", "JAX-RS").
  const hyphen = t.listed ? "|-" : "";
  const start = /^[\p{L}\p{N}]/u.test(name) ? `(?<!${WORD}${hyphen})` : "";
  const end = /[\p{L}\p{N}]$/u.test(name) ? `(?!${WORD}|[+#]${hyphen})` : "";
  const core = `${start}${escape(name).replace(/ /g, String.raw`\s+`)}${end}`;
  return t.listed ? `${BEFORE}${core}${AFTER}|${core}${SAYS}` : core;
}

const MATCHERS = TECHNOLOGIES.map((t) => ({
  key: t.key,
  re: new RegExp(t.names.map((n) => patternOf(n, t)).join("|"), `mu${t.exact ? "" : "i"}`),
}));

// Changes when the dictionary or the way it matches does: postings read with another version are read again.
export const TECHNOLOGIES_VERSION = hash(
  JSON.stringify(TECHNOLOGIES),
  MATCHERS.map((m) => m.re.source).join("\n"),
).slice(0, 12);

// The keys of the technologies a title and text name, in the dictionary's order, each once.
export function technologiesOf(title: string, text: string | null | undefined): string[] {
  const all = `${title}\n${text ?? ""}`;
  return [...new Set(MATCHERS.filter((m) => m.re.test(all)).map((m) => m.key))];
}

// One row per technology for the site: its label and every name it can be searched by, in lower case.
export function technologyRows() {
  const by = new Map<string, { key: string; label: string; search: Set<string> }>();
  for (const t of TECHNOLOGIES) {
    const row = by.get(t.key) ?? {
      key: t.key,
      label: t.label,
      search: new Set([t.key, t.label.toLowerCase()]),
    };
    t.names.forEach((n) => row.search.add(n.toLowerCase()));
    by.set(t.key, row);
  }
  return [...by.values()].map((r) => ({ key: r.key, label: r.label, search: [...r.search] }));
}

// Fills the technology table from the dictionary, then reads every posting an older dictionary read (or none did).
// Runs on each deploy; ingest reads new and changed postings itself.
export async function readTechnologies() {
  const rows = technologyRows();
  await sql.begin(async (tx) => {
    await tx`delete from technology where key not in ${tx(rows.map((r) => r.key))}`;
    await tx`
      insert into technology ${tx(rows)}
      on conflict (key) do update set label = excluded.label, search = excluded.search`;
  });
  let read = 0;
  for (;;) {
    const batch = await sql<{ id: number; title: string; description: string | null }[]>`
      select id, title, description from posting
      where technologies_version is distinct from ${TECHNOLOGIES_VERSION}
      order by id limit 1000`;
    if (!batch.length) break;
    const found = batch.map((p) => ({ id: p.id, keys: technologiesOf(p.title, p.description) }));
    await sql`
      update posting p set technologies = array(select jsonb_array_elements_text(f.keys)),
        technologies_version = ${TECHNOLOGIES_VERSION}
      from jsonb_to_recordset(${sql.json(found)}) as f(id int, keys jsonb)
      where p.id = f.id`;
    read += batch.length;
  }
  console.log(
    `technologies ${TECHNOLOGIES_VERSION}: ${String(rows.length)} in the dictionary, ${String(read)} postings read`,
  );
}
