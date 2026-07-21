// PlantRight — curated plant catalog + preference matcher.
//
// Every entry is tagged with the attributes the dashboard asks about so a
// plan can be narrowed to what the gardener actually wants to plant:
//   zones     [min, max] USDA hardiness zones the plant survives in
//   life      "annual" | "perennial" | "biennial"  (woody shrubs/trees are perennial)
//   type      what you'd shop for it as
//   size      mature height: small <2ft · medium 2-6ft · large >6ft
//   flowering true when the bloom is a reason to plant it
//   sun       ideal exposure: "full" (6h+) · "part" · "shade"
//   water     "low" | "medium" | "high"

export type Life = "annual" | "perennial" | "biennial";
export type PlantType =
  | "vegetable"
  | "fruit"
  | "herb"
  | "flower"
  | "shrub"
  | "tree"
  | "vine"
  | "grass"
  | "groundcover";
export type Size = "small" | "medium" | "large";
export type Sun = "full" | "part" | "shade";
export type Water = "low" | "medium" | "high";

export type Plant = {
  name: string;
  why: string;
  zones: [number, number];
  life: Life;
  type: PlantType;
  size: Size;
  flowering: boolean;
  sun: Sun;
  water: Water;
};

export const CATALOG: Plant[] = [
  // ---------------- Vegetables ----------------
  { name: "Tomato (early variety)", why: "Sets fruit before heat stress and fits shorter seasons.", zones: [3, 11], life: "annual", type: "vegetable", size: "medium", flowering: false, sun: "full", water: "medium" },
  { name: "Cherry Tomato", why: "Ripens fast and keeps producing until frost.", zones: [3, 11], life: "annual", type: "vegetable", size: "medium", flowering: false, sun: "full", water: "medium" },
  { name: "Bell Pepper", why: "Needs warm nights to size up — your summers deliver.", zones: [4, 11], life: "annual", type: "vegetable", size: "medium", flowering: false, sun: "full", water: "medium" },
  { name: "Jalapeño Pepper", why: "Heat-loving and productive in a small footprint.", zones: [4, 11], life: "annual", type: "vegetable", size: "small", flowering: false, sun: "full", water: "medium" },
  { name: "Zucchini", why: "One or two plants will out-produce a whole bed.", zones: [3, 11], life: "annual", type: "vegetable", size: "medium", flowering: false, sun: "full", water: "high" },
  { name: "Cucumber", why: "Trellis it to save space and keep fruit clean.", zones: [4, 11], life: "annual", type: "vine", size: "medium", flowering: false, sun: "full", water: "high" },
  { name: "Bush Beans", why: "No trellis needed and ready in about 55 days.", zones: [3, 11], life: "annual", type: "vegetable", size: "small", flowering: false, sun: "full", water: "medium" },
  { name: "Pole Beans", why: "Vertical yield — a big harvest from a narrow bed.", zones: [3, 11], life: "annual", type: "vine", size: "large", flowering: false, sun: "full", water: "medium" },
  { name: "Leaf Lettuce", why: "Forgiving cool-season crop you can cut and regrow.", zones: [2, 11], life: "annual", type: "vegetable", size: "small", flowering: false, sun: "part", water: "medium" },
  { name: "Spinach", why: "Fast cool-season green that shrugs off light frost.", zones: [2, 9], life: "annual", type: "vegetable", size: "small", flowering: false, sun: "part", water: "medium" },
  { name: "Kale", why: "Frost actually sweetens the leaves.", zones: [2, 10], life: "biennial", type: "vegetable", size: "medium", flowering: false, sun: "full", water: "medium" },
  { name: "Swiss Chard", why: "Handles both cool and hot spells without bolting.", zones: [3, 10], life: "biennial", type: "vegetable", size: "medium", flowering: false, sun: "full", water: "medium" },
  { name: "Carrots", why: "Direct-sown and happy in cool soil.", zones: [3, 10], life: "biennial", type: "vegetable", size: "small", flowering: false, sun: "full", water: "medium" },
  { name: "Radishes", why: "Harvestable in under a month — great for filling gaps.", zones: [2, 11], life: "annual", type: "vegetable", size: "small", flowering: false, sun: "full", water: "medium" },
  { name: "Beets", why: "Two crops in one: roots and edible greens.", zones: [2, 10], life: "biennial", type: "vegetable", size: "small", flowering: false, sun: "full", water: "medium" },
  { name: "Broccoli", why: "Cool-season crop that heads up before summer heat.", zones: [3, 10], life: "annual", type: "vegetable", size: "medium", flowering: false, sun: "full", water: "medium" },
  { name: "Sugar Snap Peas", why: "Plant early — they thrive while it's still chilly.", zones: [3, 9], life: "annual", type: "vine", size: "medium", flowering: false, sun: "full", water: "medium" },
  { name: "Okra", why: "A true heat-lover that keeps going in high summer.", zones: [6, 11], life: "annual", type: "vegetable", size: "large", flowering: true, sun: "full", water: "low" },
  { name: "Sweet Potatoes", why: "Long warm season lets the roots size up.", zones: [8, 11], life: "annual", type: "vine", size: "small", flowering: false, sun: "full", water: "low" },
  { name: "Winter Squash", why: "Sprawls in summer and stores for months after harvest.", zones: [3, 11], life: "annual", type: "vine", size: "large", flowering: false, sun: "full", water: "medium" },
  { name: "Garlic", why: "Plant in fall, ignore all winter, harvest in summer.", zones: [3, 9], life: "annual", type: "vegetable", size: "small", flowering: false, sun: "full", water: "low" },
  { name: "Onions", why: "Pick a day-length type suited to your latitude.", zones: [3, 9], life: "biennial", type: "vegetable", size: "small", flowering: false, sun: "full", water: "medium" },
  { name: "Eggplant", why: "Wants the same long heat that peppers do.", zones: [5, 11], life: "annual", type: "vegetable", size: "medium", flowering: false, sun: "full", water: "medium" },
  { name: "Rhubarb", why: "A permanent patch that returns bigger every spring.", zones: [3, 7], life: "perennial", type: "vegetable", size: "medium", flowering: false, sun: "full", water: "medium" },
  { name: "Asparagus", why: "Slow to start, then productive for 15+ years.", zones: [3, 8], life: "perennial", type: "vegetable", size: "large", flowering: false, sun: "full", water: "medium" },

  // ---------------- Fruit ----------------
  { name: "Strawberries", why: "Spreads into a low edible groundcover.", zones: [3, 10], life: "perennial", type: "fruit", size: "small", flowering: true, sun: "full", water: "medium" },
  { name: "Highbush Blueberry", why: "Cold-hardy, needs acidic soil, gorgeous fall color.", zones: [3, 8], life: "perennial", type: "shrub", size: "large", flowering: true, sun: "full", water: "medium" },
  { name: "Rabbiteye Blueberry", why: "The blueberry bred for warm southern summers.", zones: [7, 9], life: "perennial", type: "shrub", size: "large", flowering: true, sun: "full", water: "medium" },
  { name: "Raspberries", why: "Canes fruit heavily with almost no fussing.", zones: [3, 9], life: "perennial", type: "shrub", size: "medium", flowering: true, sun: "full", water: "medium" },
  { name: "Thornless Blackberry", why: "Big harvests without the scratches.", zones: [5, 9], life: "perennial", type: "shrub", size: "medium", flowering: true, sun: "full", water: "medium" },
  { name: "Fig 'Brown Turkey'", why: "Two crops a year once winters stay mild.", zones: [7, 11], life: "perennial", type: "tree", size: "large", flowering: false, sun: "full", water: "low" },
  { name: "Dwarf Meyer Lemon", why: "Rarely-freezing winters keep it fruiting outdoors.", zones: [9, 11], life: "perennial", type: "tree", size: "medium", flowering: true, sun: "full", water: "medium" },
  { name: "Avocado", why: "Frost-free winters let it flower and set fruit.", zones: [9, 11], life: "perennial", type: "tree", size: "large", flowering: false, sun: "full", water: "medium" },
  { name: "Mango", why: "Heat and humidity are exactly what it wants.", zones: [10, 11], life: "perennial", type: "tree", size: "large", flowering: true, sun: "full", water: "medium" },
  { name: "Banana", why: "Year-round warmth lets a clump mature and fruit.", zones: [9, 11], life: "perennial", type: "tree", size: "large", flowering: false, sun: "full", water: "high" },
  { name: "Dwarf Apple Tree", why: "Needs winter chill hours — your winters supply them.", zones: [3, 8], life: "perennial", type: "tree", size: "large", flowering: true, sun: "full", water: "medium" },
  { name: "Peach Tree", why: "Spring bloom plus fruit in a mid-range climate.", zones: [5, 9], life: "perennial", type: "tree", size: "large", flowering: true, sun: "full", water: "medium" },
  { name: "Pomegranate", why: "Loves heat, tolerates drought, blooms orange-red.", zones: [7, 11], life: "perennial", type: "shrub", size: "large", flowering: true, sun: "full", water: "low" },

  // ---------------- Herbs ----------------
  { name: "Basil", why: "Pinch it back and it thickens all summer.", zones: [4, 11], life: "annual", type: "herb", size: "small", flowering: false, sun: "full", water: "medium" },
  { name: "Rosemary", why: "Overwinters outdoors here and needs almost no water.", zones: [7, 11], life: "perennial", type: "herb", size: "medium", flowering: true, sun: "full", water: "low" },
  { name: "Thyme", why: "Low, tough, and happy in poor dry soil.", zones: [4, 9], life: "perennial", type: "herb", size: "small", flowering: true, sun: "full", water: "low" },
  { name: "Oregano", why: "Spreads into a fragrant mat and returns each spring.", zones: [4, 10], life: "perennial", type: "herb", size: "small", flowering: true, sun: "full", water: "low" },
  { name: "Mint", why: "Nearly unkillable — keep it in a pot.", zones: [3, 11], life: "perennial", type: "herb", size: "small", flowering: false, sun: "part", water: "high" },
  { name: "Sage", why: "Woody, drought-tough, and evergreen in mild winters.", zones: [4, 10], life: "perennial", type: "herb", size: "medium", flowering: true, sun: "full", water: "low" },
  { name: "Chives", why: "First green thing up in spring, with edible purple blooms.", zones: [3, 9], life: "perennial", type: "herb", size: "small", flowering: true, sun: "full", water: "medium" },
  { name: "Cilantro", why: "Sow in cool weather — it bolts the moment it's hot.", zones: [3, 11], life: "annual", type: "herb", size: "small", flowering: false, sun: "part", water: "medium" },
  { name: "Flat-leaf Parsley", why: "Cut-and-come-again all season, mild frost tolerant.", zones: [4, 9], life: "biennial", type: "herb", size: "small", flowering: false, sun: "part", water: "medium" },
  { name: "Dill", why: "Self-sows and feeds swallowtail caterpillars.", zones: [3, 11], life: "annual", type: "herb", size: "medium", flowering: true, sun: "full", water: "medium" },
  { name: "Lavender 'Munstead'", why: "The lavender that reliably survives colder winters.", zones: [5, 9], life: "perennial", type: "herb", size: "medium", flowering: true, sun: "full", water: "low" },
  { name: "Lemongrass", why: "Tropical clumping grass that thrives in your heat.", zones: [9, 11], life: "perennial", type: "herb", size: "large", flowering: false, sun: "full", water: "medium" },

  // ---------------- Perennial flowers ----------------
  { name: "Coneflower (Echinacea)", why: "Native, drought-tolerant, and covered in pollinators.", zones: [3, 9], life: "perennial", type: "flower", size: "medium", flowering: true, sun: "full", water: "low" },
  { name: "Black-eyed Susan", why: "Tough native that reseeds happily and blooms for months.", zones: [3, 9], life: "perennial", type: "flower", size: "medium", flowering: true, sun: "full", water: "low" },
  { name: "Daylily", why: "Survives neglect and still blooms every summer.", zones: [3, 9], life: "perennial", type: "flower", size: "medium", flowering: true, sun: "full", water: "low" },
  { name: "Hosta", why: "The reliable answer for a shady bed.", zones: [3, 9], life: "perennial", type: "flower", size: "medium", flowering: false, sun: "shade", water: "medium" },
  { name: "Peony", why: "Needs a hard winter chill to set buds — perfect here.", zones: [3, 8], life: "perennial", type: "flower", size: "medium", flowering: true, sun: "full", water: "medium" },
  { name: "Siberian Iris", why: "Cold-hardy and shrugs off deep freezes.", zones: [3, 9], life: "perennial", type: "flower", size: "medium", flowering: true, sun: "full", water: "medium" },
  { name: "Bearded Iris", why: "Rhizomes bake happily in dry summer sun.", zones: [3, 9], life: "perennial", type: "flower", size: "medium", flowering: true, sun: "full", water: "low" },
  { name: "Sedum 'Autumn Joy'", why: "Succulent foliage all season, late bloom for bees.", zones: [3, 9], life: "perennial", type: "flower", size: "medium", flowering: true, sun: "full", water: "low" },
  { name: "Russian Sage", why: "Silvery, aromatic, and thrives on being ignored.", zones: [4, 9], life: "perennial", type: "flower", size: "medium", flowering: true, sun: "full", water: "low" },
  { name: "Salvia 'May Night'", why: "Deep violet spikes that rebloom if you cut them back.", zones: [4, 9], life: "perennial", type: "flower", size: "medium", flowering: true, sun: "full", water: "low" },
  { name: "Coreopsis", why: "Months of small gold daisies on a compact plant.", zones: [4, 9], life: "perennial", type: "flower", size: "small", flowering: true, sun: "full", water: "low" },
  { name: "Shasta Daisy", why: "Classic cutting-garden perennial, very forgiving.", zones: [4, 9], life: "perennial", type: "flower", size: "medium", flowering: true, sun: "full", water: "medium" },
  { name: "Garden Phlox", why: "Fragrant mid-summer color when spring bloomers fade.", zones: [4, 8], life: "perennial", type: "flower", size: "medium", flowering: true, sun: "full", water: "medium" },
  { name: "Bee Balm (Monarda)", why: "Hummingbird magnet that spreads into a nice clump.", zones: [4, 9], life: "perennial", type: "flower", size: "medium", flowering: true, sun: "full", water: "medium" },
  { name: "Astilbe", why: "Feathery plumes for shade where little else blooms.", zones: [4, 8], life: "perennial", type: "flower", size: "medium", flowering: true, sun: "shade", water: "high" },
  { name: "Ostrich Fern", why: "Architectural shade foliage, no flowers to deadhead.", zones: [3, 8], life: "perennial", type: "flower", size: "large", flowering: false, sun: "shade", water: "high" },
  { name: "Hellebore (Lenten Rose)", why: "Blooms in late winter while everything else sleeps.", zones: [4, 9], life: "perennial", type: "flower", size: "small", flowering: true, sun: "shade", water: "medium" },
  { name: "Catmint (Nepeta)", why: "Long-blooming, deer-resistant, and drought-proof.", zones: [3, 8], life: "perennial", type: "flower", size: "small", flowering: true, sun: "full", water: "low" },
  { name: "Yarrow", why: "Flat flower heads on a plant that wants poor dry soil.", zones: [3, 9], life: "perennial", type: "flower", size: "medium", flowering: true, sun: "full", water: "low" },
  { name: "Blanket Flower (Gaillardia)", why: "Nonstop red-gold bloom in heat and bad soil.", zones: [3, 10], life: "perennial", type: "flower", size: "small", flowering: true, sun: "full", water: "low" },
  { name: "Butterfly Weed", why: "The native milkweed monarchs actually lay eggs on.", zones: [3, 9], life: "perennial", type: "flower", size: "medium", flowering: true, sun: "full", water: "low" },
  { name: "Lantana", why: "Blooms through brutal heat and never needs water.", zones: [8, 11], life: "perennial", type: "flower", size: "small", flowering: true, sun: "full", water: "low" },
  { name: "Tropical Hibiscus", why: "Dinner-plate blooms where frost never arrives.", zones: [9, 11], life: "perennial", type: "shrub", size: "large", flowering: true, sun: "full", water: "medium" },
  { name: "Bougainvillea", why: "Thrives on heat, sun, and being under-watered.", zones: [9, 11], life: "perennial", type: "vine", size: "large", flowering: true, sun: "full", water: "low" },
  { name: "Plumeria", why: "True tropical — needs your frost-free winters.", zones: [10, 11], life: "perennial", type: "tree", size: "large", flowering: true, sun: "full", water: "low" },
  { name: "Bird of Paradise", why: "Frost-free winters let it flower again and again.", zones: [9, 11], life: "perennial", type: "flower", size: "large", flowering: true, sun: "full", water: "medium" },
  { name: "Agapanthus", why: "Blue globe flowers on an evergreen clump.", zones: [8, 11], life: "perennial", type: "flower", size: "medium", flowering: true, sun: "full", water: "low" },
  { name: "Canna Lily", why: "Bold tropical foliage plus vivid summer bloom.", zones: [7, 11], life: "perennial", type: "flower", size: "large", flowering: true, sun: "full", water: "high" },

  // ---------------- Annual flowers ----------------
  { name: "Marigolds", why: "Easy annual color that deters common garden pests.", zones: [2, 11], life: "annual", type: "flower", size: "small", flowering: true, sun: "full", water: "medium" },
  { name: "Zinnias", why: "Direct-sow, cut endlessly, bloom until frost.", zones: [2, 11], life: "annual", type: "flower", size: "medium", flowering: true, sun: "full", water: "medium" },
  { name: "Sunflowers", why: "Fastest way to get height and drama in one season.", zones: [2, 11], life: "annual", type: "flower", size: "large", flowering: true, sun: "full", water: "medium" },
  { name: "Cosmos", why: "Airy height from seed in poor soil, no fertilizer.", zones: [2, 11], life: "annual", type: "flower", size: "large", flowering: true, sun: "full", water: "low" },
  { name: "Petunias", why: "Spills over containers and blooms nonstop.", zones: [2, 11], life: "annual", type: "flower", size: "small", flowering: true, sun: "full", water: "medium" },
  { name: "Impatiens", why: "One of the few annuals that flowers in real shade.", zones: [2, 11], life: "annual", type: "flower", size: "small", flowering: true, sun: "shade", water: "high" },
  { name: "Wax Begonia", why: "Handles part shade and humidity without sulking.", zones: [2, 11], life: "annual", type: "flower", size: "small", flowering: true, sun: "part", water: "medium" },
  { name: "Snapdragons", why: "Cool-weather bloomer for spring and fall color.", zones: [2, 11], life: "annual", type: "flower", size: "medium", flowering: true, sun: "full", water: "medium" },
  { name: "Pansies", why: "Plant in fall or early spring — they laugh at frost.", zones: [2, 11], life: "annual", type: "flower", size: "small", flowering: true, sun: "part", water: "medium" },
  { name: "Nasturtiums", why: "Edible flowers on a plant that prefers bad soil.", zones: [2, 11], life: "annual", type: "flower", size: "small", flowering: true, sun: "full", water: "low" },
  { name: "Sweet Alyssum", why: "Low carpet of honey-scented white, great edging.", zones: [2, 11], life: "annual", type: "groundcover", size: "small", flowering: true, sun: "full", water: "medium" },

  // ---------------- Shrubs ----------------
  { name: "Lilac", why: "Classic cold-climate shrub with reliable spring scent.", zones: [3, 7], life: "perennial", type: "shrub", size: "large", flowering: true, sun: "full", water: "medium" },
  { name: "Panicle Hydrangea", why: "The hydrangea that blooms even after a hard winter.", zones: [3, 8], life: "perennial", type: "shrub", size: "large", flowering: true, sun: "full", water: "medium" },
  { name: "Bigleaf Hydrangea", why: "Mophead blooms whose color follows your soil pH.", zones: [5, 9], life: "perennial", type: "shrub", size: "medium", flowering: true, sun: "part", water: "high" },
  { name: "Boxwood", why: "Evergreen structure that holds the bed together in winter.", zones: [5, 9], life: "perennial", type: "shrub", size: "medium", flowering: false, sun: "part", water: "medium" },
  { name: "Knock Out Rose", why: "Rose color without spraying or serious pruning.", zones: [4, 10], life: "perennial", type: "shrub", size: "medium", flowering: true, sun: "full", water: "medium" },
  { name: "Viburnum", why: "Spring flowers, fall berries, and birds all season.", zones: [4, 8], life: "perennial", type: "shrub", size: "large", flowering: true, sun: "full", water: "medium" },
  { name: "Spirea", why: "Compact, tidy, and blooms on new growth.", zones: [4, 9], life: "perennial", type: "shrub", size: "medium", flowering: true, sun: "full", water: "medium" },
  { name: "Ninebark", why: "Dark foliage and peeling bark for winter interest.", zones: [3, 7], life: "perennial", type: "shrub", size: "large", flowering: true, sun: "full", water: "low" },
  { name: "Red Twig Dogwood", why: "Scarlet stems that carry the garden through snow.", zones: [3, 8], life: "perennial", type: "shrub", size: "large", flowering: false, sun: "full", water: "high" },
  { name: "Azalea", why: "Spring color under trees where sun is filtered.", zones: [5, 9], life: "perennial", type: "shrub", size: "medium", flowering: true, sun: "part", water: "medium" },
  { name: "Rhododendron", why: "Evergreen and big-flowered in acidic, part-shade beds.", zones: [4, 8], life: "perennial", type: "shrub", size: "large", flowering: true, sun: "part", water: "medium" },
  { name: "Camellia", why: "Mild winters let this evergreen bloom outdoors in cold months.", zones: [7, 10], life: "perennial", type: "shrub", size: "large", flowering: true, sun: "part", water: "medium" },
  { name: "Gardenia", why: "Fragrant evergreen that needs your warmth and humidity.", zones: [8, 11], life: "perennial", type: "shrub", size: "medium", flowering: true, sun: "part", water: "high" },
  { name: "Oleander", why: "Blooms all summer on almost no water (toxic if eaten).", zones: [8, 11], life: "perennial", type: "shrub", size: "large", flowering: true, sun: "full", water: "low" },
  { name: "Bottlebrush", why: "Red bottlebrush flowers that hummingbirds work over.", zones: [9, 11], life: "perennial", type: "shrub", size: "large", flowering: true, sun: "full", water: "low" },

  // ---------------- Trees ----------------
  { name: "Serviceberry", why: "Native four-season tree built for harsh northern winters.", zones: [3, 8], life: "perennial", type: "tree", size: "large", flowering: true, sun: "part", water: "medium" },
  { name: "Eastern Redbud", why: "Magenta blooms straight off bare branches in early spring.", zones: [4, 9], life: "perennial", type: "tree", size: "large", flowering: true, sun: "part", water: "medium" },
  { name: "Flowering Dogwood", why: "Understory tree that wants filtered light, not full blast.", zones: [5, 9], life: "perennial", type: "tree", size: "large", flowering: true, sun: "part", water: "medium" },
  { name: "Japanese Maple", why: "Slow, sculptural, and best with afternoon shade.", zones: [5, 8], life: "perennial", type: "tree", size: "large", flowering: false, sun: "part", water: "medium" },
  { name: "Red Maple", why: "Fast shade tree with dependable scarlet fall color.", zones: [3, 9], life: "perennial", type: "tree", size: "large", flowering: false, sun: "full", water: "medium" },
  { name: "Eastern White Pine", why: "Evergreen screening that handles cold and wind.", zones: [3, 8], life: "perennial", type: "tree", size: "large", flowering: false, sun: "full", water: "medium" },
  { name: "Crepe Myrtle", why: "A long warm season lets it flower for months.", zones: [7, 10], life: "perennial", type: "tree", size: "large", flowering: true, sun: "full", water: "low" },
  { name: "Live Oak", why: "The long-lived shade anchor for warm coastal yards.", zones: [8, 10], life: "perennial", type: "tree", size: "large", flowering: false, sun: "full", water: "low" },

  // ---------------- Grasses & groundcovers ----------------
  { name: "Switchgrass", why: "Native prairie grass — upright, tough, and no watering.", zones: [4, 9], life: "perennial", type: "grass", size: "large", flowering: false, sun: "full", water: "low" },
  { name: "Little Bluestem", why: "Blue-green summer blades turning copper for winter.", zones: [3, 9], life: "perennial", type: "grass", size: "medium", flowering: false, sun: "full", water: "low" },
  { name: "Fountain Grass", why: "Soft arching plumes that catch low afternoon light.", zones: [5, 9], life: "perennial", type: "grass", size: "medium", flowering: true, sun: "full", water: "low" },
  { name: "Muhly Grass", why: "A cloud of pink haze every fall in warm climates.", zones: [7, 11], life: "perennial", type: "grass", size: "medium", flowering: true, sun: "full", water: "low" },
  { name: "Creeping Thyme", why: "Walkable, fragrant filler between pavers.", zones: [4, 9], life: "perennial", type: "groundcover", size: "small", flowering: true, sun: "full", water: "low" },
  { name: "Creeping Phlox", why: "Sheets of spring color spilling over walls and slopes.", zones: [3, 9], life: "perennial", type: "groundcover", size: "small", flowering: true, sun: "full", water: "low" },
  { name: "Creeping Juniper", why: "Evergreen slope cover that never needs watering.", zones: [3, 9], life: "perennial", type: "groundcover", size: "small", flowering: false, sun: "full", water: "low" },
  { name: "Vinca Minor", why: "Evergreen shade carpet with periwinkle-blue flowers.", zones: [4, 9], life: "perennial", type: "groundcover", size: "small", flowering: true, sun: "shade", water: "medium" },
];

