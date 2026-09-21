// src/pages/home/reliquary.data.js
// Data registry and artifact mapping for the Archive Reliquary (Scholar's Tableau).
// Supports curated default artifacts and dynamic generation from published tales.

import { ENABLE_DYNAMIC_TALE_ARTIFACTS } from '@config/app.config.js';

// Centerpiece image assets
import bookAsset from '@/assets/images/reliquary/book.jpg';
import lampAsset from '@/assets/images/reliquary/lamp.jpg';
import watchAsset from '@/assets/images/reliquary/watch.jpg';
import mapAsset from '@/assets/images/reliquary/map.svg';
import quillAsset from '@/assets/images/reliquary/quill.svg';
import spectaclesAsset from '@/assets/images/reliquary/spectacles.svg';

/**
 * @typedef {Object} ReliquaryArtifact
 * @property {string} id Unique identifier
 * @property {string} [taleId] Connected tale ID if linked
 * @property {'book'|'lamp'|'watch'|'map'|'quill'|'spectacles'|'spirits'} type Artifact classification
 * @property {string} title Name of the artifact
 * @property {string} taleTitle Title of the chronicle it embodies
 * @property {string} era Cultural or mythological origin
 * @property {string} lore Archival snippet / description
 * @property {string} [asset] Image/SVG source URL
 * @property {string} readUrl Navigation link
 * @property {{ left: string, top: string, width: string }} position Responsive coordinates
 * @property {number} zIndex Layer stacking order
 * @property {string} animation Animation modifier class
 */

/**
 * Curated centerpiece artifacts modeled after the scholar's desk etching illustration.
 * Each artifact represents a foundational pillar of mythic lore and oral tradition.
 *
 * @type {ReliquaryArtifact[]}
 */
export const DEFAULT_ARTIFACTS = [
  {
    id: 'tablet-destinies',
    taleId: 'gilgamesh',
    type: 'book',
    title: 'The Tablet of Destinies',
    taleTitle: 'The Epic of Gilgamesh',
    era: 'Mesopotamian • Tablet XI',
    lore: 'Ancient cuneiform grimoire containing the decrees of the gods and cosmic fate.',
    asset: bookAsset,
    readUrl: 'library.html?search=gilgamesh',
    position: { left: '16%', top: '34%', width: '64%' },
    zIndex: 4,
    animation: 'reliquary-item--book',
  },
  {
    id: 'phare-alexandria',
    taleId: 'alexandria-beacon',
    type: 'lamp',
    title: 'The Scholar’s Phare',
    taleTitle: 'Echoes of Alexandria',
    era: 'Ptolemaic Egypt • 280 BCE',
    lore: 'Ornate brass lamp whose incandescent amber flame illuminates invisible archival palimpsests.',
    asset: lampAsset,
    readUrl: 'library.html?search=alexandria',
    position: { left: '2%', top: '2%', width: '38%' },
    zIndex: 6,
    animation: 'reliquary-item--lamp',
  },
  {
    id: 'chronometer-epochs',
    taleId: 'cosmic-weaver',
    type: 'watch',
    title: 'Astrolabe of Epochs',
    taleTitle: 'The Celestial Weaver',
    era: 'Persian Astronomy • 1050 CE',
    lore: 'Open brass chronometer with exposed gearwork and a hanging fob chain tracking mythological eclipses.',
    asset: watchAsset,
    readUrl: 'library.html?search=astronomy',
    position: { left: '52%', top: '46%', width: '44%' },
    zIndex: 7,
    animation: 'reliquary-item--watch',
  },
  {
    id: 'chart-sunken-isles',
    taleId: 'lemuria-chart',
    type: 'map',
    title: 'Chart of the Sunken Isles',
    taleTitle: 'Myth of Lemuria & Atlantis',
    era: 'Oceanic Oral Tradition',
    lore: 'Curled vellum map with rhumb lines and compass rose tracing forgotten archipelagos.',
    asset: mapAsset,
    readUrl: 'library.html?search=isles',
    position: { left: '42%', top: '10%', width: '46%' },
    zIndex: 2,
    animation: 'reliquary-item--map',
  },
  {
    id: 'quill-maat',
    taleId: 'hall-of-two-truths',
    type: 'quill',
    title: 'Feather of the Scribe',
    taleTitle: 'The Hall of Two Truths',
    era: 'Egyptian Dynastic Era',
    lore: 'Golden quill dipped in runic lapis ink used by chroniclers of eternity.',
    asset: quillAsset,
    readUrl: 'contribution.html',
    position: { left: '33%', top: '4%', width: '25%' },
    zIndex: 3,
    animation: 'reliquary-item--quill',
  },
  {
    id: 'spectacles-archivist',
    taleId: 'scriptorium',
    type: 'spectacles',
    title: 'Archivist’s Spectacles',
    taleTitle: 'The Monastic Scriptoriums',
    era: 'Medieval Manuscript Era',
    lore: 'Wire-frame reading glasses worn by monks illuminating sacred folios.',
    asset: spectaclesAsset,
    readUrl: 'library.html',
    position: { left: '10%', top: '68%', width: '28%' },
    zIndex: 8,
    animation: 'reliquary-item--spectacles',
  },
];

