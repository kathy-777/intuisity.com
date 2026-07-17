import { Horoscope, Origin } from "circular-natal-horoscope-js/dist/index.js";

type SignProfile = {
  name: string;
  element: string;
  strength: string;
  focus: string;
  reminder: string;
  dateRange: string;
};

type BirthLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

const signs: SignProfile[] = [
  { name: "Capricorn", element: "Earth", strength: "steady follow-through", focus: "one meaningful priority", reminder: "rest is part of progress", dateRange: "Dec. 22-Jan. 19" },
  { name: "Aquarius", element: "Air", strength: "fresh ideas", focus: "one new way to solve a problem", reminder: "connection matters as much as independence", dateRange: "Jan. 20-Feb. 18" },
  { name: "Pisces", element: "Water", strength: "kind imagination", focus: "one quiet creative or caring action", reminder: "protect your emotional energy", dateRange: "Feb. 19-March 20" },
  { name: "Aries", element: "Fire", strength: "brave first steps", focus: "one clear action you can start now", reminder: "patience can strengthen action", dateRange: "March 21-April 19" },
  { name: "Taurus", element: "Earth", strength: "grounded persistence", focus: "one choice that feels nourishing and sustainable", reminder: "small changes can be safe", dateRange: "April 20-May 20" },
  { name: "Gemini", element: "Air", strength: "curious communication", focus: "one conversation worth having", reminder: "clarity comes from slowing down", dateRange: "May 21-June 20" },
  { name: "Cancer", element: "Water", strength: "emotional honesty", focus: "one supportive boundary", reminder: "your needs deserve care too", dateRange: "June 21-July 22" },
  { name: "Leo", element: "Fire", strength: "warm confidence", focus: "one honest way to express yourself", reminder: "you do not need applause to shine", dateRange: "July 23-Aug. 22" },
  { name: "Virgo", element: "Earth", strength: "helpful improvement", focus: "one small fix that makes life easier", reminder: "done can be better than perfect", dateRange: "Aug. 23-Sept. 22" },
  { name: "Libra", element: "Air", strength: "balanced thinking", focus: "one fair decision", reminder: "peace does not require self-abandonment", dateRange: "Sept. 23-Oct. 22" },
  { name: "Scorpio", element: "Water", strength: "deep honesty", focus: "one truth you are ready to admit to yourself", reminder: "softness and strength can coexist", dateRange: "Oct. 23-Nov. 21" },
  { name: "Sagittarius", element: "Fire", strength: "hopeful exploration", focus: "one thing that expands your world", reminder: "freedom grows through wise commitments", dateRange: "Nov. 22-Dec. 21" }
];

const questionFrames = [
  "Where would {strength} help you follow through on {focus} today?",
  "What decision would become easier if you honored this reminder: {reminder}?",
  "Which relationship or conversation could benefit from your {element} sign awareness today?",
  "What small action can turn {focus} into something real before the day ends?",
  "Where are you being asked to move from reaction into a calmer, wiser response?",
  "What would feel supportive, honest, and doable for your chart energy today?",
  "Which choice would let you use your strength without forcing the outcome?",
  "What is one thing your future self would thank you for doing with this guidance?"
];

