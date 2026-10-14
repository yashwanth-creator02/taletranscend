// src/utils/epub.utils.ts
/**
 * EPUB & ZIP Export Utilities.
 *
 * Provides a zero-dependency, browser-native ZIP archiver and EPUB 3 generator
 * compliant with the Open Container Format (OCF) standard.
 */

export interface EpubChapter {
  title: string;
  content: string;
}

export interface EpubMetadata {
  id?: string;
  title: string;
  authorName?: string;
  synopsis?: string;
  era?: string;
  genre?: string;
  chapters?: EpubChapter[];
}

export interface ZipFileInput {
  name: string;
  data: string | Uint8Array;
}

// Precomputed CRC32 table for fast checksum generation
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

/**
 * Calculates standard CRC32 checksum for a Uint8Array byte stream.
 */
export function calculateCrc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Escapes special XML/XHTML characters to prevent parsing errors in e-readers.
 */
export function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts Markdown or plaintext chapter contents into clean, valid XHTML paragraphs.
 */
export function formatChapterXhtml(content: string): string {
  if (!content) return '<p>No content recorded.</p>';

  const paragraphs = content.split(/\n\s*\n/);
  return paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('### ')) {
        return `<h4>${escapeXml(trimmed.slice(4))}</h4>`;
      }
      if (trimmed.startsWith('## ')) {
        return `<h3>${escapeXml(trimmed.slice(3))}</h3>`;
      }
      if (trimmed.startsWith('# ')) {
        return `<h2>${escapeXml(trimmed.slice(2))}</h2>`;
      }
      if (trimmed.startsWith('> ')) {
        return `<blockquote>${escapeXml(trimmed.slice(2))}</blockquote>`;
      }
      return `<p>${escapeXml(trimmed).replace(/\n/g, '<br/>')}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Creates an uncompressed ZIP archive (STORE mode) from a list of files.
 * Method 0 (STORE) is required for EPUB 'mimetype' and fully valid across all e-readers.
 */
export function createZipArchive(files: ZipFileInput[]): Uint8Array {
  const encoder = new TextEncoder();

  const normalized = files.map((file) => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes =
      file.data instanceof Uint8Array
        ? file.data
        : encoder.encode(typeof file.data === 'string' ? file.data : '');
    const crc = calculateCrc32(dataBytes);
    return {
      name: file.name,
      nameBytes,
      dataBytes,
      crc,
      uncompressedSize: dataBytes.length,
      compressedSize: dataBytes.length,
      localHeaderOffset: 0,
    };
  });

  const now = new Date();
  const year = Math.max(1980, now.getFullYear());
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = Math.floor(now.getSeconds() / 2);

  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;

  // Calculate local headers size and record offsets
  let localHeadersSize = 0;
  for (const f of normalized) {
    f.localHeaderOffset = localHeadersSize;
    localHeadersSize += 30 + f.nameBytes.length + f.dataBytes.length;
  }

  // Calculate central directory size
  let centralDirSize = 0;
  for (const f of normalized) {
    centralDirSize += 46 + f.nameBytes.length;
  }

  const eocdSize = 22;
  const totalSize = localHeadersSize + centralDirSize + eocdSize;
  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);

  // 1. Write Local Headers & File Data
  let offset = 0;
  for (const f of normalized) {
    // Local header signature: 0x04034b50
    view.setUint32(offset, 0x04034b50, true);
    view.setUint16(offset + 4, 20, true); // version needed: 2.0
    view.setUint16(offset + 6, 0x0800, true); // flags: UTF-8
    view.setUint16(offset + 8, 0, true); // compression: STORE (0)
    view.setUint16(offset + 10, dosTime, true);
    view.setUint16(offset + 12, dosDate, true);
    view.setUint32(offset + 14, f.crc, true);
    view.setUint32(offset + 18, f.compressedSize, true);
    view.setUint32(offset + 22, f.uncompressedSize, true);
    view.setUint16(offset + 26, f.nameBytes.length, true);
    view.setUint16(offset + 28, 0, true); // extra field length
    offset += 30;

    buffer.set(f.nameBytes, offset);
    offset += f.nameBytes.length;

    buffer.set(f.dataBytes, offset);
    offset += f.dataBytes.length;
  }

  const centralDirOffset = offset;

  // 2. Write Central Directory Entries
  for (const f of normalized) {
    // Central directory header signature: 0x02014b50
    view.setUint32(offset, 0x02014b50, true);
    view.setUint16(offset + 4, 20, true); // version made by: 2.0
    view.setUint16(offset + 6, 20, true); // version needed: 2.0
    view.setUint16(offset + 8, 0x0800, true); // flags: UTF-8
    view.setUint16(offset + 10, 0, true); // compression: STORE (0)
    view.setUint16(offset + 12, dosTime, true);
    view.setUint16(offset + 14, dosDate, true);
    view.setUint32(offset + 16, f.crc, true);
    view.setUint32(offset + 20, f.compressedSize, true);
    view.setUint32(offset + 24, f.uncompressedSize, true);
    view.setUint16(offset + 28, f.nameBytes.length, true);
    view.setUint16(offset + 30, 0, true); // extra field length
    view.setUint16(offset + 32, 0, true); // file comment length
    view.setUint16(offset + 34, 0, true); // disk number start
    view.setUint16(offset + 36, 0, true); // internal file attributes
    view.setUint32(offset + 38, 0, true); // external file attributes
    view.setUint32(offset + 42, f.localHeaderOffset, true);
    offset += 46;

    buffer.set(f.nameBytes, offset);
    offset += f.nameBytes.length;
  }

  // 3. Write End of Central Directory Record (EOCD)
  view.setUint32(offset, 0x06054b50, true); // EOCD signature
  view.setUint16(offset + 4, 0, true); // disk number
  view.setUint16(offset + 6, 0, true); // disk start
  view.setUint16(offset + 8, normalized.length, true); // records on disk
  view.setUint16(offset + 10, normalized.length, true); // total records
  view.setUint32(offset + 12, centralDirSize, true); // size of central directory
  view.setUint32(offset + 16, centralDirOffset, true); // offset of central directory
  view.setUint16(offset + 20, 0, true); // comment length

  return buffer;
}

/**
 * Builds an EPUB 3 document bundle wrapped in a standard Blob.
 */
export function buildEpubBlob(tale: EpubMetadata): Blob {
  const safeId = (tale.id || tale.title || 'chronicle')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const safeTitle = escapeXml(tale.title || 'Untitled Chronicle');
  const safeAuthor = escapeXml(tale.authorName || 'Anonymous Chronicler');
  const safeSynopsis = escapeXml(tale.synopsis || '');
  const chapters =
    tale.chapters && tale.chapters.length > 0
      ? tale.chapters
      : [{ title: 'Scroll #1', content: '' }];
  const isoDate = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  // 1. mimetype (Must be first, exactly 20 bytes uncompressed)
  const files: ZipFileInput[] = [{ name: 'mimetype', data: 'application/epub+zip' }];

  // 2. META-INF/container.xml
  files.push({
    name: 'META-INF/container.xml',
    data: `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  });

  // 3. OEBPS/style.css
  files.push({
    name: 'OEBPS/style.css',
    data: `body {
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.65;
  margin: 1.5em;
  color: #1a1a1a;
  background-color: #fafafa;
}
h1, h2, h3, h4 {
  font-family: serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #0f172a;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}
h1 {
  font-size: 1.8em;
  text-align: center;
}
.metadata {
  text-align: center;
  font-style: italic;
  margin-bottom: 2.5em;
  color: #64748b;
  font-size: 0.9em;
}
.synopsis {
  border-left: 3px solid #6366f1;
  padding: 0.8em 1.2em;
  margin: 2em 0;
  background: #f1f5f9;
  font-style: italic;
  color: #334155;
}
p {
  margin-top: 0;
  margin-bottom: 1.2em;
  text-align: justify;
}
blockquote {
  border-left: 2px solid #cbd5e1;
  padding-left: 1em;
  margin-left: 0;
  color: #475569;
  font-style: italic;
}`,
  });

  // 4. Chapter XHTML documents
  const manifestItems: string[] = [];
  const spineItems: string[] = [];
  const navItems: string[] = [];

  // Add cover / title page
  files.push({
    name: 'OEBPS/title.xhtml',
    data: `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <h1>${safeTitle}</h1>
  <div class="metadata">
    <p>By ${safeAuthor}</p>
    ${tale.era ? `<p>Era: ${escapeXml(tale.era)}</p>` : ''}
    ${tale.genre ? `<p>Genre: ${escapeXml(tale.genre)}</p>` : ''}
  </div>
  ${safeSynopsis ? `<div class="synopsis"><p>${safeSynopsis}</p></div>` : ''}
</body>
</html>`,
  });

  manifestItems.push(
    '<item id="title-page" href="title.xhtml" media-type="application/xhtml+xml"/>'
  );
  spineItems.push('<itemref idref="title-page"/>');

  chapters.forEach((ch, idx) => {
    const chNum = idx + 1;
    const chTitle = escapeXml(ch.title || `Scroll #${chNum}`);
    const chFilename = `chapter_${chNum}.xhtml`;
    const chId = `ch-${chNum}`;
    const chHtml = formatChapterXhtml(ch.content);

    files.push({
      name: `OEBPS/${chFilename}`,
      data: `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <title>${chTitle}</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <h2>${chTitle}</h2>
  ${chHtml}
</body>
</html>`,
    });

    manifestItems.push(
      `<item id="${chId}" href="${chFilename}" media-type="application/xhtml+xml"/>`
    );
    spineItems.push(`<itemref idref="${chId}"/>`);
    navItems.push(`<li><a href="${chFilename}">${chTitle}</a></li>`);
  });

  // 5. OEBPS/nav.xhtml (EPUB 3 Navigation Document)
  files.push({
    name: 'OEBPS/nav.xhtml',
    data: `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <meta charset="utf-8" />
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      <li><a href="title.xhtml">Title Page</a></li>
      ${navItems.join('\n      ')}
    </ol>
  </nav>
</body>
</html>`,
  });

  // 6. OEBPS/content.opf (Package Document)
  files.push({
    name: 'OEBPS/content.opf',
    data: `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="pub-id" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:taletranscend:${safeId}</dc:identifier>
    <dc:title>${safeTitle}</dc:title>
    <dc:creator>${safeAuthor}</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${isoDate}</meta>
  </metadata>
  <manifest>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine>
    ${spineItems.join('\n    ')}
  </spine>
</package>`,
  });

  const zipBytes = createZipArchive(files);
  return new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/epub+zip' });
}
