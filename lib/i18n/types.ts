export const LOCALES = ["fr", "en", "de", "es", "no", "sv", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, { name: string; flag: string }> = {
  fr: { name: "Français", flag: "🇫🇷" },
  en: { name: "English", flag: "🇬🇧" },
  de: { name: "Deutsch", flag: "🇩🇪" },
  es: { name: "Español", flag: "🇪🇸" },
  no: { name: "Norsk", flag: "🇳🇴" },
  sv: { name: "Svenska", flag: "🇸🇪" },
  pt: { name: "Português", flag: "🇵🇹" },
};

export type PlanFeature = { text: string; included: boolean };
export type PlanCopy = {
  name: string;
  tagline: string;
  period: string;
  cta: string;
  features: PlanFeature[];
};
export type TestimonialCopy = { name: string; role: string; content: string };
export type BenefitCopy = { title: string; description: string };

export type Dictionary = {
  nav: {
    features: string;
    preview: string;
    pricing: string;
    reviews: string;
    signIn: string;
    tryFree: string;
  };
  hero: {
    badge: string;
    titleLine1: string;
    titleHighlight: string;
    titleLine2: string;
    subtitle: string;
    placeholder: string;
    generate: string;
    freeNote: string;
  };
  benefits: {
    title: string;
    titleHighlight: string;
    titleSuffix: string;
    subtitle: string;
    items: [BenefitCopy, BenefitCopy, BenefitCopy, BenefitCopy];
  };
  preview: {
    eyebrow: string;
    title: string;
    titleHighlight: string;
    description: string;
    bullets: [string, string, string];
    playlistTitle: string;
    playlistMeta: string;
    ctaListen: string;
  };
  testimonials: {
    title: string;
    titleHighlight: string;
    items: [TestimonialCopy, TestimonialCopy, TestimonialCopy];
  };
  cta: {
    title: string;
    titleHighlight: string;
    subtitle: string;
    button: string;
  };
  footer: {
    pricing: string;
    signIn: string;
    copyright: string;
  };
  pricing: {
    badge: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    plans: [PlanCopy, PlanCopy, PlanCopy, PlanCopy];
  };
  login: {
    signIn: string;
    signUp: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    submitSignIn: string;
    submitSignUp: string;
    or: string;
    google: string;
    apple: string;
    consent: string;
  };
  app: {
    spotifyConnected: string;
    connectSpotify: string;
    signIn: string;
    generatePlaceholder: string;
    generateBtn: string;
    generatePushBtn: string;
    connectToPush: string;
    hintConnected: string;
    hintNotConnected: string;
    charsLeft: string;
    options: {
      title: string;
      trackCount: string;
      language: string;
      auto: string;
      energy: string;
      chill: string;
      intense: string;
      advanced: string;
      reset: string;
      ambiance: {
        title: string;
        danceability: string;
        emotionalIntensity: string;
        darkness: string;
        sensuality: string;
        positivity: string;
      };
      style: {
        title: string;
        preferredGenres: string;
        excludedGenres: string;
        genrePlaceholder: string;
        era: string;
        eraAny: string;
        eraCurrent: string;
        popularity: string;
        popularityAny: string;
        popularityMainstream: string;
        popularityBalanced: string;
        popularityNiche: string;
        popularityUnderground: string;
        discovery: string;
        discoverySafe: string;
        discoveryBalanced: string;
        discoveryAdventurous: string;
        discoveryUnderground: string;
        variety: string;
      };
      vocals: {
        title: string;
        preference: string;
        any: string;
        mostlyVocal: string;
        mostlyInstrumental: string;
        instrumentalOnly: string;
        female: string;
        male: string;
        mixed: string;
        duets: string;
        spokenWord: string;
        whisperedBreathy: string;
        explicit: string;
      };
      selection: {
        title: string;
        preferredArtists: string;
        excludedArtists: string;
        artistPlaceholder: string;
        referenceTracks: string;
        referenceTracksPlaceholder: string;
        referenceTracksHint: string;
        remixes: string;
        liveVersions: string;
        covers: string;
      };
      progression: {
        title: string;
        stable: string;
        gradualRise: string;
        gradualFall: string;
        wave: string;
        slowBurn: string;
        peakAndRelease: string;
        cinematicJourney: string;
      };
      context: {
        title: string;
        activity: string;
        activityPlaceholder: string;
        timeOfDay: string;
        season: string;
        locationAtmosphere: string;
        locationPlaceholder: string;
        customInstructions: string;
        customInstructionsPlaceholder: string;
      };
    };
  };
  settings: {
    title: string;
    back: string;
    language: string;
    languageDescription: string;
    account: string;
    notSignedIn: string;
    plan: string;
  };
};