const baseBirthLocations: BirthLocation[] = [
  { label: "Seattle, Washington, United States", latitude: 47.6062, longitude: -122.3321 },
  { label: "Miami, Florida, United States", latitude: 25.7617, longitude: -80.1918 },
  { label: "New York, New York, United States", latitude: 40.7128, longitude: -74.006 },
  { label: "Los Angeles, California, United States", latitude: 34.0522, longitude: -118.2437 },
  { label: "San Francisco, California, United States", latitude: 37.7749, longitude: -122.4194 },
  { label: "Chicago, Illinois, United States", latitude: 41.8781, longitude: -87.6298 },
  { label: "Houston, Texas, United States", latitude: 29.7604, longitude: -95.3698 },
  { label: "Phoenix, Arizona, United States", latitude: 33.4484, longitude: -112.074 },
  { label: "Philadelphia, Pennsylvania, United States", latitude: 39.9526, longitude: -75.1652 },
  { label: "San Antonio, Texas, United States", latitude: 29.4241, longitude: -98.4936 },
  { label: "San Diego, California, United States", latitude: 32.7157, longitude: -117.1611 },
  { label: "Dallas, Texas, United States", latitude: 32.7767, longitude: -96.797 },
  { label: "Austin, Texas, United States", latitude: 30.2672, longitude: -97.7431 },
  { label: "Jacksonville, Florida, United States", latitude: 30.3322, longitude: -81.6557 },
  { label: "Fort Worth, Texas, United States", latitude: 32.7555, longitude: -97.3308 },
  { label: "Columbus, Ohio, United States", latitude: 39.9612, longitude: -82.9988 },
  { label: "Charlotte, North Carolina, United States", latitude: 35.2271, longitude: -80.8431 },
  { label: "Indianapolis, Indiana, United States", latitude: 39.7684, longitude: -86.1581 },
  { label: "Denver, Colorado, United States", latitude: 39.7392, longitude: -104.9903 },
  { label: "Boston, Massachusetts, United States", latitude: 42.3601, longitude: -71.0589 },
  { label: "Nashville, Tennessee, United States", latitude: 36.1627, longitude: -86.7816 },
  { label: "Portland, Oregon, United States", latitude: 45.5152, longitude: -122.6784 },
  { label: "Las Vegas, Nevada, United States", latitude: 36.1699, longitude: -115.1398 },
  { label: "Atlanta, Georgia, United States", latitude: 33.749, longitude: -84.388 },
  { label: "Minneapolis, Minnesota, United States", latitude: 44.9778, longitude: -93.265 },
  { label: "Toronto, Ontario, Canada", latitude: 43.6532, longitude: -79.3832 },
  { label: "Vancouver, British Columbia, Canada", latitude: 49.2827, longitude: -123.1207 },
  { label: "London, England, United Kingdom", latitude: 51.5072, longitude: -0.1276 },
  { label: "Paris, France", latitude: 48.8566, longitude: 2.3522 },
  { label: "Sydney, New South Wales, Australia", latitude: -33.8688, longitude: 151.2093 }
];