// What the dashboard sends us. Everything is optional — an empty/absent
// field means "no preference".
export type Preferences = {
  types?: PlantType[];
  life?: "any" | Life;
  size?: "any" | Size;
  flowering?: "any" | "yes" | "no";
  sun?: "any" | Sun;
  water?: "any" | "low";
  pollinator?: "any" | "yes";
};

// A plant counts as pollinator-friendly if its bloom is a reason to plant it
// and it's an ornamental type bees and butterflies actually visit. This mirrors
// isPollinatorFriendly() in src/lib/plantData.js so the filter and the
// "Pollinator-friendly" badge always agree.
const POLLINATOR_TYPES = new Set<PlantType>([
  "flower", "herb", "shrub", "tree", "vine", "groundcover",
]);
function isPollinator(p: Plant): boolean {
  return p.flowering && POLLINATOR_TYPES.has(p.type);
}

// Sun tolerance: a plant listed for less sun than the site gets is still a
// candidate for part sun, but nothing sun-loving belongs in real shade.
const SUN_OK: Record<Sun, Sun[]> = {
  full: ["full", "part"],
  part: ["part", "shade"],
  shade: ["shade"],
};

type Filter = { key: string; label: string; test: (p: Plant) => boolean };

// Build the optional filters in order of how readily we'd give each one up
// when a location + preference combination has too few matches.
function buildFilters(prefs: Preferences): Filter[] {
  const f: Filter[] = [];
  if (prefs.types?.length) {
    const set = new Set(prefs.types);
    f.push({ key: "types", label: "plant type", test: (p) => set.has(p.type) });
  }
  if (prefs.life && prefs.life !== "any") {
    // Biennials read as annuals to a gardener replanting each year.
    const want = prefs.life;
    f.push({
      key: "life",
      label: want === "annual" ? "annuals only" : "perennials only",
      test: (p) =>
        want === "annual" ? p.life !== "perennial" : p.life === "perennial",
    });
  }
  if (prefs.flowering === "yes") {
    f.push({ key: "flowering", label: "flowering plants", test: (p) => p.flowering });
  } else if (prefs.flowering === "no") {
    f.push({ key: "flowering", label: "foliage over flowers", test: (p) => !p.flowering });
  }
  if (prefs.sun && prefs.sun !== "any") {
    const ok = SUN_OK[prefs.sun];
    f.push({ key: "sun", label: `${prefs.sun}-sun plants`, test: (p) => ok.includes(p.sun) });
  }
  if (prefs.size && prefs.size !== "any") {
    const want = prefs.size;
    f.push({ key: "size", label: `${want} mature size`, test: (p) => p.size === want });
  }
  if (prefs.water === "low") {
    f.push({ key: "water", label: "low-water plants", test: (p) => p.water === "low" });
  }
  if (prefs.pollinator === "yes") {
    f.push({ key: "pollinator", label: "pollinator-friendly plants", test: isPollinator });
  }
  // Least essential last — these are the first to be dropped.
  return f.reverse();
}

