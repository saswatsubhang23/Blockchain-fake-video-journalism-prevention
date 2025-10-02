import { createHash } from "crypto";
import fs from "fs";

export function sha256File(filePath, asHexWith0x = true) {
  const hash = createHash("sha256");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  const hex = hash.digest("hex");
  return asHexWith0x ? `0x${hex}` : hex;
}