const additionalBirthLocations: BirthLocation[] = [
  { label: "San Jose, California, United States", latitude: 37.3382, longitude: -121.8863 },
  { label: "Sacramento, California, United States", latitude: 38.5816, longitude: -121.4944 },
  { label: "Fresno, California, United States", latitude: 36.7378, longitude: -119.7871 },
  { label: "Long Beach, California, United States", latitude: 33.7701, longitude: -118.1937 },
  { label: "Oakland, California, United States", latitude: 37.8044, longitude: -122.2712 },
  { label: "Bakersfield, California, United States", latitude: 35.3733, longitude: -119.0187 },
  { label: "Anaheim, California, United States", latitude: 33.8366, longitude: -117.9143 },
  { label: "Riverside, California, United States", latitude: 33.9806, longitude: -117.3755 },
  { label: "Irvine, California, United States", latitude: 33.6846, longitude: -117.8265 },
  { label: "Santa Ana, California, United States", latitude: 33.7455, longitude: -117.8677 },
  { label: "Tampa, Florida, United States", latitude: 27.9506, longitude: -82.4572 },
  { label: "Orlando, Florida, United States", latitude: 28.5383, longitude: -81.3792 },
  { label: "St. Petersburg, Florida, United States", latitude: 27.7676, longitude: -82.6403 },
  { label: "Hialeah, Florida, United States", latitude: 25.8576, longitude: -80.2781 },
  { label: "Tallahassee, Florida, United States", latitude: 30.4383, longitude: -84.2807 },
  { label: "Fort Lauderdale, Florida, United States", latitude: 26.1224, longitude: -80.1373 },
  { label: "Cape Coral, Florida, United States", latitude: 26.5629, longitude: -81.9495 },
  { label: "Salt Lake City, Utah, United States", latitude: 40.7608, longitude: -111.891 },
  { label: "Provo, Utah, United States", latitude: 40.2338, longitude: -111.6585 },
  { label: "Ogden, Utah, United States", latitude: 41.223, longitude: -111.9738 },
  { label: "Reno, Nevada, United States", latitude: 39.5296, longitude: -119.8138 },
  { label: "Henderson, Nevada, United States", latitude: 36.0395, longitude: -114.9817 },
  { label: "Mesa, Arizona, United States", latitude: 33.4152, longitude: -111.8315 },
  { label: "Tucson, Arizona, United States", latitude: 32.2226, longitude: -110.9747 },
  { label: "Scottsdale, Arizona, United States", latitude: 33.4942, longitude: -111.9261 },
  { label: "Glendale, Arizona, United States", latitude: 33.5387, longitude: -112.186 },
  { label: "Tempe, Arizona, United States", latitude: 33.4255, longitude: -111.94 },
  { label: "Albuquerque, New Mexico, United States", latitude: 35.0844, longitude: -106.6504 },
  { label: "Santa Fe, New Mexico, United States", latitude: 35.687, longitude: -105.9378 },
  { label: "Colorado Springs, Colorado, United States", latitude: 38.8339, longitude: -104.8214 },
  { label: "Aurora, Colorado, United States", latitude: 39.7294, longitude: -104.8319 },
  { label: "Fort Collins, Colorado, United States", latitude: 40.5853, longitude: -105.0844 },
  { label: "Boulder, Colorado, United States", latitude: 40.015, longitude: -105.2705 },
  { label: "Omaha, Nebraska, United States", latitude: 41.2565, longitude: -95.9345 },
  { label: "Lincoln, Nebraska, United States", latitude: 40.8136, longitude: -96.7026 },
  { label: "Kansas City, Missouri, United States", latitude: 39.0997, longitude: -94.5786 },
  { label: "St. Louis, Missouri, United States", latitude: 38.627, longitude: -90.1994 },
  { label: "Springfield, Missouri, United States", latitude: 37.209, longitude: -93.2923 },
  { label: "Wichita, Kansas, United States", latitude: 37.6872, longitude: -97.3301 },
  { label: "Topeka, Kansas, United States", latitude: 39.0473, longitude: -95.6752 },
  { label: "Tulsa, Oklahoma, United States", latitude: 36.154, longitude: -95.9928 },
  { label: "Norman, Oklahoma, United States", latitude: 35.2226, longitude: -97.4395 },
  { label: "New Orleans, Louisiana, United States", latitude: 29.9511, longitude: -90.0715 },
  { label: "Baton Rouge, Louisiana, United States", latitude: 30.4515, longitude: -91.1871 },
  { label: "Shreveport, Louisiana, United States", latitude: 32.5252, longitude: -93.7502 },
  { label: "Memphis, Tennessee, United States", latitude: 35.1495, longitude: -90.049 },
  { label: "Knoxville, Tennessee, United States", latitude: 35.9606, longitude: -83.9207 },
  { label: "Chattanooga, Tennessee, United States", latitude: 35.0456, longitude: -85.3097 },
  { label: "Louisville, Kentucky, United States", latitude: 38.2527, longitude: -85.7585 },
  { label: "Lexington, Kentucky, United States", latitude: 38.0406, longitude: -84.5037 },
  { label: "Cincinnati, Ohio, United States", latitude: 39.1031, longitude: -84.512 },
  { label: "Cleveland, Ohio, United States", latitude: 41.4993, longitude: -81.6944 },
  { label: "Toledo, Ohio, United States", latitude: 41.6528, longitude: -83.5379 },
  { label: "Akron, Ohio, United States", latitude: 41.0814, longitude: -81.519 },
  { label: "Dayton, Ohio, United States", latitude: 39.7589, longitude: -84.1916 },
  { label: "Detroit, Michigan, United States", latitude: 42.3314, longitude: -83.0458 },
  { label: "Grand Rapids, Michigan, United States", latitude: 42.9634, longitude: -85.6681 },
  { label: "Ann Arbor, Michigan, United States", latitude: 42.2808, longitude: -83.743 },
  { label: "Lansing, Michigan, United States", latitude: 42.7325, longitude: -84.5555 },
  { label: "Milwaukee, Wisconsin, United States", latitude: 43.0389, longitude: -87.9065 },
  { label: "Madison, Wisconsin, United States", latitude: 43.0731, longitude: -89.4012 },
  { label: "Green Bay, Wisconsin, United States", latitude: 44.5133, longitude: -88.0133 },
  { label: "Des Moines, Iowa, United States", latitude: 41.5868, longitude: -93.625 },
  { label: "Cedar Rapids, Iowa, United States", latitude: 41.9779, longitude: -91.6656 },
  { label: "Fargo, North Dakota, United States", latitude: 46.8772, longitude: -96.7898 },
  { label: "Bismarck, North Dakota, United States", latitude: 46.8083, longitude: -100.7837 },
  { label: "Sioux Falls, South Dakota, United States", latitude: 43.546, longitude: -96.7313 },
  { label: "Billings, Montana, United States", latitude: 45.7833, longitude: -108.5007 },
  { label: "Bozeman, Montana, United States", latitude: 45.677, longitude: -111.0429 },
  { label: "Boise, Idaho, United States", latitude: 43.615, longitude: -116.2023 },
  { label: "Spokane, Washington, United States", latitude: 47.6588, longitude: -117.426 },
  { label: "Tacoma, Washington, United States", latitude: 47.2529, longitude: -122.4443 },
  { label: "Olympia, Washington, United States", latitude: 47.0379, longitude: -122.9007 },
  { label: "Eugene, Oregon, United States", latitude: 44.0521, longitude: -123.0868 },
  { label: "Salem, Oregon, United States", latitude: 44.9429, longitude: -123.0351 },
  { label: "Bend, Oregon, United States", latitude: 44.0582, longitude: -121.3153 },
  { label: "Honolulu, Hawaii, United States", latitude: 21.3099, longitude: -157.8581 },
  { label: "Anchorage, Alaska, United States", latitude: 61.2181, longitude: -149.9003 },
  { label: "Birmingham, Alabama, United States", latitude: 33.5186, longitude: -86.8104 },
  { label: "Montgomery, Alabama, United States", latitude: 32.3668, longitude: -86.3 },
  { label: "Mobile, Alabama, United States", latitude: 30.6954, longitude: -88.0399 },
  { label: "Little Rock, Arkansas, United States", latitude: 34.7465, longitude: -92.2896 },
  { label: "Raleigh, North Carolina, United States", latitude: 35.7796, longitude: -78.6382 },
  { label: "Greensboro, North Carolina, United States", latitude: 36.0726, longitude: -79.792 },
  { label: "Durham, North Carolina, United States", latitude: 35.994, longitude: -78.8986 },
  { label: "Charleston, South Carolina, United States", latitude: 32.7765, longitude: -79.9311 },
  { label: "Columbia, South Carolina, United States", latitude: 34.0007, longitude: -81.0348 },
  { label: "Savannah, Georgia, United States", latitude: 32.0809, longitude: -81.0912 },
  { label: "Augusta, Georgia, United States", latitude: 33.4735, longitude: -82.0105 },
  { label: "Macon, Georgia, United States", latitude: 32.8407, longitude: -83.6324 },
  { label: "Richmond, Virginia, United States", latitude: 37.5407, longitude: -77.436 },
  { label: "Virginia Beach, Virginia, United States", latitude: 36.8529, longitude: -75.978 },
  { label: "Norfolk, Virginia, United States", latitude: 36.8508, longitude: -76.2859 },
  { label: "Baltimore, Maryland, United States", latitude: 39.2904, longitude: -76.6122 },
  { label: "Annapolis, Maryland, United States", latitude: 38.9784, longitude: -76.4922 },
  { label: "Washington, District of Columbia, United States", latitude: 38.9072, longitude: -77.0369 },
  { label: "Newark, New Jersey, United States", latitude: 40.7357, longitude: -74.1724 },
  { label: "Jersey City, New Jersey, United States", latitude: 40.7178, longitude: -74.0431 },
  { label: "Trenton, New Jersey, United States", latitude: 40.2206, longitude: -74.7597 },
  { label: "Pittsburgh, Pennsylvania, United States", latitude: 40.4406, longitude: -79.9959 },
  { label: "Allentown, Pennsylvania, United States", latitude: 40.6023, longitude: -75.4714 },
  { label: "Buffalo, New York, United States", latitude: 42.8864, longitude: -78.8784 },
  { label: "Rochester, New York, United States", latitude: 43.1566, longitude: -77.6088 },
  { label: "Albany, New York, United States", latitude: 42.6526, longitude: -73.7562 },
  { label: "Syracuse, New York, United States", latitude: 43.0481, longitude: -76.1474 },
  { label: "Providence, Rhode Island, United States", latitude: 41.824, longitude: -71.4128 },
  { label: "Hartford, Connecticut, United States", latitude: 41.7658, longitude: -72.6734 },
  { label: "New Haven, Connecticut, United States", latitude: 41.3083, longitude: -72.9279 },
  { label: "Burlington, Vermont, United States", latitude: 44.4759, longitude: -73.2121 },
  { label: "Manchester, New Hampshire, United States", latitude: 42.9956, longitude: -71.4548 },
  { label: "Portland, Maine, United States", latitude: 43.6591, longitude: -70.2568 },
  { label: "Quebec City, Quebec, Canada", latitude: 46.8139, longitude: -71.208 },
  { label: "Montreal, Quebec, Canada", latitude: 45.5017, longitude: -73.5673 },
  { label: "Ottawa, Ontario, Canada", latitude: 45.4215, longitude: -75.6972 },
  { label: "Calgary, Alberta, Canada", latitude: 51.0447, longitude: -114.0719 },
  { label: "Edmonton, Alberta, Canada", latitude: 53.5461, longitude: -113.4938 },
  { label: "Winnipeg, Manitoba, Canada", latitude: 49.8951, longitude: -97.1384 },
  { label: "Halifax, Nova Scotia, Canada", latitude: 44.6488, longitude: -63.5752 },
  { label: "Dublin, Ireland", latitude: 53.3498, longitude: -6.2603 },
  { label: "Edinburgh, Scotland, United Kingdom", latitude: 55.9533, longitude: -3.1883 },
  { label: "Manchester, England, United Kingdom", latitude: 53.4808, longitude: -2.2426 },
  { label: "Birmingham, England, United Kingdom", latitude: 52.4862, longitude: -1.8904 },
  { label: "Glasgow, Scotland, United Kingdom", latitude: 55.8642, longitude: -4.2518 },
  { label: "Madrid, Spain", latitude: 40.4168, longitude: -3.7038 },
  { label: "Barcelona, Spain", latitude: 41.3874, longitude: 2.1686 },
  { label: "Rome, Italy", latitude: 41.9028, longitude: 12.4964 },
  { label: "Milan, Italy", latitude: 45.4642, longitude: 9.19 },
  { label: "Berlin, Germany", latitude: 52.52, longitude: 13.405 },
  { label: "Munich, Germany", latitude: 48.1351, longitude: 11.582 },
  { label: "Amsterdam, Netherlands", latitude: 52.3676, longitude: 4.9041 },
  { label: "Brussels, Belgium", latitude: 50.8503, longitude: 4.3517 },
  { label: "Zurich, Switzerland", latitude: 47.3769, longitude: 8.5417 },
  { label: "Vienna, Austria", latitude: 48.2082, longitude: 16.3738 },
  { label: "Stockholm, Sweden", latitude: 59.3293, longitude: 18.0686 },
  { label: "Oslo, Norway", latitude: 59.9139, longitude: 10.7522 },
  { label: "Copenhagen, Denmark", latitude: 55.6761, longitude: 12.5683 },
  { label: "Helsinki, Finland", latitude: 60.1699, longitude: 24.9384 },
  { label: "Warsaw, Poland", latitude: 52.2297, longitude: 21.0122 },
  { label: "Prague, Czech Republic", latitude: 50.0755, longitude: 14.4378 },
  { label: "Athens, Greece", latitude: 37.9838, longitude: 23.7275 },
  { label: "Istanbul, Turkey", latitude: 41.0082, longitude: 28.9784 },
  { label: "Mexico City, Mexico", latitude: 19.4326, longitude: -99.1332 },
  { label: "Guadalajara, Jalisco, Mexico", latitude: 20.6597, longitude: -103.3496 },
  { label: "Monterrey, Nuevo Leon, Mexico", latitude: 25.6866, longitude: -100.3161 },
  { label: "Sao Paulo, Brazil", latitude: -23.5558, longitude: -46.6396 },
  { label: "Rio de Janeiro, Brazil", latitude: -22.9068, longitude: -43.1729 },
  { label: "Buenos Aires, Argentina", latitude: -34.6037, longitude: -58.3816 },
  { label: "Lima, Peru", latitude: -12.0464, longitude: -77.0428 },
  { label: "Bogota, Colombia", latitude: 4.711, longitude: -74.0721 },
  { label: "Santiago, Chile", latitude: -33.4489, longitude: -70.6693 },
  { label: "Tokyo, Japan", latitude: 35.6762, longitude: 139.6503 },
  { label: "Osaka, Japan", latitude: 34.6937, longitude: 135.5023 },
  { label: "Seoul, South Korea", latitude: 37.5665, longitude: 126.978 },
  { label: "Beijing, China", latitude: 39.9042, longitude: 116.4074 },
  { label: "Shanghai, China", latitude: 31.2304, longitude: 121.4737 },
  { label: "Hong Kong, China", latitude: 22.3193, longitude: 114.1694 },
  { label: "Singapore", latitude: 1.3521, longitude: 103.8198 },
  { label: "Bangkok, Thailand", latitude: 13.7563, longitude: 100.5018 },
  { label: "Manila, Philippines", latitude: 14.5995, longitude: 120.9842 },
  { label: "Jakarta, Indonesia", latitude: -6.2088, longitude: 106.8456 },
  { label: "Kuala Lumpur, Malaysia", latitude: 3.139, longitude: 101.6869 },
  { label: "New Delhi, India", latitude: 28.6139, longitude: 77.209 },
  { label: "Mumbai, Maharashtra, India", latitude: 19.076, longitude: 72.8777 },
  { label: "Bengaluru, Karnataka, India", latitude: 12.9716, longitude: 77.5946 },
  { label: "Chennai, Tamil Nadu, India", latitude: 13.0827, longitude: 80.2707 },
  { label: "Hyderabad, Telangana, India", latitude: 17.385, longitude: 78.4867 },
  { label: "Karachi, Pakistan", latitude: 24.8607, longitude: 67.0011 },
  { label: "Lahore, Pakistan", latitude: 31.5204, longitude: 74.3587 },
  { label: "Dubai, United Arab Emirates", latitude: 25.2048, longitude: 55.2708 },
  { label: "Tel Aviv, Israel", latitude: 32.0853, longitude: 34.7818 },
  { label: "Cairo, Egypt", latitude: 30.0444, longitude: 31.2357 },
  { label: "Johannesburg, South Africa", latitude: -26.2041, longitude: 28.0473 },
  { label: "Cape Town, South Africa", latitude: -33.9249, longitude: 18.4241 },
  { label: "Auckland, New Zealand", latitude: -36.8509, longitude: 174.7645 },
  { label: "Melbourne, Victoria, Australia", latitude: -37.8136, longitude: 144.9631 },
  { label: "Brisbane, Queensland, Australia", latitude: -27.4698, longitude: 153.0251 },
  { label: "Perth, Western Australia, Australia", latitude: -31.9523, longitude: 115.8613 }
];

