import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function loadReferenceHtml(): Promise<string> {
  const filePath = join(
    process.cwd(),
    "src/modules/funds-forecaster/reference/index.html",
  );
  return readFile(filePath, "utf8");
}
