declare module "circular-natal-horoscope-js/dist/index" {
  export class Origin {
    constructor(options?: {
      year?: number;
      month?: number;
      date?: number;
      hour?: number;
      minute?: number;
      second?: number;
      latitude?: number;
      longitude?: number;
    });
  }

  export class Horoscope {
    constructor(options?: {
      origin?: Origin;
      language?: string;
      houseSystem?: string;
      zodiac?: string;
      aspectPoints?: string[];
      aspectWithPoints?: string[];
      aspectTypes?: string[];
      customOrbs?: Record<string, number>;
    });

    Ascendant: any;
    Aspects: { all: any[] };
    CelestialBodies: Record<string, any>;
    Midheaven: any;
    SunSign: any;
  }
}

declare module "circular-natal-horoscope-js/dist/index.js" {
  export * from "circular-natal-horoscope-js/dist/index";
}
