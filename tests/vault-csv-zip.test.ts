import { describe, expect, it } from "vitest";
import {
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
  TextWriter,
  configure,
} from "@zip.js/zip.js";

import { csvToEncryptedZip } from "../src/features/vault/domain/vault-csv-zip";

configure({ useWebWorkers: false });

async function readEncryptedZip(bytes: Uint8Array, password: string) {
  const reader = new ZipReader(new Uint8ArrayReader(bytes), { password });
  const entries = await reader.getEntries();
  const entry = entries[0];
  if (!entry || entry.directory) {
    await reader.close();
    throw new Error("no file entry in zip");
  }
  const name = entry.filename;
  const text = await entry.getData(new TextWriter());
  const raw = await entry.getData(new Uint8ArrayWriter());
  await reader.close();
  return { name, text, raw };
}

describe("csvToEncryptedZip", () => {
  it("produces an AES-encrypted zip whose entry decrypts back to the CSV", async () => {
    const csv = "Anbieter,Login\nMax Mustermann,max@example.test\n";
    const bytes = await csvToEncryptedZip({
      csv,
      password: "correct horse battery",
      entryName: "nachklang-export.csv",
    });

    expect(bytes.byteLength).toBeGreaterThan(0);

    const { name, text, raw } = await readEncryptedZip(bytes, "correct horse battery");
    expect(name).toBe("nachklang-export.csv");
    // TextDecoder strips a leading BOM on read, so the decoded text is the plain CSV...
    expect(text).toBe(csv);
    // ...but the stored bytes carry the UTF-8 BOM so Excel renders umlauts correctly.
    expect(Array.from(raw.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("cannot be read with the wrong password", async () => {
    const bytes = await csvToEncryptedZip({
      csv: "a,b\n1,2\n",
      password: "right-password",
      entryName: "x.csv",
    });
    await expect(readEncryptedZip(bytes, "wrong-password")).rejects.toThrow();
  });
});
