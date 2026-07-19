import { describe, it, expect } from "vitest";
import { validateMagicBytes } from "../routes/documents";
import fs from "fs";
import path from "path";
import os from "os";

describe("Document Security Magic Bytes Validation Tests", () => {
  it("should successfully validate correct PDF magic bytes", () => {
    const tempFile = path.join(os.tmpdir(), `temp_${Date.now()}.pdf`);
    // %PDF magic bytes is 25 50 44 46
    fs.writeFileSync(tempFile, Buffer.from([0x25, 0x50, 0x44, 0x46, 0x31, 0x32, 0x33, 0x34]));

    try {
      const isValid = validateMagicBytes(tempFile, "invoice.pdf");
      expect(isValid).toBe(true);
    } finally {
      try { fs.unlinkSync(tempFile); } catch (_) {}
    }
  });

  it("should reject forged file which is executable but renamed to PDF", () => {
    const tempFile = path.join(os.tmpdir(), `temp_${Date.now()}.pdf`);
    // EXE magic bytes (MZ) is 4D 5A
    fs.writeFileSync(tempFile, Buffer.from([0x4D, 0x5A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));

    try {
      const isValid = validateMagicBytes(tempFile, "malicious_renamed_to.pdf");
      expect(isValid).toBe(false);
    } finally {
      try { fs.unlinkSync(tempFile); } catch (_) {}
    }
  });

  it("should successfully validate correct PNG magic bytes", () => {
    const tempFile = path.join(os.tmpdir(), `temp_${Date.now()}.png`);
    // PNG magic bytes is 89 50 4E 47
    fs.writeFileSync(tempFile, Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));

    try {
      const isValid = validateMagicBytes(tempFile, "logo.png");
      expect(isValid).toBe(true);
    } finally {
      try { fs.unlinkSync(tempFile); } catch (_) {}
    }
  });

  it("should reject dangerous bash script disguised as a text file", () => {
    const tempFile = path.join(os.tmpdir(), `temp_${Date.now()}.txt`);
    // Bash script start (#!/b) is 23 21 2F 62
    fs.writeFileSync(tempFile, Buffer.from([0x23, 0x21, 0x2F, 0x62, 0x61, 0x73, 0x68, 0x0A]));

    try {
      const isValid = validateMagicBytes(tempFile, "normal.txt");
      expect(isValid).toBe(false);
    } finally {
      try { fs.unlinkSync(tempFile); } catch (_) {}
    }
  });
});