const knownBirthLocations = [...baseBirthLocations, ...additionalBirthLocations];

export function getAstrologyReading(
  birthdate: string,
  date = new Date(),
  birthTime = "",
  birthCity = "",
  customBirthLocation?: BirthLocation | null
) {
  const parsed = parseBirthdate(birthdate);
  if (!parsed) return null;

  const sign = getSunSign(parsed.month, parsed.day);
  const birthContext = `${birthTime.trim()}|${birthCity.trim().toLowerCase()}`;
  const contextSeed = [...birthContext].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const daySeed = Math.floor(date.getTime() / 86400000) + sign.name.length + contextSeed;
  const birthClock = parseBirthTime(birthTime);
  const birthLocation = customBirthLocation || resolveBirthLocation(birthCity);
  const fullChart = birthClock && birthLocation
    ? calculateFullChart(parsed, birthClock, birthLocation)
    : null;
  const questionFrame = questionFrames[daySeed % questionFrames.length];
  const dailyQuestion = fillFrame(questionFrame, sign, fullChart);
  const savedBirthTime = birthTime.trim();
  const savedBirthCity = birthCity.trim();
  const synopsis = buildDailySynopsis(sign, fullChart, daySeed, savedBirthTime, savedBirthCity);

  return {
    sign,
    fullChart,
    tips: [dailyQuestion],
    synopsis,
    dailyQuestion,
    birthDetailsIncluded: Boolean(fullChart || birthTime.trim() || birthCity.trim()),
    chartCalculation: fullChart ? "full-birth-chart" : "sun-sign-daily"
  };
}

