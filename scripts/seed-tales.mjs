// scripts/seed-tales.mjs
// Seeds 24 rich folklore & myth tales with chapters into Firebase Firestore.
// Safe, idempotent, complies with Firestore security rules & Tale schemas.

import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const TALES_PATH = 'v1/taletranscend/projects/v1/public/data/tales';

const SEED_TALES = [
  {
    id: 'tale-008',
    title: 'The Song of the Obsidian Weaver',
    authorName: 'Kaelen Morrow',
    description: 'A mythic artisan threads the celestial dark to stitch fallen constellations back to life.',
    synopsis: 'Before the light had a name, a weaver sat at the lip of the glass chasm, drawing thread from obsidian stones. When the seventh moon cracked, only her needle could mend the sky before shadow engulfed the continents.',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    era: 'First Dawn',
    tags: ['myth', 'creation', 'stars', 'magic', 'fantasy'],
    tone: 'poetic',
    worldSetting: 'A primordial archipelago suspended above an endless ocean of liquid obsidian and stardust.',
    authorNotes: 'Dedicated to the ancient oral songs of the night sky weavers.',
    isFeatured: true,
    isEditorsPick: true,
    readCount: 1420,
    bookmarkCount: 88,
    reactionCount: 312,
    commentCount: 29,
    chapters: [
      {
        title: 'Thread of the Black Loom',
        content: `Before the sun learned to burn and before the mountains hardened their spines, there was only the Loom of Glass.

Kaelen remembered the first hum of the shuttle. It sounded like ice snapping on a deep mountain lake at midnight. Her fingers were dyed the color of dried blackberries, calloused from centuries of coaxing silk out of volcanic glass.

"You cannot bind the sky, daughter," the elders had warned when the great comet shattered the vault overhead. "Sky is vapor. Sky is breath."

"Sky is memory," she replied, and cast her silver shuttle across the abyss.

With each pass, a streak of violet fire caught in the warp. The needle pierced the void, pulling taut the severed threads of Orion's belt. Beneath her hanging scaffold, the world turned in silence—a blue marble trembling in a cradle of pitch.`
      },
      {
        title: 'The Fracture at Noon',
        content: `By the second epoch, the fissure had widened toward the horizon.

Kaelen knelt on the obsidian precipice, her breathe pluming into cold starlight. A star had fallen—not as dust, but as a burning egg of white flame. It lay cradled in the basin below, weeping molten iron.

She tied off the zenith knot with her teeth, tasting salt and old iron. If the stitch held until dawn, the people of the river basins would look upward and see only unbroken blue. If it failed, the dark would pour into their grain silos and freeze their rivers to stone.

She drew the last thread tight. The horizon sighed, and light broke like glass against the world's eastern edge.`
      }
    ]
  },
  {
    id: 'tale-009',
    title: 'The Whisper of Ironwood Peak',
    authorName: 'Thyra Stonecipher',
    description: 'High in the glacial ranges, colossal stone sentinels awaken whenever a promise is broken.',
    synopsis: 'The folk of the high valleys keep no written treaties; they swear their vows facing Ironwood Peak. But when an imperial commander breaks an ancient non-aggression oath, the mountain itself begins to speak in tremors.',
    coverUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200&auto=format&fit=crop',
    era: 'Age of Heroes',
    tags: ['mountains', 'spirits', 'legend', 'oaths', 'epic'],
    tone: 'solemn',
    worldSetting: 'Snow-swept mountain peaks where giant spirits sleep encased in glacial quartz.',
    authorNotes: 'Drawn from Scandinavian and Alpine mountain folklore.',
    isFeatured: true,
    isEditorsPick: false,
    readCount: 954,
    bookmarkCount: 64,
    reactionCount: 204,
    commentCount: 18,
    chapters: [
      {
        title: 'The Sentry in the Frost',
        content: `The frost in the high pass did not melt, even when July arrived with its thin, yellow sun.

Thyra tightened the wool straps around her snowshoes and listened. For three days, the sheep bells in the valley had been mute. Sheep knew before hounds did; hounds knew before men. Something with granite ribs was turning in its slumber deep inside Ironwood Peak.

"Lord Vane signed the timber lease," her brother had said yesterday, polishing his brass hunting buckle. "The council gave him sixty thousand silver florins. It is legal, Thyra."

"The mountain does not read ink," she told the chimney smoke. "The mountain remembers blood on the stone."

When she reached the tree line where the dwarf pines grew twisted like clenched fists, she saw the first crack in the glacier. It was twenty cubits across, yawning black, and from its depths rose the scent of crushed lichen and ozone.`
      },
      {
        title: 'The Avalanche of Voices',
        content: `The voice did not come through the air. It rose through the soles of her boots, through the tibia and the pelvis, vibrating in her jaw until her teeth ached.

WHO SHALL HOLD THE BOUNDARY?

Thyra knelt in the snow and uncorked the horn of unpasteurized goat milk she carried at her belt. She poured the white stream over the lip of the crevasse. It hissed against the blue ice like water on hot iron.

"I am Thyra of the Seventh Hearth," she called into the rift. "The timber men will leave before the new moon. Let the passes sleep."

The mountain was silent for the span of forty heartbeats. Then a single boulder rolled down the scree, stopping three inches from her right knee—a boundary stone marked with three parallel grooves, ancient as the sea.`
      }
    ]
  },
  {
    id: 'tale-010',
    title: 'Lament of the Sunken Citadel',
    authorName: 'Caspian Vance',
    description: 'Beneath the calm waters of the Azure Gulf lie the sapphire spires of a drowned kingdom.',
    synopsis: 'Divers in the Azure Gulf have long spoken of bells tolling under the tides. When an oceanographer recovers a bronze sextant untouched by corrosion, the lost empire of Oakhaven begins to reveal its tragic demise.',
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
    era: 'Drowned Epoch',
    tags: ['sea', 'ruins', 'ocean', 'mystery', 'lost-civilization'],
    tone: 'melancholic',
    worldSetting: 'An ancient undersea metropolis discovered inside the calm eye of a perpetual tidal vortex.',
    authorNotes: 'Explores the Atlantean myth from the perspective of coastal pearl divers.',
    isFeatured: false,
    isEditorsPick: true,
    readCount: 1120,
    bookmarkCount: 79,
    reactionCount: 260,
    commentCount: 22,
    chapters: [
      {
        title: 'The Tide Bell',
        content: `Every fisherman along the Jagged Cape knows the third chime of the afternoon tide.

It does not come from the bell tower of Saint Jude on the bluff. It comes from eighty fathoms down, where the seafloor drops into the violet trench known as the Throat.

Caspian pulled his diving mask over his eyes, checked the brass regulator on his twin tanks, and rolled backward over the gunwale of the skiff.

The water was turquoise at twenty feet, cobalt at sixty, and by one hundred feet it had turned the bruised black of crushed plums. Then his lantern beam struck something that had no business existing on a coral bed: fluted marble columns, their capitals carved with acanthus leaves and leaping dolphins, perfectly intact beneath a shroud of golden sea fans.`
      },
      {
        title: 'The Inscription of Queen Thalassa',
        content: `He drifted between the columns into what must have been an imperial council chamber.

Here, schools of phosphorescent silverfish darted through archways where senators had once debated grain tariffs. In the center of the hall stood an altar carved from a single slab of lapis lazuli.

Caspian brushed aside a colony of brittle stars. The Greek letters carved into the stone were filled with gold leaf that had never tarnished:

WE SOUGHT THE MOON IN HER REFLECTION
AND FORGOT THAT THE TIDE IS HER HAND.
REMEMBER US WHEN THE SHORE RETREATS.

He took three photographs, his strobe lighting the stone in brilliant flashes of cyan and gold. When he looked up, the shadows between the columns seemed to sway in cadence with the distant, muffled chime of the sunken bell.`
      }
    ]
  },
  {
    id: 'tale-011',
    title: 'The Alchemist’s Celestial Clock',
    authorName: 'Elora Vance',
    description: 'An alpine tower clockwork mechanism that calculates the precise hour when forgotten gods walk.',
    synopsis: 'Master Horologist Valerius spent forty-two years inside the bell tower of Oberwald building a clock of celestial bronze. Its twelve dials do not track minutes or hours, but the shifting alignments of dormant astral beings.',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
    era: 'Renaissance of Brass',
    tags: ['clockwork', 'alchemy', 'astronomy', 'steampunk', 'invention'],
    tone: 'mysterious',
    worldSetting: 'A towering observatory perched on the ridge of an alpine canyon measuring cosmic cycles.',
    authorNotes: 'Inspired by Prague astronomical clock and mechanical Renaissance treatises.',
    isFeatured: false,
    isEditorsPick: false,
    readCount: 780,
    bookmarkCount: 45,
    reactionCount: 158,
    commentCount: 11,
    chapters: [
      {
        title: 'The Escapement of Stars',
        content: `The ticking was loud enough to frighten the swallows nesting in the eaves.

Tick. Clack. Whirr.

Master Valerius wiped whale oil from his thumb and adjusted the escapement lever with an ivory tweezers. The third pendulum was nine feet long, weighted with a sphere of meteoric nickel that swung once every six seconds with monastic precision.

"You are going blind, uncle," Elora said, climbing the spiral wooden stairs with a basket of dark bread and smoked trout. "The glassmakers in Venice cannot grind lenses small enough for what you are trying to see."

"I do not need eyes to see the orbit of the Iron Sovereign, child," the old man rasped without looking up. "Listen to the chime of gear seventeen. That is not friction. That is the gravity of Saturn tugging at the axle."`
      }
    ]
  },
  {
    id: 'tale-012',
    title: 'Chronicles of the Silk Horizon',
    authorName: 'Li Wei-Lin',
    description: 'A merchant caravan journeys across crimson desert dunes guided by songs preserved in jade flutes.',
    synopsis: 'Across the Great Shifting Sea, ordinary maps are useless because the dunes migrate ten leagues every sandstorm. Only the Flute Keepers can navigate the desert, playing notes that resonate with the subterranean mineral veins.',
    coverUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1200&auto=format&fit=crop',
    era: 'Golden Dynasty',
    tags: ['desert', 'trade', 'caravan', 'folklore', 'travel'],
    tone: 'epic',
    worldSetting: 'The crimson dunes between the jade mountains and the singing mirage cities.',
    authorNotes: 'Influenced by Silk Road legends and ancient Chinese musical acoustics.',
    isFeatured: true,
    isEditorsPick: true,
    readCount: 1680,
    bookmarkCount: 112,
    reactionCount: 430,
    commentCount: 36,
    chapters: [
      {
        title: 'The Crimson Meridian',
        content: `The sand in the Taklamakan does not blow east or west; it dances in spirals that mimic the flight of startled pheasants.

Wei-Lin led his camel by its braided hemp halter, his eyes shielded behind smoked quartz goggles. Behind him, twelve wagons of raw green silk, cinnamon bark, and lacquered tea chests swayed in rhythm with the bells around the dromedaries' necks.

Ahead, the desert turned the color of dried cinnabar.

"Halt the line!" he signaled with two sharp blasts of his bone whistle.

The apprentices scrambled to drop anchor pegs into the packed crust. Old Master Shen unrolled his bamboo sleeve, revealing the white jade flute that had been handed down through nine generations of imperial guides.`
      },
      {
        title: 'The Sand That Answers',
        content: `Master Shen closed his eyes and raised the flute to his chapped lips.

The note was low and hollow, vibrating in the chest cavity like a bronze gong struck muffled underwater. For three breaths, nothing answered save the whistling wind.

Then, fifty yards ahead, the crimson dune began to tremble. A ridge of hard slate emerged from the shifting sand—a submerged spine of rock left by a river that had dried ten thousand years ago.

"The road is open," Master Shen whispered, wiping fine grit from the mouthpiece. "Follow the spine until the evening star touches the third ridge. Tread softly; the salt worms sleep three cubits below."`
      }
    ]
  },
  {
    id: 'tale-013',
    title: 'The Forest That Forgot Its Roots',
    authorName: 'Rowan Thorne',
    description: 'A primeval woodland where centuries-old moss groves wander across valleys during heavy mists.',
    synopsis: 'Woodcutters in the Glen of Oakhaven know never to sleep beneath the same willow twice. The trees of the Shrouded Wood untangle their roots at dusk, roaming the highland valleys in search of rainwater.',
    coverUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop',
    era: 'Verdant Age',
    tags: ['forest', 'fae', 'nature', 'spirits', 'folklore'],
    tone: 'enchanting',
    worldSetting: 'A sentient primeval woodland where centuries-old moss groves shift positions during mist.',
    authorNotes: 'Celtic nature mythology reimagined as a moving ecosystem.',
    isFeatured: false,
    isEditorsPick: false,
    readCount: 890,
    bookmarkCount: 52,
    reactionCount: 195,
    commentCount: 14,
    chapters: [
      {
        title: 'The Walking Oaks',
        content: `It began with a sound like wet leather tearing slowly.

Rowan was setting rabbit snares by the brook when he noticed that the Great Pollard—a three-hundred-year-old oak with a trunk as wide as a blacksmith's cottage—was four rods closer to the water than it had been when he gathered acorns at Michaelmas.

He dropped his snares and walked to the base of the trunk.

Where the roots entered the black earth, there were no broken sods. The soil flowed like dark porridge around thick, gnarly taproots that flexed and curled with deliberate slowness, testing the bank for stability.

"Hungry, old grandfather?" Rowan murmured, resting his palm against the lichen-crusted bark. A tremor coursed through the heartwood—slow, steady, beating once for every ten of a man's heartbeats.`
      }
    ]
  },
  {
    id: 'tale-014',
    title: 'Vessel of the Starlit Dunes',
    authorName: 'Zahra Al-Miraj',
    description: 'Sand-skiffs skimming the desert wastes by aligning brass sextants with forgotten constellations.',
    synopsis: 'When the monsoon winds fail, the trade guilds take to the Sand Ships. With outriggers of polished cedar and sails of woven spun glass, they cross four hundred miles of dunes in three days of breathless flight.',
    coverUrl: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?q=80&w=1200&auto=format&fit=crop',
    era: 'Nomad Sovereign',
    tags: ['desert', 'stars', 'astral', 'voyage', 'adventure'],
    tone: 'mystical',
    worldSetting: 'Sand-skiffs navigating the night wastes by aligning bronze sextants with dead constellations.',
    authorNotes: 'Bedouin astronomical lore blended with speculative nautical fantasy.',
    isFeatured: true,
    isEditorsPick: false,
    readCount: 1340,
    bookmarkCount: 94,
    reactionCount: 350,
    commentCount: 25,
    chapters: [
      {
        title: 'The Glass Skiff',
        content: `The desert at night is not quiet; it sings a high, glassy tone as the hot daytime air escapes from between millions of quartz grains.

Zahra checked the tension on the mainsheet. The skiff was called *The North Falcon*, twenty-four feet from pointed bowsprit to squared stern, balanced on three curved skids of seasoned lignum vitae polished with seal grease.

"Wind rising from the south-southeast!" her lookout cried from the rope basket.

She threw her weight against the tiller. The keel caught the crest of a forty-foot barchan dune, and the ship went airborne for two dizzying seconds, sailing through cold starlight before touching down on the leeward slope with a hiss like silk on velvet.`
      }
    ]
  },
  {
    id: 'tale-015',
    title: 'The Bell of Hundred Echoes',
    authorName: 'Tenzin Norbu',
    description: 'A monastic bell carved from meteoric iron whose tolling reveals forgotten memories.',
    synopsis: 'Atop Mount Kailash stands a monastery with no gates. In its courtyard hangs a bronze bell that was struck only once every fifty years. Pilgrims come seeking not absolution, but the return of things they forgot they had lost.',
    coverUrl: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?q=80&w=1200&auto=format&fit=crop',
    era: 'Monastic Silence',
    tags: ['monastery', 'philosophy', 'sound', 'peace', 'meditation'],
    tone: 'peaceful',
    worldSetting: 'A cloud monastery carved into vertical granite needles above misty chasms.',
    authorNotes: 'Explores Buddhist contemplation and sound vibration metaphysics.',
    isFeatured: false,
    isEditorsPick: true,
    readCount: 620,
    bookmarkCount: 41,
    reactionCount: 178,
    commentCount: 12,
    chapters: [
      {
        title: 'The Strike of Dawn',
        content: `The mallet was made of wild cherry wood wrapped in seven layers of yak felt.

Tenzin stood barefoot on the flagstones, the frost numbing his heels. Behind him, thirty-three novices sat cross-legged with their shawls drawn over their shaved heads.

"Do not listen to the strike," the Abbot whispered beside him. "Listen to the space the sound leaves behind when it dies."

Tenzin swung the mallet.

The iron bell did not scream. It groaned like a glacier calving into a mountain tarn. The wave of sound rippled through the courtyard, passing through their ribs, their temples, their teeth. And in that ringing resonance, Tenzin saw his mother's smile from forty winters ago, vivid as yesterday's snow.`
      }
    ]
  },
  {
    id: 'tale-016',
    title: 'The Last Cartographer of Ashfall',
    authorName: 'Ignis Barov',
    description: 'Mapping an ever-shifting volcanic archipelago where every sunrise reshapes the coastline.',
    synopsis: 'On the volcanic edge of the world, maps are rendered in charcoal on vellum made from cured manta ray skins. Ignis must map the smoking Caldera of Saint Elmo before the magma dome collapses into the boiling sea.',
    coverUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200&auto=format&fit=crop',
    era: 'Cinder Wastes',
    tags: ['volcano', 'maps', 'exploration', 'survival', 'grit'],
    tone: 'gritty',
    worldSetting: 'The volcanic perimeter where ash storms reshape coastlines every solar turn.',
    authorNotes: 'Inspired by early maritime survey expeditions around Krakatoa and Iceland.',
    isFeatured: false,
    isEditorsPick: false,
    readCount: 710,
    bookmarkCount: 38,
    reactionCount: 142,
    commentCount: 9,
    chapters: [
      {
        title: 'The Caldera Rim',
        content: `The ink froze in the horn well unless Ignis kept it pressed against his ribs inside his sheepskin jerkin.

He planted the brass tripod in the black pumice gravel and leveled the compass plate. Two miles across the steaming turquoise crater lake, Fumarole Nine was belching yellow sulphur vapor three hundred feet into the overcast sky.

"Three degrees east of yesterday's benchmark," he muttered, scratching a line into the ray-skin chart with a bone stylus.

The ground shuddered. A flock of ash gulls burst from the crags, screaming their harsh warnings as a new lava tongue began to creep into the northern bay.`
      }
    ]
  },
  {
    id: 'tale-017',
    title: 'The Garden of Silver Serpents',
    authorName: 'Mei-Xing Chen',
    description: 'In the Forbidden Courtyard of the Empress, sleeping serpents weave illusions into blossom trees.',
    synopsis: 'Legend says the silver serpents of Chang’an were not beasts of poison, but guardians of dreams. Every spring, as cherry blossoms carpet the imperial tiles, they awaken to harvest the unuttered wishes of the palace poets.',
    coverUrl: 'https://images.unsplash.com/photo-1528164344705-475426879c0d?q=80&w=1200&auto=format&fit=crop',
    era: 'Jade Empire',
    tags: ['folklore', 'dragons', 'palace', 'intrigue', 'poetry'],
    tone: 'lyrical',
    worldSetting: 'The hidden courtyards of the Empress of Rain, guarded by slumbering silver basilisks.',
    authorNotes: 'Tribute to classical Tang and Song dynasty court poetry and dragon lore.',
    isFeatured: true,
    isEditorsPick: true,
    readCount: 1530,
    bookmarkCount: 105,
    reactionCount: 380,
    commentCount: 31,
    chapters: [
      {
        title: 'Blossoms and Scales',
        content: `The courtyard was paved with white river stones that had been boiled in rosewater every equinox for three centuries.

Mei-Xing stepped quietly along the veranda, holding her lantern low so the oiled rice paper would not catch the autumn draft. In the branches of the weeping plum tree, something glinted like mercury poured through moonlight.

It was neither dragon nor viper. Its scales were thin as beaten silver foil, overlapping with mathematical perfection, and its eyes were two polished pieces of green jade.

"Speak your poem, scholar," the serpent breathed, its tongue tasting the scent of ink on her silk sleeves. "The Empress sleeps, but the garden remembers."`
      }
    ]
  },
  {
    id: 'tale-018',
    title: 'Waltz of the Winter Solstice',
    authorName: 'Freja Lindholm',
    description: 'A royal ball held inside a palace of fjord ice where guests dance to melodies played on icicles.',
    synopsis: 'Once every hundred years, the northern fjord freezes solid to a depth of fifty fathoms. The Ice Queen opens the doors of the Frost Citadel for one solitary night of music, where mortals may dance with the spirits of the aurora.',
    coverUrl: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?q=80&w=1200&auto=format&fit=crop',
    era: 'Boreal Crown',
    tags: ['winter', 'snow', 'royalty', 'ballad', 'romance'],
    tone: 'nostalgic',
    worldSetting: 'A grand palace of carved fjord ice lit with hundreds of tallow candelabras.',
    authorNotes: 'Scandinavian winter fairy tale tradition.',
    isFeatured: false,
    isEditorsPick: true,
    readCount: 840,
    bookmarkCount: 67,
    reactionCount: 220,
    commentCount: 16,
    chapters: [
      {
        title: 'The Great Hall of Frost',
        content: `The chandeliers were made of stalactites plucked from sea caves during the polar midnight.

Freja took the gloved hand of the stranger. Through the white velvet of his palm, she felt no warmth—only the clean, sharp vibration of frozen water under pressure.

"Do you know the steps to the Northbound Reel, lady?" he asked, his voice chiming like crystal wine glasses tapped together.

"My grandmother taught me by the woodstove," she smiled, curtsying as the fiddlers struck up the opening cadence. Around them, two hundred couples spun in circles of fur and velvet, their breath rising like silver clouds toward the vaulted glacial ceiling.`
      }
    ]
  },
  {
    id: 'tale-019',
    title: 'The Book of Forgotten Skies',
    authorName: 'Julian Sterling',
    description: 'Sky-captains sail between floating islands, documenting weather patterns from eras that never were.',
    synopsis: 'When the Zephyr Archipelago was unmoored from the earth during the Great Upheaval, its navigators realized the clouds held historical records. By analyzing rain patterns, they could read the lost histories of cities long turned to dust.',
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
    era: 'Zephyr Isles',
    tags: ['sky', 'airships', 'library', 'adventure', 'clouds'],
    tone: 'wonder',
    worldSetting: 'Floating islands anchored by magnetized iron chains amidst turquoise cloud rivers.',
    authorNotes: 'Sky fantasy paying homage to Jules Verne and Ghibli aeronaval aesthetics.',
    isFeatured: true,
    isEditorsPick: false,
    readCount: 1290,
    bookmarkCount: 86,
    reactionCount: 290,
    commentCount: 24,
    chapters: [
      {
        title: 'The Cloud Anchor',
        content: `The barometer dropped four inches in twelve minutes.

Julian leaned over the mahogany railing of the *Zephyr Queen*, his goggles fogged with moisture from the cumulonimbus cloud bank they were currently bisecting.

"Drop the sounding lead!" he shouted into the speaking tube.

Thirty fathoms below their gondola, the copper weight penetrated a layer of cerulean vapor. When the winch crew hauled it back up, the wax cylinder attached to the lead was etched with delicate frost patterns—not random crystals, but geometric cuneiform formed by ancient barometric memory.`
      }
    ]
  },
  {
    id: 'tale-020',
    title: 'Shadows Across the Amber Gate',
    authorName: 'Soran Khouri',
    description: 'Nine merchant empires negotiate a desperate truce under the golden arch of the Amber Gate.',
    synopsis: 'The Amber Gate is forty feet high and cast from solid fossilized resin. It stands at the border where the dry desert plains meet the lush river delta. When a murdered diplomat is found embedded inside the amber, the peace of nine realms fractures.',
    coverUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1200&auto=format&fit=crop',
    era: 'Silk & Shadow',
    tags: ['intrigue', 'bazaar', 'assassins', 'politics', 'mystery'],
    tone: 'tense',
    worldSetting: 'A crossroad citadel where nine trade routes collide and spies trade in stolen dialects.',
    authorNotes: 'Levantine political intrigue and historical noir.',
    isFeatured: false,
    isEditorsPick: false,
    readCount: 690,
    bookmarkCount: 48,
    reactionCount: 165,
    commentCount: 13,
    chapters: [
      {
        title: 'The Preserved Ambassador',
        content: `The amber was so clear you could count the brass buttons on the dead man's waistcoat.

Soran knelt on the marble flagstones, holding his oil lamp close to the vertical slab. Ambassador Malik looked as though he had simply fallen asleep while reading a treaty—eyes closed, chin resting on his chest, a quill still clasped between his rigid fingers.

"How long has he been inside?" the Grand Vizier whispered from behind a veil of gold thread.

"The gate was cast six hundred years ago, Excellency," Soran replied, pressing his thumb against the warm, fragrant resin. "Yet his pocket watch is still ticking."`
      }
    ]
  },
  {
    id: 'tale-021',
    title: 'The Golem of the Clay Keep',
    authorName: 'Dara O’Connell',
    description: 'An ancient guardian made of river silt and inscribed stones maintains a lonely watchtower.',
    synopsis: 'Generations of villagers have brought loaves of fresh soda bread and clay pots of elderberry wine to the watchtower of Ballycarra. Inside sits Boru, a creature of loam and river boulders, who has never uttered a word yet guards their valley against all wolves.',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    era: 'Old River Kingdoms',
    tags: ['folklore', 'constructs', 'guardians', 'ireland', 'heartfelt'],
    tone: 'tender',
    worldSetting: 'A river valley watchtower maintained by a mute giant made of kiln-baked loam.',
    authorNotes: 'Rooted in Irish and Jewish golem folklore traditions.',
    isFeatured: false,
    isEditorsPick: true,
    readCount: 1040,
    bookmarkCount: 75,
    reactionCount: 275,
    commentCount: 21,
    chapters: [
      {
        title: 'The Loam Hearth',
        content: `Boru did not sleep, but when the rains were heavy, he sat very still near the turf fire so his joints would not soften.

Little Dara climbed up onto the golem's broad shoulder, perching between two rounded stones of river granite that served as collarbones.

"Read the word again, Boru," the boy pleaded, tracing the worn Hebrew letter etched into the creature's clay forehead.

The golem did not speak, but he raised one massive hand—fingers shaped like loaves of unbaked rye—and gently shielded the boy from the draft blowing through the arrow slits.`
      }
    ]
  },
  {
    id: 'tale-022',
    title: 'Tide of the Phosphor Coast',
    authorName: 'Narelle Blue',
    description: 'Emerald bioluminescence transforms an isolated reef into a glowing map of the night sky.',
    synopsis: 'During the vernal equinox, the coral reefs of the Southern Atoll glow with a brilliance that can be seen from high orbit. Pearl divers believe that swimming through the green phosphorescence allows one to speak with the ancestors who charted the ocean before the moon was born.',
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
    era: 'Luminescent Age',
    tags: ['bioluminescence', 'coast', 'secrets', 'night', 'ocean'],
    tone: 'eerie',
    worldSetting: 'A coastal reef whose algae lights up with emerald fire during total eclipses.',
    authorNotes: 'Inspired by the Great Barrier Reef and Polynesian voyaging chants.',
    isFeatured: false,
    isEditorsPick: false,
    readCount: 580,
    bookmarkCount: 33,
    reactionCount: 130,
    commentCount: 8,
    chapters: [
      {
        title: 'The Green Lagoon',
        content: `When Narelle dipped her oar into the lagoon, the disturbance sparked a thousand emerald sparks that drifted like fireflies in the dark water.

Beneath the canoe, the reef was ablaze. Staghorn corals glowed like neon trees, and manta rays glided through the phosphorescence like living jade kites.

"Do not look down too long," her grandfather warned, paddling with rhythmic strokes from the stern. "The sea has eyes tonight, little fish, and she is looking for ones who forget the shore."`
      }
    ]
  },
  {
    id: 'tale-023',
    title: 'The Mirror Merchant of Samara',
    authorName: 'Harun Qasimi',
    description: 'A bazaar merchant sells hand-blown glass mirrors that reveal past deeds and future vows.',
    synopsis: 'In the bazaar of Samara, Master Harun keeps thirty mirrors wrapped in embroidered goat hair. One mirror shows your face as your mother saw you; another shows your face as your enemy dreams of you. But the third mirror is never uncovered without a blood price.',
    coverUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop',
    era: 'Age of Caravans',
    tags: ['fable', 'mirrors', 'merchant', 'morality', 'bazaar'],
    tone: 'whimsical',
    worldSetting: 'An ancient bazaar stall selling mirrors that reflect who you were seven years ago.',
    authorNotes: 'Middle Eastern fable storytelling in the tradition of One Thousand and One Nights.',
    isFeatured: true,
    isEditorsPick: true,
    readCount: 1490,
    bookmarkCount: 99,
    reactionCount: 395,
    commentCount: 28,
    chapters: [
      {
        title: 'The Silvered Surface',
        content: `The stall smelled of cardamom pods, crushed cloves, and nitric acid.

The vizier's captain tossed a pouch of twenty gold dinars onto the cedar table. "I want the mirror that shows the assassin's heart, old man."

Harun picked up the purse, weighed it in his lean palm, and tossed it back.

"Gold buys silvered glass, captain. It does not buy the nerve to look into it. The mirror does not show the assassin's face; it shows the face of the man who hired him. Are you certain your master wishes you to bring that answer back to the palace?"`
      }
    ]
  },
  {
    id: 'tale-024',
    title: 'Covenant of the Hearth Keepers',
    authorName: 'Asha Ndiaye',
    description: 'A sacred fire that has burned for forty generations guards a peaceful savannah village.',
    synopsis: 'Since the time of the Great Drought, the women of the Baobab Circle have tended the central embers of Koro. If the flame should ever die, legend holds that the lion spirits of the grassland will reclaim the houses and return the soil to wild scrub.',
    coverUrl: 'https://images.unsplash.com/photo-1492571350019-22de08371fd3?q=80&w=1200&auto=format&fit=crop',
    era: 'Tribal Fire',
    tags: ['hearth', 'oral-tradition', 'elders', 'fire', 'community'],
    tone: 'cozy',
    worldSetting: 'A savannah compound gathered around a sacred fire that has burned for forty generations.',
    authorNotes: 'West African griot oral narrative celebrating communal preservation.',
    isFeatured: false,
    isEditorsPick: false,
    readCount: 760,
    bookmarkCount: 51,
    reactionCount: 188,
    commentCount: 15,
    chapters: [
      {
        title: 'The Red Ember',
        content: `The wood must be mopane root, cured in dry sand for two dry seasons before it touches the coals.

Asha added three thumb-sized chunks to the hearth with iron tongs. The fire did not blaze in wild sparks; it sat deep in the clay bowl like molten honey, breathing quietly in rhythm with the evening cicadas.

"Tell the story of the elephant mother," the children chorused, wrapping their cotton blankets tight against the savannah chill.

Asha smiled, the glow of the embers painting copper lights in her eyes. "Listen then, small ones, to how the first drum was hollowed from a fallen star..."`
      }
    ]
  },
  {
    id: 'tale-025',
    title: 'The Brass Sparrow’s Flight',
    authorName: 'Matteo Rossi',
    description: 'A clockmaker’s mechanical bird escapes its cage to deliver a forgotten love letter across war-torn Venice.',
    synopsis: 'Crafted with spring-loaded brass wings and a ruby escapement gear, the mechanical sparrow was intended as a novelty for the Doge. Instead, it was wound with a secret clockwork message that could stop an impending fleet siege.',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    era: 'Mechanical Renaissance',
    tags: ['automata', 'invention', 'hope', 'venice', 'steampunk'],
    tone: 'inspiring',
    worldSetting: 'A workshop city of canals, waterwheels, and wind-up aviary messengers.',
    authorNotes: 'Renaissance Italian clockwork and Venetian romanticism.',
    isFeatured: true,
    isEditorsPick: false,
    readCount: 1180,
    bookmarkCount: 82,
    reactionCount: 265,
    commentCount: 20,
    chapters: [
      {
        title: 'The Spring and the Feather',
        content: `Click. Whirr-r-r.

The tiny bird tilted its head forty-five degrees, its two emerald eyes catching the candlelight. Matteo inserted the miniature silver key into the keyhole beneath its left wing and turned it four and a half times.

"Fly to the balcony with the blue wisteria, little friend," he whispered through trembling lips.

The bird spread its articulated brass feathers, the miniature gears whirring with the precision of a Swiss pocket watch. It launched from his open window into the damp Venetian night, banking gracefully over the dark waters of the Grand Canal as church bells tolled two in the morning.`
      }
    ]
  },
  {
    id: 'tale-026',
    title: 'Whispering Wells of Qumran',
    authorName: 'Malik Thorne',
    description: 'Subterranean limestone wells that echo ancient prophecies when spring waters fill the aquifers.',
    synopsis: 'Beneath the desert cliffs of the Dead Sea lie forty-two rock-cut cisterns. When the flash floods cascade from the Judean hills, the rushing water turns the cistern air shafts into massive organ pipes playing chords of ancient prophecy.',
    coverUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1200&auto=format&fit=crop',
    era: 'Desert Hermits',
    tags: ['desert', 'water', 'prophecy', 'mystery', 'caves'],
    tone: 'reverent',
    worldSetting: 'Subterranean aquifers where monks listen to water droplets echoing prophecies.',
    authorNotes: 'Historical theological archaeology mixed with natural acoustics.',
    isFeatured: false,
    isEditorsPick: true,
    readCount: 890,
    bookmarkCount: 59,
    reactionCount: 215,
    commentCount: 14,
    chapters: [
      {
        title: 'The Sounding Chamber',
        content: `Malik lowered his parchment horn into the darkness of Well Twenty-Two.

The water was three hundred feet down, dripping rhythmically onto a limestone bell: *Plink. Plop. Resound.*

Each drop produced a resonant overtone that bounced between the carved Hebrew letters covering the limestone walls. For twelve centuries, the order of the Listeners had transcribed these acoustic patterns, charting floods, droughts, and the rise and fall of empires.`
      }
    ]
  },
  {
    id: 'tale-027',
    title: 'The King Who Counted Leaves',
    authorName: 'Barnaby Finch',
    description: 'A gentle monarch abdicates his golden throne to catalog every oak leaf in his enchanted forest.',
    synopsis: 'King Aldous XVIII was declared mad by his chancellors when he traded his crown of rubies for a leatherbound folio and a wooden magnifying lens. Thirty years later, the chancellors found that his leaf catalog had prevented the Great Blight from starving the realm.',
    coverUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop',
    era: 'Fable of the Crown',
    tags: ['fable', 'monarch', 'folklore', 'nature', 'wit'],
    tone: 'satirical',
    worldSetting: 'A small overgrown kingdom whose ruler spent thirty years cataloging every oak leaf.',
    authorNotes: 'Gentle satirical fable celebrating botanical science over imperial conquest.',
    isFeatured: false,
    isEditorsPick: false,
    readCount: 920,
    bookmarkCount: 63,
    reactionCount: 240,
    commentCount: 17,
    chapters: [
      {
        title: 'Leaf Fourteen Thousand and One',
        content: `"Fourteen thousand, four hundred and two," Aldous murmured, pressing the serrated green margin of an autumn leaf into his heavy cedar press.

The Prime Minister stood in the mud, his ermine robes splattered with damp moss. "Sire! The Duke of Alençon has mobilized forty thousand pikes on the border! You must return to the war room!"

"Tell the Duke that his pikes are made of ash wood," the King replied without raising his head, "and that three of his ash groves have already developed the black gall. If he marches his men in the autumn rain, his spears will snap before they reach the river. Now hand me that bottle of gum arabic, will you?"`
      }
    ]
  },
  {
    id: 'tale-028',
    title: 'Runes of the Midnight Aurora',
    authorName: 'Astrid Skov',
    description: 'A blind skald interprets glowing celestial ribbons written across arctic winter skies.',
    synopsis: 'In the northern fjord lands, the aurora borealis is not considered light, but the living calligraphy of the sky gods. Only those without mortal vision can perceive the true geometric prophecies spelled out in the emerald curtains.',
    coverUrl: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1200&auto=format&fit=crop',
    era: 'Glacial Runes',
    tags: ['aurora', 'runes', 'magic', 'northern', 'prophecy'],
    tone: 'epic',
    worldSetting: 'A frozen fjord where sky lights spell out runes only blind shamans can decode.',
    authorNotes: 'Norse skaldic traditions and geomagnetism mythology.',
    isFeatured: true,
    isEditorsPick: true,
    readCount: 1750,
    bookmarkCount: 130,
    reactionCount: 480,
    commentCount: 42,
    chapters: [
      {
        title: 'The Sky-Scribe',
        content: `Astrid sat on the whalebone stool facing the northern horizon.

She wore a linen band over her sightless eyes, her hands resting flat on a drumhead made of dried halibut skin. When the aurora flared green above the peaks, the electrical charge in the cold air caused the skin of the drum to hum like a tuning fork.

"The dragon rune is turning," she announced to the silent clan gathered around the peat fire. "The ice will hold until the fourth moon. Prepare the sealing boats."`
      }
    ]
  },
  {
    id: 'tale-029',
    title: 'The Weaver of Falling Leaves',
    authorName: 'Chiyo Takahashi',
    description: 'An elderly artisan creates exquisite tapestries woven purely from autumn maple leaves.',
    synopsis: 'Deep in the cedar mountains of Yoshino, Master Chiyo gathers scarlet momiji leaves preserved in sweet rice vinegar. Her tapestries survive centuries without fading, holding within their fibers the exact warmth of the autumn sun under which they fell.',
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
    era: 'Autumn Moon',
    tags: ['autumn', 'poetry', 'spirits', 'loss', 'japan'],
    tone: 'wistful',
    worldSetting: 'A tranquil temple in the red maple hills where an artisan weaves tapestries from frost-brittle leaves.',
    authorNotes: 'Explores wabi-sabi aesthetics and Japanese textile preservation.',
    isFeatured: false,
    isEditorsPick: true,
    readCount: 810,
    bookmarkCount: 56,
    reactionCount: 210,
    commentCount: 13,
    chapters: [
      {
        title: 'The Red Maple Loom',
        content: `The shuttle was carved from cherry wood, polished with camellia oil until it slipped through the silk threads without making a sound.

Chiyo picked up a leaf of deep vermilion, its five points sharp as an eagle's talons. She laid it across the warp, tucking the thin stem between two strands of spun hemp.

"Why do you work so hard on something that rots, grandmother?" the novice asked, sweeping fallen needles from the veranda.

"Nothing rots if it is remembered with reverence, child," Chiyo murmured, sliding the comb downward to lock the crimson leaf into eternity.`
      }
    ]
  },
  {
    id: 'tale-030',
    title: 'Voyage of the Solar Moth',
    authorName: 'Orion Vance',
    description: 'A gilded galleon with gossamer sails rides the solar winds to the border of the known universe.',
    synopsis: 'When the terrestrial seas were exhausted, the Astromancers of Alexandria constructed the *Solaris*—a three-masted schooner fitted with sails of woven gossamer that catch the photons streaming from the heart of the sun.',
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
    era: 'Aetherial Age',
    tags: ['space', 'celestial', 'voyage', 'myth', 'sun'],
    tone: 'grand',
    worldSetting: 'A golden celestial galleon riding solar winds toward the rim of creation.',
    authorNotes: 'Blends ancient Hellenistic astronomy with solar sail astrophysics.',
    isFeatured: true,
    isEditorsPick: false,
    readCount: 1380,
    bookmarkCount: 97,
    reactionCount: 360,
    commentCount: 27,
    chapters: [
      {
        title: 'The Solar Wind',
        content: `The sails were thinner than a soap bubble, shimmering with iridescent rainbow rings as millions of photons pounded against the mirrored gossamer.

Captain Orion stood at the helm of the *Solaris*, adjusting the solar rudder by three arcseconds. Ahead lay the orbit of Mars, glowing like a blood ruby against the velvet tapestry of deep space.

"All hands prepare for the Jupiter slingshot!" he commanded through the brass trumpet. "Check your magnetic boots; we enter the zero-gravity channel in three bell strikes."`
      }
    ]
  },
  {
    id: 'tale-031',
    title: 'The Ghost of the Gilded Lyre',
    authorName: 'Daphne Vane',
    description: 'An ancient Greek amphitheater where the shade of a legendary poet still plays for the evening tide.',
    synopsis: 'On the sun-baked cliffs of Delos stands a half-ruined marble stage overlooking the Aegean. When the offshore evening breeze blows through the fluted columns, the spectral notes of a gilded lyre drift across the waves, calming even the most violent tempests.',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    era: 'Hellenic Mythos',
    tags: ['music', 'tragedy', 'ghosts', 'greek', 'sea'],
    tone: 'haunting',
    worldSetting: 'An amphitheater on a sun-drenched cliff overlooking the wine-dark Aegean sea.',
    authorNotes: 'Honoring the Orphic hymns and ancient Mediterranean acoustics.',
    isFeatured: false,
    isEditorsPick: true,
    readCount: 870,
    bookmarkCount: 61,
    reactionCount: 235,
    commentCount: 19,
    chapters: [
      {
        title: 'The Twilight Hymn',
        content: `The marble benches were still warm from the Mediterranean sun when Daphne reached the orchestra circle.

In the center of the ring, where the altar of Dionysus had stood two thousand years before, a shimmer of silver air wavered like heat above an anvil.

Then came the chord.

Seven strings of bronze and gut, tuned to the Dorian mode. The sound was so pure, so resonant, that the sea gulls circling above ceased their cries, gliding motionless on the rising evening thermal.`
      }
    ]
  }
];

