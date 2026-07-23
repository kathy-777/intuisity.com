export type BirthChartProfile = {
  calculationType: "full-birth-chart" | "sun-sign-daily";
  source: string;
  houseSystem: string;
  zodiac: string;
  locationLabel: string;
  sunSign: string;
  moonSign: string;
  risingSign: string;
  midheavenSign: string;
  strongestAspect: string | null;
  updatedAt: string;
};

export type UserProfile = {
  language: string;
  email: string;
  phone: string;
  name: string;
  reminderTime: string;
  timeZone?: string;
  birthdate: string;
  birthTime: string;
  birthCity: string;
  birthState: string;
  birthCountry: string;
  birthLatitude?: number;
  birthLongitude?: number;
  birthLocationLabel?: string;
  birthChart?: BirthChartProfile;
  currentCity: string;
  currentState: string;
  currentCountry: string;
  passwordHash?: string;
  authProvider?: "password" | "google" | "guest";
};