// Prefer plants sitting comfortably inside the zone range over ones clinging
// to the edge of their survivable limit.
function zoneComfort(p: Plant, zone: number): number {
  return Math.min(zone - p.zones[0], p.zones[1] - zone);
}

export type MatchResult = {
  plants: Plant[];
  /** Human-readable filters we had to drop to find enough plants. */
  relaxed: string[];
};

export function matchPlants(
  zone: number | null,
  prefs: Preferences,
  limit = 12
): MatchResult {
  const inZone = zone
    ? CATALOG.filter((p) => zone >= p.zones[0] && zone <= p.zones[1])
    : CATALOG.slice();

  const filters = buildFilters(prefs);
  const relaxed: string[] = [];
  let active = filters;
  let hits = inZone.filter((p) => active.every((f) => f.test(p)));

  // Too narrow a request would otherwise return an empty plan. Drop the
  // least-important constraint at a time and tell the user what we dropped.
  while (hits.length < 4 && active.length > 0) {
    relaxed.push(active[0].label);
    active = active.slice(1);
    hits = inZone.filter((p) => active.every((f) => f.test(p)));
  }

  // Even after relaxing, a plant that met every original answer should still
  // outrank one that only survives because we widened the search.
  const satisfied = (p: Plant) => filters.filter((f) => f.test(p)).length;

  const ranked = hits.sort(
    (a, b) =>
      satisfied(b) - satisfied(a) ||
      (zone ? zoneComfort(b, zone) - zoneComfort(a, zone) : 0) ||
      a.name.localeCompare(b.name)
  );

  // Spread the picks across categories so a plan isn't twelve tomatoes.
  const perType = Math.max(2, Math.ceil(limit / 4));
  const counts: Record<string, number> = {};
  const picked: Plant[] = [];
  for (const p of ranked) {
    if (picked.length >= limit) break;
    if ((counts[p.type] ?? 0) >= perType) continue;
    counts[p.type] = (counts[p.type] ?? 0) + 1;
    picked.push(p);
  }
  // Backfill from what the diversity cap skipped if we're still short.
  if (picked.length < limit) {
    for (const p of ranked) {
      if (picked.length >= limit) break;
      if (!picked.includes(p)) picked.push(p);
    }
  }

  return { plants: picked, relaxed: relaxed.reverse() };
}