function parseBirthdate(value: string) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function parseBirthTime(value: string) {
  const match = value.trim().toUpperCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || "0");
  const period = match[3];

  if (period === "AM") {
    if (hour === 12) hour = 0;
  } else if (period === "PM") {
    if (hour < 12) hour += 12;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function getSunSign(month: number, day: number) {
  const changeDays = [20, 19, 20, 20, 21, 21, 22, 23, 23, 23, 22, 22];
  const signIndex = day < changeDays[month - 1] ? month - 1 : month;
  return signs[signIndex % 12];
}

function resolveBirthLocation(value: string) {
  const normalizedValue = normalizeLocation(value);
  if (!normalizedValue) return null;
  return knownBirthLocations.find((location) => {
    const normalizedLabel = normalizeLocation(location.label);
    const [city] = normalizedLabel.split(",");
    return normalizedLabel.includes(normalizedValue) || normalizedValue.includes(city);
  }) || null;
}

export function getKnownBirthLocation(value: string) {
  return resolveBirthLocation(value);
}

function calculateFullChart(
  birthdate: { year: number; month: number; day: number },
  birthTime: { hour: number; minute: number },
  birthLocation: BirthLocation
) {
  try {
    const origin = new Origin({
      year: birthdate.year,
      month: birthdate.month - 1,
      date: birthdate.day,
      hour: birthTime.hour,
      minute: birthTime.minute,
      latitude: birthLocation.latitude,
      longitude: birthLocation.longitude
    });
    const horoscope = new Horoscope({
      origin,
      houseSystem: "whole-sign",
      zodiac: "tropical",
      aspectPoints: ["bodies", "points", "angles"],
      aspectWithPoints: ["bodies", "points", "angles"],
      aspectTypes: ["major"],
      customOrbs: {},
      language: "en"
    });
    const strongestAspect = horoscope.Aspects.all[0];
    return {
      source: "CircularNatalHoroscopeJS",
      houseSystem: "Whole Sign",
      zodiac: "Tropical",
      locationLabel: birthLocation.label,
      sunSign: signLabel(horoscope.CelestialBodies.sun?.Sign) || signLabel(horoscope.SunSign),
      moonSign: signLabel(horoscope.CelestialBodies.moon?.Sign),
      risingSign: signLabel(horoscope.Ascendant?.Sign),
      midheavenSign: signLabel(horoscope.Midheaven?.Sign),
      strongestAspect: strongestAspect
        ? `${strongestAspect.point1Label} ${strongestAspect.label} ${strongestAspect.point2Label}`
        : null
    };
  } catch {
    return null;
  }
}

function fillFrame(frame: string, sign: SignProfile, fullChart: ReturnType<typeof calculateFullChart> | null) {
  const fullChartAddition = fullChart?.moonSign && fullChart.risingSign
    ? ` Consider your ${fullChart.moonSign} Moon and ${fullChart.risingSign} Rising as you answer.`
    : "";
  return frame
    .replace("{strength}", sign.strength)
    .replace("{focus}", sign.focus)
    .replace("{element}", sign.element)
    .replace("{reminder}", sign.reminder) + fullChartAddition;
}

function buildDailySynopsis(
  sign: SignProfile,
  fullChart: ReturnType<typeof calculateFullChart> | null,
  daySeed: number,
  birthTime = "",
  birthCity = ""
) {
  const dayTone = daySeed % 3 === 0 ? "A very positive day" : daySeed % 2 === 0 ? "A positive day" : "An average day";
  const signGuidance = horoscopeGuidanceBySign[sign.name] || horoscopeGuidanceBySign.Aries;
  const lead = signGuidance[daySeed % signGuidance.length];
  const aspect = fullChart?.strongestAspect
    ? `The strongest chart pattern showing today is ${fullChart.strongestAspect}, so notice where that theme appears in choices, conversations, or timing.`
    : `The useful reminder is this: ${sign.reminder}.`;
  return `${sign.name} (${sign.dateRange})\n${dayTone}\n\n${lead} ${aspect} Stay practical, follow the calmest signal, and let one small choice move the day forward.`;
}

const horoscopeGuidanceBySign: Record<string, string[]> = {
  Aries: [
    "This is a good day to get something moving, especially a task that has been waiting for your courage or direct attention. Use your energy well, but do not push so hard that you miss the simple solution.",
    "Today favors action, but the best progress comes from focus rather than force. Finish one old task, make one clear decision, and let impatience settle before you speak.",
    "Your fire is strong today, which can help you start, repair, or complete something quickly. Choose the action that feels brave and useful, then pace yourself."
  ],
  Taurus: [
    "Today favors comfort, beauty, money awareness, and steady effort. You may enjoy making your surroundings nicer or choosing one practical step that helps you feel more secure.",
    "This is a supportive day for creative work, simple pleasures, and grounded decisions. Take your time, but do not let comfort become avoidance.",
    "Your best results come from patience and good taste today. Handle one financial, home, food, garden, or body-related matter with care."
  ],
  Gemini: [
    "This is a lively day for messages, errands, learning, and conversations. You can gather useful information if you slow down enough to hear what people are really saying.",
    "Your mind may move quickly today, which helps with writing, calls, planning, and catching up. Keep notes so good ideas do not scatter.",
    "Today favors connection with neighbors, siblings, friends, or new faces. Ask one better question and let curiosity lead you somewhere useful."
  ],
  Cancer: [
    "Today highlights home, family, emotional honesty, and the need for a calm base. A small nurturing action could make the whole day feel smoother.",
    "This is a good day to notice what makes you feel safe and supported. Tend to one personal or household matter before taking on everyone else's needs.",
    "Your intuition may be especially responsive today. Trust the quiet signal, but give yourself room before reacting emotionally."
  ],
  Leo: [
    "Today favors confidence, generosity, creativity, and being seen for the right reasons. Share warmth, but avoid turning a simple moment into a performance.",
    "This can be a pleasant day for style, art, children, romance, fun, or leadership. Let your natural sparkle help others without needing applause.",
    "People may notice you today, so use that attention well. Speak with heart, choose beauty where you can, and take pride in one thing you complete."
  ],
  Virgo: [
    "Today supports useful work, organizing, health routines, and careful improvements. A small fix can make a bigger difference than you expect.",
    "Your eye for detail is helpful today, especially if you are wrapping up loose ends. Stay productive, but do not let perfection slow a good result.",
    "This is a good day to simplify. Clear one area, answer one practical question, or make one routine easier to keep."
  ],
  Libra: [
    "Today highlights balance, relationships, beauty, and fair decisions. A graceful conversation can help smooth something that has felt awkward.",
    "This is a supportive day for social plans, design choices, partnership matters, and restoring harmony. Be kind, but do not abandon your own preference.",
    "You may be asked to cooperate or mediate today. Listen carefully, then choose the answer that feels peaceful and honest."
  ],
  Scorpio: [
    "Today favors depth, focus, private insight, and honest observation. You may see beneath the surface of a situation, but use that awareness gently.",
    "This is a strong day for research, emotional clarity, shared money, or a conversation that needs truth. Avoid intensity for its own sake.",
    "Your intuition may pick up what others are not saying. Let that guide you toward wisdom, not suspicion."
  ],
  Sagittarius: [
    "Today favors learning, travel thoughts, fresh perspective, and honest optimism. If routine feels too tight, add one small adventure or new idea.",
    "This is a good day to explore a plan, talk with someone inspiring, or look at the bigger picture. Keep promises realistic.",
    "Your spirit wants room today. Choose something that expands your world without scattering your energy."
  ],
  Capricorn: [
    "Today supports productivity, responsibility, planning, and finishing what matters. Choose one priority and give it steady attention.",
    "This can be a constructive day for work, money, reputation, or long-term goals. Move carefully, but do not underestimate how much one focused hour can do.",
    "Your practical side is useful today. Handle the responsibility in front of you, then give yourself permission to rest."
  ],
  Aquarius: [
    "Today favors new ideas, teamwork, technology, and a fresh way of solving an old problem. Reach out, but stay grounded in what is actually useful.",
    "This is a good day for friends, groups, planning, and unusual insights. Something may click when you stop trying to solve it the expected way.",
    "Your independence is strong today, but connection still matters. Share one idea and let someone else add to it."
  ],
  Pisces: [
    "Today favors imagination, compassion, music, rest, and gentle creative work. Keep boundaries clear so your sensitivity remains a gift.",
    "This is a reflective day, especially for art, dreams, romance, spiritual practice, or quiet problem-solving. Choose peace where you can.",
    "Your intuition may arrive as a mood, image, or soft knowing. Write it down before the day gets too busy."
  ]
};

function signLabel(sign: { label?: string } | null | undefined) {
  return typeof sign?.label === "string" ? sign.label : null;
}

function normalizeLocation(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(usa|u\.s\.a\.|united states of america)\b/g, "united states")
    .replace(/\s+/g, " ")
    .trim();
}
