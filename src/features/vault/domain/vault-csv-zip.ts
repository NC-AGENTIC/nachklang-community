import {
  TextReader,
  Uint8ArrayWriter,
  ZipWriter,
  configure,
} from "@zip.js/zip.js";

// Keep zip.js single-threaded: avoids shipping a separate worker chunk through the
// Next.js client bundle, and exports are small enough that workers buy us nothing.
configure({ useWebWorkers: false });

export type CsvToEncryptedZipInput = {
  csv: string;
  password: string;
  entryName: string;
};

// Packs the (plain) CSV into a password-protected ZIP using WinZip AES-256, so the
// archive opens in any standard tool (7-Zip, Keka, WinRAR) without NachKlang. A UTF-8
// BOM is prefixed so spreadsheet apps render umlauts correctly after extraction.
export async function csvToEncryptedZip({
  csv,
  password,
  entryName,
}: CsvToEncryptedZipInput): Promise<Uint8Array> {
  const zipWriter = new ZipWriter(new Uint8ArrayWriter(), {
    password,
    encryptionStrength: 3,
  });
  await zipWriter.add(entryName, new TextReader("﻿" + csv));
  return zipWriter.close();
}
