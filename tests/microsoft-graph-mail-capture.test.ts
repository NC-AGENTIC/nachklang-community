import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { captureMailIfEnabled } from "@/server/mail/capture";

const originalCapturePath = process.env.NACHKLANG_MAIL_CAPTURE_PATH;

describe("captureMailIfEnabled", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nachklang-mail-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    if (originalCapturePath === undefined) {
      delete process.env.NACHKLANG_MAIL_CAPTURE_PATH;
    } else {
      process.env.NACHKLANG_MAIL_CAPTURE_PATH = originalCapturePath;
    }
  });

  it("captures the verification link when the capture path env var is set", () => {
    const file = join(dir, "mail.tsv");
    process.env.NACHKLANG_MAIL_CAPTURE_PATH = file;

    captureMailIfEnabled({
      to: "x@y.z",
      subject: "Test",
      html: '<p>Hello</p><p><a href="https://example.org/verify?token=abc">Verify</a></p>',
    });

    const fields = readFileSync(file, "utf8").trim().split("\t");
    expect(fields[1]).toBe("x@y.z");
    expect(fields[2]).toBe("Test");
    expect(fields[3]).toBe("https://example.org/verify?token=abc");
  });

  it("captures the OTP from a styled <strong> element (branded email)", () => {
    const file = join(dir, "otp.tsv");
    process.env.NACHKLANG_MAIL_CAPTURE_PATH = file;

    captureMailIfEnabled({
      to: "a@b.c",
      subject: "NachKlang E-Mail-Code",
      html: '<p>Ihr Code</p><strong style="font-size:30px;letter-spacing:8px;">482915</strong>',
    });

    const fields = readFileSync(file, "utf8").trim().split("\t");
    expect(fields[3]).toBe("482915");
  });

  it("does NOT write to the capture file when NACHKLANG_MAIL_CAPTURE_PATH is unset", () => {
    delete process.env.NACHKLANG_MAIL_CAPTURE_PATH;
    const file = join(dir, "should-not-exist.tsv");
    captureMailIfEnabled({ to: "x@y.z", subject: "Test", html: "<p>Hi</p>" });
    expect(() => readFileSync(file, "utf8")).toThrow();
  });
});