function buildSearchKeywords(title, tags) {
  const words = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const tagWords = (tags || []).map((t) => t.toLowerCase());
  return [...new Set([...words, ...tagWords])];
}

async function runSeed() {
  console.log('🚀 Starting TaleTranscend Firebase Seeding...');

  // Sign in anonymously to get a valid authenticated author UID for security rules
  const userCred = await signInAnonymously(auth);
  const uid = userCred.user.uid;
  console.log(`👤 Signed in as scribe UID: ${uid}`);

  const existingSnap = await getDocs(collection(db, TALES_PATH));
  const existingIds = new Set(existingSnap.docs.map((d) => d.id));
  console.log(`📊 Found ${existingIds.size} existing tales in Firestore.`);

  let createdCount = 0;

  for (const item of SEED_TALES) {
    const taleId = item.id;

    // Calculate word count & estimated reading time across chapters
    const totalWords = item.chapters.reduce((sum, ch) => {
      const words = ch.content.trim().split(/\s+/).length;
      return sum + words;
    }, 0);
    const estimatedReadMins = Math.max(1, Math.ceil(totalWords / 225));

    const taleRef = doc(db, TALES_PATH, taleId);

    const now = Timestamp.now();
    // Stagger timestamps across past 30 days so pagination ordering is realistic
    const daysAgo = Math.floor(Math.random() * 25) + 1;
    const pastTimestamp = Timestamp.fromDate(new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000));

    const talePayload = {
      title: item.title,
      authorId: uid, // conforms to isAuthorOfIncoming() rule
      authorName: item.authorName,
      authorAvatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(item.authorName)}`,
      description: item.description,
      synopsis: item.synopsis,
      coverUrl: item.coverUrl,
      era: item.era,
      tags: item.tags,
      tone: item.tone,
      language: 'English',
      visibility: 'public',
      audience: 'General',
      contentWarnings: [],
      worldSetting: item.worldSetting,
      authorNotes: item.authorNotes,
      chapterCount: item.chapters.length,
      wordCount: totalWords,
      estimatedReadMins,
      readCount: item.readCount,
      commentCount: item.commentCount,
      reactionCount: item.reactionCount,
      bookmarkCount: item.bookmarkCount,
      status: 'published',
      isFeatured: Boolean(item.isFeatured),
      isEditorsPick: Boolean(item.isEditorsPick),
      searchKeywords: buildSearchKeywords(item.title, item.tags),
      submittedAt: pastTimestamp,
      reviewedAt: pastTimestamp,
      reviewedBy: 'archive-curator',
      rejectionReason: null,
      moderationNotes: 'Archived directly into public repository.',
      publishedAt: pastTimestamp,
      lastChapterAddedAt: pastTimestamp,
      createdAt: pastTimestamp,
      updatedAt: now,
    };

    console.log(`Writing tale ${taleId}: "${item.title}"...`);
    await setDoc(taleRef, talePayload, { merge: true });

    // Seed chapters
    for (let idx = 0; idx < item.chapters.length; idx++) {
      const ch = item.chapters[idx];
      const chWords = ch.content.trim().split(/\s+/).length;
      const chMins = Math.max(1, Math.ceil(chWords / 225));
      const chRef = doc(db, `${TALES_PATH}/${taleId}/chapters`, String(idx));

      await setDoc(
        chRef,
        {
          chapterNum: idx + 1,
          title: ch.title,
          content: ch.content,
          index: idx,
          wordCount: chWords,
          estimatedReadMins: chMins,
          createdAt: pastTimestamp,
          updatedAt: now,
          publishedAt: pastTimestamp,
        },
        { merge: true }
      );
    }

    createdCount++;
  }

  const finalSnap = await getDocs(collection(db, TALES_PATH));
  console.log(`\n🎉 Seeding complete!`);
  console.log(`✨ Successfully seeded ${createdCount} tales.`);
  console.log(`📚 Total tales in Firestore now: ${finalSnap.size}`);

  process.exit(0);
}

runSeed().catch((err) => {
  console.error('❌ Seeding failed with error:', err);
  process.exit(1);
});
