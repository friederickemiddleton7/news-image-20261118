import { copyFileSync } from "node:fs";
copyFileSync(new URL("./entry.png", import.meta.url), "/output/entry.png");
