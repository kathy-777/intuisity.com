import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getAstrologyReading, getKnownBirthLocation } from "../data/astrologyTips";
import { getDailyChallenges } from "../data/mockData";
import { dailyIntuitionLessons } from "../data/dailyLessons";
import { PersonProfile, personProfiles } from "../data/personProfiles";
import { recordModuleTime, startActivityTracking } from "../services/adminAnalytics";
import { completeTreasureChallenge, createTreasureChallenge, fetchTreasureChallenge, lookupBirthLocation, markTreasureChallengeOpened, syncDailyResult, syncFriends, syncModuleFeedback, TreasureChallengeReceipt } from "../services/backendApi";
import { BirthChartProfile, UserProfile } from "../types/userProfile";

type Answers = Record<string, string>;

type AstrologyJournalEntry = {
  date: string;
  plan: string;
  update?: string;
};

type LearningJournalEntry = {
  date: string;
  challenge: string;
  response?: string;
};

type DailyResultEntry = {
  date: string;
  modules: Array<{ label: string; score: number; maximum: number }>;
  total: number;
  maximum: number;
};

type ModuleFeedback = Record<string, { rating: number; improvement: string; updatedAt?: string }>;

type FriendContact = {
  name: string;
  phone?: string;
  email?: string;
};

type TreasureDragItem = {
  icon: string;
  from: "palette" | "slot";
  index?: number;
};

type DailyPersonChallenge = {
  date: string;
  profileId: string;
  portraitUri: string | null;
  attributeChoices: string[];
  selections: string[];
  completed: boolean;
};

type PictureItem = {
  id: string;
  label: string;
  source: any;
  group?: "nature" | "object";
};

type RoomObject = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  source: any;
};

type KitchenSpot = {
  left: `${number}%`;
  top: `${number}%`;
  width: `${number}%`;
  height: number;
};

type Props = {
  answers: Answers;
  friendChallengeRequestId?: number;
  homeRequestId?: number;
  isPremium: boolean;
  onLogout: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  userProfile: UserProfile;
};

const personChoiceLimit = 3;
const personMaximumScore = 3;
const personPortraitSearchLimit = 100;
const portraitCache = new Map<string, string | null>();
const photographicPersonProfileIds = new Set([
  "sojourner-truth",
  "elizabeth-blackwell",
  "ignaz-semmelweis",
  "jose-rizal",
  "idab-wells",
  "wangari-maathai",
  "annie-jump-cannon",
  "henrietta-swan-leavitt",
  "alice-ball",
  "garrett-morgan",
  "lewis-latimer",
  "janaki-ammal",
  "chika-kuroda",
  "lise-meitner",
  "jocelyn-bell-burnell",
  "katherine-johnson",
  "mary-jackson",
  "dorothy-vaughan",
  "hertha-ayrton",
  "nettie-stevens",
  "flossie-wong-staal",
  "tu-youyou",
  "gertrude-elion",
  "patricia-bath",
  "virginia-apgar",
  "rebecca-lee-crumpler",
  "antonia-novello",
  "mabel-ping-hua-lee",
  "zitkala-sa",
  "susette-la-flesche",
  "queen-liliuokalani",
  "yuri-kochiyama",
  "bayard-rustin",
  "claudette-colvin",
  "pauli-murray",
  "daisy-bates",
  "fannie-lou-hamer",
  "ella-baker",
  "septima-clark",
  "mary-mcleod-bethune",
  "charles-hamilton-houston",
  "constance-baker-motley",
  "robert-smalls",
  "bessie-coleman",
  "eugene-bullard",
  "andree-de-jongh",
  "nancy-wake",
  "noor-inayat-khan",
  "josephine-baker",
  "chiune-sugihara",
  "jan-karski",
  "irena-sendler",
  "raoul-wallenberg",
  "aleksandra-kollontai",
  "emily-warren-roebling",
  "sophia-jex-blake",
  "emmy-noether",
  "srinivasa-ramanujan",
  "subrahmanyan-chandrasekhar",
  "abdus-salam",
  "satyendra-nath-bose",
  "chandra-bose",
  "c-v-raman",
  "chien-shiung-wu",
  "huda-shaarawi",
  "doria-shafik",
  "qiu-jin",
  "funmilayo-ransome-kuti",
  "leymah-gbowee",
  "rigoberta-menchu",
  "berta-caceres",
  "chico-mendes",
  "marsha-p-johnson",
  "sylvia-rivera",
  "alan-turing",
  "tommy-flowers",
  "grace-hopper",
  "hedy-lamarr",
  "sister-rosetta-tharpe",
  "bessie-smith",
  "ma-rainey",
  "florence-price",
  "william-grant-still",
  "alvin-ailey",
  "katherine-dunham",
  "jacob-lawrence",
  "augusta-savage",
  "alma-thomas",
  "tarsila-do-amaral",
  "remedios-varo",
  "leonora-carrington",
  "camille-claudel",
  "edmonia-lewis",
  "gerda-taro",
  "dorothea-lange",
  "gordon-parks",
  "margaret-bourke-white",
  "ida-tarbell",
  "nellie-bly",
  "martha-gellhorn",
  "rachel-carson",
  "marjory-stoneman-douglas",
  "aldo-leopold",
  "george-washington-carver",
  "norman-borlaug",
  "cecilia-payne",
  "vera-rubin",
  "maria-goeppert-mayer"
]);
const dailyPointWeights = {
  friend: 24,
  knowing: 20,
  learning: 12,
  person: 15,
  astrology: 14,
  remoteViewing: 15
};

const rewardImages: PictureItem[] = [
  { id: "cottage", label: "Meadow cottage", source: require("../../assets/photo-cottage.png") },
  { id: "deer", label: "Forest deer", source: require("../../assets/photo-deer.png") },
  { id: "lake", label: "Mountain lake", source: require("../../assets/photo-lake.png") },
  { id: "horse", label: "Meadow horse", source: require("../../assets/photo-horse.png") },
  { id: "waterfall", label: "Forest waterfall", source: require("../../assets/photo-waterfall.png") },
  { id: "beach", label: "Tropical beach", source: require("../../assets/photo-beach.png") }
];

const knowingRewardThemes = [
  { label: "Meadow cottage", query: "cottage,meadow" },
  { label: "Forest deer", query: "deer,forest" },
  { label: "Mountain lake", query: "mountain,lake" },
  { label: "Meadow horse", query: "horse,meadow" },
  { label: "Forest waterfall", query: "waterfall,forest" },
  { label: "Tropical beach", query: "tropical,beach" },
  { label: "Garden path", query: "garden,path" },
  { label: "Sunlit cabin", query: "sunlit,cabin" },
  { label: "Wildflowers", query: "wildflowers,field" },
  { label: "Ocean sunrise", query: "ocean,sunrise" },
  { label: "Forest fox", query: "fox,forest" },
  { label: "Meadow sheep", query: "sheep,meadow" },
  { label: "River stones", query: "river,stones" },
  { label: "Autumn woods", query: "autumn,woods" },
  { label: "Snowy cabin", query: "snow,cabin" },
  { label: "Butterfly garden", query: "butterfly,garden" },
  { label: "Lavender field", query: "lavender,field" },
  { label: "Misty valley", query: "misty,valley" },
  { label: "Country lane", query: "country,lane" },
  { label: "Sunset meadow", query: "sunset,meadow" },
  { label: "Forest owl", query: "owl,forest" },
  { label: "Mountain cabin", query: "mountain,cabin" },
  { label: "Calm river", query: "calm,river" },
  { label: "Pasture cows", query: "cows,pasture" },
  { label: "Rose garden", query: "rose,garden" },
  { label: "Lake house", query: "lake,house" },
  { label: "Forest bridge", query: "forest,bridge" },
  { label: "Golden field", query: "golden,field" },
  { label: "Hummingbird flowers", query: "hummingbird,flowers" },
  { label: "Peaceful farmhouse", query: "farmhouse,nature" }
];

const knowingRewardImages: PictureItem[] = knowingRewardThemes.flatMap((theme, themeIndex) =>
  Array.from({ length: 10 }, (_, imageIndex) => {
    const number = themeIndex * 10 + imageIndex + 1;
    return {
      id: `knowing-${themeIndex}-${imageIndex}`,
      label: `${theme.label} ${imageIndex + 1}`,
      source: {
        uri: `https://picsum.photos/seed/intuisity-knowing-${number}/900/700`
      }
    };
  })
);

const remoteViewingThemes = [
  { label: "Forest cabin", query: "forest,cabin" },
  { label: "Ocean cliffs", query: "ocean,cliffs" },
  { label: "Mountain sunrise", query: "mountain,sunrise" },
  { label: "Flower garden", query: "flower,garden" },
  { label: "Desert road", query: "desert,road" },
  { label: "Snowy village", query: "snow,village" },
  { label: "Waterfall pool", query: "waterfall,pool" },
  { label: "Old library", query: "library,books" },
  { label: "Stone bridge", query: "stone,bridge" },
  { label: "Wild horse", query: "horse,nature" },
  { label: "Forest deer", query: "deer,forest" },
  { label: "Butterfly flowers", query: "butterfly,flowers" },
  { label: "Lake dock", query: "lake,dock" },
  { label: "Red door", query: "red,door" },
  { label: "Cozy fireplace", query: "fireplace,room" },
  { label: "Garden bench", query: "garden,bench" },
  { label: "Sailboat harbor", query: "sailboat,harbor" },
  { label: "Country kitchen", query: "country,kitchen" },
  { label: "Misty forest", query: "misty,forest" },
  { label: "Castle path", query: "castle,path" },
  { label: "Rain window", query: "rain,window" },
  { label: "Golden field", query: "golden,field" },
  { label: "Moonlit water", query: "moon,water" },
  { label: "Quiet chapel", query: "chapel,interior" },
  { label: "Village street", query: "village,street" },
  { label: "Tea table", query: "tea,table" },
  { label: "Garden gate", query: "garden,gate" },
  { label: "Rocky canyon", query: "canyon,rocks" },
  { label: "Autumn trail", query: "autumn,trail" },
  { label: "Blue cottage", query: "blue,cottage" }
];

const remoteViewingPictures: PictureItem[] = remoteViewingThemes.flatMap((theme, themeIndex) =>
  Array.from({ length: 10 }, (_, variantIndex) => {
    const number = themeIndex * 10 + variantIndex + 1;
    return {
      id: `remote-target-${number}`,
      label: `${theme.label} ${variantIndex + 1}`,
      source: {
        uri: `https://loremflickr.com/900/700/${theme.query}?lock=${9200 + number}`
      }
    };
  })
);

const socialPictureThemes = [
  { label: "Forest path", query: "forest,path", group: "nature" },
  { label: "Mountain lake", query: "mountain,lake", group: "nature" },
  { label: "Ocean waves", query: "ocean,waves", group: "nature" },
  { label: "Flower meadow", query: "flower,meadow", group: "nature" },
  { label: "Waterfall", query: "waterfall,nature", group: "nature" },
  { label: "Sunset sky", query: "sunset,sky", group: "nature" },
  { label: "Snowy mountain", query: "snow,mountain", group: "nature" },
  { label: "Desert landscape", query: "desert,landscape", group: "nature" },
  { label: "Coat", query: "coat,fashion", group: "object" },
  { label: "Umbrella", query: "umbrella", group: "object" },
  { label: "Spider on a web", query: "spider,web", group: "object" },
  { label: "Old key", query: "antique,key", group: "object" },
  { label: "Lantern", query: "lantern", group: "object" },
  { label: "Bicycle", query: "bicycle", group: "object" },
  { label: "Teacup", query: "teacup", group: "object" },
  { label: "Clock", query: "clock", group: "object" },
  { label: "Open book", query: "open,book", group: "object" },
  { label: "Red door", query: "red,door", group: "object" },
  { label: "Wooden bridge", query: "wooden,bridge", group: "object" },
  { label: "Sailboat", query: "sailboat", group: "object" },
  { label: "Feather", query: "feather", group: "object" },
  { label: "Candle", query: "candle", group: "object" },
  { label: "Crystal", query: "crystal", group: "object" },
  { label: "Paintbrush", query: "paintbrush", group: "object" },
  { label: "Chair", query: "chair", group: "object" },
  { label: "Window", query: "window", group: "object" },
  { label: "Shell", query: "seashell", group: "object" },
  { label: "Hot-air balloon", query: "hot-air-balloon", group: "object" },
  { label: "Stone arch", query: "stone,arch", group: "object" },
  { label: "Bird in flight", query: "bird,flying", group: "nature" }
];

const socialChallengePictures: PictureItem[] = Array.from({ length: 300 }, (_, index) => {
  const number = index + 1;
  const theme = socialPictureThemes[index % socialPictureThemes.length];
  return {
    id: `social-nature-${number}`,
    label: theme.label,
    group: theme.group as "nature" | "object",
    source: {
      uri: `https://picsum.photos/seed/intuisity-social-${number}/900/700`
    }
  };
});

const fallbackSocialPictures: PictureItem[] = [
  { id: "fallback-cottage", label: "Meadow cottage", group: "nature", source: require("../../assets/photo-cottage.png") },
  { id: "fallback-deer", label: "Forest deer", group: "nature", source: require("../../assets/photo-deer.png") },
  { id: "fallback-lake", label: "Mountain lake", group: "nature", source: require("../../assets/photo-lake.png") },
  { id: "fallback-horse", label: "Meadow horse", group: "object", source: require("../../assets/photo-horse.png") },
  { id: "fallback-waterfall", label: "Forest waterfall", group: "object", source: require("../../assets/photo-waterfall.png") },
  { id: "fallback-beach", label: "Tropical beach", group: "object", source: require("../../assets/photo-beach.png") }
];

const colors: Record<string, string> = {
  Red: "#EF4444",
  Yellow: "#F4C542",
  Blue: "#3274E8"
};

const colorNames = Object.keys(colors);
const birthTimeHours = Array.from({ length: 12 }, (_, index) => String(index + 1));
const birthTimeMinutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

const challengeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  "daily-intuition": "color-palette-outline",
  "remote-viewing-arena": "bulb-outline",
  "third-eye-activation": "eye-outline",
  "psychic-potential-score": "moon-outline",
  "social-prediction": "gift-outline",
  "remote-viewing-test": "radio-outline"
};

const treasureChestIcons = ["💎", "👑", "🪙", "🔮", "💍", "🗝️", "📿", "🏺", "📜", "🦪", "🐚", "🎖️", "🏆", "🎁", "🧿"];
const treasureBaseGamePieces = [
  "💎", "👑", "🪙", "🔮", "💍", "🗝️", "📿", "🏺", "📜", "🦪",
  "🐚", "🎖️", "🏆", "🎁", "🧿", "⭐", "🌙", "☀️", "⚡", "🔥",
  "🌊", "🌈", "🪷", "🌻", "🌹", "🍀", "🍄", "🌵", "🌴", "🌲",
  "🪨", "🕯️", "🧭", "🗺️", "⏳", "⌛", "🪞", "🔔", "🎵", "🎶",
  "🎻", "🎨", "🖌️", "📚", "📖", "✒️", "🪶", "🔭", "📷", "🎞️",
  "🧵", "🪡", "🧶", "🧺", "🪁", "🧸", "🪀", "🎲", "♟️", "🃏",
  "🧩", "🎯", "🏹", "🛡️", "⚜️", "🔱", "⚖️", "🪬", "🕊️", "🦋",
  "🐝", "🐞", "🐢", "🦉", "🦚"
];
const treasureGamePieceCatalog = treasureBaseGamePieces;

const treasureWinOpeners = [
  "Fantastic",
  "Amazing",
  "Wonderful",
  "Beautiful work",
  "You did it",
  "Brilliant sensing",
  "Excellent focus",
  "Your intuition came through",
  "That was inspired",
  "Lovely work",
  "Strong signal",
  "Clear knowing",
  "Great job",
  "Your insight landed",
  "Nicely tuned in",
  "That was a bright hit",
  "Your instincts were awake",
  "You followed the right thread",
  "A confident win",
  "Your inner compass was on"
];
const treasureWinClosers = [
  "you opened the chest",
  "you unlocked the treasure",
  "you found the hidden order",
  "you followed the signal",
  "you trusted your first knowing",
  "you solved the treasure pattern",
  "you let your intuition lead",
  "you found the right sequence",
  "you brought the treasure to light",
  "you read the pattern clearly",
  "you stayed with the mystery",
  "you turned a hunch into a win",
  "you found the golden thread",
  "you matched the hidden rhythm",
  "you opened the way forward"
];
const treasureWinMessages = treasureWinOpeners.flatMap((opener) =>
  treasureWinClosers.map((closer) => `${opener}, ${closer}`)
);
const treasureChestClosedImage = require("../../assets/treasure-chest/realistic-chest-closed.png");
const treasureChestOpenImage = require("../../assets/treasure-chest/realistic-chest-open.png");
const treasureSceneImages = [
  require("../../assets/treasure-chest/beach.jpg"),
  require("../../assets/treasure-chest/ship-deck.jpg"),
  require("../../assets/treasure-chest/sunlit-cave.jpg"),
  require("../../assets/treasure-chest/sandy-cove.jpg"),
  require("../../assets/treasure-chest/captain-cabin.jpg"),
  require("../../assets/treasure-chest/waterfall-pool.jpg")
];

const powerWordQualities = [
  "Awakened", "Balanced", "Bold", "Boundless", "Bright", "Calm", "Centered", "Clear",
  "Compassionate", "Confident", "Connected", "Courageous", "Creative", "Curious", "Deep",
  "Divine", "Empowered", "Expansive", "Faithful", "Fearless", "Focused", "Free", "Gentle",
  "Grounded", "Guided", "Harmonious", "Hopeful", "Inspired", "Intuitive", "Joyful",
  "Kind", "Luminous", "Mindful", "Open", "Patient", "Peaceful", "Radiant", "Resilient",
  "Sacred", "Steady"
];

const powerWordEssences = [
  "Abundance", "Adventure", "Balance", "Clarity", "Confidence", "Connection", "Courage",
  "Creativity", "Energy", "Faith", "Flow", "Focus", "Freedom", "Grace", "Gratitude",
  "Growth", "Harmony", "Healing", "Hope", "Joy", "Love", "Momentum", "Peace", "Purpose",
  "Wisdom"
];

const powerWords = powerWordQualities.flatMap((quality) =>
  powerWordEssences.map((essence) => `${quality} ${essence}`)
);

const powerWordMeanings: Record<string, string> = {
  Abundance: "Notice the good that is already growing around you. When you appreciate what is present, you become more open to receiving new possibilities.",
  Courage: "Courage is taking one honest step even when the full path is not yet visible. Trust yourself enough to begin.",
  Clarity: "Clarity arrives when you quiet the noise and listen for what feels simple and true. Give yourself space before choosing.",
  Trust: "Trust invites you to loosen your grip on every outcome. Your inner wisdom becomes easier to hear when you believe you can meet what comes.",
  Joy: "Joy is a compass pointing toward what brings your spirit alive. Make room for one small moment of delight today.",
  Peace: "Peace begins within the pause between reaction and response. Breathe slowly and let calm guide your next step.",
  Strength: "Your strength includes gentleness, patience, and the willingness to keep going. Remember how much you have already overcome.",
  Wisdom: "Wisdom grows when experience meets reflection. Listen to what your life has already taught you before seeking another answer.",
  Freedom: "Freedom begins when you release a belief or habit that no longer fits who you are becoming. Choose what feels spacious and true.",
  Focus: "Focus gathers your energy around what matters most. Give one meaningful task your full attention today.",
  Healing: "Healing is not a race; it is a series of compassionate choices. Offer yourself the patience you would give someone you love.",
  Confidence: "Confidence grows each time you honor your own voice. Take action before every doubt has disappeared.",
  Gratitude: "Gratitude helps ordinary moments reveal their value. Name something good today and let yourself truly feel it.",
  Purpose: "Purpose is often found in the next helpful, meaningful step rather than one grand answer. Follow what feels worth contributing.",
  Balance: "Balance is a living adjustment, not a perfect still point. Notice where you need more effort and where you need more rest.",
  Hope: "Hope keeps a window open for a better possibility. Let even a small sign of progress remind you that change can unfold.",
  Creativity: "Creativity asks you to explore without needing to be perfect. Follow the idea that feels playful, surprising, or alive.",
  Connection: "Connection grows through attention and sincerity. Reach toward someone today with curiosity, warmth, or honest appreciation.",
  Patience: "Patience allows the right timing to reveal itself. Keep tending what matters without forcing it to bloom too soon.",
  Adventure: "Adventure begins whenever you meet the unfamiliar with curiosity. Let one new choice expand your world today."
};

const roomObjectPool: RoomObject[] = [
  { id: "flowers", label: "Flowers", icon: "flower-outline", source: { uri: "https://loremflickr.com/500/500/kitchen,flowers?lock=4301" } },
  { id: "mug", label: "Coffee Mug", icon: "cafe-outline", source: { uri: "https://loremflickr.com/500/500/coffee,mug?lock=4302" } },
  { id: "towel", label: "Kitchen Towel", icon: "reader-outline", source: { uri: "https://loremflickr.com/500/500/kitchen,towel?lock=4303" } },
  { id: "mixing-bowl", label: "Mixing Bowl", icon: "ellipse-outline", source: { uri: "https://loremflickr.com/500/500/mixing,bowl?lock=4304" } },
  { id: "wooden-spoon", label: "Wooden Spoon", icon: "restaurant-outline", source: { uri: "https://loremflickr.com/500/500/wooden,spoon?lock=4305" } },
  { id: "teapot", label: "Teapot", icon: "cafe-outline", source: { uri: "https://loremflickr.com/500/500/teapot,kitchen?lock=4306" } }
];

const kitchenObjectSpots: KitchenSpot[] = [
  { left: "9%", top: "20%", width: "16%", height: 68 },
  { left: "35%", top: "48%", width: "13%", height: 54 },
  { left: "14%", top: "69%", width: "15%", height: 70 },
  { left: "52%", top: "46%", width: "15%", height: 62 },
  { left: "61%", top: "58%", width: "15%", height: 62 },
  { left: "80%", top: "55%", width: "15%", height: 66 }
];

const personImages: Record<string, any> = {
  elena: require("../../assets/person-elena.png"),
  marcus: require("../../assets/person-marcus.png"),
  mei: require("../../assets/person-mei.png")
};

