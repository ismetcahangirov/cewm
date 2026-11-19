import "dotenv/config";

import { createRequire } from "node:module";

const { main } = createRequire(import.meta.url)("./run") as typeof import("./run");

await main(process.argv.slice(2));
process.exit(0);
