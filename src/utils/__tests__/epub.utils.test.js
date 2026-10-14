// src/utils/__tests__/epub.utils.test.js
import { describe, it, expect } from 'vitest';
import {
  calculateCrc32,
  escapeXml,
  formatChapterXhtml,
  createZipArchive,
  buildEpubBlob,
} from '../epub.utils.ts';

describe('epub.utils', () => {
  describe('calculateCrc32', () => {
    it('calculates correct CRC32 for known strings', () => {
      const encoder = new TextEncoder();
      expect(calculateCrc32(encoder.encode(''))).toBe(0);
      expect(calculateCrc32(encoder.encode('123456789'))).toBe(0xcbf43926);
    });
  });

  describe('escapeXml', () => {
    it('escapes special characters', () => {
      expect(escapeXml('Tales & "Legends" <of> \'Old\'')).toBe(
        'Tales &amp; &quot;Legends&quot; &lt;of&gt; &apos;Old&apos;'
      );
    });

    it('handles empty input gracefully', () => {
      expect(escapeXml('')).toBe('');
    });
  });

  describe('formatChapterXhtml', () => {
    it('converts markdown paragraphs and headings into XHTML tags', () => {
      const md = '# Main Header\n\n## Subheader\n\nThis is paragraph one.\n\n> A quote from lore';
      const xhtml = formatChapterXhtml(md);

      expect(xhtml).toContain('<h2>Main Header</h2>');
      expect(xhtml).toContain('<h3>Subheader</h3>');
      expect(xhtml).toContain('<p>This is paragraph one.</p>');
      expect(xhtml).toContain('<blockquote>A quote from lore</blockquote>');
    });

    it('returns fallback paragraph when content is empty', () => {
      expect(formatChapterXhtml('')).toBe('<p>No content recorded.</p>');
    });
  });

  describe('createZipArchive', () => {
    it('creates a binary ZIP buffer with standard PK signatures', () => {
      const files = [
        { name: 'mimetype', data: 'application/epub+zip' },
        { name: 'hello.txt', data: 'Hello World' },
      ];

      const zipBytes = createZipArchive(files);
      expect(zipBytes).toBeInstanceOf(Uint8Array);
      expect(zipBytes.length).toBeGreaterThan(0);

      // Verify Local Header Signature (PK\x03\x04 = 0x50, 0x4b, 0x03, 0x04)
      expect(zipBytes[0]).toBe(0x50);
      expect(zipBytes[1]).toBe(0x4b);
      expect(zipBytes[2]).toBe(0x03);
      expect(zipBytes[3]).toBe(0x04);

      // Verify End of Central Directory Signature (PK\x05\x06 = 0x50, 0x4b, 0x05, 0x06)
      const eocdSig = [0x50, 0x4b, 0x05, 0x06];
      let foundEocd = false;
      for (let i = 0; i < zipBytes.length - 4; i++) {
        if (
          zipBytes[i] === eocdSig[0] &&
          zipBytes[i + 1] === eocdSig[1] &&
          zipBytes[i + 2] === eocdSig[2] &&
          zipBytes[i + 3] === eocdSig[3]
        ) {
          foundEocd = true;
          break;
        }
      }
      expect(foundEocd).toBe(true);
    });
  });

  describe('buildEpubBlob', () => {
    it('builds an EPUB blob with correct MIME type and structure', () => {
      const tale = {
        id: 'tale-1',
        title: 'The Weaver of Dreams',
        authorName: 'Aria',
        synopsis: 'A mythical tale of shadows and starlight.',
        era: 'Mythic',
        genre: 'Folklore',
        chapters: [
          { title: 'The Loom', content: 'In the beginning, threads were woven from night.' },
          { title: 'The Spindle', content: 'Dawn broke across the loom of stars.' },
        ],
      };

      const blob = buildEpubBlob(tale);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/epub+zip');
      expect(blob.size).toBeGreaterThan(100);
    });
  });
});