export function DailyChallengeHub({ answers, friendChallengeRequestId = 0, homeRequestId = 0, isPremium, onLogout, onUpdateProfile, setAnswers, userProfile }: Props) {
  const savedPersonChallengeRef = useRef(loadTodaysPersonChallenge(userProfile.email));
  const savedPersonChallenge = savedPersonChallengeRef.current;
  const savedPersonProfile = savedPersonChallenge
    ? personProfiles.find((profile) => profile.id === savedPersonChallenge.profileId)
    : undefined;
  const initialPersonProfile = savedPersonProfile && isPhotographicPersonProfile(savedPersonProfile)
    ? savedPersonProfile
    : pickBalancedPersonProfile(userProfile.email);
  const [page, setPage] = useState("hub");
  const analyticsPageRef = useRef(page);
  const analyticsStartedRef = useRef(Date.now());
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [targets, setTargets] = useState(makeTargets);
  const [colorOrders, setColorOrders] = useState(() => makeColorOrders(targets));
  const [knowingRewardPictures, setKnowingRewardPictures] = useState(makeKnowingRewardPictures);
  const [person, setPerson] = useState(initialPersonProfile);
  const [personPortraitUri, setPersonPortraitUri] = useState<string | null>(savedPersonChallenge?.portraitUri || initialPersonProfile.portraitUri || null);
  const [personAttributeChoices, setPersonAttributeChoices] = useState(() =>
    savedPersonChallenge?.attributeChoices?.length ? savedPersonChallenge.attributeChoices : shuffle(initialPersonProfile.attributes)
  );
  const [personPortraitLoading, setPersonPortraitLoading] = useState(!savedPersonChallenge?.portraitUri && !initialPersonProfile.portraitUri);
  const [personSelections, setPersonSelections] = useState<string[]>(savedPersonChallenge?.selections || []);
  const [showPersonResults, setShowPersonResults] = useState(Boolean(savedPersonChallenge?.completed));
  const [personPracticeMode, setPersonPracticeMode] = useState(false);
  const [birthDetails, setBirthDetails] = useState({
    birthdate: userProfile.birthdate,
    birthTime: userProfile.birthTime,
    birthCity: userProfile.birthCity,
    birthState: userProfile.birthState,
    birthCountry: userProfile.birthCountry
  });
  const [birthDetailsOpen, setBirthDetailsOpen] = useState(!userProfile.birthdate);
  const [birthDetailsSaved, setBirthDetailsSaved] = useState(false);
  const hasSavedBirthDetails = Boolean(userProfile.birthdate);
  const birthDetailsComplete = Boolean(
    userProfile.birthdate &&
    userProfile.birthTime &&
    userProfile.birthCity &&
    userProfile.birthState &&
    userProfile.birthCountry
  );
  const birthLocation = [userProfile.birthCity, userProfile.birthState, userProfile.birthCountry].filter(Boolean).join(", ");
  const savedResolvedBirthLocation = Number.isFinite(userProfile.birthLatitude) && Number.isFinite(userProfile.birthLongitude)
    ? {
      label: userProfile.birthLocationLabel || birthLocation,
      latitude: Number(userProfile.birthLatitude),
      longitude: Number(userProfile.birthLongitude)
    }
    : null;
  const birthDetailsSummary = [
    userProfile.birthdate,
    userProfile.birthTime,
    birthLocation
  ].filter(Boolean).join(" · ");
  const birthDetailsMissingList = [
    !userProfile.birthTime && "birth time",
    !userProfile.birthCity && "birth city",
    !userProfile.birthState && "birth state/region",
    !userProfile.birthCountry && "birth country"
  ].filter(Boolean).join(", ");
  const astrologyReading = useMemo(
    () => getAstrologyReading(userProfile.birthdate, new Date(), userProfile.birthTime, birthLocation, savedResolvedBirthLocation),
    [birthLocation, savedResolvedBirthLocation?.latitude, savedResolvedBirthLocation?.longitude, userProfile.birthTime, userProfile.birthdate]
  );
  const [astrologyPlan, setAstrologyPlan] = useState("");
  const [planSaved, setPlanSaved] = useState(false);
  const [birthLocationStatus, setBirthLocationStatus] = useState("");
  const [priorAstrologyEntry, setPriorAstrologyEntry] = useState<AstrologyJournalEntry | null>(null);
  const [astrologyUpdate, setAstrologyUpdate] = useState("");
  const [friendName, setFriendName] = useState("");
  const [friendPhone, setFriendPhone] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [friendPhoneError, setFriendPhoneError] = useState("");
  const [friendInviteStatus, setFriendInviteStatus] = useState("");
  const [savedFriends, setSavedFriends] = useState<FriendContact[]>(() => loadFriends(userProfile.email));
  const [pendingTreasureFriend, setPendingTreasureFriend] = useState<{
    contact: FriendContact;
    nextSaved: FriendContact[];
    nextSelected: string[];
  } | null>(null);
  const [selectedFriendPhones, setSelectedFriendPhones] = useState<string[]>([]);
  const [showSavedFriends, setShowSavedFriends] = useState(false);
  const [friendStep, setFriendStep] = useState<"predict" | "friend-choice" | "pending">("predict");
  const [treasureFlowStep, setTreasureFlowStep] = useState<"choose" | "friend-setup" | "play">("choose");
  const [friendPictures] = useState(makeFriendPictures);
  const [predictedPicture, setPredictedPicture] = useState<string | null>(null);
  const [friendPicture, setFriendPicture] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<"friend" | "computer">("friend");
  const [computerResult, setComputerResult] = useState(false);
  const [treasureIcons, setTreasureIcons] = useState(makeTreasureChestIcons);
  const [treasureSecret, setTreasureSecret] = useState<string[]>([]);
  const [treasureGuess, setTreasureGuess] = useState<Array<string | null>>(Array(5).fill(null));
  const [treasureAttemptRows, setTreasureAttemptRows] = useState<Array<Array<string | null>>>([]);
  const [treasureLocked, setTreasureLocked] = useState<boolean[]>(Array(5).fill(false));
  const [treasureTriesLeft, setTreasureTriesLeft] = useState(4);
  const [treasureWinText, setTreasureWinText] = useState("");
  const [treasureNote, setTreasureNote] = useState("");
  const [treasureSceneImage, setTreasureSceneImage] = useState(() => treasureSceneImages[0]);
  const [invitedTreasureSender, setInvitedTreasureSender] = useState("");
  const [invitedTreasureChallengeId, setInvitedTreasureChallengeId] = useState("");
  const [treasureResponseStatus, setTreasureResponseStatus] = useState("");
  const [sentTreasureChallenges, setSentTreasureChallenges] = useState<TreasureChallengeReceipt[]>(() => loadSentTreasureChallenges(userProfile.email));
  const [selectedTreasureDrag, setSelectedTreasureDrag] = useState<TreasureDragItem | null>(null);
  const treasurePointerDragRef = useRef<TreasureDragItem | null>(null);
  const treasureIgnoreClickRef = useRef(false);
  const [treasurePointerDrag, setTreasurePointerDrag] = useState<TreasureDragItem | null>(null);
  const [treasureDropSlot, setTreasureDropSlot] = useState<number | null>(null);
  const [dailyPowerWords] = useState(makeDailyPowerWords);
  const [predictedPowerWord, setPredictedPowerWord] = useState<string | null>(null);
  const [computerPowerWord, setComputerPowerWord] = useState<string | null>(null);
  const [learningChallenge, setLearningChallenge] = useState("");
  const [learningTaskSaved, setLearningTaskSaved] = useState(false);
  const [priorLearningEntry, setPriorLearningEntry] = useState<LearningJournalEntry | null>(null);
  const [learningResponse, setLearningResponse] = useState("");
  const [learningHistory, setLearningHistory] = useState<LearningJournalEntry[]>([]);
  const [remoteRound, setRemoteRound] = useState(0);
  const [remotePhase, setRemotePhase] = useState<"sense" | "choose" | "result">("sense");
  const [remoteCorrect, setRemoteCorrect] = useState(0);
  const [remoteChoice, setRemoteChoice] = useState<string | null>(null);
  const [remoteTargets, setRemoteTargets] = useState(makeRemoteViewingPairs);
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number; start?: boolean }>>([]);
  const [moduleFeedback, setModuleFeedback] = useState<ModuleFeedback>(() => loadModuleFeedback(userProfile.email));
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  useEffect(() => {
    setBirthDetails({
      birthdate: userProfile.birthdate,
      birthTime: userProfile.birthTime,
      birthCity: userProfile.birthCity,
      birthState: userProfile.birthState,
      birthCountry: userProfile.birthCountry
    });
    if (!userProfile.birthdate) {
      setBirthDetailsOpen(true);
    }
  }, [userProfile.birthCity, userProfile.birthCountry, userProfile.birthState, userProfile.birthTime, userProfile.birthdate]);

  useEffect(() => {
    setPage("hub");
  }, [homeRequestId]);

  useEffect(() => {
    if (!friendChallengeRequestId) return;
    setPage("social-prediction");
    setOpponent("friend");
    setTreasureFlowStep("friend-setup");
    setTreasureSecret([]);
    setTreasureGuess(Array(5).fill(null));
    setTreasureAttemptRows([]);
    setTreasureLocked(Array(5).fill(false));
    setTreasureTriesLeft(4);
    setTreasureWinText("");
    setFriendInviteStatus("Choose up to five people for this Treasure Chest competition.");
  }, [friendChallengeRequestId]);

  useEffect(() => {
    const invite = loadTreasureInviteFromUrl();
    if (!invite) return;
    let cancelled = false;
    const openInvite = async () => {
      try {
        const loaded = invite.challengeId ? await fetchTreasureChallenge(invite.challengeId) : invite;
        if (cancelled) return;
        const icons = loaded.tiles || loaded.icons;
        if (!Array.isArray(icons) || icons.length !== 5) throw new Error("This treasure link is incomplete.");
        setPage("social-prediction");
        setOpponent("computer");
        setTreasureFlowStep("play");
        setTreasureIcons(icons);
        setTreasureSecret(icons);
        setTreasureGuess(Array(5).fill(null));
        setTreasureAttemptRows([]);
        setTreasureLocked(Array(5).fill(false));
        setTreasureTriesLeft(4);
        setTreasureWinText("");
        setTreasureNote(loaded.note || "");
        setInvitedTreasureSender(loaded.senderName || "Your friend");
        setInvitedTreasureChallengeId(invite.challengeId || "");
        setTreasureSceneImage(shuffle(treasureSceneImages)[0]);
        setComputerResult(false);
        if (invite.challengeId) {
          markTreasureChallengeOpened(invite.challengeId).catch((error) => {
            console.warn("Treasure opened notification failed", error);
          });
        }
      } catch (error) {
        if (!cancelled) setTreasureResponseStatus(error instanceof Error ? error.message : "This treasure challenge could not be opened.");
      }
    };
    openInvite();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!sentTreasureChallenges.length) return;
    let cancelled = false;
    const refresh = async () => {
      const refreshed = await Promise.all(sentTreasureChallenges.map(async (challenge) => {
        try {
          return { ...challenge, ...(await fetchTreasureChallenge(challenge.id, challenge.senderToken)) };
        } catch {
          return challenge;
        }
      }));
      if (!cancelled) {
        setSentTreasureChallenges(refreshed);
        saveSentTreasureChallenges(userProfile.email, refreshed);
      }
    };
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [userProfile.email, sentTreasureChallenges.length]);

  const updateBirthDetail = (field: keyof typeof birthDetails, value: string) => {
    setBirthDetails({ ...birthDetails, [field]: value });
    setBirthDetailsSaved(false);
    setBirthLocationStatus("");
  };

  const saveBirthDetails = async () => {
    const nextBirthDetailsComplete = Boolean(
      birthDetails.birthdate.trim() &&
      birthDetails.birthTime.trim() &&
      birthDetails.birthCity.trim() &&
      birthDetails.birthState.trim() &&
      birthDetails.birthCountry.trim()
    );
    const nextBirthLocation = [birthDetails.birthCity, birthDetails.birthState, birthDetails.birthCountry].filter(Boolean).join(", ");
    const builtInLocation = getKnownBirthLocation(nextBirthLocation);
    const lookedUpLocation = !builtInLocation && birthDetails.birthCity.trim() && birthDetails.birthCountry.trim()
      ? await lookupBirthLocation(nextBirthLocation)
      : null;
    const resolvedLocation = builtInLocation || lookedUpLocation;
    if (builtInLocation) {
      setBirthLocationStatus(`Birthplace matched: ${builtInLocation.label}`);
    } else if (lookedUpLocation) {
      setBirthLocationStatus(`Birthplace found and saved: ${lookedUpLocation.label}`);
    } else if (birthDetails.birthCity.trim()) {
      setBirthLocationStatus("Birth details saved. Today's reading will use the strongest guidance available from what you entered, and you can refine the birthplace later if needed.");
    }
    const nextAstrologyReading = getAstrologyReading(
      birthDetails.birthdate.trim(),
      new Date(),
      birthDetails.birthTime.trim(),
      nextBirthLocation,
      resolvedLocation
    );
    const nextBirthChart: BirthChartProfile | undefined = nextAstrologyReading
      ? {
          calculationType: nextAstrologyReading.chartCalculation as BirthChartProfile["calculationType"],
          source: nextAstrologyReading.fullChart?.source || "Intuisity Sun Sign Daily",
          houseSystem: nextAstrologyReading.fullChart?.houseSystem || "",
          zodiac: nextAstrologyReading.fullChart?.zodiac || "Tropical",
          locationLabel: nextAstrologyReading.fullChart?.locationLabel || resolvedLocation?.label || nextBirthLocation,
          sunSign: nextAstrologyReading.fullChart?.sunSign || nextAstrologyReading.sign.name,
          moonSign: nextAstrologyReading.fullChart?.moonSign || "",
          risingSign: nextAstrologyReading.fullChart?.risingSign || "",
          midheavenSign: nextAstrologyReading.fullChart?.midheavenSign || "",
          strongestAspect: nextAstrologyReading.fullChart?.strongestAspect || null,
          updatedAt: new Date().toISOString()
        }
      : undefined;
    onUpdateProfile({
      ...userProfile,
      birthdate: birthDetails.birthdate.trim(),
      birthTime: birthDetails.birthTime.trim(),
      birthCity: birthDetails.birthCity.trim(),
      birthState: birthDetails.birthState.trim(),
      birthCountry: birthDetails.birthCountry.trim(),
      birthLatitude: resolvedLocation?.latitude,
      birthLongitude: resolvedLocation?.longitude,
      birthLocationLabel: resolvedLocation?.label,
      birthChart: nextBirthChart
    });
    setBirthDetailsSaved(true);
    setBirthDetailsOpen(!nextBirthDetailsComplete);
  };
  const birthdateReady = validBirthdate(birthDetails.birthdate);
  const birthdateHasFullLength = birthDetails.birthdate.replace(/\D/g, "").length === 8;

  const resetKnowing = () => {
    setRound(0);
    setCorrect(0);
    setChoice(null);
    const nextTargets = makeTargets();
    setTargets(nextTargets);
    setColorOrders(makeColorOrders(nextTargets));
    setKnowingRewardPictures(makeKnowingRewardPictures());
    setPage("knowing");
  };

  const resetRemoteViewing = () => {
    setRemoteRound(0);
    setRemotePhase("sense");
    setRemoteCorrect(0);
    setRemoteChoice(null);
    setDrawingPoints([]);
    setRemoteTargets(makeRemoteViewingPairs());
    setPage("remote-viewing-test");
  };

  const navigateToPage = (nextPage: string) => {
    if (nextPage === "remote-viewing-test") {
      resetRemoteViewing();
      return;
    }
    setPage(nextPage);
  };

  const addFriendPhone = () => {
    const name = friendName.trim();
    const phone = formatFriendPhone(friendPhone);
    const email = friendEmail.trim().toLowerCase();
    const phoneDigits = phone.replace(/\D/g, "");
    if (!name) {
      setFriendPhoneError("Please enter your friend's name.");
      return null;
    }
    if (!phoneDigits && !email) {
      setFriendPhoneError("Please enter a phone number or email address.");
      return null;
    }
    if (phoneDigits && phoneDigits.length !== 10) {
      setFriendPhoneError("Please enter a valid 10-digit phone number.");
      return null;
    }
    if (email && !isValidEmail(email)) {
      setFriendPhoneError("Please enter a valid friend email address.");
      return null;
    }
    const contact: FriendContact = { name, phone: phoneDigits ? phone : "", email };
    const contactKey = getFriendKey(contact);
    const nextSaved = savedFriends.some((friend) => getFriendKey(friend) === contactKey)
      ? savedFriends.map((friend) => getFriendKey(friend) === contactKey ? { ...friend, ...contact, email: email || friend.email } : friend)
      : [...savedFriends, contact];
    const nextSelected = selectedFriendPhones.includes(contactKey) ? selectedFriendPhones : [...selectedFriendPhones, contactKey];
    setSavedFriends(nextSaved);
    setSelectedFriendPhones(nextSelected);
    setShowSavedFriends(true);
    saveFriends(userProfile.email, nextSaved);
    setFriendName("");
    setFriendPhone("");
    setFriendEmail("");
    setFriendPhoneError("");
    return { contact, contactKey, nextSaved, nextSelected };
  };

  const previousPage = getPreviousModulePage(page);
  const nextPage = getNextModulePage(page);
  const homeChallenges = getDailyChallenges();
  const ChallengePageHeader = (props: {
    eyebrow: string;
    title: string;
    subtitle: string;
    compact?: boolean;
  }) => (
    <PageHeader
      {...props}
      onHome={page === "hub" ? undefined : () => setPage("hub")}
      onBack={page === "hub" ? undefined : () => navigateToPage(previousPage || "hub")}
      onNext={page === "daily-results" ? undefined : nextPage ? () => navigateToPage(nextPage) : undefined}
    />
  );
  const persistPersonChallenge = (
    challenge: Partial<Omit<DailyPersonChallenge, "date">>
  ) => {
    const record = saveTodaysPersonChallenge(userProfile.email, {
      profileId: person.id,
      portraitUri: personPortraitUri || person.portraitUri || null,
      attributeChoices: personAttributeChoices,
      selections: personSelections,
      completed: showPersonResults,
      ...challenge
    });
    savedPersonChallengeRef.current = record;
    return record;
  };
  const startPersonPracticeRound = async () => {
    setPersonPracticeMode(true);
    setPersonPortraitLoading(true);
    const lockedProfileId = savedPersonChallengeRef.current?.profileId;
    for (let attempt = 0; attempt < Math.min(personProfiles.length, personPortraitSearchLimit); attempt += 1) {
      const candidate = pickBalancedPersonProfile(userProfile.email, Date.now() + attempt);
      if ((candidate.id === lockedProfileId || candidate.id === person.id) && attempt < personPortraitSearchLimit - 1) continue;
      const portraitUri = candidate.portraitUri || await resolveWikipediaPortrait(candidate.wikipediaTitle || candidate.name);
      if (portraitUri) {
        setPerson(candidate);
        setPersonPortraitUri(portraitUri);
        rememberPersonPortrait(userProfile.email, candidate.id);
        setPersonAttributeChoices(shuffle(candidate.attributes));
        setPersonSelections([]);
        setShowPersonResults(false);
        setPersonPortraitLoading(false);
        return;
      }
    }
    setPersonSelections([]);
    setShowPersonResults(false);
    setPersonPortraitLoading(false);
  };

  useEffect(() => {
    startActivityTracking();
  }, []);

  useEffect(() => {
    const previousPage = analyticsPageRef.current;
    const startedAt = analyticsStartedRef.current;
    const changedAt = Date.now();
    recordModuleTime(userProfile.email, previousPage, startedAt, changedAt);
    analyticsPageRef.current = page;
    analyticsStartedRef.current = changedAt;
  }, [page, userProfile.email]);

  useEffect(() => {
    return () => {
      recordModuleTime(userProfile.email, analyticsPageRef.current, analyticsStartedRef.current, Date.now());
    };
  }, [userProfile.email]);

  useEffect(() => {
    let active = true;

    async function loadPersonWithPortrait() {
      const savedChallenge = savedPersonChallengeRef.current;
      const lockedProfile = savedChallenge
        ? personProfiles.find((profile) => profile.id === savedChallenge.profileId)
        : undefined;

      if (!personPracticeMode && savedChallenge && lockedProfile && isPhotographicPersonProfile(lockedProfile)) {
        const savedPortrait = savedChallenge.portraitUri || lockedProfile.portraitUri || await resolveWikipediaPortrait(lockedProfile.wikipediaTitle || lockedProfile.name);
        if (!active) return;
        setPerson(lockedProfile);
        setPersonPortraitUri(savedPortrait || null);
        setPersonAttributeChoices(savedChallenge.attributeChoices?.length ? savedChallenge.attributeChoices : shuffle(lockedProfile.attributes));
        setPersonSelections(savedChallenge.selections || []);
        setShowPersonResults(Boolean(savedChallenge.completed));
        if (savedPortrait && savedPortrait !== savedChallenge.portraitUri) {
          savedPersonChallengeRef.current = saveTodaysPersonChallenge(userProfile.email, {
            ...savedChallenge,
            portraitUri: savedPortrait
          });
        }
        setPersonPortraitLoading(false);
        return;
      }

      if (personPortraitUri || person.portraitUri) {
        if (!personPracticeMode && !savedPersonChallengeRef.current) {
          savedPersonChallengeRef.current = saveTodaysPersonChallenge(userProfile.email, {
            profileId: person.id,
            portraitUri: personPortraitUri || person.portraitUri || null,
            attributeChoices: personAttributeChoices,
            selections: personSelections,
            completed: false
          });
        }
        setPersonPortraitLoading(false);
        return;
      }

      setPersonPortraitLoading(true);
      for (let attempt = 0; attempt < Math.min(personProfiles.length, personPortraitSearchLimit); attempt += 1) {
        const candidate = pickBalancedPersonProfile(userProfile.email, attempt);
        const portraitUri = candidate.portraitUri || await resolveWikipediaPortrait(candidate.wikipediaTitle || candidate.name);
        if (!active) return;
        if (portraitUri) {
          setPerson(candidate);
          setPersonPortraitUri(portraitUri);
          rememberPersonPortrait(userProfile.email, candidate.id);
          const nextAttributeChoices = shuffle(candidate.attributes);
          setPersonAttributeChoices(nextAttributeChoices);
          setPersonSelections([]);
          setShowPersonResults(false);
          if (!personPracticeMode) {
            savedPersonChallengeRef.current = saveTodaysPersonChallenge(userProfile.email, {
            profileId: candidate.id,
            portraitUri,
            attributeChoices: nextAttributeChoices,
            selections: [],
            completed: false
            });
          }
          setPersonPortraitLoading(false);
          return;
        }
      }
      setPersonPortraitLoading(false);
    }

    loadPersonWithPortrait();
    return () => {
      active = false;
    };
  }, [person.id, person.portraitUri, personAttributeChoices, personPortraitUri, personPracticeMode, personSelections, showPersonResults, userProfile.email]);

  useEffect(() => {
    if (page !== "knowing" || !choice) return;

    const timer = setTimeout(() => {
      if (round === 4) {
        setAnswers((current) => ({
          ...current,
          "daily-intuition": "Completed",
          "knowing-score": String(correct)
        }));
        setPage("knowing-results");
      } else {
        setRound((current) => current + 1);
        setChoice(null);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [choice, page, round, setAnswers]);

  useEffect(() => {
    const entries = loadAstrologyJournal();
    const today = getDateKey();
    const todayEntry = entries.find((entry) => entry.date === today);
    const prior = [...entries]
      .reverse()
      .find((entry) => entry.date < today && !entry.update);
    setPriorAstrologyEntry(prior || null);
    setAstrologyUpdate(prior?.update || "");
    setAstrologyPlan(todayEntry?.plan || "");
    setPlanSaved(Boolean(todayEntry));

    const learningEntries = loadLearningJournal();
    const todayLearning = learningEntries.find((entry) => entry.date === today);
    const priorLearning = [...learningEntries]
      .reverse()
      .find((entry) => entry.date < today && !entry.response);
    setLearningChallenge(todayLearning?.challenge || "");
    setLearningTaskSaved(Boolean(todayLearning));
    setPriorLearningEntry(priorLearning || null);
    setLearningResponse(priorLearning?.response || "");
    setLearningHistory(learningEntries.filter((entry) => Boolean(entry.response)).reverse());
  }, []);

  if (page === "knowing-results") {
    return (
      <View>
        <ChallengePageHeader
          eyebrow="Challenge 2 · Train Your Knowing"
          title="Your five-try results"
          subtitle="Notice how often your first impression guided you to the hidden picture."
        />
        <View style={styles.resultsPanel}>
          <Ionicons color="#7555C7" name="sparkles-outline" size={42} />
          <Text style={styles.resultsNumber}>{correct} of 5</Text>
          <Text style={styles.resultsLabel}>colors correctly sensed</Text>
          <Text style={styles.resultsPoints}>{calculateModulePoints(correct, 5, dailyPointWeights.knowing)} of {dailyPointWeights.knowing} points earned</Text>
          <View style={[styles.abilityMessage, correct >= 4 && styles.abilityMessageStrong]}>
            <Text style={[styles.abilityMessageTitle, correct >= 4 && styles.abilityMessageTitleStrong]}>
              {getKnowingResultMessage(correct).title}
            </Text>
            <Text style={styles.abilityMessageText}>
              {getKnowingResultMessage(correct).detail}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => setPage("remote-viewing-arena")} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Carry the signal forward</Text>
          <Ionicons color="#FFFFFF" name="arrow-forward-outline" size={18} />
        </Pressable>
        <Pressable onPress={resetKnowing} style={styles.primaryButton}>
          <Ionicons color="#FFFFFF" name="refresh-outline" size={18} />
          <Text style={styles.primaryButtonText}>Follow five more signals</Text>
        </Pressable>
      </View>
    );
  }

  if (page === "knowing") {
    const target = targets[round];
    const isCorrect = choice === target;
    const roundColors = colorOrders[round];

    return (
      <View>
        <ChallengePageHeader
          eyebrow={`Challenge 2 · Try ${round + 1} of 5`}
          title="Train Your Knowing"
          subtitle="A beautiful picture is hidden beneath one colored square. Quiet your mind and choose the square you sense is covering it."
        />
        <IntuitionSkillFocus
          skills="First impressions, quiet attention, and recognizing subtle internal signals"
          explanation="This helps you notice the difference between an immediate impression and an answer reached after overthinking. The goal is to recognize your own recurring cues—not to be correct every time."
        />
        <Text style={styles.progressLabel}>
          {round + (choice ? 1 : 0)} of 5 questions answered
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((round + (choice ? 1 : 0)) / 5) * 100}%` }
            ]}
          />
        </View>
        <View style={styles.knowingGuidance}>
          <Ionicons color="#7555C7" name="sparkles-outline" size={23} />
          <Text style={styles.knowingGuidanceText}>
            Sit comfortably and take a slow breath. One of the colored squares has a picture hidden underneath it. Before tapping, soften your focus and feel which square seems to be holding the picture. Trust the first gentle impression that comes to you.
          </Text>
        </View>
        <View style={styles.colorGrid}>
          {roundColors.map((color) => {
            const hidesPhoto = color === target;
            const revealPhoto = choice === target && color === target;
            const showCorrectBox = choice !== null && choice !== target && color === target;
            return (
              <Pressable
                disabled={choice !== null}
                key={color}
                onPress={() => {
                  setChoice(color);
                  if (color === target) setCorrect((current) => current + 1);
                }}
                style={[
                  styles.colorBox,
                  choice === color && styles.selectedColorBox,
                  showCorrectBox && styles.correctColorBox
                ]}
              >
                {hidesPhoto && (
                  <Image
                    accessibilityLabel="Beautiful hidden photograph"
                    resizeMode="cover"
                    source={(knowingRewardPictures[round] || rewardImages[round % rewardImages.length]).source}
                    style={styles.revealImage}
                  />
                )}
                {!revealPhoto && (
                  <View
                    style={[
                      styles.colorCover,
                      { backgroundColor: colors[color] }
                    ]}
                  />
                )}
                <View style={styles.colorLabel}>
                  <Text style={styles.colorText}>{color}</Text>
                  {revealPhoto && <Ionicons color="#FFFFFF" name="sparkles" size={18} />}
                  {showCorrectBox && <Ionicons color="#FFFFFF" name="checkmark-circle" size={18} />}
                </View>
              </Pressable>
            );
          })}
        </View>
        {choice && (
          <View style={[styles.message, isCorrect && styles.correctMessage]}>
            <Text style={styles.messageTitle}>
              {isCorrect ? "You knew it!" : `The picture was behind ${target}.`}
            </Text>
            <Text style={styles.messageText}>
              {isCorrect
                ? "Your first impression found the picture. The next question will begin shortly."
                : "Trust the process. The next question will begin shortly."}
            </Text>
          </View>
        )}
      </View>
    );
  }

  if (page === "remote-viewing-arena") {
    const lessonChoices = getTodaysLessonChoices();
    const selectedLesson = lessonChoices.find((lesson) => learningChallenge === lesson.practice);
    const visibleHistory = isPremium ? learningHistory : learningHistory.slice(0, 1);
    return (
      <View>
        <ChallengePageHeader
          eyebrow="Challenge 3 · Positivity Practice"
          title="Choose today's gentle idea"
          subtitle="Pick one simple thing to try, notice, or follow through on today."
          compact
        />
        <IntuitionSkillFocus
          skills="Everyday noticing, synchronicity awareness, and acting on constructive inner prompts"
          explanation="This turns intuition into an everyday habit: notice a useful idea, try it safely, and reflect on what actually happened."
        />
        {priorLearningEntry && (
          <View style={[styles.learningReminder, styles.learningReminderCompact]}>
            <View style={styles.reminderHeading}>
              <Ionicons color="#7555C7" name="notifications-outline" size={23} />
              <Text style={styles.reminderTitle}>How did yesterday's task go?</Text>
            </View>
            <Text style={styles.followUpPlan}>{priorLearningEntry.challenge}</Text>
            <TextInput
              accessibilityLabel="Update on previous intuition challenge"
              multiline
              onChangeText={setLearningResponse}
              placeholder="What happened? How did it affect your day?"
              placeholderTextColor="#9A93AA"
              style={[styles.journalInput, styles.learningJournalInputCompact]}
              textAlignVertical="top"
              value={learningResponse}
            />
            <Pressable
              disabled={!learningResponse.trim()}
              onPress={() => {
                saveLearningResponse(priorLearningEntry.date, learningResponse.trim());
                const updated = loadLearningJournal();
                setLearningHistory(updated.filter((entry) => Boolean(entry.response)).reverse());
                setPriorLearningEntry(null);
                setAnswers((current) => ({
                  ...current,
                  "learning-followup-score": "1"
                }));
              }}
              style={[styles.secondaryButton, !learningResponse.trim() && styles.disabledButton]}
            >
              <Text style={styles.secondaryButtonText}>Save yesterday's response</Text>
            </Pressable>
            <Text style={styles.pointsEarnedText}>Submit your follow-up to complete part of this module's {dailyPointWeights.learning} daily points.</Text>
          </View>
        )}
        <View style={styles.lessonCard}>
          {[
            "Choose one gentle idea for today.",
            "Let awareness, mindfulness, and inner knowing guide the moment.",
            "Keep it simple enough to actually try in real life."
          ].map((point) => (
            <View key={point} style={styles.lessonPoint}>
              <Ionicons color="#00AEBB" name="checkmark-circle-outline" size={21} />
              <Text style={styles.lessonPointText}>{point}</Text>
            </View>
          ))}
        </View>
        <View style={styles.learningChoiceGrid}>
          {lessonChoices.map((lesson, index) => {
            const selected = learningChallenge === lesson.practice;
            return (
              <Pressable
                accessibilityLabel={`Choose positivity idea ${index + 1}`}
                disabled={learningTaskSaved}
                key={`${lesson.title}-${index}`}
                onPress={() => setLearningChallenge(lesson.practice)}
                style={[styles.learningIdeaChoice, selected && styles.learningIdeaChoiceSelected, learningTaskSaved && styles.learningIdeaChoiceLocked]}
              >
                <View style={styles.learningIdeaHeader}>
                  <View style={[styles.learningIdeaNumber, selected && styles.learningIdeaNumberSelected]}>
                    <Text style={[styles.learningIdeaNumberText, selected && styles.learningIdeaNumberTextSelected]}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.learningIdeaTitle, selected && styles.learningIdeaTitleSelected]}>{lesson.title}</Text>
                  {selected && <Ionicons color="#008A94" name="checkmark-circle" size={20} />}
                </View>
                <Text style={styles.learningIdeaText}>{lesson.practice}</Text>
                <Text style={styles.learningIdeaReflection}>{lesson.reflection}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.learningChallengeCard, styles.learningChallengeCardCompact]}>
          <Text style={styles.practiceLabel}>Your task for today</Text>
          <Text style={styles.practiceText}>
            Choose one idea above, or write a small positivity task of your own.
          </Text>
          <TextInput
            accessibilityLabel="Today's positivity task"
            editable={!learningTaskSaved}
            multiline
            onChangeText={setLearningChallenge}
            placeholder="Example: I will guess who calls next, or invite someone to lunch."
            placeholderTextColor="#9A93AA"
            style={[styles.journalInput, styles.learningJournalInputCompact, learningTaskSaved && styles.journalInputLocked]}
            textAlignVertical="top"
            value={learningChallenge}
          />
          {selectedLesson && !learningTaskSaved && (
            <Text style={styles.journalHint}>Selected: {selectedLesson.title}</Text>
          )}
          {learningTaskSaved && (
            <View style={styles.savedTaskBanner}>
              <Ionicons color="#239963" name="lock-closed-outline" size={18} />
              <Text style={styles.savedTaskText}>Your task is locked in for today.</Text>
            </View>
          )}
          <Text style={styles.journalHint}>
            Tomorrow, Intuisity will ask what happened.
          </Text>
          <Text style={styles.pointsEarnedText}>Save today's task to complete part of this module's {dailyPointWeights.learning} daily points.</Text>
        </View>
        {learningTaskSaved ? (
          <View style={styles.taskActionRow}>
            <Pressable
              onPress={() => setLearningTaskSaved(false)}
              style={[styles.secondaryButton, styles.taskEditButton]}
            >
              <Ionicons color="#6544B8" name="create-outline" size={18} />
              <Text style={styles.taskEditButtonText}>Edit task</Text>
            </Pressable>
            <Pressable
              onPress={() => setPage("third-eye-activation")}
              style={[styles.primaryButton, styles.taskContinueButton]}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons color="#FFFFFF" name="arrow-forward-outline" size={18} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            disabled={!learningChallenge.trim()}
            onPress={() => {
              saveLearningChallenge(learningChallenge.trim());
              setLearningTaskSaved(true);
              setAnswers((current) => ({
                ...current,
                "remote-viewing-arena": "Completed",
                "learning-commitment-score": "1"
              }));
            }}
            style={[styles.primaryButton, styles.learningSubmitButton, !learningChallenge.trim() && styles.disabledButton]}
          >
            <Ionicons color="#FFFFFF" name="checkmark-circle-outline" size={18} />
            <Text style={styles.primaryButtonText}>Lock in today's task</Text>
          </Pressable>
        )}
        {visibleHistory.length > 0 && (
          <View>
            <View style={styles.historyHeading}>
              <Text style={styles.resultsSectionTitle}>
                {isPremium ? "Your challenge history" : "Your latest response"}
              </Text>
              {!isPremium && (
                <View style={styles.premiumPill}>
                  <Ionicons color="#6544B8" name="lock-closed-outline" size={13} />
                  <Text style={styles.premiumPillText}>Premium shows all days</Text>
                </View>
              )}
            </View>
            {visibleHistory.map((entry) => (
              <View key={entry.date} style={styles.historyEntry}>
                <Text style={styles.historyDate}>{formatDateKey(entry.date)}</Text>
                <Text style={styles.historyChallenge}>{entry.challenge}</Text>
                <Text style={styles.historyResponse}>{entry.response}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  if (page === "third-eye-activation") {
    const personCorrect = personSelections.filter((attribute) =>
      person.correctAttributes.includes(attribute)
    ).length;
    const personPortraitSource = personPortraitUri ? { uri: personPortraitUri } : personImages[person.id];

    if (personPortraitLoading || !personPortraitSource) {
      return (
        <View>
          <ChallengePageHeader
            eyebrow="Challenge 4 · Read the Person"
            title="Finding a real historic photo"
            subtitle="Preparing a person with an available photograph and factual history."
          />
          <View style={styles.loadingPanel}>
            <Ionicons color="#7555C7" name="image-outline" size={34} />
            <Text style={styles.loadingPanelText}>Loading a real photo for this challenge...</Text>
          </View>
        </View>
      );
    }

    return (
      <View>
        <ChallengePageHeader
          eyebrow="Challenge 4 · Read the Person"
          title={showPersonResults ? `${personCorrect} of ${personMaximumScore} correct` : "What do you sense about this person?"}
          subtitle={
            showPersonResults
              ? "Review your intuitive impressions and compare them with the person's hidden story."
              : person.introduction
          }
        />
        <IntuitionSkillFocus
          skills="Social intuition, nonverbal observation, empathy, and separating impressions from assumptions"
          explanation="You form a first impression from limited information, then check it against facts. Reviewing misses is useful too because it can reveal personal assumptions and patterns."
        />
        <View style={styles.personPortraitFrame}>
          <Image
            accessibilityLabel="Portrait for the Read the Person challenge"
            onError={async () => {
              if ((!personPracticeMode && savedPersonChallengeRef.current) || showPersonResults) {
                setPersonPortraitLoading(false);
                return;
              }
              setPersonPortraitLoading(true);
                for (let attempt = 0; attempt < Math.min(personProfiles.length, personPortraitSearchLimit); attempt += 1) {
                const candidate = pickBalancedPersonProfile(userProfile.email, attempt + 1);
                const portraitUri = candidate.portraitUri || await resolveWikipediaPortrait(candidate.wikipediaTitle || candidate.name);
                if (portraitUri) {
                  setPerson(candidate);
                  setPersonPortraitUri(portraitUri);
                  rememberPersonPortrait(userProfile.email, candidate.id);
                  const nextAttributeChoices = shuffle(candidate.attributes);
                  setPersonAttributeChoices(nextAttributeChoices);
                  setPersonSelections([]);
                  setShowPersonResults(false);
                  if (!personPracticeMode) {
                    savedPersonChallengeRef.current = saveTodaysPersonChallenge(userProfile.email, {
                    profileId: candidate.id,
                    portraitUri,
                    attributeChoices: nextAttributeChoices,
                    selections: [],
                    completed: false
                    });
                  }
                  setPersonPortraitLoading(false);
                  return;
                }
              }
              setPersonPortraitLoading(false);
            }}
            resizeMode="contain"
            source={personPortraitSource}
            style={styles.personPortrait}
          />
        </View>

        <Text style={styles.selectionCount}>
          {showPersonResults ? "Your attribute review" : `${personSelections.length} of ${personChoiceLimit} attributes selected`}
        </Text>
        <View style={styles.attributeList}>
          {personAttributeChoices.map((attribute) => {
            const selectedAttribute = personSelections.includes(attribute);
            const correctAttribute = person.correctAttributes.includes(attribute);
            return (
              <Pressable
                disabled={showPersonResults}
                key={attribute}
                onPress={() => {
                  if (personSelections.includes(attribute)) {
                    const nextSelections = personSelections.filter((item) => item !== attribute);
                    setPersonSelections(nextSelections);
                    if (!personPracticeMode) {
                      persistPersonChallenge({
                        selections: nextSelections,
                        completed: false
                      });
                    }
                    return;
                  }
                  if (personSelections.length >= personChoiceLimit) return;

                  const nextSelections = [...personSelections, attribute];
                  setPersonSelections(nextSelections);

                  if (nextSelections.length === personChoiceLimit) {
                    const correctCount = nextSelections.filter((item) =>
                      person.correctAttributes.includes(item)
                    ).length;
                    setShowPersonResults(true);
                    if (!personPracticeMode && !savedPersonChallengeRef.current?.completed) {
                      persistPersonChallenge({
                        profileId: person.id,
                        portraitUri: personPortraitUri || person.portraitUri || null,
                        attributeChoices: personAttributeChoices,
                        selections: nextSelections,
                        completed: true
                      });
                      setAnswers((current) => ({
                        ...current,
                        "third-eye-activation": "Completed",
                        "person-score": String(correctCount)
                      }));
                    }
                  } else {
                    if (!personPracticeMode) {
                      persistPersonChallenge({
                        selections: nextSelections,
                        completed: false
                      });
                    }
                  }
                }}
                style={[
                  styles.attributeChoice,
                  selectedAttribute && styles.attributeSelected,
                  showPersonResults && correctAttribute && styles.attributeCorrect,
                  showPersonResults &&
                    correctAttribute &&
                    selectedAttribute &&
                    styles.attributeCorrectSelected,
                  showPersonResults && selectedAttribute && !correctAttribute && styles.attributeIncorrect
                ]}
              >
                <Ionicons
                  color={
                    showPersonResults && correctAttribute && selectedAttribute
                      ? "#FFFFFF"
                      : showPersonResults && correctAttribute
                      ? "#239963"
                      : selectedAttribute
                        ? "#7555C7"
                        : "#9A93AA"
                  }
                  name={
                    showPersonResults && correctAttribute
                      ? "checkmark-circle"
                      : selectedAttribute
                        ? "checkmark-circle-outline"
                        : "ellipse-outline"
                  }
                  size={21}
                />
                <Text
                  style={[
                    styles.attributeText,
                    showPersonResults &&
                      correctAttribute &&
                      selectedAttribute &&
                      styles.attributeCorrectSelectedText
                  ]}
                >
                  {attribute}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {showPersonResults && (
          <View style={styles.personHistory}>
            <Text style={styles.practiceLabel}>More about {person.name}</Text>
            <Text style={styles.practiceText}>{person.history}</Text>
          </View>
        )}

        {!showPersonResults ? (
          <View>
            <View style={styles.selectionPrompt}>
              <Ionicons color="#7555C7" name="sparkles-outline" size={20} />
              <Text style={styles.selectionPromptText}>
                Select three attributes to automatically reveal their story.
              </Text>
            </View>
            <Pressable onPress={() => setPage("hub")} style={styles.secondaryButton}>
              <Ionicons color="#FFFFFF" name="arrow-back-outline" size={18} />
              <Text style={styles.secondaryButtonText}>Return to challenges</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.remoteAnswerStage}>
            <View style={styles.scoreAdded}>
              <Ionicons color="#7555C7" name="trophy-outline" size={22} />
              <Text style={styles.scoreAddedText}>
                {personPracticeMode ? `${personCorrect} correct in this practice round` : (
                  <>
                {personCorrect} correct · {calculateModulePoints(personCorrect, personMaximumScore, dailyPointWeights.person)} of {dailyPointWeights.person} points added
                  </>
                )}
              </Text>
            </View>
            <Text style={styles.selectionPromptText}>
              {personPracticeMode
                ? "Practice rounds help you see what people enjoy, but today's official score stays locked from the first play."
                : "Today's official Read the Person score is locked in. You can still play more practice rounds today."}
            </Text>
            <Pressable
              onPress={startPersonPracticeRound}
              style={styles.secondaryButton}
            >
              <Ionicons color="#FFFFFF" name="refresh-outline" size={18} />
              <Text style={styles.secondaryButtonText}>Play another person</Text>
            </Pressable>
            <Pressable
              onPress={() => setPage("psychic-potential-score")}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Carry this insight forward</Text>
              <Ionicons color="#FFFFFF" name="arrow-forward-outline" size={18} />
            </Pressable>
            <Pressable onPress={() => setPage("hub")} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Back to challenges</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  if (page === "psychic-potential-score") {
    return (
      <View>
        <ChallengePageHeader
          eyebrow="Challenge 5 · Daily Astrology Tips"
          title={astrologyReading ? `${astrologyReading.sign.name} guidance for ${userProfile.name}` : "Add your birthdate for astrology guidance"}
          subtitle={
            astrologyReading
              ? `A daily chart synopsis and one focused question inspired by your ${astrologyReading.sign.element} sign.`
              : "Enter your birth details here once and Intuisity will save them for next time."
          }
        />
        <IntuitionSkillFocus
          skills="Self-reflection, pattern awareness, and using symbolic prompts to make intentional choices"
          explanation="Astrology provides a reflection prompt here. The intuition skill is deciding what feels personally relevant, then testing that insight through a practical action."
        />

        <View style={styles.birthdateCard}>
          {hasSavedBirthDetails ? (
            <Pressable
              accessibilityLabel="Open saved birth details"
              onPress={() => setBirthDetailsOpen(!birthDetailsOpen)}
              style={styles.birthDetailsDropdown}
            >
              <Ionicons color="#7555C7" name="planet-outline" size={25} />
              <View style={styles.menuCopy}>
                <Text style={styles.birthChartTitle}>{birthDetailsComplete ? "Birth details saved" : "Birth details started"}</Text>
                <Text style={styles.birthDetailsSummary}>{birthDetailsSummary || "Tap to review your birth details"}</Text>
                {!birthDetailsComplete && (
                  <Text style={styles.birthDetailsSummary}>Add later when you know: {birthDetailsMissingList}</Text>
                )}
              </View>
              <Ionicons color="#7555C7" name={birthDetailsOpen ? "chevron-up-outline" : "chevron-down-outline"} size={22} />
            </Pressable>
          ) : (
            <View style={styles.birthDetailsHeader}>
              <Ionicons color="#7555C7" name="planet-outline" size={25} />
              <View style={styles.menuCopy}>
                <Text style={styles.birthChartTitle}>Birth details for astrology</Text>
                <Text style={styles.birthChartNote}>Saved to your profile after you tap save.</Text>
              </View>
            </View>
          )}

          {birthDetailsOpen && (
            <View>
              {hasSavedBirthDetails && (
                <Text style={styles.birthChartNote}>
                  {birthDetailsComplete
                    ? "Make changes only if your birth details need updating."
                    : "Save what you know now. You can return later to add any birth details you do not know today."}
                </Text>
              )}
              <TextInput
                accessibilityLabel="Birthdate for astrology"
                keyboardType="number-pad"
                onChangeText={(birthdate) => updateBirthDetail("birthdate", formatBirthdate(birthdate))}
                placeholder="Birthdate MM/DD/YYYY"
                placeholderTextColor="#9A93AA"
                style={styles.birthdateInput}
                value={birthDetails.birthdate}
              />
              <TextInput
                accessibilityLabel="Birth city for astrology"
                onChangeText={(birthCity) => updateBirthDetail("birthCity", birthCity)}
                placeholder="Birth city"
                placeholderTextColor="#9A93AA"
                style={styles.birthdateInput}
                value={birthDetails.birthCity}
              />
              <TextInput
                accessibilityLabel="Birth state or region for astrology"
                onChangeText={(birthState) => updateBirthDetail("birthState", birthState)}
                placeholder="Birth state or region"
                placeholderTextColor="#9A93AA"
                style={styles.birthdateInput}
                value={birthDetails.birthState}
              />
              <TextInput
                accessibilityLabel="Birth country for astrology"
                onChangeText={(birthCountry) => updateBirthDetail("birthCountry", birthCountry)}
                placeholder="Birth country"
                placeholderTextColor="#9A93AA"
                style={styles.birthdateInput}
                value={birthDetails.birthCountry}
              />
              <BirthTimePicker
                onChange={(birthTime) => updateBirthDetail("birthTime", birthTime)}
                value={birthDetails.birthTime}
              />
              <Pressable
                disabled={!birthdateReady}
                onPress={saveBirthDetails}
                style={[styles.secondaryButton, !birthdateReady && styles.disabledButton]}
              >
                <Text style={styles.secondaryButtonText}>{birthDetailsSaved ? "Birth details saved" : birthDetailsComplete ? "Update birth details" : "Save what I know"}</Text>
              </Pressable>
              {birthLocationStatus ? (
                <Text style={styles.birthChartNote}>{birthLocationStatus}</Text>
              ) : null}
              {!birthdateReady && (
                <Text style={styles.birthChartNote}>
                  {birthdateHasFullLength
                    ? "Please check the birthdate. It should be a real date in MM/DD/YYYY format."
                    : "Birthdate opens today's guidance. Birth time and birthplace can be added later for the most reliable chart details."}
                </Text>
              )}
            </View>
          )}
        </View>

        {!astrologyReading ? (
          <View style={styles.birthdateCard}>
            <Ionicons color="#7555C7" name="person-circle-outline" size={42} />
            <Text style={styles.birthChartNote}>
              Save your birthdate above to open your daily astrology guidance.
            </Text>
          </View>
        ) : (
          <View>
            <View style={styles.signBanner}>
              <View style={styles.signSymbol}>
                <Ionicons color="#FFFFFF" name="star-outline" size={25} />
              </View>
              <View style={styles.menuCopy}>
                <Text style={styles.signTitle}>{astrologyReading.sign.name}</Text>
                <Text style={styles.signSubtitle}>
                  {astrologyReading.sign.element} sign · {astrologyReading.sign.strength}
                </Text>
                {astrologyReading.birthDetailsIncluded && (
                  <Text style={styles.signDetail}>
                    {astrologyReading.fullChart ? "Full birth chart calculated" : "Birth details included"}
                  </Text>
                )}
              </View>
            </View>
            {astrologyReading.fullChart ? (
              <View style={styles.fullChartCard}>
                <Text style={styles.fullChartTitle}>Your Intuisity chart highlights</Text>
                <View style={styles.fullChartGrid}>
                  <View style={styles.fullChartItem}>
                    <Text style={styles.fullChartLabel}>Sun</Text>
                    <Text style={styles.fullChartValue}>{astrologyReading.fullChart.sunSign}</Text>
                  </View>
                  <View style={styles.fullChartItem}>
                    <Text style={styles.fullChartLabel}>Moon</Text>
                    <Text style={styles.fullChartValue}>{astrologyReading.fullChart.moonSign}</Text>
                  </View>
                  <View style={styles.fullChartItem}>
                    <Text style={styles.fullChartLabel}>Rising</Text>
                    <Text style={styles.fullChartValue}>{astrologyReading.fullChart.risingSign}</Text>
                  </View>
                  <View style={styles.fullChartItem}>
                    <Text style={styles.fullChartLabel}>Midheaven</Text>
                    <Text style={styles.fullChartValue}>{astrologyReading.fullChart.midheavenSign}</Text>
                  </View>
                </View>
                {astrologyReading.fullChart.strongestAspect && (
                  <Text style={styles.fullChartAspect}>Key pattern: {astrologyReading.fullChart.strongestAspect}</Text>
                )}
                <Text style={styles.fullChartSource}>
                  Calculated with {astrologyReading.fullChart.source} · {astrologyReading.fullChart.zodiac} zodiac · {astrologyReading.fullChart.houseSystem} houses
                </Text>
              </View>
            ) : (
              <View style={styles.fullChartCard}>
                <Text style={styles.fullChartTitle}>
                  {astrologyReading.birthDetailsIncluded ? "Using your saved birth details" : "Using your birthdate guidance"}
                </Text>
                <Text style={styles.fullChartSource}>
                  {astrologyReading.birthDetailsIncluded
                    ? "Intuisity will use the strongest guidance available from the details you entered. Add or refine missing birth details anytime for the most reliable chart guidance."
                    : "Today's reading uses your birthdate and Sun sign. Add birth time and birthplace when you have them for the most reliable guidance."}
                </Text>
              </View>
            )}
            <View style={styles.astrologyChoicesHeading}>
              <Ionicons color="#7555C7" name="sparkles-outline" size={22} />
              <View style={styles.menuCopy}>
                <Text style={styles.astrologyChoicesTitle}>Today's Chart Synopsis</Text>
                <Text style={styles.astrologyChoicesSubtitle}>
                  Read this first, then answer the question below in your own words.
                </Text>
              </View>
            </View>
            <View style={styles.chartSynopsisCard}>
              <View style={styles.chartSynopsisHeading}>
                <Ionicons color="#7555C7" name="planet-outline" size={24} />
                <Text style={styles.chartSynopsisTitle}>Your daily astrology</Text>
              </View>
              <Text style={styles.chartSynopsisText}>{astrologyReading.synopsis}</Text>
            </View>
            {priorAstrologyEntry && (
              <View style={styles.followUpCard}>
                <Text style={styles.practiceLabel}>Follow up from {formatDateKey(priorAstrologyEntry.date)}</Text>
                <Text style={styles.followUpPlan}>{priorAstrologyEntry.plan}</Text>
                <Text style={styles.inputLabel}>How did that task go?</Text>
                <TextInput
                  accessibilityLabel="Update on previous astrology task"
                  multiline
                  onChangeText={setAstrologyUpdate}
                  placeholder="Share what happened, what helped, or what you learned..."
                  placeholderTextColor="#9A93AA"
                  style={styles.journalInput}
                  textAlignVertical="top"
                  value={astrologyUpdate}
                />
                <Pressable
                  disabled={!astrologyUpdate.trim()}
                  onPress={() => {
                    saveAstrologyUpdate(priorAstrologyEntry.date, astrologyUpdate.trim());
                    setPriorAstrologyEntry(null);
                  }}
                  style={[styles.secondaryButton, !astrologyUpdate.trim() && styles.disabledButton]}
                >
                  <Text style={styles.secondaryButtonText}>Save my update</Text>
                </Pressable>
              </View>
            )}
            <View style={styles.dailyActionCard}>
              <Text style={styles.practiceLabel}>Today's chart question</Text>
              <Text style={styles.practiceText}>
                {astrologyReading.dailyQuestion}
              </Text>
              <TextInput
                accessibilityLabel="Today's astrology self-challenge"
                editable={!planSaved}
                multiline
                onChangeText={setAstrologyPlan}
                placeholder="Write your answer or the action this question inspires..."
                placeholderTextColor="#9A93AA"
                style={styles.journalInput}
                textAlignVertical="top"
                value={astrologyPlan}
              />
              <Pressable
                disabled={!astrologyPlan.trim() || planSaved}
                onPress={() => {
                  saveAstrologyPlan(astrologyPlan.trim());
                  setPlanSaved(true);
                }}
                style={[
                  styles.secondaryButton,
                  (!astrologyPlan.trim() || planSaved) && styles.disabledButton
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  {planSaved ? "Saved for tomorrow's follow-up" : "Save my answer"}
                </Text>
              </Pressable>
            </View>
            {planSaved && (
              <View style={styles.chartSynopsisCard}>
                <View style={styles.chartSynopsisHeading}>
                  <Ionicons color="#7555C7" name="star-outline" size={24} />
                  <Text style={styles.chartSynopsisTitle}>Your Daily Chart Highlights</Text>
                </View>
                <Text style={styles.chartSynopsisText}>
                  {`${astrologyReading.synopsis} Your saved response, "${astrologyPlan.trim()}", gives you a clear way to use this guidance in real life.`}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => {
                setAnswers((current) => ({ ...current, "psychic-potential-score": "Completed" }));
                resetRemoteViewing();
              }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Save my guidance and continue</Text>
              <Ionicons color="#FFFFFF" name="arrow-forward-outline" size={18} />
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  if (page === "social-prediction") {
    const revealDate = new Date();
    revealDate.setDate(revealDate.getDate() + 1);
    const revealLabel = revealDate.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
    const treasureStarted = treasureSecret.length === 5;
    const treasureCorrect = treasureLocked.filter(Boolean).length;
    const treasureUsed = treasureGuess.filter(Boolean);
    const treasureMissingCount = treasureGuess.filter((icon) => !icon).length;
    const treasureLost = treasureWinText.startsWith("The treasure");
    const treasureFriendSubmitted = treasureWinText.startsWith("Your treasure tiles");
    const treasureWon = Boolean(treasureWinText) && !treasureLost && !treasureFriendSubmitted;
    const treasureInspirationMessage =
      (opponent === "friend" || invitedTreasureSender) && treasureNote.trim()
        ? treasureNote.trim()
        : "You are bright, brave, and guided.";
    const treasureInspirationWords = treasureInspirationMessage.split(/\s+/).filter(Boolean);
    const treasureSceneStyle = [
      styles.treasureScene,
      opponent === "friend" ? styles.treasureSceneFriend : styles.treasureSceneComputer,
      treasureStarted && styles.treasureSceneActive,
      treasureWon && styles.treasureSceneWon,
      treasureLost && styles.treasureSceneLost
    ];
    const chooseTreasureMode = (mode: "friend" | "computer") => {
      if (mode === "friend" && userProfile.authProvider === "guest") {
        setFriendPhoneError("Please create or sign in to your Intuisity account before inviting your own friends.");
        onLogout();
        return;
      }
      setOpponent(mode);
      setFriendPhoneError("");
      setFriendInviteStatus("");
      setTreasureWinText("");
      setInvitedTreasureSender("");
      if (mode === "friend") {
        setTreasureSecret([]);
        setTreasureGuess(Array(5).fill(null));
        setTreasureAttemptRows([]);
        setTreasureLocked(Array(5).fill(false));
        setTreasureTriesLeft(4);
        setSelectedTreasureDrag(null);
        setTreasureFlowStep("friend-setup");
        return;
      }
      startTreasureChallenge("computer");
    };
    const addTreasureFriend = () => {
      if (selectedFriendPhones.length >= 5) {
        setFriendPhoneError("You can invite up to five people to one competition.");
        return null;
      }
      if (!friendName.trim()) {
        setFriendPhoneError("Please enter your friend's name.");
        return null;
      }
      if (!friendEmail.trim()) {
        setFriendPhoneError("Please enter your friend's email address.");
        return null;
      }
      return addFriendPhone();
    };
    const startTreasureChallenge = (
      mode: "friend" | "computer",
      friendKeys = selectedFriendPhones,
      friendList = savedFriends
    ) => {
      if (mode === "friend" && friendKeys.length === 0) {
        setFriendPhoneError("Select or add at least one friend with an email address.");
        return;
      }
      if (mode === "friend") {
        const selectedFriends = friendList.filter((friend) => friendKeys.includes(getFriendKey(friend)));
        const missingEmail = selectedFriends.some((friend) => !friend.email);
        if (missingEmail) {
          setFriendPhoneError("Friend challenges require an email. Phone number is optional.");
          return;
        }
        setFriendInviteStatus("Arrange your five treasure tiles, then submit to send the challenge.");
      } else {
        setFriendInviteStatus("");
      }
      const nextIcons = makeTreasureChestIcons();
      setTreasureIcons(nextIcons);
      setTreasureSecret(shuffle(nextIcons));
      setTreasureGuess(Array(5).fill(null));
      setTreasureAttemptRows([]);
      setTreasureLocked(Array(5).fill(false));
      setTreasureTriesLeft(4);
      setTreasureWinText("");
      setSelectedTreasureDrag(null);
      setTreasureSceneImage(shuffle(treasureSceneImages)[0]);
      setOpponent(mode);
      setInvitedTreasureSender("");
      setTreasureFlowStep("play");
      setComputerResult(false);
      setAnswers((current) => {
        const next = { ...current };
        delete next["friend-score"];
        delete next["friend-points"];
        delete next["friend-maximum"];
        return next;
      });
    };
    const saveTreasureFriendAndContinue = () => {
      const saved = addTreasureFriend();
      if (!saved) return;
      const nextSelected = [saved.contactKey];
      setSelectedFriendPhones(nextSelected);
      setPendingTreasureFriend({
        contact: saved.contact,
        nextSaved: saved.nextSaved,
        nextSelected
      });
      setFriendInviteStatus("");
    };
    const placeTreasureIcon = (drag: TreasureDragItem, targetIndex: number) => {
      if (treasureLocked[targetIndex]) return;
      setTreasureGuess((current) => {
        const next = [...current];
        if (drag.from === "slot") {
          if (drag.index === undefined || treasureLocked[drag.index] || drag.index === targetIndex) return current;
          const targetIcon = next[targetIndex] || null;
          next[targetIndex] = drag.icon;
          next[drag.index] = targetIcon;
          return next;
        }
        if (next.includes(drag.icon)) return current;
        next[targetIndex] = drag.icon;
        return next;
      });
      setSelectedTreasureDrag(null);
    };
    const tapTreasureIcon = (drag: TreasureDragItem) => {
      if (treasureIgnoreClickRef.current) {
        treasureIgnoreClickRef.current = false;
        return;
      }
      if (drag.from === "slot") {
        if (drag.index === undefined || treasureLocked[drag.index]) return;
        setTreasureGuess((current) => current.map((slot, index) => index === drag.index ? null : slot));
        setSelectedTreasureDrag(null);
        return;
      }
      const firstEmpty = treasureGuess.findIndex((slot) => !slot);
      if (firstEmpty === -1 || treasureGuess.includes(drag.icon)) return;
      placeTreasureIcon(drag, firstEmpty);
    };
    const writeTreasureDrag = (event: any, drag: TreasureDragItem) => {
      const transfer = event.dataTransfer || event.nativeEvent?.dataTransfer;
      transfer?.setData("application/json", JSON.stringify(drag));
      transfer?.setData("text/plain", drag.icon);
      if (transfer) {
        transfer.effectAllowed = "move";
      }
    };
    const readTreasureDrag = (event: any): TreasureDragItem | null => {
      const transfer = event.dataTransfer || event.nativeEvent?.dataTransfer;
      try {
        const raw = transfer?.getData("application/json");
        if (raw) return JSON.parse(raw);
        const icon = transfer?.getData("text/plain");
        return icon ? { icon, from: "palette" } : null;
      } catch {
        return null;
      }
    };
    const startTreasurePointerDrag = (event: any, drag: TreasureDragItem) => {
      treasurePointerDragRef.current = drag;
      treasureIgnoreClickRef.current = false;
      setTreasurePointerDrag(drag);
      setTreasureDropSlot(null);
      event.currentTarget?.setPointerCapture?.(event.pointerId);
      event.preventDefault?.();
    };
    const updateTreasureDropSlot = (event: any) => {
      if (!treasurePointerDragRef.current) return;
      const nativeEvent = event.nativeEvent || event;
      const target = (globalThis as any).document?.elementFromPoint?.(nativeEvent.clientX, nativeEvent.clientY);
      const slot = target?.closest?.("[data-treasure-slot-index]");
      if (!slot) {
        setTreasureDropSlot(null);
        return;
      }
      const slotIndex = Number(slot.getAttribute("data-treasure-slot-index"));
      setTreasureDropSlot(Number.isInteger(slotIndex) && !treasureLocked[slotIndex] ? slotIndex : null);
    };
    const finishTreasurePointerDrag = (event: any) => {
      const drag = treasurePointerDragRef.current;
      if (!drag) return;
      const nativeEvent = event.nativeEvent || event;
      const target = (globalThis as any).document?.elementFromPoint?.(nativeEvent.clientX, nativeEvent.clientY);
      const slot = target?.closest?.("[data-treasure-slot-index]");
      let handledDrop = false;
      if (slot) {
        const slotIndex = Number(slot.getAttribute("data-treasure-slot-index"));
        if (Number.isInteger(slotIndex)) {
          placeTreasureIcon(drag, slotIndex);
          handledDrop = drag.from === "palette" || drag.index !== slotIndex;
        }
      } else if (drag.from === "palette") {
        const firstEmpty = treasureGuess.findIndex((slotIcon) => !slotIcon);
        if (firstEmpty !== -1 && !treasureGuess.includes(drag.icon)) {
          placeTreasureIcon(drag, firstEmpty);
          handledDrop = true;
        }
      }
      treasureIgnoreClickRef.current = handledDrop;
      event.target?.releasePointerCapture?.(event.pointerId);
      treasurePointerDragRef.current = null;
      setTreasurePointerDrag(null);
      setTreasureDropSlot(null);
    };
    const submitTreasureGuess = () => {
      if (!treasureStarted || treasureGuess.some((icon) => !icon) || treasureTriesLeft === 0) return;
      const submittedGuess = [...treasureGuess];
      if (opponent === "friend") {
        const selectedFriends = savedFriends.filter((friend) => selectedFriendPhones.includes(getFriendKey(friend)) && friend.email);
        const competitionId = createClientId();
        setTreasureAttemptRows((current) => [...current, submittedGuess]);
        setTreasureGuess(submittedGuess);
        setTreasureLocked(Array(5).fill(true));
        setTreasureWinText("Your treasure tiles were submitted. Your friend will be invited to answer your game.");
        setFriendInviteStatus("Sending friend challenge invite...");
        Promise.all(selectedFriends.map(async (friend) => {
          const created = await createTreasureChallenge({
            friendEmail: friend.email || "",
            friendName: friend.name,
            competitionId,
            origin: getAppOrigin(),
            note: treasureNote.trim(),
            senderEmail: userProfile.email,
            senderName: userProfile.name || "A friend",
            tiles: submittedGuess as string[]
          });
          return { ...created, friendEmail: friend.email || "", friendName: friend.name } as TreasureChallengeReceipt;
        }))
          .then((created) => {
            const next = [...created, ...sentTreasureChallenges.filter((existing) => !created.some((item) => item.id === existing.id))];
            setSentTreasureChallenges(next);
            saveSentTreasureChallenges(userProfile.email, next);
            setFriendInviteStatus(`Challenge sent to ${selectedFriends.length} ${selectedFriends.length === 1 ? "friend" : "friends"}. You will receive an email when it is opened and another when answers are submitted.`);
          })
          .catch((error) => setFriendInviteStatus(`Your tiles were saved here, but the email invite could not be sent yet. ${error instanceof Error ? error.message : "Check Resend and Vercel settings."}`));
        return;
      }
      const nextTriesLeft = Math.max(0, treasureTriesLeft - 1);
      const nextLocked = treasureGuess.map((icon, index) => treasureLocked[index] || icon === treasureSecret[index]);
      const correctCount = nextLocked.filter(Boolean).length;
      setTreasureAttemptRows((current) => [...current, submittedGuess]);
      setTreasureTriesLeft(nextTriesLeft);
      setTreasureLocked(nextLocked);
      if (invitedTreasureChallengeId) {
        const attemptNumber = treasureAttemptRows.length + 1;
        setTreasureResponseStatus(`Saving attempt ${attemptNumber}...`);
        completeTreasureChallenge(invitedTreasureChallengeId, submittedGuess as string[], attemptNumber, correctCount === 5)
          .then(() => setTreasureResponseStatus(correctCount === 5
            ? `Chest solved in ${attemptNumber} ${attemptNumber === 1 ? "try" : "tries"}. ${invitedTreasureSender || "Your friend"} has been notified.`
            : `Attempt ${attemptNumber} saved. Your competition score is up to date.`))
          .catch((error) => setTreasureResponseStatus(`Your answers were saved in the game, but the notification could not be sent. ${error instanceof Error ? error.message : "Please try again."}`));
      }
      if (correctCount === 5) {
        const triesUsed = 4 - nextTriesLeft;
        const treasurePoints = calculateTreasurePoints(triesUsed);
        setTreasureWinText(makeTreasureWinMessage(triesUsed));
        setAnswers((current) => ({
          ...current,
          "social-prediction": "Completed",
          "friend-score": String(treasurePoints),
          "friend-points": String(treasurePoints),
          "friend-maximum": String(dailyPointWeights.friend)
        }));
        return;
      }
      if (nextTriesLeft === 0) {
        setTreasureWinText("The treasure stayed hidden this time. Try again tomorrow.");
        setAnswers((current) => ({
          ...current,
          "social-prediction": "Completed",
          "friend-score": "0",
          "friend-points": "0",
          "friend-maximum": String(dailyPointWeights.friend)
        }));
      } else {
        setSelectedTreasureDrag(null);
        setTreasureGuess(submittedGuess.map((icon, index) => nextLocked[index] ? icon : null));
      }
    };
    const renderTreasureInspirationBurst = () => {
      if (!treasureWon) return null;
      if (typeof (globalThis as any).document === "undefined") {
        return (
          <View style={styles.treasureInspirationLayer}>
            {treasureInspirationWords.map((word, index) => (
              <Text key={`${word}-${index}`} style={styles.treasureInspirationWord}>
                {word}
              </Text>
            ))}
          </View>
        );
      }
      const paths = [
        { x: -118, y: -126 },
        { x: -72, y: -178 },
        { x: -16, y: -210 },
        { x: 56, y: -186 },
        { x: 116, y: -134 },
        { x: -130, y: -74 },
        { x: 12, y: -112 },
        { x: 138, y: -78 },
        { x: -58, y: -238 },
        { x: 84, y: -232 },
        { x: 0, y: -260 },
        { x: 132, y: -206 }
      ];
      return React.createElement(
        "div",
        {
          key: `treasure-inspiration-${treasureWinText}-${treasureInspirationMessage}`,
          style: {
            bottom: "28%",
            left: "50%",
            pointerEvents: "none",
            position: "absolute",
            zIndex: 6
          }
        },
        React.createElement(
          "style",
          null,
          `
            @keyframes intuisityTreasureWordFirework {
              0% { opacity: 0; transform: translate(-50%, 10px) scale(0.62); text-shadow: 0 0 0 rgba(255, 242, 170, 0); }
              14% { opacity: 1; transform: translate(-50%, -10px) scale(1.05); text-shadow: 0 0 18px rgba(255, 242, 170, 0.95); }
              74% { opacity: 1; transform: translate(calc(-50% + var(--tx)), var(--ty)) scale(1); text-shadow: 0 0 24px rgba(255, 232, 120, 0.85); }
              100% { opacity: 0; transform: translate(calc(-50% + var(--tx)), calc(var(--ty) - 16px)) scale(0.95); text-shadow: 0 0 4px rgba(255, 242, 170, 0.2); }
            }
          `
        ),
        treasureInspirationWords.map((word, index) => {
          const path = paths[index % paths.length];
          return React.createElement(
            "span",
            {
              key: `${word}-${index}`,
              style: {
                "--tx": `${path.x}px`,
                "--ty": `${path.y}px`,
                animation: "intuisityTreasureWordFirework 2.8s cubic-bezier(0.14, 0.86, 0.2, 1) both",
                animationDelay: `${index * 0.34}s`,
                color: index % 3 === 0 ? "#FFFFFF" : index % 3 === 1 ? "#FFE77A" : "#CFF8FF",
                fontSize: index % 4 === 0 ? 25 : 22,
                fontWeight: 900,
                left: 0,
                letterSpacing: 0,
                lineHeight: "26px",
                position: "absolute",
                top: 0,
                whiteSpace: "nowrap"
              } as any
            },
            word
          );
        })
      );
    };
    const renderRealTreasureGlow = () => {
      if (!treasureStarted) return null;
      if (typeof (globalThis as any).document === "undefined") {
        return <View style={styles.realTreasureGlow} />;
      }
      return React.createElement(
        "div",
        {
          style: {
            background: "radial-gradient(ellipse at center, rgba(255, 250, 183, 0.9) 0%, rgba(255, 225, 99, 0.62) 42%, rgba(255, 201, 52, 0.18) 70%, rgba(255, 201, 52, 0) 100%)",
            borderRadius: 999,
            bottom: "20%",
            filter: "blur(2px)",
            height: "24%",
            left: "31%",
            pointerEvents: "none",
            position: "absolute",
            right: "31%",
            zIndex: 3,
            animation: "intuisityTreasureGlowPulse 1.8s ease-in-out infinite alternate"
          }
        },
        React.createElement(
          "style",
          null,
          `
            @keyframes intuisityTreasureGlowPulse {
              0% { opacity: 0.58; transform: translateY(4px) scale(0.9); box-shadow: 0 0 18px rgba(255, 231, 122, 0.42), 0 0 34px rgba(255, 199, 53, 0.22); }
              100% { opacity: 1; transform: translateY(0) scale(1.12); box-shadow: 0 0 30px rgba(255, 241, 151, 0.88), 0 0 54px rgba(255, 210, 65, 0.48); }
            }
          `
        )
      );
    };
    const renderTreasurePlacementControls = () => {
      if (typeof (globalThis as any).document !== "undefined") {
        const webTokenStyle = (disabled: boolean, active: boolean): any => ({
          alignItems: "center",
          background: active ? "#FFF9E8" : "#EDFBFB",
          border: active ? "3px solid #F4B740" : "2px solid #00AEBB",
          borderRadius: 8,
          color: "#30264C",
          cursor: disabled ? "default" : "grab",
          display: "flex",
          flex: 1,
          fontSize: 28,
          fontWeight: 900,
          justifyContent: "center",
          minHeight: 66,
          opacity: disabled ? 0.16 : 1,
          touchAction: "none",
          userSelect: "none"
        });
        const webSlotStyle = (locked: boolean, active: boolean, empty = false): any => ({
          alignItems: "center",
          background: locked ? "#EDFFF6" : active || empty ? "#FFF9E8" : "#FFFFFF",
          border: locked ? "2px solid #43C987" : active || empty ? "3px dashed #F4B740" : "2px dashed #DAD3E8",
          borderRadius: 8,
          color: empty ? "#8A6B20" : "#30264C",
          cursor: locked ? "default" : "grab",
          display: "flex",
          flex: 1,
          fontSize: empty ? 12 : 28,
          fontWeight: 900,
          justifyContent: "center",
          minHeight: 66,
          touchAction: "none",
          userSelect: "none"
        });
        const webPastSlotStyle = (correct: boolean): any => ({
          alignItems: "center",
          background: correct ? "#EDFFF6" : "#F8F7FC",
          border: correct ? "2px solid #43C987" : "1px solid #E7E3F2",
          borderRadius: 8,
          color: correct ? "#176F42" : "#8A8299",
          display: "flex",
          flex: 1,
          fontSize: 24,
          fontWeight: 900,
          justifyContent: "center",
          minHeight: 44,
          opacity: correct ? 1 : 0.72
        });
        return React.createElement(
          "div",
          {
            onPointerCancel: finishTreasurePointerDrag,
            onPointerMove: updateTreasureDropSlot,
            onPointerUp: finishTreasurePointerDrag,
            style: { overflow: "visible", paddingBottom: 18, touchAction: "pan-y" }
          },
          React.createElement("div", { style: { color: "#706982", fontSize: 12, fontWeight: 900, marginBottom: 8, textTransform: "uppercase" } }, opponent === "friend" ? "Step 1: Your five empty boxes" : "Your order"),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 } },
            treasureGuess.map((icon, index) => {
              const active = treasureDropSlot === index;
              return React.createElement(
                "div",
                {
                  "data-treasure-slot-index": index,
                  draggable: false,
                  key: `treasure-top-slot-${index}`,
                  onClick: () => icon && tapTreasureIcon({ icon, from: "slot", index }),
                  onDragEnter: () => !treasureLocked[index] && setTreasureDropSlot(index),
                  onDragLeave: () => setTreasureDropSlot((current) => current === index ? null : current),
                  onDragOver: (event: any) => {
                    if (!treasureLocked[index]) {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setTreasureDropSlot(index);
                    }
                  },
                  onDrop: (event: any) => {
                    event.preventDefault();
                    const drag = readTreasureDrag(event);
                    if (drag) placeTreasureIcon(drag, index);
                    setTreasureDropSlot(null);
                  },
                  onPointerDown: (event: any) => icon && !treasureLocked[index] && startTreasurePointerDrag(event, { icon, from: "slot", index }),
                  style: webSlotStyle(treasureLocked[index], active, !icon)
                },
                icon || "Empty"
              );
            })
          ),
          React.createElement("div", { style: { color: "#8A6B20", fontSize: 12, fontWeight: 900, lineHeight: "17px", marginBottom: 12, textAlign: "center" } }, opponent === "friend" ? "Tap a treasure below and it will fill the next empty box above." : "Tap treasures into the boxes above, or drag them into place."),
          React.createElement("div", { style: { color: "#706982", fontSize: 12, fontWeight: 900, marginBottom: 8, textTransform: "uppercase" } }, opponent === "friend" ? "Step 2: Tap treasures to fill the boxes" : "Available treasures"),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 8, justifyContent: "center", marginBottom: 14 } },
            treasureIcons.map((icon) => {
              const disabled = treasureUsed.includes(icon);
              const active = treasurePointerDrag?.from === "palette" && treasurePointerDrag.icon === icon;
              return React.createElement(
                "div",
                {
                  draggable: false,
                  key: icon,
                  onClick: () => tapTreasureIcon({ icon, from: "palette" }),
                  onDragStart: (event: any) => event.preventDefault(),
                  onPointerDown: (event: any) => !disabled && startTreasurePointerDrag(event, { icon, from: "palette" }),
                  style: webTokenStyle(disabled, active)
                },
                icon
              );
            })
          ),
          React.createElement("div", { style: { color: "#8A6B20", fontSize: 12, fontWeight: 900, lineHeight: "17px", marginBottom: 12, textAlign: "center" } }, opponent === "friend" ? "Tap five treasures below. Your chosen order appears in the boxes, then the submit button will turn purple." : "Drag treasures into the boxes below, or tap a treasure to place it in the next open box."),
          treasureAttemptRows.length > 0 && React.createElement(
            "div",
            { style: { display: "grid", gap: 8, marginBottom: 12 } },
            treasureAttemptRows.map((row, rowIndex) => React.createElement(
              "div",
              { key: `treasure-attempt-${rowIndex}` },
              React.createElement("div", { style: { color: "#706982", fontSize: 11, fontWeight: 900, marginBottom: 5, textTransform: "uppercase" } }, `Try ${rowIndex + 1}`),
              React.createElement(
                "div",
                { style: { display: "flex", gap: 8, justifyContent: "center" } },
                row.map((icon, index) => React.createElement(
                  "div",
                  { key: `treasure-attempt-${rowIndex}-${index}`, style: webPastSlotStyle(icon === treasureSecret[index]) },
                  icon || "Empty"
                ))
              )
            ))
          ),
          opponent === "friend" && React.createElement(
            "label",
            { style: { color: "#6544B8", display: "block", fontSize: 13, fontWeight: 900, marginBottom: 7 } },
            "Message to your friend"
          ),
          opponent === "friend" && React.createElement(
            "textarea",
            {
              onChange: (event: any) => setTreasureNote(event.target.value),
              placeholder: "Write a short message that appears when your friend opens the chest.",
              style: {
                background: "#FFFFFF",
                border: "2px solid #BFE8E8",
                borderRadius: 8,
                color: "#30264C",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 700,
                lineHeight: "20px",
                marginBottom: 12,
                minHeight: 84,
                padding: 12,
                resize: "vertical",
                width: "100%"
              },
              value: treasureNote
            }
          ),
          React.createElement(
            "button",
            {
              disabled: treasureMissingCount > 0,
              onClick: submitTreasureGuess,
              onPointerDown: () => {
                treasurePointerDragRef.current = null;
                setTreasurePointerDrag(null);
                setTreasureDropSlot(null);
              },
              style: {
                alignItems: "center",
                background: treasureMissingCount > 0 ? "#CFC8DA" : "#7555C7",
                border: 0,
                borderRadius: 8,
                color: "#FFFFFF",
                cursor: treasureMissingCount > 0 ? "default" : "pointer",
                display: "flex",
                fontSize: 15,
                fontWeight: 900,
                gap: 8,
                justifyContent: "center",
                minHeight: 52,
                padding: "14px 16px",
                width: "100%"
              }
            },
            opponent === "friend"
              ? treasureMissingCount > 0
                ? `Choose ${treasureMissingCount} more ${treasureMissingCount === 1 ? "tile" : "tiles"}`
                : "Lock in my tiles and send"
              : treasureMissingCount > 0
                ? `Choose ${treasureMissingCount} more`
                : "Try unlocking"
          )
        );
      }
      return (
        <View>
          <Text style={styles.selectionCount}>{opponent === "friend" ? "Step 1: Your five empty boxes" : "Your order"}</Text>
          <View style={styles.treasureSlotRow}>
            {treasureGuess.map((icon, index) => (
              <Pressable
                key={`treasure-top-slot-${index}`}
                onPress={() => icon && tapTreasureIcon({ icon, from: "slot", index })}
                style={[
                  styles.treasureSlot,
                  !icon && styles.treasureSlotEmpty,
                  treasureLocked[index] && styles.treasureSlotCorrect
                ]}
              >
                <Text style={[styles.treasureTokenText, !icon && styles.treasureEmptySlotText]}>{icon || "Empty"}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.treasurePlacementHint}>
            {opponent === "friend"
              ? "Tap a treasure below and it will fill the next empty box above."
              : "Tap treasures into the boxes above, or drag them into place."}
          </Text>
          <Text style={styles.selectionCount}>{opponent === "friend" ? "Step 2: Tap treasures to fill the boxes" : "Available treasures"}</Text>
          <View style={styles.treasureTokenGrid}>
            {treasureIcons.map((icon) => {
              const disabled = treasureUsed.includes(icon);
              return (
                <Pressable
                  disabled={disabled}
                  key={icon}
                  onPress={() => tapTreasureIcon({ icon, from: "palette" })}
                  style={[styles.treasureToken, disabled && styles.treasureTokenDisabled]}
                >
                  <Text style={styles.treasureTokenText}>{icon}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.treasurePlacementHint}>
            {opponent === "friend"
              ? "Tap five treasures below. Your chosen order appears in the boxes, then the submit button will turn purple."
              : "Drag treasures into the boxes below, or tap a treasure to place it in the next open box."}
          </Text>
          {treasureAttemptRows.length > 0 && (
            <View style={styles.treasureAttemptList}>
              {treasureAttemptRows.map((row, rowIndex) => (
                <View key={`treasure-attempt-${rowIndex}`} style={styles.treasureAttemptBlock}>
                  <Text style={styles.selectionCount}>Try {rowIndex + 1}</Text>
                  <View style={styles.treasureSlotRow}>
                    {row.map((icon, index) => {
                      const correct = icon === treasureSecret[index];
                      return (
                        <View
                          key={`treasure-attempt-${rowIndex}-${index}`}
                          style={[
                            styles.treasurePastSlot,
                            correct && styles.treasurePastSlotCorrect
                          ]}
                        >
                          <Text style={styles.treasurePastSlotText}>{icon || "Empty"}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
          {opponent === "friend" && (
            <View style={styles.treasureMessageCard}>
              <Text style={styles.treasureMessageLabel}>Message to your friend</Text>
              <TextInput
                accessibilityLabel="Message to friend"
                multiline
                onChangeText={setTreasureNote}
                placeholder="Write a short message that appears when your friend opens the chest."
                placeholderTextColor="#9A93AA"
                style={styles.treasureMessageInput}
                textAlignVertical="top"
                value={treasureNote}
              />
            </View>
          )}
          <Pressable
            disabled={treasureMissingCount > 0}
            onPress={submitTreasureGuess}
            style={[styles.primaryButton, treasureMissingCount > 0 && styles.disabledButton]}
          >
            <Ionicons color="#FFFFFF" name={opponent === "friend" ? "send-outline" : "key-outline"} size={18} />
            <Text style={styles.primaryButtonText}>
              {opponent === "friend"
                ? treasureMissingCount > 0
                  ? `Choose ${treasureMissingCount} more ${treasureMissingCount === 1 ? "tile" : "tiles"}`
                  : "Lock in my tiles and send"
                : treasureMissingCount > 0
                  ? `Choose ${treasureMissingCount} more`
                  : "Try unlocking"}
            </Text>
          </Pressable>
        </View>
      );
    };

    return (
      <View>
        <ChallengePageHeader
          eyebrow="Challenge 1 · Treasure Chest"
          title={invitedTreasureSender ? `${invitedTreasureSender}'s Treasure Chest` : "Treasure Chest"}
          subtitle={invitedTreasureSender ? "Your friend hid five treasures. Guess the order in four tries, then create an account if you want to invite friends too." : "Try a friend's treasure challenge or play the computer. Arrange the five treasures in the hidden order. You have four tries."}
        />
        <IntuitionSkillFocus
          skills="Pattern sensing, working memory, patience, and trusting an initial arrangement before revising it"
          explanation="Notice how your first arrangement compares with later guesses. Pay attention to which choices feel calm and clear versus rushed or overly analytical."
        />
        <View style={styles.treasureSplitLayout}>
          <View style={styles.treasureControlPanel}>
        {treasureFlowStep === "choose" && (
          <View style={styles.treasureModeGrid}>
            <Pressable
              onPress={() => chooseTreasureMode("friend")}
              style={styles.treasureModeCard}
            >
              <Ionicons color="#7555C7" name="people-outline" size={28} />
              <Text style={styles.treasureModeTitle}>Play a friend</Text>
              <Text style={styles.treasureModeText}>Add their email, arrange your five treasure tiles, then send the challenge.</Text>
            </Pressable>
            <Pressable
              onPress={() => chooseTreasureMode("computer")}
              style={styles.treasureModeCard}
            >
              <Ionicons color="#008A94" name="desktop-outline" size={28} />
              <Text style={styles.treasureModeTitle}>Play computer</Text>
              <Text style={styles.treasureModeText}>The computer hides the treasure order and you try to unlock it.</Text>
            </Pressable>
          </View>
        )}
        {treasureFlowStep !== "choose" && (
          <View style={styles.opponentToggle}>
            <Pressable
              onPress={() => chooseTreasureMode("friend")}
              style={[styles.opponentOption, opponent === "friend" && styles.opponentOptionSelected]}
            >
              <Ionicons color={opponent === "friend" ? "#FFFFFF" : "#6544B8"} name="people-outline" size={19} />
              <Text style={[styles.opponentOptionText, opponent === "friend" && styles.opponentOptionTextSelected]}>Play with friend</Text>
            </Pressable>
            <Pressable
              onPress={() => chooseTreasureMode("computer")}
              style={[styles.opponentOption, opponent === "computer" && styles.opponentOptionSelected]}
            >
              <Ionicons color={opponent === "computer" ? "#FFFFFF" : "#6544B8"} name="desktop-outline" size={19} />
              <Text style={[styles.opponentOptionText, opponent === "computer" && styles.opponentOptionTextSelected]}>Play computer</Text>
            </Pressable>
          </View>
        )}
        {treasureFlowStep !== "choose" && opponent === "friend" && !treasureStarted && (
          <View>
            <Text style={styles.inputLabel}>Friend connection</Text>
            <TextInput
              accessibilityLabel="Friend name"
              autoCapitalize="words"
              onChangeText={(value) => {
                setFriendName(value);
                setFriendPhoneError("");
              }}
              placeholder="Friend's name"
              placeholderTextColor="#9A93AA"
              style={styles.birthdateInput}
              value={friendName}
            />
            <TextInput
              accessibilityLabel="Friend phone number"
              keyboardType="phone-pad"
              onChangeText={(value) => {
                setFriendPhone(formatFriendPhone(value));
                setFriendPhoneError("");
              }}
              placeholder="Phone number optional"
              placeholderTextColor="#9A93AA"
              style={styles.birthdateInput}
              value={friendPhone}
            />
            <TextInput
              accessibilityLabel="Friend email address"
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={(value) => {
                setFriendEmail(value);
                setFriendPhoneError("");
              }}
              placeholder="Friend email for invite (required)"
              placeholderTextColor="#9A93AA"
              style={styles.birthdateInput}
              value={friendEmail}
            />
            <Text style={styles.savedFriendsLabel}>Email is required so they can receive the challenge. Phone number is optional.</Text>
            <Text style={styles.treasureCompetitionRules}>Competition rules: invite up to five people. With two players, fewest tries wins. With three or more, fastest solve wins and fewer tries breaks a tie.</Text>
            {friendPhoneError ? <Text style={styles.inputError}>{friendPhoneError}</Text> : null}
            <Pressable
              accessibilityLabel="Save friend and continue to treasure tiles"
              disabled={!friendName.trim() || !friendEmail.trim()}
              onPress={saveTreasureFriendAndContinue}
              style={[styles.primaryButton, (!friendName.trim() || !friendEmail.trim()) && styles.disabledButton]}
            >
              <Ionicons color="#FFFFFF" name="person-add-outline" size={18} />
              <Text style={styles.primaryButtonText}>Save this friend</Text>
            </Pressable>
            {pendingTreasureFriend && (
              <View style={styles.friendPlayConfirmation}>
                <Ionicons color="#6544B8" name="people-circle-outline" size={30} />
                <Text style={styles.friendPlayConfirmationTitle}>Would you like to play {pendingTreasureFriend.contact.name}?</Text>
                <Text style={styles.friendPlayConfirmationText}>{pendingTreasureFriend.contact.email}</Text>
                <Pressable
                  onPress={() => {
                    startTreasureChallenge("friend", pendingTreasureFriend.nextSelected, pendingTreasureFriend.nextSaved);
                    setPendingTreasureFriend(null);
                  }}
                  style={styles.primaryButton}
                >
                  <Ionicons color="#FFFFFF" name="checkmark-circle-outline" size={18} />
                  <Text style={styles.primaryButtonText}>Yes, play {pendingTreasureFriend.contact.name}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setPendingTreasureFriend(null);
                    setShowSavedFriends(true);
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Choose someone else</Text>
                </Pressable>
              </View>
            )}
            {savedFriends.length > 0 && (
              <View>
                <Text style={styles.savedFriendsLabel}>Optional: choose someone from your saved friends</Text>
                <Pressable
                  accessibilityLabel="Open saved friends"
                  onPress={() => setShowSavedFriends((current) => !current)}
                  style={styles.savedFriendsDropdownButton}
                >
                  <View style={styles.savedFriendsDropdownTitle}>
                    <Ionicons color="#6544B8" name="folder-open-outline" size={18} />
                    <Text style={styles.savedFriendsLabel}>{showSavedFriends ? "Hide saved friends" : `Open saved friends (${savedFriends.length})`}</Text>
                  </View>
                  <Ionicons color="#6544B8" name={showSavedFriends ? "chevron-up-outline" : "chevron-down-outline"} size={18} />
                </Pressable>
                {showSavedFriends && (
                <View style={styles.friendChipGrid}>
                  {savedFriends.map((friend) => {
                    const friendKey = getFriendKey(friend);
                    const selected = selectedFriendPhones.includes(friendKey);
                    return (
                      <Pressable
                        accessibilityLabel={`Select friend ${friend.name}`}
                        key={friendKey}
                        onPress={() => {
                          setFriendPhoneError("");
                          setPendingTreasureFriend(null);
                          setSelectedFriendPhones((current) => current.includes(friendKey)
                            ? current.filter((item) => item !== friendKey)
                            : current.length >= 5
                              ? current
                              : [...current, friendKey]);
                          if (!selected && selectedFriendPhones.length >= 5) {
                            setFriendPhoneError("You can invite up to five people to one competition.");
                          }
                        }}
                        style={[styles.friendChip, selected && styles.friendChipSelected]}
                      >
                        <Ionicons color={selected ? "#FFFFFF" : "#7555C7"} name={selected ? "checkmark-circle" : "person-add-outline"} size={16} />
                        <View style={styles.friendChipCopy}>
                          <Text style={[styles.friendChipText, selected && styles.friendChipTextSelected]}>{friend.name}</Text>
                          <Text style={[styles.friendChipDetail, selected && styles.friendChipTextSelected]}>{formatFriendContactDetail(friend)}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                )}
                <Text style={styles.selectedFriendsCount}>{selectedFriendPhones.length} of 5 people selected</Text>
              </View>
            )}
            {friendInviteStatus ? <Text style={styles.inviteStatus}>{friendInviteStatus}</Text> : null}
            {sentTreasureChallenges.length > 0 && (
              <View style={styles.treasureStatusList}>
                <Text style={styles.treasureStatusHeading}>Your sent chests</Text>
                {sentTreasureChallenges.slice(0, 5).map((challenge) => (
                  <View key={challenge.id} style={styles.treasureStatusRow}>
                    <Text style={styles.treasureStatusFriend}>{challenge.friendName || challenge.friendEmail}</Text>
                    <View style={styles.treasureStatusScore}>
                      <Text style={styles.treasureStatusBadge}>{formatTreasureStatus(challenge.status)}</Text>
                      {challenge.emailDeliveryStatus ? (
                        <Text style={[styles.treasureStatusDetail, isEmailDeliveryProblem(challenge.emailDeliveryStatus) && styles.treasureStatusDeliveryProblem]}>
                          {formatEmailDeliveryStatus(challenge.emailDeliveryStatus)}
                        </Text>
                      ) : null}
                      {challenge.attempts ? <Text style={styles.treasureStatusDetail}>{challenge.attempts} {challenge.attempts === 1 ? "try" : "tries"}{challenge.rank ? ` · #${challenge.rank} of ${challenge.playerCount}` : ""}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        {treasureFlowStep === "choose" || pendingTreasureFriend ? null : !treasureStarted || treasureWinText ? (
          <Pressable
            disabled={opponent === "friend" && selectedFriendPhones.length === 0 && !treasureWinText}
            onPress={() => startTreasureChallenge(opponent)}
            style={[
              styles.primaryButton,
              opponent === "friend" && selectedFriendPhones.length === 0 && !treasureWinText && styles.disabledButton
            ]}
          >
            <Ionicons color="#FFFFFF" name={opponent === "friend" ? "send-outline" : "sparkles-outline"} size={18} />
            <Text style={styles.primaryButtonText}>
              {treasureWinText ? "Play again" : opponent === "friend" ? "Continue with selected friend" : "Start computer game"}
            </Text>
          </Pressable>
        ) : (
          renderTreasurePlacementControls()
        )}
          </View>
          <View style={styles.treasurePreviewPanel}>
            <ImageBackground source={treasureSceneImage} resizeMode="stretch" style={treasureSceneStyle} imageStyle={styles.treasureSceneImage}>
         <View style={styles.treasureSceneShade} />
         <View style={styles.realTreasureChestWrap}>
           <View style={styles.realTreasureShadow} />
           <Image
             accessibilityLabel={treasureWon ? "Open treasure chest" : "Closed treasure chest"}
             resizeMode="contain"
             source={treasureWon ? treasureChestOpenImage : treasureChestClosedImage}
                  style={styles.realTreasureChestImage}
                />
                {renderRealTreasureGlow()}
              </View>
              {renderTreasureInspirationBurst()}
            </ImageBackground>
            <View style={styles.treasureChestCard}>
              <Ionicons color={treasureLost ? "#6544B8" : "#8A6B20"} name={treasureLost ? "lock-closed-outline" : treasureWon ? "gift-outline" : "sparkles-outline"} size={34} />
              <Text style={styles.treasureChestTitle}>
                {treasureWinText || (treasureStarted ? `${treasureCorrect} of 5 treasures in the right spot` : "Start a treasure challenge")}
              </Text>
              {treasureWon && (
                <Text style={styles.treasurePointsText}>
                  {Number(answers["friend-points"] || 0)} of {dailyPointWeights.friend} points earned
                </Text>
              )}
              <Text style={styles.treasureChestText}>
                {treasureStarted
                  ? invitedTreasureSender
                    ? `You are answering ${invitedTreasureSender}'s hidden treasure order. You have ${treasureTriesLeft} ${treasureTriesLeft === 1 ? "try" : "tries"} left.`
                    : opponent === "friend"
                      ? "Tap five treasures into your order, then submit those tiles for your friend to answer."
                      : `${treasureTriesLeft} ${treasureTriesLeft === 1 ? "try" : "tries"} left. Tap treasures into the boxes below.`
                  : opponent === "friend"
                    ? "Create a standalone Treasure Chest challenge for a friend, or try the flow here first."
                    : "The computer will hide the order for you to solve."}
              </Text>
              {treasureResponseStatus ? <Text style={styles.treasureResponseStatus}>{treasureResponseStatus}</Text> : null}
            </View>
            {treasureWon && (
              <View style={styles.treasureFriendMessageCard}>
                <View style={styles.treasureFriendMessageHeader}>
                  <Ionicons color="#6544B8" name="chatbubble-ellipses-outline" size={20} />
                  <Text style={styles.treasureFriendMessageTitle}>
                    {invitedTreasureSender ? `${invitedTreasureSender}'s message` : opponent === "friend" ? "Message for your friend" : "Treasure message"}
                  </Text>
                </View>
                <Text style={styles.treasureNoteText}>{treasureInspirationMessage}</Text>
              </View>
            )}
            {invitedTreasureSender && treasureResponseStatus && (
              <View style={styles.treasureSiteInviteCard}>
                <View style={styles.treasureFriendMessageHeader}>
                  <Ionicons color="#008A94" name="sparkles-outline" size={22} />
                  <Text style={styles.treasureSiteInviteTitle}>Create your own Treasure Chest</Text>
                </View>
                <Text style={styles.treasureSiteInviteText}>
                  To make a challenge and send it back to {invitedTreasureSender}, or invite someone else, create your free Intuisity account first.
                </Text>
                <Pressable onPress={onLogout} style={styles.treasureSiteInviteButton}>
                  <Ionicons color="#FFFFFF" name="person-add-outline" size={18} />
                  <Text style={styles.primaryButtonText}>Create account to send my own</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.prototypeNote}>
          Treasure Chest is Challenge 1. Invited friends can play from the email link without creating an account.
        </Text>
      </View>
    );

    if (computerResult) {
      const match = predictedPowerWord === computerPowerWord;
      const computerWordMeaning = computerPowerWord ? getPowerWordMeaning(String(computerPowerWord)) : "";
      return (
        <View>
          <ChallengePageHeader
            eyebrow="Challenge 1 · Social Challenge Results"
            title={match ? "You found today's power word!" : "The computer chose a different word"}
            subtitle={match ? "Your intuition matched the computer's hidden power word." : "Notice which word first called to you and keep practicing."}
          />
          <View style={[styles.pendingPanel, match && styles.computerWinPanel]}>
            <Ionicons color={match ? "#239963" : "#7555C7"} name={match ? "trophy-outline" : "sparkles-outline"} size={42} />
            <Text style={styles.pendingTitle}>{match ? "You got it right" : "Try again tomorrow"}</Text>
            <Text style={styles.pendingText}>
              {match ? "This correct prediction has been added to your daily score." : "Compare the two words and notice which one first called to your intuition."}
            </Text>
          </View>
          <View style={styles.powerResultRow}>
            <View style={[styles.powerResult, match && styles.powerResultMatch]}>
              <Text style={styles.practiceLabel}>Your prediction</Text>
              <Text style={styles.powerResultWord}>{predictedPowerWord}</Text>
            </View>
            <View style={[styles.powerResult, match && styles.powerResultMatch]}>
              <Text style={styles.practiceLabel}>Computer chose</Text>
              <Text style={styles.powerResultWord}>{computerPowerWord}</Text>
            </View>
          </View>
          <View style={styles.powerWordMeaning}>
            <Ionicons color="#7555C7" name="sunny-outline" size={28} />
            <Text style={styles.powerWordMeaningLabel}>Today's inspiration</Text>
            <Text style={styles.powerWordMeaningTitle}>{computerPowerWord}</Text>
            <Text style={styles.powerWordMeaningText}>{computerWordMeaning}</Text>
          </View>
          <Pressable onPress={resetKnowing} style={styles.primaryButton}>
            <Ionicons color="#FFFFFF" name="checkmark-circle-outline" size={18} />
            <Text style={styles.primaryButtonText}>Continue to Challenge 2</Text>
          </Pressable>
        </View>
      );
    }

    if (friendStep === "pending") {
      const predicted = friendPictures.find((picture) => picture.id === predictedPicture);
      const friendMatches = Number(answers["friend-score"] || 0);
      const friendMaximum = Number(answers["friend-maximum"] || selectedFriendPhones.length || 1);
      return (
        <View>
          <ChallengePageHeader
            eyebrow="Challenge 1 · Social Challenge"
            title="Your results are sealed"
            subtitle={`The result will be revealed on ${revealLabel}.`}
          />
          <View style={styles.pendingPanel}>
            <Ionicons color={friendMatches ? "#239963" : "#7555C7"} name={friendMatches ? "trophy-outline" : "time-outline"} size={42} />
            <Text style={styles.pendingTitle}>
              {friendMatches
                ? `${calculateModulePoints(friendMatches, friendMaximum, dailyPointWeights.friend)} of ${dailyPointWeights.friend} points earned`
                : "Waiting for tomorrow"}
            </Text>
            <Text style={styles.pendingText}>
              {friendMatches
                ? `${friendMatches} ${friendMatches === 1 ? "friend matched" : "friends matched"} your prediction. The friend challenge can earn up to ${dailyPointWeights.friend} daily points.`
                : "Your prediction and your friends' choices are safely recorded. Come back tomorrow to continue building your score."}
            </Text>
          </View>
          <View style={styles.sealedRow}>
            <View style={styles.sealedItem}>
              <Text style={styles.practiceLabel}>Your prediction</Text>
              <Image source={predicted?.source} style={styles.sealedImage} resizeMode="cover" />
            </View>
            <View style={styles.sealedItem}>
              <Text style={styles.practiceLabel}>Friend's choice</Text>
              <View style={styles.hiddenChoice}>
                <Ionicons color="#FFFFFF" name="lock-closed-outline" size={28} />
              </View>
            </View>
          </View>
          <Pressable onPress={resetKnowing} style={styles.primaryButton}>
            <Ionicons color="#FFFFFF" name="checkmark-circle-outline" size={18} />
            <Text style={styles.primaryButtonText}>Continue to Challenge 2</Text>
          </Pressable>
        </View>
      );
    }

    if (friendStep === "friend-choice") {
      return (
        <View>
          <ChallengePageHeader
            eyebrow="Challenge 1 · Friend View Preview"
            title="Which picture do you choose?"
            subtitle={`Invitation preview for ${selectedFriendPhones.length} ${selectedFriendPhones.length === 1 ? "friend" : "friends"}. Follow your first impression and choose one picture.`}
          />
          <PictureGrid
            columns={3}
            pictures={friendPictures}
            selectedId={friendPicture}
            onSelect={setFriendPicture}
          />
          <View style={styles.answerNavigation}>
            <Pressable
              accessibilityLabel="Go back"
              onPress={() => {
                setFriendPicture(null);
                setFriendStep("predict");
              }}
              style={styles.answerNavButton}
            >
              <Ionicons color="#6544B8" name="arrow-back-outline" size={22} />
              <Text style={styles.answerNavText}>Back</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Return home"
              onPress={() => setPage("hub")}
              style={styles.answerNavButton}
            >
              <Ionicons color="#6544B8" name="home-outline" size={22} />
              <Text style={styles.answerNavText}>Home</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Seal choice and continue"
              disabled={!friendPicture}
              onPress={() => {
                const matches = predictedPicture === friendPicture ? selectedFriendPhones.length : 0;
                setAnswers((current) => ({
                  ...current,
                  "social-prediction": "Completed",
                  "friend-score": String(matches),
                  "friend-points": String(calculateModulePoints(matches, selectedFriendPhones.length || 1, dailyPointWeights.friend)),
                  "friend-maximum": String(selectedFriendPhones.length)
                }));
                setFriendStep("pending");
              }}
              style={[
                styles.answerNavButton,
                styles.answerNavForward,
                !friendPicture && styles.disabledButton
              ]}
            >
              <Ionicons color="#FFFFFF" name="arrow-forward-outline" size={22} />
              <Text style={styles.answerNavForwardText}>Forward</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View>
        <ChallengePageHeader
          eyebrow="Challenge 1 · Social Challenge"
          title={opponent === "friend" ? "Predict what your friend will choose" : "Pick today's power word"}
          subtitle={opponent === "friend" ? "Choose the picture you believe your friend will pick, then send them the challenge." : "Which of these five power words do you believe the computer secretly selected?"}
        />
        <View style={styles.opponentToggle}>
          <Pressable
            onPress={() => setOpponent("friend")}
            style={[styles.opponentOption, opponent === "friend" && styles.opponentOptionSelected]}
          >
            <Ionicons color={opponent === "friend" ? "#FFFFFF" : "#6544B8"} name="people-outline" size={19} />
            <Text style={[styles.opponentOptionText, opponent === "friend" && styles.opponentOptionTextSelected]}>Play with friend</Text>
          </Pressable>
          <Pressable
            onPress={() => setOpponent("computer")}
            style={[styles.opponentOption, opponent === "computer" && styles.opponentOptionSelected]}
          >
            <Ionicons color={opponent === "computer" ? "#FFFFFF" : "#6544B8"} name="desktop-outline" size={19} />
            <Text style={[styles.opponentOptionText, opponent === "computer" && styles.opponentOptionTextSelected]}>Play with computer</Text>
          </Pressable>
        </View>
        {opponent === "friend" && (
          <View>
            <Text style={styles.inputLabel}>Invite up to 5 friends</Text>
            <TextInput
              accessibilityLabel="Friend name"
              autoCapitalize="words"
              onChangeText={(value) => {
                setFriendName(value);
                setFriendPhoneError("");
              }}
              placeholder="Friend's name"
              placeholderTextColor="#9A93AA"
              style={styles.birthdateInput}
              value={friendName}
            />
            <View style={styles.friendPhoneRow}>
              <TextInput
                accessibilityLabel="Friend phone number"
                keyboardType="phone-pad"
                onChangeText={(value) => {
                  setFriendPhone(formatFriendPhone(value));
                  setFriendPhoneError("");
                }}
                onSubmitEditing={addFriendPhone}
                placeholder="(555) 555-5555"
                placeholderTextColor="#9A93AA"
                style={[styles.birthdateInput, styles.friendPhoneInput]}
                value={friendPhone}
              />
              <Pressable
                accessibilityLabel="Add friend phone number"
                disabled={!friendName.trim() || !friendPhone.trim() || selectedFriendPhones.length >= 5}
                onPress={addFriendPhone}
                style={[styles.addFriendButton, (!friendName.trim() || !friendPhone.trim() || selectedFriendPhones.length >= 5) && styles.disabledButton]}
              >
                <Ionicons color="#FFFFFF" name="add" size={24} />
              </Pressable>
            </View>
            {friendPhoneError ? <Text style={styles.inputError}>{friendPhoneError}</Text> : null}
            {savedFriends.length > 0 && (
              <View>
                <Text style={styles.savedFriendsLabel}>Saved friends · tap to select</Text>
                <View style={styles.friendChipGrid}>
                  {savedFriends.map((friend) => {
                    const friendKey = getFriendKey(friend);
                    const selected = selectedFriendPhones.includes(friendKey);
                    return (
                      <Pressable
                        accessibilityLabel={`Select friend ${friend.name}`}
                        key={friendKey}
                        onPress={() => {
                          setFriendPhoneError("");
                          setSelectedFriendPhones((current) => {
                            if (current.includes(friendKey)) return current.filter((item) => item !== friendKey);
                            if (current.length >= 5) {
                              setFriendPhoneError("You can invite up to 5 friends at a time.");
                              return current;
                            }
                            return [...current, friendKey];
                          });
                        }}
                        style={[styles.friendChip, selected && styles.friendChipSelected]}
                      >
                        <Ionicons color={selected ? "#FFFFFF" : "#7555C7"} name={selected ? "checkmark-circle" : "person-add-outline"} size={16} />
                        <View style={styles.friendChipCopy}>
                          <Text style={[styles.friendChipText, selected && styles.friendChipTextSelected]}>{friend.name}</Text>
                          <Text style={[styles.friendChipDetail, selected && styles.friendChipTextSelected]}>{formatFriendContactDetail(friend)}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
            <Text style={styles.selectedFriendsCount}>{selectedFriendPhones.length} of 5 friends selected</Text>
          </View>
        )}
        <Text style={styles.selectionCount}>
          {opponent === "friend" ? "Choose your prediction" : "Choose the word that calls to you"}
        </Text>
        {opponent === "friend" ? (
          <PictureGrid
            columns={3}
            pictures={friendPictures}
            selectedId={predictedPicture}
            onSelect={setPredictedPicture}
          />
        ) : (
          <View style={styles.powerWordGrid}>
            {dailyPowerWords.map((word) => (
              <Pressable
                key={word}
                onPress={() => setPredictedPowerWord(word)}
                style={[
                  styles.powerWordChoice,
                  predictedPowerWord === word && styles.powerWordChoiceSelected
                ]}
              >
                <Ionicons
                  color={predictedPowerWord === word ? "#FFFFFF" : "#7555C7"}
                  name="sparkles-outline"
                  size={19}
                />
                <Text
                  style={[
                    styles.powerWordText,
                    predictedPowerWord === word && styles.powerWordTextSelected
                  ]}
                >
                  {word}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <Pressable
          disabled={
            opponent === "friend"
              ? !predictedPicture || selectedFriendPhones.length === 0
              : !predictedPowerWord
          }
          onPress={() => {
            if (opponent === "computer") {
              const computerPick =
                dailyPowerWords[Math.floor(Math.random() * dailyPowerWords.length)];
              setComputerPowerWord(computerPick);
              setComputerResult(true);
              setAnswers((current) => ({
                ...current,
                "social-prediction": "Completed",
                "friend-score": predictedPowerWord === computerPick ? "1" : "0",
                "friend-points": String(calculateModulePoints(predictedPowerWord === computerPick ? 1 : 0, 1, dailyPointWeights.friend)),
                "friend-maximum": "1"
              }));
              return;
            }
            setFriendStep("friend-choice");
          }}
          style={[
            styles.primaryButton,
            (opponent === "friend"
              ? !predictedPicture || selectedFriendPhones.length === 0
              : !predictedPowerWord) && styles.disabledButton
          ]}
        >
          <Ionicons color="#FFFFFF" name={opponent === "friend" ? "send-outline" : "sparkles-outline"} size={18} />
          <Text style={styles.primaryButtonText}>
            {opponent === "friend"
              ? selectedFriendPhones.length
                ? `Send to ${selectedFriendPhones.length} ${selectedFriendPhones.length === 1 ? "friend" : "friends"}`
                : "Select friends to invite"
              : "Reveal today's power word"}
          </Text>
        </Pressable>
        {opponent === "friend" && (
          <Text style={styles.prototypeNote}>
            Prototype note: this previews the friend's invitation screen. Sending a real text-message invitation requires connecting an SMS service and app download link.
          </Text>
        )}
      </View>
    );
  }

  if (page === "remote-viewing-test") {
    const roundTarget = remoteTargets[remoteRound];
    const choices = roundTarget.choices || [roundTarget.target, roundTarget.decoy];
    const selectedCorrectly = remoteChoice === roundTarget.target.id;
    return (
      <View>
        <ChallengePageHeader
          eyebrow={`Challenge 6 · Test ${remoteRound + 1} of 3`}
          title="Remote Viewing Challenge"
          compact={remotePhase !== "sense"}
          subtitle={
            remotePhase === "sense"
              ? "Imagine which image is waiting on the next page, then draw your first ideas."
              : "Which picture best matches the impressions you received?"
          }
        />
        <IntuitionSkillFocus
          skills="Sensory imagery, open-ended perception, and recording impressions before seeing possible answers"
          explanation="Practice noticing basic shapes, colors, textures, movement, temperature, and mood without forcing them into a complete story."
        />
        <Text style={styles.progressLabel}>{remoteRound} of 3 tests completed</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(remoteRound / 3) * 100}%` }]} />
        </View>

        {remotePhase === "sense" ? (
          <View>
            <View style={styles.remoteInstructionCard}>
              <Ionicons color="#7555C7" name="pencil-outline" size={22} />
              <Text style={styles.remoteInstructionText}>
                Imagine which image is showing on the next page. Draw your ideas before you see the choices. It is great to start with basic shapes, lines, colors, textures, or the first feeling that comes to mind.
              </Text>
            </View>
            <DrawingPad points={drawingPoints} setPoints={setDrawingPoints} />
            <View style={styles.drawingActions}>
              <Pressable onPress={() => setDrawingPoints([])} style={[styles.secondaryButton, styles.drawingActionButton]}>
                <Ionicons color="#FFFFFF" name="trash-outline" size={17} />
                <Text style={styles.secondaryButtonText}>Clear drawing</Text>
              </Pressable>
              <Pressable onPress={() => setRemotePhase("choose")} style={[styles.primaryButton, styles.drawingActionButton]}>
                <Text style={styles.primaryButtonText}>Reveal two choices</Text>
                <Ionicons color="#FFFFFF" name="arrow-forward-outline" size={18} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.remoteAnswerStage}>
            <PictureGrid
              compact
              pictures={choices}
              selectedId={remoteChoice}
              correctId={roundTarget.target.id}
              showResult={remotePhase === "result"}
              onSelect={(id) => {
                if (remotePhase === "result") return;
                setRemoteChoice(id);
                if (id === roundTarget.target.id) setRemoteCorrect((current) => current + 1);
                setRemotePhase("result");
              }}
            />
            {remotePhase === "result" && (
              <View style={[styles.message, styles.remoteResultCompact, selectedCorrectly && styles.remoteSuccess]}>
                <Text style={[styles.messageTitle, styles.remoteResultTitleCompact]}>
                  {selectedCorrectly ? "Great job!" : "Keep following your impressions"}
                </Text>
                <Text style={[styles.messageText, styles.remoteResultTextCompact]}>
                  {selectedCorrectly
                    ? "Your remote viewing impressions matched the hidden target."
                  : `The hidden target was ${roundTarget.target.label}.`}
                </Text>
              </View>
            )}
            {remotePhase === "result" && (
              <Pressable
                onPress={() => {
                  if (remoteRound === 2) {
                    setAnswers((current) => ({
                      ...current,
                      "remote-viewing-test": "Completed",
                      "remote-viewing-score": String(remoteCorrect)
                    }));
                    setPage("remote-viewing-results");
                  } else {
                    setRemoteRound((current) => current + 1);
                    setRemoteChoice(null);
                    setDrawingPoints([]);
                    setRemotePhase("sense");
                  }
                }}
                style={[styles.primaryButton, styles.remoteNextButtonCompact]}
              >
                <Text style={styles.primaryButtonText}>
                  {remoteRound === 2 ? "See remote viewing results" : "Begin next test"}
                </Text>
                <Ionicons color="#FFFFFF" name="arrow-forward-outline" size={18} />
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  }

  if (page === "remote-viewing-results") {
    return (
      <View>
        <ChallengePageHeader
          eyebrow="Remote Viewing Complete"
          title={`${remoteCorrect} of 3 targets matched`}
          subtitle="Notice which impressions helped you recognize the hidden targets."
        />
        <View style={styles.resultsPanel}>
          <Ionicons color="#7555C7" name="radio-outline" size={42} />
          <Text style={styles.resultsNumber}>{remoteCorrect}/3</Text>
          <Text style={styles.resultsPoints}>{calculateModulePoints(remoteCorrect, 3, dailyPointWeights.remoteViewing)} of {dailyPointWeights.remoteViewing} points added to today's score</Text>
        </View>
        <Pressable onPress={() => setPage("daily-results")} style={styles.primaryButton}>
          <Ionicons color="#FFFFFF" name="trophy-outline" size={18} />
          <Text style={styles.primaryButtonText}>View final daily results</Text>
        </Pressable>
      </View>
    );
  }

  if (page === "daily-results") {
    const knowingScore = Number(answers["knowing-score"] || 0);
    const learningCommitmentScore = Number(answers["learning-commitment-score"] || 0);
    const learningFollowupScore = Number(answers["learning-followup-score"] || 0);
    const learningScore = learningCommitmentScore + learningFollowupScore;
    const personScore = Number(answers["person-score"] || 0);
    const astrologyScore = answers["psychic-potential-score"] === "Completed" ? 1 : 0;
    const friendScore = Number(answers["friend-score"] || 0);
    const friendMaximum = Number(answers["friend-maximum"] || 1);
    const friendPoints = Number(answers["friend-points"] || calculateModulePoints(friendScore, friendMaximum, dailyPointWeights.friend));
    const friendPending =
      answers["social-prediction"] === "Completed" &&
      !Object.prototype.hasOwnProperty.call(answers, "friend-score");
    const remoteViewingScore = Number(answers["remote-viewing-score"] || 0);
    const completedChallengeCount = [
      answers["social-prediction"] === "Completed",
      Object.prototype.hasOwnProperty.call(answers, "knowing-score"),
      answers["remote-viewing-arena"] === "Completed" ||
        Object.prototype.hasOwnProperty.call(answers, "learning-commitment-score") ||
        Object.prototype.hasOwnProperty.call(answers, "learning-followup-score"),
      Object.prototype.hasOwnProperty.call(answers, "person-score"),
      answers["psychic-potential-score"] === "Completed",
      Object.prototype.hasOwnProperty.call(answers, "remote-viewing-score")
    ].filter(Boolean).length;
    const dailyCreditEarned = completedChallengeCount > 0;
    const personalTotal =
      knowingScore + learningScore + personScore + astrologyScore + friendScore + remoteViewingScore;
    const maximumScore = 16 + friendMaximum;
    const scoreRows = [
      {
        label: "Challenge 1: Treasure Chest",
        score: friendScore,
        maximum: friendMaximum,
        points: friendPoints,
        possiblePoints: dailyPointWeights.friend,
        pending: friendPending
      },
      {
        label: "Challenge 2: Train Your Knowing",
        score: knowingScore,
        maximum: 5,
        points: calculateModulePoints(knowingScore, 5, dailyPointWeights.knowing),
        possiblePoints: dailyPointWeights.knowing
      },
      {
        label: "Challenge 3: Positivity Practice",
        score: learningScore,
        maximum: 2,
        points: calculateModulePoints(learningScore, 2, dailyPointWeights.learning),
        possiblePoints: dailyPointWeights.learning
      },
      {
        label: "Challenge 4: Read the Person",
        score: personScore,
        maximum: personMaximumScore,
        points: calculateModulePoints(personScore, personMaximumScore, dailyPointWeights.person),
        possiblePoints: dailyPointWeights.person
      },
      {
        label: "Challenge 5: Daily Astrology Tips",
        score: astrologyScore,
        maximum: 1,
        points: calculateModulePoints(astrologyScore, 1, dailyPointWeights.astrology),
        possiblePoints: dailyPointWeights.astrology
      },
      {
        label: "Challenge 6: Remote Viewing Challenge",
        score: remoteViewingScore,
        maximum: 3,
        points: calculateModulePoints(remoteViewingScore, 3, dailyPointWeights.remoteViewing),
        possiblePoints: dailyPointWeights.remoteViewing
      }
    ];
    const totalPoints = scoreRows.reduce((sum, row) => sum + (row.pending ? 0 : row.points), 0);
    const maximumPoints = Object.values(dailyPointWeights).reduce((sum, points) => sum + points, 0);
    const community = getCommunityResults();
    const progress = saveAndSummarizeDailyResults(
      userProfile.email,
      scoreRows.map(({ label, score, maximum }) => ({ label, score, maximum })),
      personalTotal,
      maximumScore,
      dailyCreditEarned
    );
    const strongestArea = progress.strongest || {
      label: "Complete one challenge",
      percent: 0
    };
    const todayStrengths = summarizeApparentStrengths(
      scoreRows.map(({ label, score, maximum }) => ({ label, score, maximum })),
      "today"
    );
    const longTermStrengths = summarizeApparentStrengths(
      progress.modules.map((module) => ({
        label: module.label,
        score: module.totalScore,
        maximum: module.totalMaximum
      })),
      "over time"
    );

    return (
      <View>
        <ChallengePageHeader
          eyebrow="Daily challenges complete"
          title="Your daily results"
          subtitle="See your personal score and how today's Intuisity community performed."
        />
        <View style={styles.finalScoreHero}>
          <Ionicons color="#FFFFFF" name="trophy-outline" size={38} />
          <Text style={styles.finalScoreLabel}>Overall daily points</Text>
          <Text style={styles.finalScoreNumber}>{totalPoints} of {maximumPoints}</Text>
          <Text style={styles.finalScorePercent}>
            {Math.round((totalPoints / maximumPoints) * 100)}% of today's points
          </Text>
          <View style={styles.finalRawScoreCard}>
            <Text style={styles.finalRawScoreLabel}>Questions and tasks correct</Text>
            <Text style={styles.finalRawScoreValue}>{personalTotal} of {maximumScore}</Text>
          </View>
          <Text style={styles.finalCreditText}>
            {dailyCreditEarned
              ? `Daily practice credit earned · ${completedChallengeCount} of 6 challenges completed`
              : "Complete any one challenge to earn today's practice credit"}
          </Text>
        </View>

        <Text style={styles.resultsSectionTitle}>Your apparent strengths</Text>
        <View style={styles.synopsisCard}>
          <View style={styles.synopsisHeading}>
            <Ionicons color="#008A94" name="sunny-outline" size={23} />
            <Text style={styles.synopsisTitle}>Today's synopsis</Text>
          </View>
          <Text style={styles.synopsisText}>{todayStrengths}</Text>
        </View>
        <View style={[styles.synopsisCard, styles.synopsisCardLongTerm]}>
          <View style={styles.synopsisHeading}>
            <Ionicons color="#7555C7" name="analytics-outline" size={23} />
            <Text style={styles.synopsisTitle}>Your pattern over time</Text>
          </View>
          <Text style={styles.synopsisText}>{longTermStrengths}</Text>
        </View>

        <Text style={styles.resultsSectionTitle}>Challenge results and points</Text>
        <View style={styles.breakdownHeaderRow}>
          <Text style={styles.breakdownHeaderText}>Correct answers</Text>
          <Text style={styles.breakdownHeaderText}>Daily points</Text>
        </View>
        {scoreRows.map((row) => (
          <View key={row.label} style={styles.scoreBreakdownRow}>
            <View style={styles.scoreBreakdownCopy}>
              <Text style={styles.scoreBreakdownLabel}>{row.label}</Text>
              <Text style={styles.scoreBreakdownSubLabel}>
                {row.pending ? "Waiting for friend response" : `${row.score} of ${row.maximum} correct`}
              </Text>
            </View>
            <View style={styles.scoreBreakdownPointsBox}>
              <Text style={styles.scoreBreakdownValueClear}>
                {row.pending ? "Pending" : `${row.points}/${row.possiblePoints}`}
              </Text>
              <Text style={styles.scoreBreakdownPointLabel}>points</Text>
            </View>
            <Text style={styles.scoreBreakdownValue}>
              {row.pending ? "Pending" : `${row.score}/${row.maximum} · ${row.points} pts`}
            </Text>
          </View>
        ))}

        <Text style={styles.resultsSectionTitle}>Your strengths over time</Text>
        <View style={styles.strengthHero}>
          <Ionicons color="#FFFFFF" name="sparkles-outline" size={28} />
          <View style={styles.strengthHeroCopy}>
            <Text style={styles.strengthHeroLabel}>Current strongest area</Text>
            <Text style={styles.strengthHeroTitle}>{strongestArea.label}</Text>
            <Text style={styles.strengthHeroText}>
              {strongestArea.percent}% average across {progress.days} {progress.days === 1 ? "day" : "days"}
            </Text>
          </View>
        </View>
        <View style={styles.cumulativeGrid}>
          <View style={styles.cumulativeMetric}>
            <Text style={styles.cumulativeValue}>{progress.days}</Text>
            <Text style={styles.cumulativeLabel}>Days practiced</Text>
          </View>
          <View style={styles.cumulativeMetric}>
            <Text style={styles.cumulativeValue}>{progress.totalPoints}</Text>
            <Text style={styles.cumulativeLabel}>Total correct</Text>
          </View>
          <View style={styles.cumulativeMetric}>
            <Text style={styles.cumulativeValue}>{progress.averagePercent}%</Text>
            <Text style={styles.cumulativeLabel}>Overall average</Text>
          </View>
        </View>
        {progress.modules.map((module) => (
          <View key={module.label} style={styles.strengthRow}>
            <View style={styles.strengthRowTop}>
              <Text style={styles.strengthRowLabel}>{module.label}</Text>
              <Text style={styles.strengthRowValue}>{module.percent}%</Text>
            </View>
            <View style={styles.strengthTrack}>
              <View style={[styles.strengthFill, { width: `${module.percent}%` }]} />
            </View>
            <Text style={styles.strengthDetail}>
              {module.totalScore} correct out of {module.totalMaximum} opportunities
            </Text>
          </View>
        ))}

        <Text style={styles.resultsSectionTitle}>Help improve your modules</Text>
        <Text style={styles.feedbackIntro}>
          Rate how much you liked each module and share anything that would make it better.
        </Text>
        {scoreRows.map((row) => {
          const feedback = moduleFeedback[row.label] || { rating: 0, improvement: "" };
          return (
            <View key={`feedback-${row.label}`} style={styles.feedbackCard}>
              <Text style={styles.feedbackModuleTitle}>{row.label}</Text>
              <Text style={styles.feedbackPrompt}>
                How much did you like this module? {feedback.rating ? `${feedback.rating}/10` : ""}
              </Text>
              <View style={styles.starRow}>
                {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => (
                  <Pressable
                    accessibilityLabel={`Rate ${row.label} ${rating} out of 10`}
                    key={rating}
                    onPress={() => {
                      setFeedbackSaved(false);
                      setModuleFeedback((current) => ({
                        ...current,
                        [row.label]: { ...feedback, rating }
                      }));
                    }}
                    style={styles.starButton}
                  >
                    <Ionicons
                      color={rating <= feedback.rating ? "#F4B740" : "#CFC8DA"}
                      name={rating <= feedback.rating ? "star" : "star-outline"}
                      size={20}
                    />
                  </Pressable>
                ))}
              </View>
              <TextInput
                accessibilityLabel={`How could ${row.label} improve?`}
                multiline
                onChangeText={(improvement) => {
                  setFeedbackSaved(false);
                  setModuleFeedback((current) => ({
                    ...current,
                    [row.label]: { ...feedback, improvement }
                  }));
                }}
                placeholder="What could improve this module?"
                placeholderTextColor="#9A93AA"
                style={styles.feedbackInput}
                textAlignVertical="top"
                value={feedback.improvement}
              />
            </View>
          );
        })}
        <Pressable
          onPress={() => {
            saveModuleFeedback(userProfile.email, stampModuleFeedback(moduleFeedback));
            setFeedbackSaved(true);
          }}
          style={styles.primaryButton}
        >
          <Ionicons color="#FFFFFF" name="save-outline" size={18} />
          <Text style={styles.primaryButtonText}>{feedbackSaved ? "Feedback saved" : "Save my feedback"}</Text>
        </Pressable>

        <Text style={styles.resultsSectionTitle}>Today's community</Text>
        <View style={styles.communityGrid}>
          <View style={styles.communityMetric}>
            <Text style={styles.communityValue}>{community.participants.toLocaleString()}</Text>
            <Text style={styles.communityLabel}>Participants</Text>
          </View>
          <View style={styles.communityMetric}>
            <Text style={styles.communityValue}>{community.participants ? `${community.average}/${maximumPoints}` : "Not yet"}</Text>
            <Text style={styles.communityLabel}>Average score</Text>
          </View>
          <View style={styles.communityMetric}>
            <Text style={styles.communityValue}>{community.participants ? `${community.percentile}%` : "Not yet"}</Text>
            <Text style={styles.communityLabel}>Your percentile</Text>
          </View>
          <View style={styles.communityMetric}>
            <Text style={styles.communityValue}>{community.participants ? `${community.topScore}/${maximumPoints}` : "Not yet"}</Text>
            <Text style={styles.communityLabel}>Top score</Text>
          </View>
        </View>
        <View style={styles.communityComparison}>
          <Text style={styles.communityComparisonTitle}>
            {community.participants === 0
              ? "Community results will appear after real daily results are saved."
              : totalPoints >= community.average
              ? "You scored above today's community average."
              : "Today's community average gives you a goal for tomorrow."}
          </Text>
          <Text style={styles.prototypeNote}>
            This section is cleared of demo counts so it only reflects real Intuisity activity.
          </Text>
        </View>
      </View>
    );
  }

  const selected = homeChallenges.find((challenge) => challenge.id === page);
  if (selected) {
    return (
      <View>
        <ChallengePageHeader eyebrow={selected.tagline} title={selected.title} subtitle={selected.prompt} />
        <View style={styles.choiceGrid}>
          {selected.choices.map((answer) => (
            <Pressable
              key={answer}
              onPress={() => setAnswers((current) => ({ ...current, [selected.id]: answer }))}
              style={[styles.choice, answers[selected.id] === answer && styles.selectedChoice]}
            >
              <Text
                style={[styles.choiceText, answers[selected.id] === answer && styles.selectedChoiceText]}
              >
                {answer}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => setPage("hub")} style={styles.primaryButton}>
          <Ionicons color="#FFFFFF" name="checkmark-outline" size={18} />
          <Text style={styles.primaryButtonText}>Save and return</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <ChallengePageHeader
        eyebrow="Today's practice"
        title="Choose a challenge"
        subtitle="Explore awareness, synchronicity, inner knowing, astrological insights, remote viewing, and manifestation through daily intuition practice."
      />
      <View style={styles.hero}>
        <Image
          accessibilityLabel="Intuisity banner with a sunlit forest stream"
          resizeMode="cover"
          source={require("../../assets/intuisity-front-banner-v5.png")}
          style={styles.heroImage}
        />
        <View style={styles.bannerIconLinks}>
          {homeChallenges.map((challenge, index) => (
            <Pressable
              accessibilityLabel={`Open ${challenge.title} from banner`}
              key={`banner-${challenge.id}`}
              onPress={() => {
                if (challenge.id === "daily-intuition") {
                  resetKnowing();
                } else {
                  navigateToPage(challenge.id);
                }
              }}
              style={({ pressed }) => [
                styles.bannerIconLink,
                pressed && styles.bannerIconLinkPressed
              ]}
            />
          ))}
        </View>
      </View>
      <View style={styles.moduleGrid}>
        {homeChallenges.map((challenge) => (
          <View key={challenge.id} style={styles.moduleGridItem}>
            <Pressable
              accessibilityLabel={`Open ${challenge.title}`}
              onPress={() => {
                if (challenge.id === "daily-intuition") {
                  resetKnowing();
                } else {
                  navigateToPage(challenge.id);
                }
              }}
              style={[styles.moduleIconButton, styles.moduleIconButtonPurple]}
            >
              <Ionicons
                color="#FFFFFF"
                name={challengeIcons[challenge.id]}
                size={32}
              />
            </Pressable>
            <View style={styles.moduleGridCopy}>
              <Text style={styles.moduleGridTitle}>{challenge.title}</Text>
              <Text style={styles.moduleGridTagline}>{challenge.prompt}</Text>
            </View>
          </View>
        ))}
      </View>
      <Pressable
        accessibilityLabel="View my ongoing results"
        onPress={() => setPage("daily-results")}
        style={styles.homeResultsButton}
      >
        <View style={styles.homeResultsIcon}>
          <Ionicons color="#FFFFFF" name="stats-chart-outline" size={23} />
        </View>
        <View style={styles.homeResultsCopy}>
          <Text style={styles.homeResultsTitle}>View My Results</Text>
          <Text style={styles.homeResultsText}>See today's scores and your ongoing strengths</Text>
        </View>
        <Ionicons color="#6544B8" name="arrow-forward-circle-outline" size={26} />
      </Pressable>
      <Pressable
        accessibilityLabel="Log out"
        onPress={onLogout}
        style={styles.homeLogoutButton}
      >
        <Ionicons color="#008A94" name="log-out-outline" size={19} />
        <Text style={styles.homeLogoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

function makeTargets() {
  const firstPass = seededShuffle(colorNames, `knowing-targets-${getDateKey()}-first-pass`);
  const secondPass = seededShuffle(colorNames, `knowing-targets-${getDateKey()}-second-pass`);
  return seededShuffle([...firstPass, ...secondPass], `knowing-targets-${getDateKey()}-final`).slice(0, 5);
}

function makeKnowingRewardPictures() {
  const historyKey = "intuisity-knowing-reward-picture-history";
  let previousIds: string[] = [];
  try {
    previousIds = JSON.parse(globalThis.localStorage?.getItem(historyKey) || "[]");
  } catch {
    previousIds = [];
  }

  let freshPictures = shuffle(knowingRewardImages.filter((picture) => !previousIds.includes(picture.id)));
  if (freshPictures.length < 5) {
    previousIds = [];
    freshPictures = shuffle(knowingRewardImages);
  }
  const selectedPictures = freshPictures.slice(0, 5);
  const updatedHistory = [...previousIds, ...selectedPictures.map((picture) => picture.id)].slice(-295);

  try {
    globalThis.localStorage?.setItem(historyKey, JSON.stringify(updatedHistory));
  } catch {
    // Browser storage may be unavailable in private mode.
  }

  return selectedPictures.length ? selectedPictures : rewardImages;
}

const astrologyJournalKey = "intuisity-astrology-journal";
const learningJournalKey = "intuisity-learning-journal";

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatBirthdate(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 8);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4)}`;
}

function formatBirthTime(value: string) {
  const periodMatch = value.toUpperCase().match(/(AM|PM|A|P)\s*$/);
  let period = periodMatch ? (periodMatch[1].startsWith("A") ? "AM" : "PM") : "";
  const numbers = value.replace(/\D/g, "").slice(0, 4);
  if (!numbers) return period;
  if (numbers.length <= 2) return numbers;
  const hourLength = numbers.length === 3 ? 1 : 2;
  const hour = Number(numbers.slice(0, hourLength));
  if (!period && hourLength === 2 && numbers.startsWith("0")) {
    period = "AM";
  }
  const formattedTime = `${hour}:${numbers.slice(hourLength)}`;
  return period ? `${formattedTime}${period.toLowerCase()}` : formattedTime;
}

function BirthTimePicker({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  const selected = parseBirthTimePickerValue(value);
  const selectedLabel = value.trim() ? `Selected: ${selected.hour}:${selected.minute} ${selected.period}` : "Optional - choose if you know it";

  const updateTime = (part: Partial<{ hour: string; minute: string; period: "AM" | "PM" }>) => {
    const nextHour = part.hour || selected.hour;
    const nextMinute = part.minute || selected.minute;
    const nextPeriod = part.period || selected.period;
    onChange(`${Number(nextHour)}:${nextMinute} ${nextPeriod}`);
  };
  const renderWheelColumn = (
    label: string,
    options: string[],
    selectedValue: string,
    onSelect: (nextValue: string) => void
  ) => (
    <View style={styles.birthTimeWheelColumn}>
      <ScrollView
        persistentScrollbar
        showsVerticalScrollIndicator
        snapToInterval={34}
        style={styles.birthTimeWheelScroller}
      >
        {options.map((option) => (
          <Pressable
            accessibilityLabel={`Select birth ${label.toLowerCase()} ${option}`}
            key={option}
            onPress={() => onSelect(option)}
            style={[styles.birthTimeWheelOption, selectedValue === option && styles.birthTimeOptionSelected]}
          >
            <Text style={[styles.birthTimeOptionText, selectedValue === option && styles.birthTimeOptionTextSelected]}>{option}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.birthTimePicker}>
      <View style={styles.birthTimeHeader}>
        <View>
          <Text style={styles.inputLabel}>Birth time</Text>
          <Text style={styles.birthTimeSelected}>{selectedLabel}</Text>
        </View>
        {value.trim() ? (
          <Pressable accessibilityLabel="Clear birth time" onPress={() => onChange("")} style={styles.birthTimeClearButton}>
            <Text style={styles.birthTimeClearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.birthTimeLabelRow}>
        <Text style={styles.birthTimePickerLabel}>Hour</Text>
        <Text style={styles.birthTimePickerLabel}>Minute</Text>
        <Text style={styles.birthTimePickerLabel}>AM/PM</Text>
      </View>
      <View style={styles.birthTimeWheelRow}>
        {renderWheelColumn("hour", birthTimeHours, selected.hour, (hour) => updateTime({ hour }))}
        {renderWheelColumn("minute", birthTimeMinutes, selected.minute, (minute) => updateTime({ minute }))}
        {renderWheelColumn("AM/PM", ["AM", "PM"], selected.period, (period) => updateTime({ period: period as "AM" | "PM" }))}
      </View>
      <Text style={styles.birthTimeScrollHint}>Scroll each column, then tap the number or AM/PM you want.</Text>
    </View>
  );
}

function parseBirthTimePickerValue(value: string) {
  const normalized = formatBirthTime(value).toUpperCase();
  const match = normalized.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?$/);
  const rawHour = Number(match?.[1] || 8);
  const rawMinute = Number(match?.[2] || 0);
  const hour = String(Math.min(Math.max(rawHour || 8, 1), 12));
  const minute = String(Math.min(Math.max(rawMinute || 0, 0), 59)).padStart(2, "0");
  const period = match?.[3] === "PM" ? "PM" : "AM";
  return { hour, minute, period };
}

function validBirthdate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  const date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[1]) - 1 && date.getDate() === Number(match[2]);
}

function formatDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric"
  });
}

function loadAstrologyJournal(): AstrologyJournalEntry[] {
  try {
    const stored = globalThis.localStorage?.getItem(astrologyJournalKey);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveAstrologyJournal(entries: AstrologyJournalEntry[]) {
  try {
    globalThis.localStorage?.setItem(astrologyJournalKey, JSON.stringify(entries));
  } catch {
    // Browser storage may be unavailable in private mode.
  }
}

function saveAstrologyPlan(plan: string) {
  const date = getDateKey();
  const entries = loadAstrologyJournal().filter((entry) => entry.date !== date);
  saveAstrologyJournal([...entries, { date, plan }]);
}

function saveAstrologyUpdate(date: string, update: string) {
  const entries = loadAstrologyJournal().map((entry) =>
    entry.date === date ? { ...entry, update } : entry
  );
  saveAstrologyJournal(entries);
}

function loadLearningJournal(): LearningJournalEntry[] {
  try {
    const stored = globalThis.localStorage?.getItem(learningJournalKey);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLearningJournal(entries: LearningJournalEntry[]) {
  try {
    globalThis.localStorage?.setItem(learningJournalKey, JSON.stringify(entries));
  } catch {
    // Browser storage may be unavailable in private mode.
  }
}

function saveLearningChallenge(challenge: string) {
  const date = getDateKey();
  const entries = loadLearningJournal().filter((entry) => entry.date !== date);
  saveLearningJournal([...entries, { date, challenge }]);
}

function saveLearningResponse(date: string, response: string) {
  const entries = loadLearningJournal().map((entry) =>
    entry.date === date ? { ...entry, response } : entry
  );
  saveLearningJournal(entries);
}

function makeColorOrders(targets: string[]) {
  return targets.map(() => colorNames);
}

function seededRandomFromString(seed: string) {
  let value = Math.abs(hashString(seed)) || 1;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: string) {
  const pick = seededRandomFromString(seed);
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(pick() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function makeRemoteViewingPairs() {
  const historyKey = "intuisity-remote-viewing-picture-history";
  let previousIds: string[] = [];

  try {
    const stored = globalThis.localStorage?.getItem(historyKey);
    previousIds = stored ? JSON.parse(stored) : [];
  } catch {
    previousIds = [];
  }

  const freshPictures = shuffle(remoteViewingPictures.filter((picture) => !previousIds.includes(picture.id)));
  const pictures = (freshPictures.length >= 6 ? freshPictures : shuffle(remoteViewingPictures)).slice(0, 6);

  try {
    const updatedHistory = [...pictures.map((picture) => picture.id), ...previousIds]
      .filter((id, index, ids) => ids.indexOf(id) === index)
      .slice(0, 180);
    globalThis.localStorage?.setItem(historyKey, JSON.stringify(updatedHistory));
  } catch {
    // Browser storage may be unavailable in private mode.
  }

  return [0, 2, 4].map((index) => {
    const pair = [pictures[index], pictures[index + 1]];
    const targetIndex = Math.floor(Math.random() * 2);
    const target = pair[targetIndex];
    const decoy = pair[targetIndex === 0 ? 1 : 0];
    return {
      target,
      decoy,
      choices: shuffle([target, decoy])
    };
  });
}

function makeFriendPictures() {
  const historyKey = "intuisity-social-picture-history";
  let previousIds: string[] = [];

  try {
    const stored = globalThis.localStorage?.getItem(historyKey);
    previousIds = stored ? JSON.parse(stored) : [];
  } catch {
    previousIds = [];
  }

  let availablePictures = socialChallengePictures.filter(
    (picture) => !previousIds.includes(picture.id)
  );

  if (
    availablePictures.length < 6 ||
    availablePictures.filter((picture) => picture.group === "nature").length < 3 ||
    availablePictures.filter((picture) => picture.group === "object").length < 3
  ) {
    previousIds = [];
    availablePictures = socialChallengePictures;
  }

  const natureChoices = shuffle(
    availablePictures.filter((picture) => picture.group === "nature")
  ).slice(0, 3);
  const objectChoices = shuffle(
    availablePictures.filter((picture) => picture.group === "object")
  ).slice(0, 3);
  const selectedPictures = shuffle([...natureChoices, ...objectChoices]);
  const updatedHistory = [
    ...previousIds,
    ...selectedPictures.map((picture) => picture.id)
  ].slice(-294);

  try {
    globalThis.localStorage?.setItem(historyKey, JSON.stringify(updatedHistory));
  } catch {
    // Browser storage may be unavailable in private mode.
  }

  return selectedPictures;
}

function makeDailyPowerWords() {
  const historyKey = "intuisity-power-word-history";
  let previousWords: string[] = [];

  try {
    const stored = globalThis.localStorage?.getItem(historyKey);
    previousWords = stored ? JSON.parse(stored) : [];
  } catch {
    previousWords = [];
  }

  let availableWords = powerWords.filter((word) => !previousWords.includes(word));
  if (availableWords.length < 5) {
    previousWords = [];
    availableWords = powerWords;
  }

  const selectedWords = shuffle(availableWords).slice(0, 5);
  const updatedHistory = [...previousWords, ...selectedWords].slice(-995);

  try {
    globalThis.localStorage?.setItem(historyKey, JSON.stringify(updatedHistory));
  } catch {
    // Browser storage may be unavailable in private mode.
  }

  return selectedWords;
}

function makeTreasureChestIcons() {
  const historyKey = "intuisity-treasure-piece-history";
  const lastGameKey = "intuisity-treasure-last-game-pieces";
  let previousPieces: string[] = [];
  let lastGamePieces: string[] = [];

  try {
    previousPieces = JSON.parse(globalThis.localStorage?.getItem(historyKey) || "[]");
    lastGamePieces = JSON.parse(globalThis.localStorage?.getItem(lastGameKey) || "[]");
  } catch {
    previousPieces = [];
    lastGamePieces = [];
  }

  let availablePieces = treasureGamePieceCatalog.filter(
    (piece) => !previousPieces.includes(piece) && !lastGamePieces.includes(piece)
  );

  if (availablePieces.length < 5) {
    previousPieces = [];
    availablePieces = treasureGamePieceCatalog.filter((piece) => !lastGamePieces.includes(piece));
  }

  const selectedPieces = shuffle(availablePieces).slice(0, 5);

  try {
    globalThis.localStorage?.setItem(historyKey, JSON.stringify([...previousPieces, ...selectedPieces].slice(-295)));
    globalThis.localStorage?.setItem(lastGameKey, JSON.stringify(selectedPieces));
  } catch {
    // Browser storage may be unavailable in private mode.
  }

  return selectedPieces;
}

function makeTreasureWinMessage(triesUsed: number) {
  const historyKey = "intuisity-treasure-win-message-history";
  let previousMessages: string[] = [];
  try {
    previousMessages = JSON.parse(globalThis.localStorage?.getItem(historyKey) || "[]");
  } catch {
    previousMessages = [];
  }

  const availableMessages = treasureWinMessages.filter((message) => !previousMessages.includes(message));
  const messagePool = availableMessages.length ? availableMessages : treasureWinMessages;
  const phrase = shuffle(messagePool)[0] || "Fantastic, you opened the chest";

  try {
    globalThis.localStorage?.setItem(historyKey, JSON.stringify([...previousMessages, phrase].slice(-280)));
  } catch {
    // Browser storage may be unavailable in private mode.
  }

  return `${phrase} in ${triesUsed} ${triesUsed === 1 ? "try" : "tries"}!`;
}

function countTreasureMatches(guess: Array<string | null>, secret: string[]) {
  return guess.reduce((total, icon, index) => total + (icon === secret[index] ? 1 : 0), 0);
}

function calculateTreasurePoints(triesUsed: number) {
  const scoreByTry: Record<number, number> = {
    1: dailyPointWeights.friend,
    2: Math.round(dailyPointWeights.friend * 0.8),
    3: Math.round(dailyPointWeights.friend * 0.6),
    4: Math.round(dailyPointWeights.friend * 0.4)
  };
  return scoreByTry[triesUsed] || 0;
}

function getPowerWordMeaning(word: string) {
  if (powerWordMeanings[word]) return powerWordMeanings[word];
  const [quality, ...essenceParts] = word.split(" ");
  const essence = essenceParts.join(" ").toLowerCase();
  return `${word} invites you to bring a ${quality.toLowerCase()} spirit to ${essence}. Let this intention guide one thoughtful choice today, and notice how your energy shifts when your actions align with it.`;
}

function shuffle<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function getTodaysLessonChoices() {
  const daysSinceStart = getDaysSinceLearningStart(getDateKey());
  const firstIndex = (daysSinceStart * 2) % dailyIntuitionLessons.length;
  const secondIndex = (firstIndex + 1) % dailyIntuitionLessons.length;
  return [dailyIntuitionLessons[firstIndex], dailyIntuitionLessons[secondIndex]];
}

function getDaysSinceLearningStart(dateKey: string) {
  const startDate = Date.UTC(2026, 0, 1);
  const [year, month, day] = dateKey.split("-").map(Number);
  const currentDate = Date.UTC(year, month - 1, day);
  return Math.max(0, Math.floor((currentDate - startDate) / 86400000));
}

function pickBalancedPersonProfile(email: string, offset = 0) {
  const groups = ["european", "asian", "african-diaspora", "middle-east-north-africa", "indigenous-latin", "global"];
  const photographicProfiles = personProfiles.filter(isPhotographicPersonProfile);
  const recentIds = loadPersonPortraitHistory(email);
  const groupIndex = Math.abs(hashString(`${getDateKey()}-${email}-${offset}`)) % groups.length;
  const preferredGroup = groups[groupIndex];
  const candidates = photographicProfiles.filter((profile) => getPersonProfileGroup(profile) === preferredGroup);
  const groupedPool = candidates.length > 0 ? candidates : photographicProfiles;
  const freshPool = groupedPool.filter((profile) => !recentIds.includes(profile.id));
  const pool = freshPool.length >= 4 ? freshPool : groupedPool;
  const profileIndex = Math.abs(hashString(`${email}-${getDateKey()}-${preferredGroup}-${offset}`)) % pool.length;
  return pool[profileIndex];
}

function loadPersonPortraitHistory(email: string) {
  try {
    const stored = globalThis.localStorage?.getItem(`intuisity-person-portrait-history-${email.toLowerCase()}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function rememberPersonPortrait(email: string, profileId: string) {
  try {
    const previousIds = loadPersonPortraitHistory(email);
    const nextIds = [profileId, ...previousIds]
      .filter((id, index, ids) => ids.indexOf(id) === index)
      .slice(0, personPortraitSearchLimit);
    globalThis.localStorage?.setItem(`intuisity-person-portrait-history-${email.toLowerCase()}`, JSON.stringify(nextIds));
  } catch {
    // Browser storage may be unavailable in private mode.
  }
}

function isPhotographicPersonProfile(profile: PersonProfile) {
  return photographicPersonProfileIds.has(profile.id) || Boolean(profile.wikipediaTitle || profile.name);
}

function getPersonProfileGroup(profile: PersonProfile) {
  const text = `${profile.id} ${profile.name} ${profile.history} ${profile.attributes.join(" ")}`.toLowerCase();

  if (
    text.includes("black") ||
    text.includes("african") ||
    text.includes("jamaica") ||
    text.includes("haitian") ||
    text.includes("kenya") ||
    text.includes("nigeria") ||
    text.includes("liberia") ||
    text.includes("civil rights") ||
    text.includes("harlem") ||
    text.includes("blues") ||
    text.includes("gospel")
  ) {
    return "african-diaspora";
  }

  if (
    text.includes("china") ||
    text.includes("chinese") ||
    text.includes("japan") ||
    text.includes("japanese") ||
    text.includes("india") ||
    text.includes("indian") ||
    text.includes("pakistan") ||
    text.includes("pakistani") ||
    text.includes("korea") ||
    text.includes("vietnam")
  ) {
    return "asian";
  }

  if (
    text.includes("arab") ||
    text.includes("persian") ||
    text.includes("egypt") ||
    text.includes("morocco") ||
    text.includes("fez") ||
    text.includes("islamic") ||
    text.includes("iran") ||
    text.includes("turkey")
  ) {
    return "middle-east-north-africa";
  }

  if (
    text.includes("native") ||
    text.includes("indigenous") ||
    text.includes("hawai") ||
    text.includes("mexico") ||
    text.includes("brazil") ||
    text.includes("guatemala") ||
    text.includes("honduras") ||
    text.includes("latina") ||
    text.includes("lenca") ||
    text.includes("k'iche")
  ) {
    return "indigenous-latin";
  }

  if (
    text.includes("british") ||
    text.includes("england") ||
    text.includes("english") ||
    text.includes("germany") ||
    text.includes("german") ||
    text.includes("france") ||
    text.includes("french") ||
    text.includes("italy") ||
    text.includes("italian") ||
    text.includes("poland") ||
    text.includes("polish") ||
    text.includes("swedish") ||
    text.includes("austrian") ||
    text.includes("dutch") ||
    text.includes("russian") ||
    text.includes("spain") ||
    text.includes("spanish")
  ) {
    return "european";
  }

  return "global";
}

function loadTodaysPersonChallenge(email: string): DailyPersonChallenge | null {
  try {
    const stored = globalThis.localStorage?.getItem(getPersonChallengeStorageKey(email));
    const parsed: DailyPersonChallenge | null = stored ? JSON.parse(stored) : null;
    const savedProfile = parsed ? personProfiles.find((profile) => profile.id === parsed.profileId) : undefined;
    if (parsed?.date === getDateKey() && savedProfile && isPhotographicPersonProfile(savedProfile)) return parsed;
  } catch {
    // Browser storage may be unavailable in private mode.
  }
  return null;
}

function saveTodaysPersonChallenge(
  email: string,
  challenge: Omit<DailyPersonChallenge, "date">
): DailyPersonChallenge {
  const record: DailyPersonChallenge = {
    ...challenge,
    date: getDateKey()
  };
  try {
    globalThis.localStorage?.setItem(getPersonChallengeStorageKey(email), JSON.stringify(record));
  } catch {
    // Browser storage may be unavailable in private mode.
  }
  return record;
}

function getPersonChallengeStorageKey(email: string) {
  return `intuisity-person-challenge-${email.toLowerCase()}`;
}

function hashString(value: string) {
  return [...value].reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
}

function calculateModulePoints(score: number, maximum: number, possiblePoints: number) {
  if (!maximum) return 0;
  return Math.round((score / maximum) * possiblePoints);
}

async function resolveWikipediaPortrait(title: string): Promise<string | null> {
  const cacheKey = title.trim().toLowerCase();
  if (portraitCache.has(cacheKey)) return portraitCache.get(cacheKey) || null;

  try {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (!response.ok) {
      portraitCache.set(cacheKey, null);
      return null;
    }
    const summary = await response.json();
    const portraitUri = summary?.thumbnail?.source || summary?.originalimage?.source || null;
    portraitCache.set(cacheKey, portraitUri);
    return portraitUri;
  } catch {
    portraitCache.set(cacheKey, null);
    return null;
  }
}

function getCommunityResults() {
  return {
    participants: 0,
    average: 0,
    percentile: 0,
    topScore: 0
  };
}

function saveAndSummarizeDailyResults(
  email: string,
  modules: DailyResultEntry["modules"],
  total: number,
  maximum: number,
  shouldSaveToday = true
) {
  const storageKey = `intuisity-daily-results-${email.toLowerCase()}`;
  let history: DailyResultEntry[] = [];
  try {
    const stored = globalThis.localStorage?.getItem(storageKey);
    history = stored ? JSON.parse(stored) : [];
  } catch {
    history = [];
  }

  const today = getDateKey();
  const updatedHistory = (
    shouldSaveToday
      ? [
          ...history.filter((entry) => entry.date !== today),
          { date: today, modules, total, maximum }
        ]
      : history
  ).sort((a, b) => a.date.localeCompare(b.date));

  if (shouldSaveToday) {
    try {
      globalThis.localStorage?.setItem(storageKey, JSON.stringify(updatedHistory));
      syncDailyResult(email, modules, total, maximum);
    } catch {
      // Browser storage may be unavailable in private mode.
    }
  }

  const totals = new Map<string, { label: string; totalScore: number; totalMaximum: number }>();
  updatedHistory.forEach((entry) => {
    entry.modules.forEach((module) => {
      const current = totals.get(module.label) || { label: module.label, totalScore: 0, totalMaximum: 0 };
      current.totalScore += module.score;
      current.totalMaximum += module.maximum;
      totals.set(module.label, current);
    });
  });

  const cumulativeModules = [...totals.values()]
    .map((module) => ({ ...module, percent: Math.round((module.totalScore / module.totalMaximum) * 100) }))
    .sort((a, b) => getReportModuleOrder(a.label) - getReportModuleOrder(b.label));
  const strongestModules = [...cumulativeModules].sort((a, b) => b.percent - a.percent);
  const totalPoints = updatedHistory.reduce((sum, entry) => sum + entry.total, 0);
  const totalPossible = updatedHistory.reduce((sum, entry) => sum + entry.maximum, 0);

  return {
    days: updatedHistory.length,
    totalPoints,
    averagePercent: totalPossible ? Math.round((totalPoints / totalPossible) * 100) : 0,
    modules: cumulativeModules,
    strongest: strongestModules[0] || cumulativeModules[0]
  };
}

function getReportModuleOrder(label: string) {
  const order: Record<string, number> = {
    "Challenge 1: Treasure Chest": 1,
    "Challenge 1: Social Challenge": 1,
    "Friend Challenge": 1,
    "Challenge 2: Train Your Knowing": 2,
    "Train Your Knowing": 2,
    "Challenge 3: Positivity Practice": 3,
    "Positivity Practice": 3,
    "Challenge 3: Daily Intuition Learning": 3,
    "Daily Intuition Learning": 3,
    "Challenge 4: Read the Person": 4,
    "Read the Person": 4,
    "Challenge 5: Daily Astrology Tips": 5,
    "Daily Astrology Tips": 5,
    "Challenge 6: Remote Viewing Challenge": 6,
    "Remote Viewing Challenge": 6
  };
  return order[label] || 99;
}

function summarizeApparentStrengths(
  modules: Array<{ label: string; score: number; maximum: number }>,
  timeframe: "today" | "over time"
) {
  const descriptions: Record<string, string> = {
    "Train Your Knowing": "trusting quick, sensory first impressions",
    "Challenge 2: Train Your Knowing": "trusting quick, sensory first impressions",
    "Positivity Practice": "building gratitude, kindness, and daily follow-through",
    "Challenge 3: Positivity Practice": "building gratitude, kindness, and daily follow-through",
    "Daily Intuition Learning": "reflecting on intuition and turning insights into action",
    "Challenge 3: Daily Intuition Learning": "reflecting on intuition and turning insights into action",
    "Read the Person": "noticing personality and life-story signals in other people",
    "Challenge 4: Read the Person": "noticing personality and life-story signals in other people",
    "Daily Astrology Tips": "using guidance intentionally and following through",
    "Challenge 5: Daily Astrology Tips": "using guidance intentionally and following through",
    "Challenge 1: Treasure Chest": "solving hidden patterns with fewer tries",
    "Friend Challenge": "solving hidden treasure patterns with friends",
    "Challenge 1: Social Challenge": "solving hidden treasure patterns with friends",
    "Remote Viewing Challenge": "sensing visual targets before seeing them",
    "Challenge 6: Remote Viewing Challenge": "sensing visual targets before seeing them"
  };
  const ranked = modules
    .map((module) => ({
      ...module,
      percent: module.maximum ? Math.round((module.score / module.maximum) * 100) : 0
    }))
    .sort((a, b) => b.percent - a.percent);
  const strongest = ranked[0];
  const second = ranked[1];
  const timeframeText = timeframe === "today" ? "Today's results" : "Your results across your saved practice days";

  if (!strongest || strongest.percent === 0) {
    return `${timeframeText} do not yet show one clear strength. Continue exploring each module and notice which impressions feel calm, immediate, and repeatable.`;
  }

  const secondStrength = second && second.percent >= 50
    ? ` You also show promise in ${descriptions[second.label] || second.label.toLowerCase()}.`
    : "";
  const confidence = strongest.percent >= 80
    ? "a particularly strong apparent ability"
    : strongest.percent >= 60
      ? "an emerging apparent strength"
      : "an early area of promise";

  return `${timeframeText} suggest ${confidence} in ${descriptions[strongest.label] || strongest.label.toLowerCase()}. Your ${strongest.percent}% result in ${strongest.label} indicates this may be a natural channel for your intuition.${secondStrength} These results are practice observations, not a clinical or scientific assessment.`;
}

function loadModuleFeedback(email: string): ModuleFeedback {
  try {
    const stored = globalThis.localStorage?.getItem(`intuisity-module-feedback-${email.toLowerCase()}`);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveModuleFeedback(email: string, feedback: ModuleFeedback) {
  try {
    globalThis.localStorage?.setItem(
      `intuisity-module-feedback-${email.toLowerCase()}`,
      JSON.stringify(feedback)
    );
    syncModuleFeedback(email, feedback);
  } catch {
    // Browser storage may be unavailable in private mode.
  }
}

function stampModuleFeedback(feedback: ModuleFeedback): ModuleFeedback {
  const savedAt = new Date().toISOString();
  return Object.fromEntries(
    Object.entries(feedback).map(([moduleLabel, value]) => [
      moduleLabel,
      value.rating || value.improvement.trim()
        ? { ...value, updatedAt: savedAt }
        : value
    ])
  );
}

function loadFriends(email: string): FriendContact[] {
  try {
    const stored = globalThis.localStorage?.getItem(`intuisity-friends-${email.toLowerCase()}`);
    if (stored) return JSON.parse(stored).map(normalizeFriendContact).filter((friend: FriendContact) => getFriendKey(friend));
    const oldPhones = globalThis.localStorage?.getItem(`intuisity-friend-phones-${email.toLowerCase()}`);
    return oldPhones
      ? JSON.parse(oldPhones).map((phone: string) => ({ name: `Friend ending ${phone.replace(/\D/g, "").slice(-4)}`, phone }))
      : [];
  } catch {
    return [];
  }
}

function saveFriends(email: string, friends: FriendContact[]) {
  try {
    globalThis.localStorage?.setItem(
      `intuisity-friends-${email.toLowerCase()}`,
      JSON.stringify(friends)
    );
    syncFriends(email, friends);
  } catch {
    // Browser storage may be unavailable in private mode.
  }
}

function formatFriendPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function normalizeFriendContact(friend: FriendContact): FriendContact {
  return {
    name: friend.name || "Friend",
    phone: friend.phone ? formatFriendPhone(friend.phone) : "",
    email: friend.email ? friend.email.trim().toLowerCase() : ""
  };
}

function getFriendKey(friend: FriendContact) {
  const phoneDigits = (friend.phone || "").replace(/\D/g, "");
  return phoneDigits ? `phone:${phoneDigits}` : friend.email ? `email:${friend.email.trim().toLowerCase()}` : "";
}

function formatFriendContactDetail(friend: FriendContact) {
  const details = [friend.phone, friend.email].filter(Boolean);
  return details.length ? details.join(" | ") : "No contact saved";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getAppOrigin() {
  const browserWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
  return browserWindow?.location?.origin || "https://intuisity.com";
}

function getTreasureInviteUrl(icons: Array<string | null>, note: string, senderName: string) {
  const params = new URLSearchParams();
  params.set("treasureInvite", "1");
  params.set("tiles", icons.filter(Boolean).join("|"));
  if (note.trim()) params.set("note", note.trim());
  if (senderName.trim()) params.set("from", senderName.trim());
  return `${getAppOrigin()}/?${params.toString()}`;
}

function loadTreasureInviteFromUrl() {
  const browserWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
  const params = new URLSearchParams(browserWindow?.location?.search || "");
  if (params.get("treasureInvite") !== "1") return null;

  const challengeId = String(params.get("challenge") || "").trim();
  if (challengeId) {
    return { challengeId, icons: [], note: "", senderName: "Your friend" };
  }

  const icons = String(params.get("tiles") || "")
    .split("|")
    .map((icon) => icon.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (icons.length !== 5) return null;

  return {
    challengeId: "",
    icons,
    note: String(params.get("note") || "").trim(),
    senderName: String(params.get("from") || "Your friend").trim() || "Your friend"
  };
}

function getSentTreasureChallengesKey(email: string) {
  return `intuisity-treasure-challenges-${String(email || "").trim().toLowerCase()}`;
}

function loadSentTreasureChallenges(email: string): TreasureChallengeReceipt[] {
  try {
    const stored = globalThis.localStorage?.getItem(getSentTreasureChallengesKey(email));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveSentTreasureChallenges(email: string, challenges: TreasureChallengeReceipt[]) {
  try {
    globalThis.localStorage?.setItem(getSentTreasureChallengesKey(email), JSON.stringify(challenges.slice(0, 25)));
  } catch {
    // Status polling remains available for the current session when browser storage is unavailable.
  }
}

function formatTreasureStatus(status: TreasureChallengeReceipt["status"]) {
  if (status === "completed") return "Completed";
  if (status === "opened") return "Opened";
  return "Sent";
}

function formatEmailDeliveryStatus(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (["delivered", "opened", "clicked"].includes(normalized)) return "Email delivered";
  if (normalized === "bounced") return "Email bounced—check the address";
  if (normalized === "suppressed") return "Email blocked by suppression list";
  if (normalized === "delivery_delayed") return "Email delivery delayed";
  if (normalized === "failed") return "Email delivery failed";
  return "Email sent—awaiting delivery";
}

function isEmailDeliveryProblem(status: string) {
  return ["bounced", "suppressed", "delivery_delayed", "failed"].includes(String(status || "").toLowerCase());
}

function createClientId() {
  const cryptoApi = (globalThis as any).crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getKnowingResultMessage(score: number) {
  const messages = [
    {
      title: "Your intuition is warming up",
      detail: "Quiet your mind, trust your first impression, and keep practicing."
    },
    {
      title: "A spark of intuition",
      detail: "You found one hidden picture. Notice what that correct choice felt like."
    },
    {
      title: "Your inner knowing is growing",
      detail: "You are beginning to recognize the signals that guide you."
    },
    {
      title: "Strong intuitive connection!",
      detail: "Three correct choices show that your first impressions deserve attention."
    },
    {
      title: "Psychic ability present",
      detail: "Four correct choices reveal an impressive connection to your intuitive signals."
    },
    {
      title: "Extraordinary psychic connection!",
      detail: "A perfect five out of five. Your intuitive knowing was exceptionally strong today."
    }
  ];
  return messages[Math.max(0, Math.min(5, score))];
}

function getNextModulePage(page: string) {
  const nextPages: Record<string, string> = {
    "social-prediction": "knowing",
    knowing: "remote-viewing-arena",
    "knowing-results": "remote-viewing-arena",
    "remote-viewing-arena": "third-eye-activation",
    "third-eye-activation": "psychic-potential-score",
    "psychic-potential-score": "remote-viewing-test",
    "remote-viewing-test": "daily-results",
    "remote-viewing-results": "daily-results",
    "daily-results": "hub"
  };
  return nextPages[page];
}

function getPreviousModulePage(page: string) {
  const previousPages: Record<string, string> = {
    "social-prediction": "hub",
    knowing: "social-prediction",
    "knowing-results": "knowing",
    "remote-viewing-arena": "knowing",
    "third-eye-activation": "remote-viewing-arena",
    "psychic-potential-score": "third-eye-activation",
    "remote-viewing-test": "psychic-potential-score",
    "remote-viewing-results": "remote-viewing-test",
    "daily-results": "remote-viewing-results"
  };
  return previousPages[page];
}

function IntuitionSkillFocus({ skills, explanation }: { skills: string; explanation: string }) {
  return (
    <View style={styles.skillFocusCard}>
      <View style={styles.skillFocusHeading}>
        <Ionicons color="#6544B8" name="bulb-outline" size={20} />
        <Text style={styles.skillFocusTitle}>What intuition skills are you improving?</Text>
      </View>
      <Text style={styles.skillFocusSkills}>{skills}</Text>
      <Text style={styles.skillFocusExplanation}>{explanation}</Text>
    </View>
  );
}

function PageHeader({
  eyebrow,
  title,
  subtitle,
  compact = false,
  onHome,
  onBack,
  onNext
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  compact?: boolean;
  onHome?: () => void;
  onBack?: () => void;
  onNext?: () => void;
}) {
  const theme = getHeaderTheme(eyebrow, title);
  return (
    <View style={[styles.header, compact && styles.headerCompact, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={[styles.headerShade, compact && styles.headerShadeCompact]}>
        {(onHome || onBack || onNext) && (
          <View style={styles.headerNavigation}>
            {onHome ? (
              <Pressable accessibilityLabel="Return home" onPress={onHome} style={styles.headerNavButton}>
                <Ionicons color="#30264C" name="home-outline" size={20} />
                <Text style={styles.headerHomeText}>Home</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <View style={styles.headerDirectionButtons}>
              {onBack && (
                <Pressable accessibilityLabel="Go back" onPress={onBack} style={styles.headerDirectionButton}>
                  <Ionicons color="#30264C" name="arrow-back-outline" size={17} />
                  <Text style={styles.headerNextText}>Back</Text>
                </Pressable>
              )}
              {onNext && (
                <Pressable accessibilityLabel="Go to next module" onPress={onNext} style={styles.headerDirectionButton}>
                  <Text style={styles.headerNextText}>Next</Text>
                  <Ionicons color="#30264C" name="arrow-forward-outline" size={17} />
                </Pressable>
              )}
            </View>
          </View>
        )}
        <View style={styles.headerTopRow}>
          <View style={[styles.headerIcon, { backgroundColor: theme.accent }]}>
            <Ionicons color="#FFFFFF" name={theme.icon} size={24} />
          </View>
          <Text style={styles.headerEyebrow}>{eyebrow}</Text>
        </View>
        <Text style={[styles.headerTitle, compact && styles.headerTitleCompact]}>{title}</Text>
        <Text style={[styles.headerSubtitle, compact && styles.headerSubtitleCompact]}>{subtitle}</Text>
      </View>
    </View>
  );
}

function getHeaderTheme(eyebrow: string, title: string) {
  const value = `${eyebrow} ${title}`.toLowerCase();
  if (value.includes("knowing") || value.includes("five-try") || value.includes("try ")) {
    return { accent: "#D74988", background: "#6544B8", border: "#63E3E0", icon: "color-palette-outline" as const };
  }
  if (value.includes("learning") || value.includes("intuition")) {
    return { accent: "#63E3E0", background: "#008A94", border: "#DCCFF5", icon: "bulb-outline" as const };
  }
  if (value.includes("person") || value.includes("sense about")) {
    return { accent: "#2E9B6F", background: "#4F3CA2", border: "#BFE8E8", icon: "eye-outline" as const };
  }
  if (value.includes("astrology") || value.includes("guidance") || value.includes("invite")) {
    return { accent: "#63E3E0", background: "#7555C7", border: "#BFE8E8", icon: "moon-outline" as const };
  }
  if (value.includes("social") || value.includes("friend") || value.includes("computer") || value.includes("power word")) {
    return { accent: "#E07A36", background: "#008A94", border: "#DCCFF5", icon: "people-outline" as const };
  }
  if (value.includes("remote viewing")) {
    return { accent: "#287DB8", background: "#4F3CA2", border: "#63E3E0", icon: "radio-outline" as const };
  }
  if (value.includes("results") || value.includes("complete")) {
    return { accent: "#63E3E0", background: "#6544B8", border: "#DCCFF5", icon: "trophy-outline" as const };
  }
  return { accent: "#63E3E0", background: "#6544B8", border: "#DCCFF5", icon: "sparkles-outline" as const };
}

function VirtualRoom({
  objects,
  selectedId,
  onSelect,
  primaryLabel,
  secondarySelectedId,
  secondaryLabel,
  compact = false
}: {
  objects: RoomObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  primaryLabel: string;
  secondarySelectedId?: string | null;
  secondaryLabel?: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.virtualRoom, compact && styles.virtualRoomCompact]}>
      <View style={styles.virtualKitchenWall}>
        <View style={styles.virtualKitchenWindow}>
          <View style={styles.windowPane} />
          <View style={styles.windowPane} />
        </View>
        <View style={styles.virtualKitchenShelfLeft} />
        <View style={styles.virtualKitchenShelfRight} />
      </View>
      <View style={styles.virtualKitchenCounter}>
        <View style={styles.virtualSink} />
        <View style={styles.virtualCabinetLeft} />
        <View style={styles.virtualCabinetCenter} />
        <View style={styles.virtualStove}>
          <View style={styles.stoveBurner} />
          <View style={styles.stoveBurner} />
        </View>
      </View>
      <View style={styles.kitchenPromptPill}>
        <Ionicons color="#008A94" name="hand-left-outline" size={15} />
        <Text style={styles.kitchenPromptText}>Tap one of the kitchen objects</Text>
      </View>
      {objects.map((object, index) => {
          const primarySelected = selectedId === object.id;
          const secondarySelected = secondarySelectedId === object.id;
          const spot = kitchenObjectSpots[index % kitchenObjectSpots.length];
          return (
            <Pressable
              accessibilityLabel={`Choose ${object.label}`}
              key={object.id}
              onPress={() => onSelect(object.id)}
              style={[
                styles.kitchenObject,
                {
                  height: compact ? Math.max(72, spot.height - 12) : spot.height,
                  left: spot.left,
                  top: spot.top,
                  width: spot.width
                },
                compact && styles.roomObjectCompact,
                primarySelected && styles.roomObjectSelected,
                secondarySelected && !primarySelected && styles.roomObjectSecondarySelected
              ]}
            >
              <Ionicons
                color={primarySelected ? "#FFFFFF" : secondarySelected ? "#008A94" : "#30264C"}
                name={object.icon}
                size={compact ? 30 : 36}
              />
              {(primarySelected || (secondarySelected && secondaryLabel)) && (
                <View style={[
                  styles.kitchenObjectLabel,
                  primarySelected && styles.kitchenObjectLabelSelected,
                  secondarySelected && !primarySelected && styles.kitchenObjectLabelSecondary
                ]}>
                  <Text style={[
                    styles.roomObjectText,
                    primarySelected && styles.roomObjectTextSelected
                  ]}>
                    {object.label}
                  </Text>
                  {primarySelected && (
                  <Text style={styles.roomObjectBadge}>{primaryLabel}</Text>
                  )}
                  {secondarySelected && !primarySelected && secondaryLabel && (
                  <Text style={styles.roomObjectSecondaryBadge}>{secondaryLabel}</Text>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
    </View>
  );
}

function PictureGrid({
  pictures,
  selectedId,
  onSelect,
  correctId,
  columns = 2,
  compact = false,
  showResult = false
}: {
  pictures: PictureItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  correctId?: string;
  columns?: 2 | 3;
  compact?: boolean;
  showResult?: boolean;
}) {
  const [failedPictureIds, setFailedPictureIds] = useState<string[]>([]);
  return (
    <View style={[styles.pictureGrid, columns === 3 && styles.pictureGridCompact, compact && styles.remotePictureGridCompact]}>
      {pictures.map((picture) => (
        <Pressable
          accessibilityLabel={picture.label}
          key={picture.id}
          onPress={() => onSelect(picture.id)}
          style={[
            styles.pictureChoice,
            columns === 3 && styles.pictureChoiceThreeColumn,
            compact && styles.remotePictureChoiceCompact,
            selectedId === picture.id && styles.pictureChoiceSelected,
            columns === 3 && selectedId === picture.id && styles.pictureChoiceSelectedCompact,
            showResult && correctId === picture.id && styles.pictureChoiceCorrect
          ]}
        >
          <Image
            onError={() => setFailedPictureIds((current) => current.includes(picture.id) ? current : [...current, picture.id])}
            source={failedPictureIds.includes(picture.id) ? getFallbackPictureSource(picture.id) : picture.source}
            style={styles.pictureChoiceImage}
            resizeMode="cover"
          />
          {selectedId === picture.id && !showResult && (
            <View style={[styles.pictureSelectedBadge, columns === 3 && styles.pictureSelectedBadgeCompact]}>
              <Ionicons color="#FFFFFF" name="checkmark" size={columns === 3 ? 12 : 22} />
            </View>
          )}
          <View style={[styles.pictureChoiceLabel, columns === 3 && styles.pictureChoiceLabelCompact, compact && styles.remotePictureLabelCompact]}>
            <Text style={[styles.pictureChoiceText, columns === 3 && styles.pictureChoiceTextCompact, compact && styles.remotePictureTextCompact]}>{picture.label}</Text>
            {(selectedId === picture.id || (showResult && correctId === picture.id)) && (
              <Ionicons
                color="#FFFFFF"
                name="checkmark-circle"
                size={19}
              />
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function getFallbackPictureSource(id: string) {
  const index = Math.abs(hashString(id)) % fallbackSocialPictures.length;
  return fallbackSocialPictures[index].source;
}

function DrawingPad({
  points,
  setPoints
}: {
  points: Array<{ x: number; y: number; start?: boolean }>;
  setPoints: React.Dispatch<React.SetStateAction<Array<{ x: number; y: number; start?: boolean }>>>;
}) {
  const canvasRef = useRef<any>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const strokePointsRef = useRef<Array<{ x: number; y: number; start?: boolean }>>([]);
  const [hasInk, setHasInk] = useState(points.length > 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    prepareCanvas(canvas);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length !== 0) return;
    const context = getCanvasContext(canvas);
    if (!context) return;
    context.clearRect(0, 0, canvas.clientWidth || 0, canvas.clientHeight || 0);
    setHasInk(false);
  }, [points.length]);

  const beginStroke = (event: any) => {
    event.preventDefault?.();
    const point = getCanvasPoint(event, canvasRef.current);
    if (!point) return;
    drawingRef.current = true;
    lastPointRef.current = point;
    strokePointsRef.current = [{ ...point, start: true }];
    setHasInk(true);
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    drawDot(canvasRef.current, point);
  };

  const continueStroke = (event: any) => {
    if (!drawingRef.current) return;
    event.preventDefault?.();
    const events = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [event];

    events.forEach((moveEvent: any) => {
      const point = getCanvasPoint(moveEvent, canvasRef.current);
      const previous = lastPointRef.current;
      if (!point || !previous) return;
      drawLine(canvasRef.current, previous, point);
      lastPointRef.current = point;
      strokePointsRef.current.push(point);
    });
  };

  const endStroke = (event: any) => {
    if (strokePointsRef.current.length > 0) {
      const finishedStroke = strokePointsRef.current;
      setPoints((current) => [...current, ...finishedStroke]);
    }
    drawingRef.current = false;
    lastPointRef.current = null;
    strokePointsRef.current = [];
    event.currentTarget?.releasePointerCapture?.(event.pointerId);
  };

  return (
    <View style={styles.drawingPad}>
      {!hasInk && (
        <View pointerEvents="none" style={styles.drawingPrompt}>
          <Ionicons color="#B2ACC0" name="pencil-outline" size={24} />
          <Text style={styles.drawingPromptText}>Draw or trace your impressions here</Text>
        </View>
      )}
      {React.createElement("canvas", {
        ref: canvasRef,
        onPointerDown: beginStroke,
        onPointerMove: continueStroke,
        onPointerOut: continueStroke,
        onPointerOver: continueStroke,
        onPointerUp: endStroke,
        onPointerCancel: endStroke,
        style: {
          cursor: "crosshair",
          height: "100%",
          inset: 0,
          position: "absolute",
          touchAction: "none",
          userSelect: "none",
          width: "100%"
        }
      })}
    </View>
  );
}

function prepareCanvas(canvas: any) {
  const rect = canvas.getBoundingClientRect?.();
  if (!rect) return;
  const pixelRatio = (globalThis as any).devicePixelRatio || 1;
  const nextWidth = Math.max(1, Math.floor(rect.width * pixelRatio));
  const nextHeight = Math.max(1, Math.floor(rect.height * pixelRatio));
  if (canvas.width !== nextWidth) canvas.width = nextWidth;
  if (canvas.height !== nextHeight) canvas.height = nextHeight;
  const context = canvas.getContext?.("2d");
  if (!context) return;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 5;
  context.strokeStyle = "#30264C";
  context.fillStyle = "#30264C";
}

function getCanvasContext(canvas: any) {
  if (!canvas) return null;
  prepareCanvas(canvas);
  return canvas.getContext?.("2d") || null;
}

function getCanvasPoint(event: any, canvas: any) {
  const rect = canvas?.getBoundingClientRect?.();
  if (!rect) return null;
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function drawDot(canvas: any, point: { x: number; y: number }) {
  const context = getCanvasContext(canvas);
  if (!context) return;
  context.beginPath();
  context.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
  context.fill();
}

function drawLine(canvas: any, from: { x: number; y: number }, to: { x: number; y: number }) {
  const context = canvas?.getContext?.("2d");
  if (!context) return;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
}

const styles = StyleSheet.create({
  skillFocusCard: { backgroundColor: "#F8F5FF", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, marginBottom: 12, padding: 12 },
  skillFocusHeading: { alignItems: "center", flexDirection: "row", gap: 7 },
  skillFocusTitle: { color: "#30264C", flex: 1, fontSize: 14, fontWeight: "900" },
  skillFocusSkills: { color: "#6544B8", fontSize: 13, fontWeight: "900", lineHeight: 19, marginTop: 7 },
  skillFocusExplanation: { color: "#5D536A", fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 5 },
  header: { borderRadius: 8, borderWidth: 2, marginBottom: 12, minHeight: 150, overflow: "hidden" },
  headerCompact: { marginBottom: 8, minHeight: 116 },
  headerShade: { backgroundColor: "rgba(19, 15, 35, 0.08)", flex: 1, justifyContent: "flex-end", minHeight: 150, padding: 14, paddingTop: 58 },
  headerShadeCompact: { minHeight: 116, padding: 10, paddingTop: 50 },
  headerNavigation: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", left: 12, position: "absolute", right: 12, top: 12 },
  headerNavButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.94)", borderRadius: 8, flexDirection: "row", gap: 5, height: 42, justifyContent: "center", minWidth: 82, paddingHorizontal: 10, shadowColor: "#30264C", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 4 },
  headerDirectionButtons: { flexDirection: "row", gap: 6 },
  headerDirectionButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.94)", borderRadius: 8, flexDirection: "row", gap: 4, minHeight: 42, paddingHorizontal: 10 },
  headerHomeText: { color: "#30264C", fontSize: 12, fontWeight: "900" },
  headerNextText: { color: "#30264C", fontSize: 12, fontWeight: "900" },
  headerTopRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  headerIcon: { alignItems: "center", borderColor: "rgba(255,255,255,0.45)", borderRadius: 8, borderWidth: 1, height: 38, justifyContent: "center", width: 38 },
  headerEyebrow: { color: "#FFFFFF", flex: 1, fontSize: 11, fontWeight: "900", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, textTransform: "uppercase" },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "900", marginTop: 6, textShadowColor: "rgba(0,0,0,0.55)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  headerTitleCompact: { fontSize: 19, marginTop: 3 },
  headerSubtitle: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", lineHeight: 17, marginTop: 4, maxWidth: 620, textShadowColor: "rgba(0,0,0,0.55)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  headerSubtitleCompact: { fontSize: 11, lineHeight: 14, marginTop: 2 },
  eyebrow: { color: "#7555C7", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  title: { color: "#201B35", fontSize: 28, fontWeight: "900", marginTop: 6 },
  subtitle: { color: "#706982", fontSize: 15, lineHeight: 22, marginTop: 8 },
  hero: { aspectRatio: 2.4, backgroundColor: "#F4F0E7", borderRadius: 8, marginBottom: 16, overflow: "hidden", width: "100%" },
  heroImage: { height: "100%", left: 0, position: "absolute", width: "100%" },
  bannerIconLinks: { bottom: "2%", flexDirection: "row", height: "27%", left: "1%", position: "absolute", width: "47%" },
  bannerIconLink: { borderRadius: 6, flex: 1 },
  bannerIconLinkPurple: {},
  bannerIconLinkTeal: {},
  bannerIconLinkPressed: { backgroundColor: "rgba(255,255,255,0.18)" },
  heroCopy: { backgroundColor: "rgba(30,17,55,0.72)", padding: 16 },
  heroEyebrow: { color: "#63E3E0", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  heroTitle: { color: "#FFFFFF", fontSize: 21, fontWeight: "900", lineHeight: 27, marginTop: 4 },
  menuItem: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 12, marginBottom: 12, padding: 14 },
  menuNumber: { alignItems: "center", backgroundColor: "#F1EDFF", borderRadius: 8, height: 40, justifyContent: "center", width: 40 },
  menuNumberText: { color: "#6544B8", fontSize: 17, fontWeight: "900" },
  menuCopy: { flex: 1 },
  menuTitleRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  menuTitle: { color: "#211B34", fontSize: 17, fontWeight: "900" },
  menuTagline: { color: "#00AEBB", fontSize: 13, fontWeight: "800", marginTop: 3 },
  moduleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  moduleGridItem: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#CFEFED", borderRadius: 8, borderWidth: 1, minHeight: 164, padding: 14, width: "48%" },
  moduleIconButton: { alignItems: "center", borderRadius: 8, borderWidth: 1, height: 66, justifyContent: "center", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.28, shadowRadius: 8, width: 66 },
  moduleIconButtonPurple: { backgroundColor: "#7555C7", borderColor: "#DCCFF5", shadowColor: "#7555C7" },
  moduleIconButtonTeal: { backgroundColor: "#008A94", borderColor: "#63E3E0", shadowColor: "#00AEBB" },
  moduleGridCopy: { alignItems: "center", marginTop: 11, width: "100%" },
  moduleGridTitle: { color: "#30264C", fontSize: 14, fontWeight: "900", lineHeight: 19, textAlign: "center" },
  moduleGridTagline: { color: "#7555C7", fontSize: 12, fontWeight: "800", lineHeight: 17, marginTop: 4, textAlign: "center" },
  homeResultsButton: { alignItems: "center", backgroundColor: "#EDFBFB", borderColor: "#00AEBB", borderRadius: 8, borderWidth: 2, flexDirection: "row", gap: 10, marginTop: 16, padding: 13 },
  homeResultsIcon: { alignItems: "center", backgroundColor: "#7555C7", borderColor: "#63E3E0", borderRadius: 8, borderWidth: 1, height: 42, justifyContent: "center", width: 42 },
  homeResultsCopy: { flex: 1 },
  homeResultsTitle: { color: "#30264C", fontSize: 16, fontWeight: "900" },
  homeResultsText: { color: "#706982", fontSize: 11, lineHeight: 16, marginTop: 2 },
  homeLogoutButton: { alignItems: "center", alignSelf: "center", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 12, minHeight: 44, paddingHorizontal: 18, paddingVertical: 10 },
  homeLogoutText: { color: "#008A94", fontSize: 14, fontWeight: "900" },
  progressTrack: { backgroundColor: "#EAE6F4", borderRadius: 8, height: 8, marginBottom: 16, overflow: "hidden" },
  progressFill: { backgroundColor: "#00AEBB", borderRadius: 8, height: "100%" },
  progressLabel: { color: "#008A94", fontSize: 13, fontWeight: "900", marginBottom: 7 },
  knowingGuidance: { alignItems: "flex-start", backgroundColor: "#EDFBFB", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 10, marginBottom: 12, padding: 12 },
  knowingGuidanceText: { color: "#4C4260", flex: 1, fontSize: 13, lineHeight: 19 },
  colorGrid: { alignSelf: "center", flexDirection: "row", gap: 7, justifyContent: "center", maxWidth: 390, width: "100%" },
  colorBox: { alignItems: "center", aspectRatio: 0.92, borderColor: "#FFFFFF", borderRadius: 8, borderWidth: 3, justifyContent: "flex-end", overflow: "hidden", position: "relative", width: "31%" },
  selectedColorBox: { borderColor: "#30264C", shadowColor: "#30264C", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8 },
  correctColorBox: { borderColor: "#43C987", borderWidth: 5, shadowColor: "#43C987", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.75, shadowRadius: 14 },
  revealImage: { height: "100%", left: 0, position: "absolute", top: 0, width: "100%" },
  colorCover: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  colorLabel: { alignItems: "center", backgroundColor: "rgba(30,17,55,0.62)", flexDirection: "row", gap: 5, justifyContent: "center", padding: 7, width: "100%" },
  colorText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  message: { backgroundColor: "#FFF8F8", borderColor: "#E8C7CA", borderRadius: 8, borderWidth: 1, marginVertical: 14, padding: 14 },
  correctMessage: { backgroundColor: "#EDFFF6", borderColor: "#43C987" },
  messageTitle: { color: "#30264C", fontSize: 17, fontWeight: "900" },
  messageText: { color: "#706982", fontSize: 14, marginTop: 4 },
  remoteResultCompact: { marginBottom: 5, marginTop: 0, padding: 7 },
  remoteResultTitleCompact: { fontSize: 14 },
  remoteResultTextCompact: { fontSize: 11, lineHeight: 15, marginTop: 1 },
  remoteAnswerStage: { marginTop: 0, paddingBottom: 4 },
  remoteNextButtonCompact: { marginBottom: 0, minHeight: 36, padding: 7 },
  choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  choice: { backgroundColor: "#F8F7FC", borderColor: "#E4DFF0", borderRadius: 8, borderWidth: 1, minWidth: "47%", padding: 14 },
  selectedChoice: { backgroundColor: "#008A94", borderColor: "#00AEBB" },
  choiceText: { color: "#393149", fontSize: 15, fontWeight: "800", textAlign: "center" },
  selectedChoiceText: { color: "#FFFFFF" },
  primaryButton: { alignItems: "center", backgroundColor: "#7555C7", borderColor: "#63E3E0", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 10, minHeight: 48, padding: 12 },
  secondaryButton: { alignItems: "center", backgroundColor: "#008A94", borderRadius: 8, justifyContent: "center", marginBottom: 14, minHeight: 48, padding: 12 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  secondaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  disabledButton: { opacity: 0.4 },
  resultsPanel: { alignItems: "center", backgroundColor: "#F8F7FC", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, marginBottom: 16, padding: 34 },
  resultsNumber: { color: "#30264C", fontSize: 52, fontWeight: "900", marginTop: 10 },
  resultsLabel: { color: "#706982", fontSize: 16, fontWeight: "700" },
  resultsPoints: { color: "#00AEBB", fontSize: 16, fontWeight: "900", marginTop: 14 },
  abilityMessage: { backgroundColor: "#EDFBFB", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, marginTop: 18, padding: 14, width: "100%" },
  abilityMessageStrong: { backgroundColor: "#FFF4D8", borderColor: "#F4C95D", borderWidth: 2, shadowColor: "#F4C95D", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 10 },
  abilityMessageTitle: { color: "#008A94", fontSize: 18, fontWeight: "900", textAlign: "center" },
  abilityMessageTitleStrong: { color: "#7555C7", fontSize: 21 },
  abilityMessageText: { color: "#706982", fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: "center" },
  lessonCard: { backgroundColor: "#F8F7FC", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, marginBottom: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  lessonIcon: { alignItems: "center", backgroundColor: "#EDFBFB", borderRadius: 8, height: 48, justifyContent: "center", marginBottom: 14, width: 48 },
  lessonPoint: { alignItems: "flex-start", flexDirection: "row", gap: 7, marginBottom: 6 },
  lessonPointText: { color: "#393149", flex: 1, fontSize: 13, lineHeight: 18 },
  practiceCard: { backgroundColor: "#EDFBFB", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, marginBottom: 8, padding: 12 },
  reflectionCard: { backgroundColor: "#FFF9E8", borderColor: "#F1DFA6", borderRadius: 8, borderWidth: 1, marginBottom: 8, padding: 12 },
  learningReminder: { backgroundColor: "#FFF9E8", borderColor: "#E9D17E", borderRadius: 8, borderWidth: 2, marginBottom: 14, padding: 16 },
  learningReminderCompact: { marginBottom: 8, padding: 12 },
  reminderHeading: { alignItems: "center", flexDirection: "row", gap: 8, marginBottom: 10 },
  reminderTitle: { color: "#6544B8", flex: 1, fontSize: 17, fontWeight: "900" },
  learningChoiceGrid: { gap: 10, marginBottom: 10 },
  learningIdeaChoice: { backgroundColor: "#FFFFFF", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 2, padding: 12 },
  learningIdeaChoiceSelected: { backgroundColor: "#EDFBFB", borderColor: "#00AEBB" },
  learningIdeaChoiceLocked: { opacity: 0.78 },
  learningIdeaHeader: { alignItems: "center", flexDirection: "row", gap: 8, marginBottom: 8 },
  learningIdeaNumber: { alignItems: "center", backgroundColor: "#F8F7FC", borderColor: "#DCCFF5", borderRadius: 999, borderWidth: 1, height: 28, justifyContent: "center", width: 28 },
  learningIdeaNumberSelected: { backgroundColor: "#008A94", borderColor: "#008A94" },
  learningIdeaNumberText: { color: "#6544B8", fontSize: 13, fontWeight: "900" },
  learningIdeaNumberTextSelected: { color: "#FFFFFF" },
  learningIdeaTitle: { color: "#6544B8", flex: 1, fontSize: 15, fontWeight: "900" },
  learningIdeaTitleSelected: { color: "#008A94" },
  learningIdeaText: { color: "#30264C", fontSize: 14, fontWeight: "800", lineHeight: 20 },
  learningIdeaReflection: { color: "#706982", fontSize: 12, fontWeight: "700", lineHeight: 17, marginTop: 7 },
  learningChallengeCard: { backgroundColor: "#EDFBFB", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, marginBottom: 16, padding: 16 },
  learningChallengeCardCompact: { marginBottom: 8, padding: 12 },
  learningJournalInputCompact: { marginBottom: 7, marginTop: 7, minHeight: 62, padding: 10 },
  learningSubmitButton: { marginBottom: 4, minHeight: 44, padding: 10 },
  journalHint: { color: "#008A94", fontSize: 12, fontWeight: "800", lineHeight: 18 },
  savedTaskBanner: { alignItems: "center", backgroundColor: "#EAF8EF", borderColor: "#BDE8CA", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 8, marginBottom: 10, padding: 10 },
  savedTaskText: { color: "#239963", flex: 1, fontSize: 13, fontWeight: "900" },
  taskActionRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  taskEditButton: { backgroundColor: "#FFFFFF", borderColor: "#DCCFF5", borderWidth: 1, flex: 1, marginBottom: 0 },
  taskEditButtonText: { color: "#6544B8", fontSize: 15, fontWeight: "900" },
  taskContinueButton: { flex: 1, marginBottom: 0 },
  pointsEarnedText: { color: "#239963", fontSize: 12, fontWeight: "900", marginTop: 2, textAlign: "center" },
  historyHeading: { marginBottom: 10 },
  premiumPill: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "#EDFBFB", borderRadius: 8, flexDirection: "row", gap: 5, paddingHorizontal: 9, paddingVertical: 6 },
  premiumPillText: { color: "#008A94", fontSize: 11, fontWeight: "900" },
  historyEntry: { backgroundColor: "#FFFFFF", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  historyDate: { color: "#7555C7", fontSize: 12, fontWeight: "900", marginBottom: 6, textTransform: "uppercase" },
  historyChallenge: { color: "#30264C", fontSize: 15, fontWeight: "900", lineHeight: 21 },
  historyResponse: { color: "#706982", fontSize: 14, lineHeight: 20, marginTop: 7 },
  practiceLabel: { color: "#6544B8", fontSize: 12, fontWeight: "900", marginBottom: 4, textTransform: "uppercase" },
  practiceText: { color: "#393149", fontSize: 14, lineHeight: 19 },
  loadingPanel: { alignItems: "center", backgroundColor: "#F8F5FF", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, gap: 12, marginBottom: 16, padding: 24 },
  loadingPanelText: { color: "#30264C", fontSize: 15, fontWeight: "800", textAlign: "center" },
  personPortraitFrame: { alignSelf: "center", backgroundColor: "#F8F7FC", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, height: 320, marginBottom: 16, maxWidth: 360, overflow: "hidden", width: "100%" },
  personPortrait: { height: "100%", width: "100%" },
  personHistory: { backgroundColor: "#EDFBFB", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, marginBottom: 16, padding: 16 },
  selectionCount: { color: "#6544B8", fontSize: 14, fontWeight: "900", marginBottom: 10 },
  attributeList: { flexDirection: "row", flexWrap: "wrap", gap: 7, justifyContent: "space-between", marginBottom: 16 },
  attributeChoice: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 52, padding: 8, width: "48.5%" },
  attributeSelected: { backgroundColor: "#EDFBFB", borderColor: "#00AEBB" },
  attributeCorrect: { backgroundColor: "#EDFFF6", borderColor: "#43C987", borderWidth: 2 },
  attributeCorrectSelected: { backgroundColor: "#18B86A", borderColor: "#079653", borderWidth: 3, shadowColor: "#18B86A", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 9 },
  attributeCorrectSelectedText: { color: "#FFFFFF", fontWeight: "900" },
  attributeIncorrect: { backgroundColor: "#FFF4F4", borderColor: "#D99196" },
  attributeText: { color: "#393149", flex: 1, fontSize: 11, fontWeight: "700", lineHeight: 14 },
  scoreAdded: { alignItems: "center", backgroundColor: "#EDFBFB", borderRadius: 8, flexDirection: "row", gap: 10, marginBottom: 12, padding: 14 },
  scoreAddedText: { color: "#008A94", flex: 1, fontSize: 15, fontWeight: "900" },
  selectionPrompt: { alignItems: "center", backgroundColor: "#EDFBFB", borderRadius: 8, flexDirection: "row", gap: 10, marginBottom: 14, padding: 14 },
  selectionPromptText: { color: "#008A94", flex: 1, fontSize: 14, fontWeight: "800", lineHeight: 20 },
  birthdateCard: { backgroundColor: "#F8F7FC", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, padding: 18 },
  birthDetailsHeader: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 12 },
  birthDetailsDropdown: { alignItems: "center", flexDirection: "row", gap: 10 },
  birthDetailsSummary: { color: "#706982", fontSize: 13, fontWeight: "700", lineHeight: 18, marginTop: 3 },
  astrologyIcon: { alignItems: "center", backgroundColor: "#F1EDFF", borderRadius: 8, height: 54, justifyContent: "center", marginBottom: 18, width: 54 },
  inputLabel: { color: "#30264C", fontSize: 14, fontWeight: "900", marginBottom: 7 },
  optionalLabel: { color: "#8A8299", fontSize: 12, fontWeight: "700" },
  birthdateInput: { backgroundColor: "#FFFFFF", borderColor: "#DAD3E8", borderRadius: 8, borderWidth: 1, color: "#30264C", fontSize: 17, marginBottom: 7, paddingHorizontal: 14, paddingVertical: 12 },
  birthTimePicker: { alignSelf: "center", backgroundColor: "#FFFFFF", borderColor: "#DAD3E8", borderRadius: 28, borderWidth: 1, marginBottom: 10, maxWidth: 306, padding: 10, width: "100%" },
  birthTimeHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 6, paddingHorizontal: 4 },
  birthTimeSelected: { color: "#008A94", fontSize: 12, fontWeight: "900", marginTop: -2, textAlign: "center" },
  birthTimeClearButton: { backgroundColor: "#F8F7FC", borderColor: "#DCCFF5", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  birthTimeClearText: { color: "#6544B8", fontSize: 12, fontWeight: "900" },
  birthTimeLabelRow: { flexDirection: "row", gap: 6, marginBottom: 5 },
  birthTimePickerLabel: { color: "#706982", flex: 1, fontSize: 10, fontWeight: "900", textAlign: "center", textTransform: "uppercase" },
  birthTimeScroller: { marginBottom: 7 },
  birthTimeOption: { alignItems: "center", backgroundColor: "#F8F7FC", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, justifyContent: "center", marginRight: 6, minHeight: 38, minWidth: 44, paddingHorizontal: 10 },
  birthTimeOptionSelected: { backgroundColor: "#6544B8", borderColor: "#6544B8" },
  birthTimeOptionText: { color: "#30264C", fontSize: 14, fontWeight: "900" },
  birthTimeOptionTextSelected: { color: "#FFFFFF" },
  birthTimePeriodRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  birthTimePeriodButton: { alignItems: "center", backgroundColor: "#EDFBFB", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 42 },
  birthTimeWheelRow: { flexDirection: "row", gap: 6 },
  birthTimeWheelColumn: { flex: 1 },
  birthTimeWheelScroller: { backgroundColor: "#F8F7FC", borderColor: "#CFC6E1", borderRadius: 18, borderWidth: 1, maxHeight: 126, minHeight: 126, paddingVertical: 4 },
  birthTimeWheelOption: { alignItems: "center", borderRadius: 999, justifyContent: "center", marginHorizontal: 4, marginVertical: 3, minHeight: 32 },
  birthTimeScrollHint: { color: "#706982", fontSize: 11, fontWeight: "800", lineHeight: 15, marginTop: 7, textAlign: "center" },
  inputError: { color: "#B15A60", fontSize: 13, fontWeight: "700", marginBottom: 8 },
  inviteStatus: { color: "#008A94", fontSize: 12, fontWeight: "800", lineHeight: 17, marginBottom: 10, marginTop: -4 },
  birthChartNote: { color: "#706982", fontSize: 13, lineHeight: 19, marginBottom: 16 },
  birthChartTitle: { color: "#30264C", fontSize: 16, fontWeight: "900" },
  signBanner: { alignItems: "center", backgroundColor: "#6544B8", borderRadius: 8, flexDirection: "row", gap: 12, marginBottom: 14, padding: 16 },
  signSymbol: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 8, height: 46, justifyContent: "center", width: 46 },
  signTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  signSubtitle: { color: "#E7DFFF", fontSize: 13, fontWeight: "700", marginTop: 3 },
  signDetail: { color: "#C9F5F1", fontSize: 11, fontWeight: "800", marginTop: 4, textTransform: "uppercase" },
  fullChartCard: { backgroundColor: "#F8F5FF", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, marginBottom: 14, padding: 14 },
  fullChartTitle: { color: "#30264C", fontSize: 16, fontWeight: "900", marginBottom: 10 },
  fullChartGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  fullChartItem: { backgroundColor: "#FFFFFF", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, minWidth: "47%", padding: 10 },
  fullChartLabel: { color: "#7555C7", fontSize: 11, fontWeight: "900", marginBottom: 3, textTransform: "uppercase" },
  fullChartValue: { color: "#30264C", fontSize: 15, fontWeight: "900" },
  fullChartAspect: { color: "#008A94", fontSize: 13, fontWeight: "900", lineHeight: 18, marginBottom: 7 },
  fullChartSource: { color: "#706982", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  astrologyTip: { alignItems: "flex-start", backgroundColor: "#FFFFFF", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 12, marginBottom: 10, padding: 14 },
  astrologyChoicesHeading: { alignItems: "center", backgroundColor: "#F8F5FF", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 10, marginBottom: 10, padding: 12 },
  astrologyChoicesTitle: { color: "#30264C", fontSize: 16, fontWeight: "900" },
  astrologyChoicesSubtitle: { color: "#706982", fontSize: 11, lineHeight: 16, marginTop: 2 },
  tipNumber: { alignItems: "center", backgroundColor: "#EDFBFB", borderRadius: 8, height: 34, justifyContent: "center", width: 34 },
  tipNumberText: { color: "#008A94", fontSize: 15, fontWeight: "900" },
  tipText: { color: "#393149", flex: 1, fontSize: 15, lineHeight: 22 },
  dailyActionCard: { backgroundColor: "#EDFBFB", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, marginBottom: 14, padding: 16 },
  chartSynopsisCard: { backgroundColor: "#F8F5FF", borderColor: "#CDBDEA", borderRadius: 8, borderWidth: 2, marginBottom: 14, padding: 16 },
  chartSynopsisHeading: { alignItems: "center", flexDirection: "row", gap: 9, marginBottom: 8 },
  chartSynopsisTitle: { color: "#30264C", fontSize: 17, fontWeight: "900" },
  chartSynopsisText: { color: "#5D536A", fontSize: 14, lineHeight: 22 },
  followUpCard: { backgroundColor: "#FFF9E8", borderColor: "#F1DFA6", borderRadius: 8, borderWidth: 1, marginBottom: 14, padding: 16 },
  followUpPlan: { color: "#30264C", fontSize: 16, fontWeight: "800", lineHeight: 23, marginBottom: 14 },
  journalInput: { backgroundColor: "#FFFFFF", borderColor: "#DAD3E8", borderRadius: 8, borderWidth: 1, color: "#30264C", fontSize: 15, lineHeight: 21, marginBottom: 10, marginTop: 10, minHeight: 96, padding: 12 },
  journalInputLocked: { backgroundColor: "#F8F7FC", borderColor: "#BDE8CA" },
  virtualRoom: { alignSelf: "center", aspectRatio: 1.22, backgroundColor: "#F8FCFC", borderColor: "#00AEBB", borderRadius: 8, borderWidth: 2, marginBottom: 12, maxWidth: 620, overflow: "hidden", position: "relative", width: "100%" },
  virtualRoomCompact: { maxWidth: 560 },
  virtualKitchenWall: { backgroundColor: "#F4FAFA", borderBottomColor: "#9FD9D9", borderBottomWidth: 2, height: "62%", left: 0, position: "absolute", right: 0, top: 0 },
  virtualKitchenWindow: { backgroundColor: "#FFFFFF", borderColor: "#69BFC7", borderRadius: 8, borderWidth: 3, flexDirection: "row", gap: 4, height: "42%", justifyContent: "center", left: "35%", padding: 5, position: "absolute", top: "13%", width: "24%" },
  windowPane: { backgroundColor: "#C9F5F1", borderRadius: 5, flex: 1 },
  virtualKitchenShelfLeft: { backgroundColor: "#D7B37D", borderRadius: 8, height: 8, left: "6%", position: "absolute", top: "29%", width: "23%" },
  virtualKitchenShelfRight: { backgroundColor: "#D7B37D", borderRadius: 8, height: 8, position: "absolute", right: "7%", top: "30%", width: "29%" },
  virtualKitchenCounter: { backgroundColor: "#FFFDF8", borderTopColor: "#8CCFD0", borderTopWidth: 3, bottom: 0, height: "42%", left: 0, position: "absolute", right: 0 },
  virtualSink: { backgroundColor: "#D8F4F2", borderColor: "#69BFC7", borderRadius: 8, borderWidth: 2, height: "30%", left: "30%", position: "absolute", top: "14%", width: "22%" },
  virtualCabinetLeft: { backgroundColor: "#4BA6BD", borderColor: "rgba(255,255,255,0.85)", borderRadius: 8, borderWidth: 1, bottom: 0, left: "4%", position: "absolute", top: "46%", width: "30%" },
  virtualCabinetCenter: { backgroundColor: "#4BA6BD", borderColor: "rgba(255,255,255,0.85)", borderRadius: 8, borderWidth: 1, bottom: 0, left: "36%", position: "absolute", top: "46%", width: "26%" },
  virtualStove: { backgroundColor: "#F8F7FC", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 2, flexDirection: "row", gap: 8, height: "36%", justifyContent: "center", padding: 9, position: "absolute", right: "6%", top: "12%", width: "26%" },
  stoveBurner: { backgroundColor: "#30264C", borderRadius: 20, height: 25, opacity: 0.75, width: 25 },
  kitchenPromptPill: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.94)", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 5, left: 12, paddingHorizontal: 9, paddingVertical: 7, position: "absolute", top: 12 },
  kitchenPromptText: { color: "#30264C", fontSize: 11, fontWeight: "900" },
  kitchenStepPanel: { alignItems: "center", backgroundColor: "#EDFBFB", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, gap: 7, marginBottom: 14, marginTop: -4, padding: 11 },
  kitchenStepText: { color: "#30264C", fontSize: 13, fontWeight: "800", lineHeight: 18, textAlign: "center" },
  kitchenResetButton: { backgroundColor: "#F1EDFF", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  kitchenResetText: { color: "#7555C7", fontSize: 12, fontWeight: "900" },
  kitchenBacksplash: { backgroundColor: "rgba(237,251,251,0.82)", borderBottomColor: "#BFE8E8", borderBottomWidth: 1, height: 104, left: 0, position: "absolute", right: 0, top: 0 },
  kitchenCabinetRow: { flexDirection: "row", gap: 8, left: 16, position: "absolute", right: 88, top: 14 },
  kitchenCabinet: { backgroundColor: "rgba(117,85,199,0.16)", borderColor: "rgba(117,85,199,0.3)", borderRadius: 8, borderWidth: 1, flex: 1, height: 34 },
  roomWindow: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, height: 42, justifyContent: "center", position: "absolute", right: 14, top: 13, width: 56 },
  roomShelf: { backgroundColor: "#8F65D6", borderRadius: 8, height: 8, left: 18, position: "absolute", right: 18, top: 92 },
  roomObjectGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between", marginTop: 105, zIndex: 2 },
  roomObject: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 2, justifyContent: "center", minHeight: 86, overflow: "hidden", padding: 5, width: "31.5%" },
  kitchenObject: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.72)", borderColor: "rgba(255,255,255,0.75)", borderRadius: 8, borderWidth: 1, elevation: 5, justifyContent: "center", overflow: "visible", padding: 3, position: "absolute", shadowColor: "#30264C", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 5, zIndex: 3 },
  roomObjectCompact: { minHeight: 78 },
  roomObjectSelected: { backgroundColor: "#7555C7", borderColor: "#63E3E0", shadowColor: "#7555C7", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 14 },
  roomObjectSecondarySelected: { backgroundColor: "#EDFBFB", borderColor: "#00AEBB", shadowColor: "#00AEBB", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10 },
  roomObjectImage: { borderColor: "rgba(255,255,255,0.45)", borderRadius: 8, borderWidth: 1, height: "100%", width: "100%" },
  kitchenObjectLabel: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.94)", borderRadius: 7, left: 0, paddingHorizontal: 4, paddingVertical: 2, position: "absolute", right: 0, top: "82%" },
  kitchenObjectLabelSelected: { backgroundColor: "rgba(117,85,199,0.95)" },
  kitchenObjectLabelSecondary: { backgroundColor: "rgba(237,251,251,0.95)" },
  roomObjectText: { color: "#30264C", fontSize: 10, fontWeight: "900", textAlign: "center" },
  roomObjectTextSelected: { color: "#FFFFFF" },
  roomObjectBadge: { color: "#FFFFFF", fontSize: 8, fontWeight: "900", marginTop: 3, textAlign: "center", textTransform: "uppercase" },
  roomObjectSecondaryBadge: { color: "#008A94", fontSize: 8, fontWeight: "900", marginTop: 3, textAlign: "center", textTransform: "uppercase" },
  roomFloor: { backgroundColor: "#F1EDFF", borderTopColor: "#DCCFF5", borderTopWidth: 1, bottom: 0, height: 48, left: 0, position: "absolute", right: 0 },
  pictureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  pictureGridCompact: { gap: 5, marginBottom: 7 },
  remotePictureGridCompact: { gap: 6, marginBottom: 5 },
  pictureChoice: { aspectRatio: 1.1, borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 2, minWidth: "47%", overflow: "hidden", position: "relative" },
  pictureChoiceThreeColumn: { aspectRatio: 1.75, minWidth: 0, width: "31.8%" },
  remotePictureChoiceCompact: { aspectRatio: 1.35 },
  pictureChoiceSelected: { backgroundColor: "#E9DFFF", borderColor: "#6A35D4", borderWidth: 6, elevation: 10, shadowColor: "#6A35D4", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 16 },
  pictureChoiceSelectedCompact: { borderWidth: 4, shadowRadius: 10 },
  pictureChoiceCorrect: { borderColor: "#18B86A", borderWidth: 5, shadowColor: "#18B86A", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.95, shadowRadius: 18 },
  pictureChoiceImage: { height: "100%", width: "100%" },
  pictureSelectedBadge: { alignItems: "center", backgroundColor: "#6A35D4", borderColor: "#FFFFFF", borderRadius: 20, borderWidth: 3, height: 38, justifyContent: "center", position: "absolute", right: 7, top: 7, width: 38 },
  pictureSelectedBadgeCompact: { borderRadius: 9, borderWidth: 2, height: 18, right: 2, top: 2, width: 18 },
  pictureChoiceLabel: { alignItems: "center", backgroundColor: "rgba(30,17,55,0.72)", bottom: 0, flexDirection: "row", gap: 5, justifyContent: "center", left: 0, padding: 7, position: "absolute", right: 0 },
  pictureChoiceLabelCompact: { gap: 1, minHeight: 20, padding: 1 },
  remotePictureLabelCompact: { minHeight: 20, padding: 2 },
  pictureChoiceText: { color: "#FFFFFF", flexShrink: 1, fontSize: 12, fontWeight: "900", textAlign: "center" },
  pictureChoiceTextCompact: { fontSize: 8, lineHeight: 9 },
  remotePictureTextCompact: { fontSize: 8, lineHeight: 9 },
  prototypeNote: { color: "#706982", fontSize: 12, lineHeight: 18, marginBottom: 14, textAlign: "center" },
  pendingPanel: { alignItems: "center", backgroundColor: "#F8F7FC", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, marginBottom: 16, padding: 26 },
  pendingTitle: { color: "#30264C", fontSize: 21, fontWeight: "900", marginTop: 10 },
  pendingText: { color: "#706982", fontSize: 14, lineHeight: 21, marginTop: 7, textAlign: "center" },
  sealedRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  sealedItem: { flex: 1 },
  sealedImage: { aspectRatio: 1, borderRadius: 8, width: "100%" },
  sealedObject: { alignItems: "center", aspectRatio: 1, backgroundColor: "#F8F5FF", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, justifyContent: "center", padding: 8, width: "100%" },
  sealedObjectImage: { borderRadius: 6, height: 54, width: "100%" },
  sealedObjectText: { color: "#30264C", fontSize: 11, fontWeight: "900", marginTop: 6, textAlign: "center" },
  hiddenChoice: { alignItems: "center", aspectRatio: 1, backgroundColor: "#6544B8", borderRadius: 8, justifyContent: "center", width: "100%" },
  answerNavigation: { flexDirection: "row", gap: 8, marginBottom: 14 },
  answerNavButton: { alignItems: "center", backgroundColor: "#F1EDFF", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, flex: 1, gap: 3, justifyContent: "center", minHeight: 58, padding: 7 },
  answerNavForward: { backgroundColor: "#7555C7", borderColor: "#7555C7" },
  answerNavText: { color: "#6544B8", fontSize: 11, fontWeight: "900" },
  answerNavForwardText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  opponentToggle: { backgroundColor: "#EDFBFB", borderRadius: 8, flexDirection: "row", gap: 6, marginBottom: 16, padding: 5 },
  opponentOption: { alignItems: "center", borderRadius: 8, flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 44, padding: 8 },
  opponentOptionSelected: { backgroundColor: "#008A94" },
  opponentOptionText: { color: "#008A94", flexShrink: 1, fontSize: 13, fontWeight: "900", textAlign: "center" },
  opponentOptionTextSelected: { color: "#FFFFFF" },
  friendPhoneRow: { alignItems: "stretch", flexDirection: "row", gap: 7 },
  friendPhoneInput: { flex: 1 },
  addFriendButton: { alignItems: "center", backgroundColor: "#008A94", borderRadius: 8, height: 48, justifyContent: "center", width: 48 },
  savedFriendsLabel: { color: "#706982", fontSize: 11, fontWeight: "800", marginBottom: 7, marginTop: 5 },
  friendPlayConfirmation: { alignItems: "center", backgroundColor: "#F8F5FF", borderColor: "#BFADE8", borderRadius: 8, borderWidth: 2, gap: 8, marginBottom: 12, marginTop: 12, padding: 14 },
  friendPlayConfirmationTitle: { color: "#30264C", fontSize: 17, fontWeight: "900", textAlign: "center" },
  friendPlayConfirmationText: { color: "#706982", fontSize: 13, fontWeight: "700", marginBottom: 2, textAlign: "center" },
  savedFriendsDropdownButton: { alignItems: "center", backgroundColor: "#F8F7FC", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginBottom: 8, marginTop: 4, paddingHorizontal: 10, paddingVertical: 9 },
  savedFriendsDropdownTitle: { alignItems: "center", flexDirection: "row", gap: 7 },
  friendChipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  friendChip: { alignItems: "center", backgroundColor: "#F8F7FC", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 5, maxWidth: "100%", paddingHorizontal: 8, paddingVertical: 7 },
  friendChipSelected: { backgroundColor: "#008A94", borderColor: "#00AEBB" },
  friendChipCopy: { flexShrink: 1 },
  friendChipText: { color: "#008A94", flexShrink: 1, fontSize: 11, fontWeight: "800" },
  friendChipDetail: { color: "#706982", flexShrink: 1, fontSize: 10, fontWeight: "700", marginTop: 1 },
  friendChipTextSelected: { color: "#FFFFFF" },
  selectedFriendsCount: { color: "#008A94", fontSize: 11, fontWeight: "900", marginBottom: 12, marginTop: 8 },
  computerWinPanel: { backgroundColor: "#EDFFF6", borderColor: "#43C987" },
  treasureSplitLayout: { alignItems: "stretch", flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 28, paddingBottom: 28 },
  treasureControlPanel: { flex: 1.02, minWidth: 300 },
  treasurePreviewPanel: { alignSelf: "flex-start", backgroundColor: "#FFF9E8", borderColor: "#F2D88F", borderRadius: 8, borderWidth: 1, flex: 0.82, justifyContent: "flex-start", minWidth: 300, padding: 10 },
  treasureModeGrid: { gap: 12, marginBottom: 14 },
  treasureModeCard: { alignItems: "flex-start", backgroundColor: "#FFFFFF", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, gap: 8, minHeight: 132, padding: 16 },
  treasureModeTitle: { color: "#30264C", fontSize: 20, fontWeight: "900" },
  treasureModeText: { color: "#706982", fontSize: 14, fontWeight: "700", lineHeight: 20 },
  treasureScene: { aspectRatio: 1.28, borderColor: "rgba(255,255,255,0.86)", borderRadius: 8, borderWidth: 1, minHeight: 250, maxHeight: 310, overflow: "hidden", position: "relative", width: "100%" },
  treasureSceneFriend: { borderColor: "#DCCFF5" },
  treasureSceneComputer: { borderColor: "#BFE8E8" },
  treasureSceneActive: { borderColor: "#F2D88F" },
  treasureSceneWon: { borderColor: "#43C987", borderWidth: 2 },
  treasureSceneLost: { borderColor: "#CFC8DA" },
  treasureSceneImage: { borderRadius: 8 },
  treasureSceneShade: { backgroundColor: "rgba(255,255,255,0.04)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  treasureSceneSky: { display: "none" },
  treasureSceneGround: { display: "none" },
  realTreasureChestWrap: { alignItems: "center", bottom: -36, height: "78%", justifyContent: "flex-end", left: -20, position: "absolute", right: -20, zIndex: 2 },
  realTreasureChestImage: { height: "100%", width: "112%" },
  realTreasureShadow: { backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 999, bottom: 16, height: 30, left: "12%", position: "absolute", right: "12%" },
  realTreasureGlow: { backgroundColor: "rgba(255, 231, 122, 0.48)", borderRadius: 999, height: "24%", left: "31%", opacity: 0.88, position: "absolute", right: "31%", shadowColor: "#FFE77A", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.82, shadowRadius: 20, top: "48%", zIndex: 3 },
  treasureInspirationLayer: { alignItems: "center", bottom: "48%", flexDirection: "row", flexWrap: "wrap", gap: 7, justifyContent: "center", left: "8%", position: "absolute", right: "8%", zIndex: 6 },
  treasureInspirationWord: { color: "#FFFFFF", fontSize: 18, fontWeight: "900", textShadowColor: "rgba(88, 49, 8, 0.55)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  treasureMoon: { backgroundColor: "#FFF9E8", borderRadius: 24, height: 48, position: "absolute", right: 22, top: 15, width: 48 },
  treasureStarOne: { backgroundColor: "#63E3E0", borderRadius: 5, height: 10, left: 28, position: "absolute", top: 20, width: 10 },
  treasureStarTwo: { backgroundColor: "#FFFFFF", borderRadius: 4, height: 8, left: "45%", position: "absolute", top: 34, width: 8 },
  treasureStarThree: { backgroundColor: "#F4C542", borderRadius: 4, height: 8, left: "63%", position: "absolute", top: 17, width: 8 },
  treasureChestVisual: { display: "none" },
  treasureChestLid: { backgroundColor: "#8A4F20", borderColor: "#F4C542", borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 3, height: 34, position: "absolute", top: 4, width: 118 },
  treasureChestLidOpen: { top: -7 },
  treasureChestBase: { backgroundColor: "#7A3E18", borderColor: "#F4C542", borderRadius: 8, borderWidth: 3, height: 45, width: 126 },
  treasureChestLock: { alignItems: "center", backgroundColor: "#F4C542", borderColor: "#8A6B20", borderRadius: 8, borderWidth: 1, height: 30, justifyContent: "center", position: "absolute", top: 34, width: 32, zIndex: 2 },
  treasureGlow: { alignItems: "center", backgroundColor: "rgba(244,197,66,0.45)", borderRadius: 30, height: 60, justifyContent: "center", position: "absolute", top: -28, width: 60 },
  treasureGlowText: { color: "#FFFFFF", fontSize: 30, fontWeight: "900" },
  treasureChestCard: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.88)", borderColor: "rgba(242,216,143,0.9)", borderRadius: 8, borderWidth: 1, marginTop: 8, padding: 10 },
  treasureChestTitle: { color: "#30264C", fontSize: 17, fontWeight: "900", marginTop: 6, textAlign: "center" },
  treasurePointsText: { color: "#008A94", fontSize: 14, fontWeight: "900", marginTop: 6, textAlign: "center" },
  treasureChestText: { color: "#5D536A", fontSize: 14, fontWeight: "800", lineHeight: 21, marginTop: 6, textAlign: "center" },
  treasureResponseStatus: { backgroundColor: "#EDFFF6", borderColor: "#43C987", borderRadius: 8, borderWidth: 1, color: "#176B49", fontSize: 13, fontWeight: "900", lineHeight: 19, marginTop: 10, padding: 10, textAlign: "center" },
  treasureStatusList: { backgroundColor: "#FFFFFF", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, gap: 8, marginTop: 12, padding: 12 },
  treasureStatusHeading: { color: "#30264C", fontSize: 15, fontWeight: "900" },
  treasureStatusRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  treasureStatusFriend: { color: "#5D536A", flex: 1, fontSize: 13, fontWeight: "800" },
  treasureStatusBadge: { backgroundColor: "#EDFBFB", borderRadius: 20, color: "#007C86", fontSize: 12, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5 },
  treasureStatusScore: { alignItems: "flex-end", gap: 3 },
  treasureStatusDetail: { color: "#706982", fontSize: 11, fontWeight: "800" },
  treasureStatusDeliveryProblem: { color: "#B0454C" },
  treasureCompetitionRules: { backgroundColor: "#FFF9E8", borderColor: "#F2D88F", borderRadius: 8, borderWidth: 1, color: "#6F5416", fontSize: 12, fontWeight: "800", lineHeight: 18, marginBottom: 10, marginTop: 8, padding: 10 },
  treasureFriendMessageCard: { backgroundColor: "#FFFFFF", borderColor: "#63E3E0", borderRadius: 8, borderWidth: 2, marginTop: 10, padding: 14 },
  treasureFriendMessageHeader: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 8 },
  treasureFriendMessageTitle: { color: "#6544B8", fontSize: 14, fontWeight: "900", textAlign: "center" },
  treasureNoteText: { color: "#008A94", fontSize: 18, fontWeight: "900", lineHeight: 25, textAlign: "center" },
  treasureSiteInviteCard: { backgroundColor: "#F8F5FF", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 2, marginTop: 10, padding: 14 },
  treasureSiteInviteTitle: { color: "#30264C", fontSize: 16, fontWeight: "900", textAlign: "center" },
  treasureSiteInviteText: { color: "#5D536A", fontSize: 14, fontWeight: "800", lineHeight: 21, marginBottom: 12, textAlign: "center" },
  treasureSiteInviteButton: { alignItems: "center", backgroundColor: "#7555C7", borderRadius: 8, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 48, paddingHorizontal: 14, paddingVertical: 12 },
  treasureTokenGrid: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 14 },
  treasureToken: { alignItems: "center", backgroundColor: "#EDFBFB", borderColor: "#00AEBB", borderRadius: 8, borderWidth: 2, cursor: "grab" as any, flex: 1, minHeight: 66, justifyContent: "center" },
  treasureTokenSelected: { backgroundColor: "#FFF9E8", borderColor: "#F4B740", borderWidth: 3, shadowColor: "#F4B740", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10 },
  treasureTokenDisabled: { opacity: 0.16 },
  treasureTokenText: { color: "#30264C", fontSize: 28, fontWeight: "900" },
  treasureMessageCard: { backgroundColor: "#F2FAFA", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 2, marginBottom: 14, padding: 12 },
  treasureMessageLabel: { color: "#6544B8", fontSize: 13, fontWeight: "900", marginBottom: 7 },
  treasureMessageInput: { backgroundColor: "#FFFFFF", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, color: "#30264C", fontSize: 14, fontWeight: "700", lineHeight: 20, minHeight: 84, padding: 12 },
  treasurePlacementHint: { color: "#8A6B20", fontSize: 12, fontWeight: "900", lineHeight: 17, marginBottom: 12, textAlign: "center" },
  treasureAttemptList: { gap: 8, marginBottom: 18 },
  treasureAttemptBlock: { gap: 5 },
  treasureSlotRow: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 14 },
  treasureSlot: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DAD3E8", borderRadius: 8, borderStyle: "dashed", borderWidth: 2, cursor: "grab" as any, flex: 1, minHeight: 66, justifyContent: "center" },
  treasureSlotEmpty: { backgroundColor: "#FFF9E8", borderColor: "#F4B740", borderWidth: 3 },
  treasureSlotReady: { backgroundColor: "#FFFDF5", borderColor: "#F4B740" },
  treasureSlotCorrect: { backgroundColor: "#EDFFF6", borderColor: "#43C987", borderStyle: "solid" },
  treasureEmptySlotText: { color: "#8A6B20", fontSize: 12 },
  treasurePastSlot: { alignItems: "center", backgroundColor: "#F8F7FC", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, flex: 1, minHeight: 44, justifyContent: "center", opacity: 0.72 },
  treasurePastSlotCorrect: { backgroundColor: "#EDFFF6", borderColor: "#43C987", borderWidth: 2, opacity: 1 },
  treasurePastSlotText: { color: "#8A8299", fontSize: 24, fontWeight: "900" },
  powerWordGrid: { gap: 9, marginBottom: 16 },
  powerWordChoice: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 52, padding: 13 },
  powerWordChoiceSelected: { backgroundColor: "#008A94", borderColor: "#00AEBB" },
  powerWordText: { color: "#393149", fontSize: 16, fontWeight: "900" },
  powerWordTextSelected: { color: "#FFFFFF" },
  powerResultRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  powerResult: { alignItems: "center", backgroundColor: "#F8F7FC", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, flex: 1, minHeight: 120, justifyContent: "center", padding: 12 },
  powerResultMatch: { backgroundColor: "#EDFFF6", borderColor: "#43C987" },
  powerResultWord: { color: "#30264C", fontSize: 19, fontWeight: "900", marginTop: 8, textAlign: "center" },
  powerWordMeaning: { alignItems: "center", backgroundColor: "#FFF9E8", borderColor: "#F2D88F", borderRadius: 8, borderWidth: 1, marginBottom: 16, padding: 18 },
  powerWordMeaningLabel: { color: "#8A6B20", fontSize: 12, fontWeight: "900", marginTop: 7, textTransform: "uppercase" },
  powerWordMeaningTitle: { color: "#30264C", fontSize: 24, fontWeight: "900", marginTop: 4, textAlign: "center" },
  powerWordMeaningText: { color: "#5D536A", fontSize: 14, lineHeight: 22, marginTop: 8, textAlign: "center" },
  finalScoreHero: { alignItems: "center", backgroundColor: "#6544B8", borderColor: "#63E3E0", borderRadius: 8, borderWidth: 2, marginBottom: 18, padding: 26 },
  finalScoreNumber: { color: "#FFFFFF", fontSize: 48, fontWeight: "900", marginTop: 8 },
  finalScoreLabel: { color: "#E7DFFF", fontSize: 16, fontWeight: "800" },
  finalScorePercent: { color: "#63E3E0", fontSize: 15, fontWeight: "900", marginTop: 8 },
  finalScorePoints: { color: "#FFFFFF", fontSize: 14, fontWeight: "900", marginTop: 5 },
  finalRawScoreCard: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.28)", borderRadius: 8, borderWidth: 1, marginTop: 12, paddingHorizontal: 18, paddingVertical: 10 },
  finalRawScoreLabel: { color: "#E7DFFF", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  finalRawScoreValue: { color: "#FFFFFF", fontSize: 20, fontWeight: "900", marginTop: 3 },
  finalCreditText: { color: "#E7DFFF", fontSize: 12, fontWeight: "800", lineHeight: 17, marginTop: 7, textAlign: "center" },
  resultsSectionTitle: { color: "#30264C", fontSize: 19, fontWeight: "900", marginBottom: 10, marginTop: 4 },
  synopsisCard: { backgroundColor: "#EDFBFB", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  synopsisCardLongTerm: { backgroundColor: "#F8F5FF", borderColor: "#DCCFF5" },
  synopsisHeading: { alignItems: "center", flexDirection: "row", gap: 8, marginBottom: 7 },
  synopsisTitle: { color: "#30264C", fontSize: 15, fontWeight: "900" },
  synopsisText: { color: "#5D536A", fontSize: 13, lineHeight: 20 },
  scoreBreakdownRow: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginBottom: 8, padding: 13 },
  breakdownHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, paddingHorizontal: 4 },
  breakdownHeaderText: { color: "#7555C7", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  scoreBreakdownCopy: { flex: 1, paddingRight: 10 },
  scoreBreakdownLabel: { color: "#393149", fontSize: 14, fontWeight: "800" },
  scoreBreakdownSubLabel: { color: "#706982", fontSize: 12, fontWeight: "700", marginTop: 3 },
  scoreBreakdownPointsBox: { alignItems: "center", backgroundColor: "#F1FFFE", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, minWidth: 74, paddingHorizontal: 8, paddingVertical: 6 },
  scoreBreakdownValueClear: { color: "#008A94", fontSize: 15, fontWeight: "900" },
  scoreBreakdownPointLabel: { color: "#706982", fontSize: 10, fontWeight: "800", marginTop: 1, textTransform: "uppercase" },
  scoreBreakdownValue: { display: "none" },
  strengthHero: { alignItems: "center", backgroundColor: "#008A94", borderRadius: 8, flexDirection: "row", gap: 13, marginBottom: 12, padding: 16 },
  strengthHeroCopy: { flex: 1 },
  strengthHeroLabel: { color: "#C9F5F1", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  strengthHeroTitle: { color: "#FFFFFF", fontSize: 19, fontWeight: "900", marginTop: 3 },
  strengthHeroText: { color: "#E6FFFD", fontSize: 12, marginTop: 4 },
  cumulativeGrid: { flexDirection: "row", gap: 7, marginBottom: 12 },
  cumulativeMetric: { alignItems: "center", backgroundColor: "#F8F7FC", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, flex: 1, padding: 10 },
  cumulativeValue: { color: "#008A94", fontSize: 20, fontWeight: "900" },
  cumulativeLabel: { color: "#706982", fontSize: 10, fontWeight: "700", marginTop: 3, textAlign: "center" },
  strengthRow: { backgroundColor: "#FFFFFF", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, marginBottom: 8, padding: 11 },
  strengthRowTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  strengthRowLabel: { color: "#393149", flex: 1, fontSize: 13, fontWeight: "800" },
  strengthRowValue: { color: "#008A94", fontSize: 14, fontWeight: "900" },
  strengthTrack: { backgroundColor: "#EAE6F4", borderRadius: 8, height: 7, marginTop: 7, overflow: "hidden" },
  strengthFill: { backgroundColor: "#00AEBB", borderRadius: 8, height: "100%" },
  strengthDetail: { color: "#81798F", fontSize: 10, marginTop: 5 },
  feedbackIntro: { color: "#706982", fontSize: 13, lineHeight: 19, marginBottom: 10 },
  feedbackCard: { backgroundColor: "#FFFFFF", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 12 },
  feedbackModuleTitle: { color: "#30264C", fontSize: 15, fontWeight: "900" },
  feedbackPrompt: { color: "#706982", fontSize: 11, fontWeight: "700", marginTop: 5 },
  starRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginVertical: 8 },
  starButton: { alignItems: "center", height: 27, justifyContent: "center", width: 27 },
  feedbackInput: { backgroundColor: "#F8F7FC", borderColor: "#DAD3E8", borderRadius: 8, borderWidth: 1, color: "#30264C", fontSize: 13, lineHeight: 18, minHeight: 62, padding: 9 },
  communityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  communityMetric: { backgroundColor: "#F8F7FC", borderColor: "#E7E3F2", borderRadius: 8, borderWidth: 1, minWidth: "47%", padding: 14 },
  communityValue: { color: "#30264C", fontSize: 22, fontWeight: "900" },
  communityLabel: { color: "#706982", fontSize: 12, fontWeight: "700", marginTop: 4 },
  communityComparison: { backgroundColor: "#EDFBFB", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, marginBottom: 14, padding: 16 },
  communityComparisonTitle: { color: "#008A94", fontSize: 16, fontWeight: "900", marginBottom: 7 },
  remoteInstructionCard: { alignItems: "flex-start", backgroundColor: "#F8F5FF", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 8, marginBottom: 8, padding: 9 },
  remoteInstructionText: { color: "#5D536A", flex: 1, fontSize: 12, fontWeight: "800", lineHeight: 17 },
  drawingPad: { backgroundColor: "#FFFFFF", borderColor: "#C5E1F3", borderRadius: 8, borderWidth: 2, height: 245, marginBottom: 8, overflow: "hidden", position: "relative" },
  drawingPrompt: { alignItems: "center", bottom: 0, justifyContent: "center", left: 0, opacity: 0.6, position: "absolute", right: 0, top: 0 },
  drawingPromptText: { color: "#8A8299", fontSize: 13, fontWeight: "700", marginTop: 7 },
  drawingPoint: { backgroundColor: "#30264C", borderRadius: 3, height: 6, position: "absolute", width: 6 },
  drawingSegment: { backgroundColor: "#30264C", borderRadius: 3, height: 6, position: "absolute" },
  drawingActions: { flexDirection: "row", gap: 8, marginBottom: 4 },
  drawingActionButton: { flex: 1, marginBottom: 0, minHeight: 42, padding: 9 },
  remoteSuccess: { backgroundColor: "#D9FFEA", borderColor: "#18B86A", borderWidth: 3, shadowColor: "#18B86A", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 12 }
});