/**
 * Derives or generates a reliquary artifact entry for a tale.
 * Enables future tales added to the archive to possess a dedicated artifact.
 *
 * @param {import('@state/schemas/tale.schema.js').Tale} tale
 * @param {number} index
 * @returns {ReliquaryArtifact}
 */
export function generateArtifactForTale(tale, index = 0) {
  if (!tale) return DEFAULT_ARTIFACTS[0];

  // If the tale explicitly has an artifact definition saved in Firestore
  if (tale.artifact && typeof tale.artifact === 'object') {
    return {
      id: `tale-artifact-${tale.id}`,
      taleId: tale.id,
      type: tale.artifact.type || 'book',
      title: tale.artifact.title || `${tale.title} Relic`,
      taleTitle: tale.title || 'Untitled Chronicle',
      era: tale.era || 'Archival Era',
      lore: tale.artifact.lore || tale.description || 'A preserved fragment from the oral archive.',
      asset: tale.artifact.asset || bookAsset,
      readUrl: `tale.html?id=${tale.id}`,
      position:
        tale.artifact.position || DEFAULT_ARTIFACTS[index % DEFAULT_ARTIFACTS.length].position,
      zIndex: 5,
      animation: 'reliquary-item--book',
    };
  }

  // Type selection heuristic based on tale themes/era
  const typeCatalog = [
    { type: 'map', asset: mapAsset, animation: 'reliquary-item--map' },
    { type: 'book', asset: bookAsset, animation: 'reliquary-item--book' },
    { type: 'watch', asset: watchAsset, animation: 'reliquary-item--watch' },
    { type: 'lamp', asset: lampAsset, animation: 'reliquary-item--lamp' },
    { type: 'quill', asset: quillAsset, animation: 'reliquary-item--quill' },
    { type: 'spectacles', asset: spectaclesAsset, animation: 'reliquary-item--spectacles' },
  ];

  const matched = typeCatalog[index % typeCatalog.length];
  const templatePosition = DEFAULT_ARTIFACTS[index % DEFAULT_ARTIFACTS.length].position;

  return {
    id: `tale-artifact-${tale.id}`,
    taleId: tale.id,
    type: matched.type,
    title: `${tale.title} Relic`,
    taleTitle: tale.title || 'Archival Fragment',
    era: tale.era || 'Ancient Era',
    lore: tale.description
      ? `${tale.description.slice(0, 110)}...`
      : 'A newly discovered fragment preserved in the archive.',
    asset: matched.asset,
    readUrl: `tale.html?id=${tale.id}`,
    position: templatePosition,
    zIndex: 5,
    animation: matched.animation,
  };
}

/**
 * Returns the effective set of artifacts to display.
 * When ENABLE_DYNAMIC_TALE_ARTIFACTS is enabled in .env, integrates newly published tales.
 *
 * @param {import('@state/schemas/tale.schema.js').Tale[]} [tales=[]]
 * @returns {ReliquaryArtifact[]}
 */
export function getReliquaryArtifacts(tales = []) {
  if (ENABLE_DYNAMIC_TALE_ARTIFACTS && tales && tales.length > 0) {
    // Map published tales into dynamic artifacts, using default centerpieces for core positions
    const dynamicArtifacts = tales.slice(0, 3).map((tale, i) => generateArtifactForTale(tale, i));

    // Merge with core lamp, map, and watch from defaults for visual completeness
    const complementary = DEFAULT_ARTIFACTS.filter(
      (a) => !dynamicArtifacts.some((d) => d.type === a.type)
    );

    return [...dynamicArtifacts, ...complementary];
  }

  // Curated masterwork default set
  return DEFAULT_ARTIFACTS;
}
