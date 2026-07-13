import type { Dictionary } from "@/lib/i18n/types";

const fr: Dictionary = {
  nav: {
    features: "Fonctionnalités",
    preview: "Aperçu",
    pricing: "Tarifs",
    reviews: "Avis",
    signIn: "Se connecter",
    tryFree: "Essayer gratuitement",
  },
  hero: {
    badge: "Propulsé par l'IA + ton compte Spotify",
    titleLine1: "Décris ton",
    titleHighlight: "mood",
    titleLine2: "Repars avec la playlist.",
    subtitle:
      "Mood DJ transforme une phrase — une ambiance, une scène, une émotion — en une vraie playlist Spotify, créée directement sur ton compte en quelques secondes.",
    placeholder: "Ex : soirée d'été sur un rooftop, coucher de soleil…",
    generate: "Générer",
    freeNote: "Gratuit pour commencer · Aucune carte bancaire requise",
  },
  benefits: {
    title: "Pensé pour",
    titleHighlight: "l'instant",
    titleSuffix: ", pas pour la playlist parfaite",
    subtitle:
      "Mood DJ n'essaie pas de deviner tes goûts pour toujours — il capture ce que tu ressens là, maintenant.",
    items: [
      {
        title: "Comprend vraiment le vibe",
        description:
          "Décris une scène, une émotion ou une ambiance en langage naturel — l'IA en tire un vrai plan musical, pas juste des mots-clés.",
      },
      {
        title: "Playlist prête en secondes",
        description:
          "Recherche, sélection et création se font en un seul passage. Pas de tri manuel, pas d'allers-retours.",
      },
      {
        title: "Directement sur ton Spotify",
        description:
          "Aucune copie, aucun lien externe : la playlist est créée sur ton propre compte, prête à écouter dans l'app.",
      },
      {
        title: "Régénère à volonté",
        description:
          "Pas convaincu par le premier jet ? Relance la génération et affine le mood jusqu'à trouver le bon tempo.",
      },
    ],
  },
  preview: {
    eyebrow: "Aperçu",
    title: "De la phrase à la",
    titleHighlight: "playlist réelle",
    description:
      "Chaque titre est choisi en fonction de l'énergie, du genre et de la scène que tu décris — puis ajouté directement sur ton compte Spotify, avec une pochette et une description générées pour l'occasion.",
    bullets: [
      "Analyse du mood, de l'énergie et du tempo recherché",
      "Sélection de titres réels via le catalogue Spotify",
      "Playlist nommée, décrite et prête à partager",
    ],
    playlistTitle: "Rooftop, coucher de soleil",
    playlistMeta: "Playlist Mood DJ · 18 titres",
    ctaListen: "Écouter sur Spotify",
  },
  testimonials: {
    title: "Ils ont laissé",
    titleHighlight: "l'IA choisir",
    items: [
      {
        name: "Léa Fontaine",
        role: "Organise des soirées entre amis",
        content:
          "J'ai tapé « apéro d'été, terrasse, ambiance qui monte doucement » et la playlist était littéralement parfaite. Plus besoin de passer 40 minutes à chercher des morceaux avant que les gens arrivent.",
      },
      {
        name: "Malik Benali",
        role: "Coach sportif indépendant",
        content:
          "Je génère une playlist différente à chaque séance selon l'intensité du cours. Mes clients me demandent régulièrement le nom de l'app.",
      },
      {
        name: "Chloé Rey",
        role: "Étudiante en architecture",
        content:
          "Pour bosser en focus profond, décrire l'ambiance que je veux marche bien mieux que chercher une playlist toute faite sur Spotify. Le seul bémol : parfois trop de titres déjà connus, j'aimerais plus de découvertes.",
      },
    ],
  },
  cta: {
    title: "Ta prochaine playlist est à",
    titleHighlight: "une phrase",
    subtitle: "Connecte ton compte, décris ton mood, et laisse Mood DJ s'occuper du reste.",
    button: "Commencer gratuitement",
  },
  footer: {
    pricing: "Tarifs",
    signIn: "Se connecter",
    copyright: "Mood DJ. Non affilié à Spotify.",
  },
  pricing: {
    badge: "Sans engagement, résiliable à tout moment",
    title: "Génère, ou génère",
    titleHighlight: "et publie",
    subtitle: "Mood DJ génère toujours ta playlist. Passer sur Spotify, c'est à toi de choisir.",
    plans: [
      {
        name: "Free",
        tagline: "Pour découvrir Mood DJ",
        period: "toujours",
        cta: "Commencer gratuitement",
        features: [
          { text: "1 playlist générée gratuitement", included: true },
          { text: "Génération par IA avec vraies recherches Spotify", included: true },
          { text: "Aucune carte bancaire requise", included: true },
          { text: "Publication sur Spotify", included: false },
        ],
      },
      {
        name: "Flow",
        tagline: "Tout ce qu'il faut pour générer la playlist parfaite.",
        period: "/ mois",
        cta: "Choisir Flow",
        features: [
          { text: "Génération de playlists IA illimitée", included: true },
          { text: "Crée une playlist à partir de n'importe quel mood ou prompt", included: true },
          { text: "Recommandations de titres intelligentes", included: true },
          { text: "Génération rapide", included: true },
          { text: "Historique de tes playlists sauvegardé", included: true },
          { text: "Accès à toutes les langues supportées", included: true },
          { text: "Synchronisation Spotify en un clic", included: false },
        ],
      },
      {
        name: "Flow Sync",
        tagline: "Tout Flow, plus l'intégration Spotify instantanée.",
        period: "/ mois",
        cta: "Choisir Flow Sync",
        features: [
          { text: "Tout ce qui est inclus dans Flow", included: true },
          { text: "Synchronisation Spotify en un clic", included: true },
          { text: "Création automatique de la playlist sur ton compte Spotify", included: true },
          { text: "Mise à jour des playlists existantes", included: true },
          { text: "Exports Spotify illimités", included: true },
          { text: "Génération prioritaire", included: true },
          { text: "Accès anticipé aux nouvelles fonctionnalités", included: true },
        ],
      },
      {
        name: "Lifetime",
        tagline: "Paie une fois, garde Flow Sync pour toujours.",
        period: "une fois",
        cta: "Débloquer à vie",
        features: [
          { text: "Tout ce qui est inclus dans Flow Sync", included: true },
          { text: "Paiement unique, aucun abonnement", included: true },
          { text: "Génération illimitée, pour toujours", included: true },
          { text: "Synchronisation Spotify illimitée, pour toujours", included: true },
          { text: "Accès anticipé aux nouvelles fonctionnalités", included: true },
        ],
      },
    ],
  },
  login: {
    signIn: "Se connecter",
    signUp: "Créer un compte",
    namePlaceholder: "Ton nom",
    emailPlaceholder: "Adresse email",
    passwordPlaceholder: "Mot de passe",
    submitSignIn: "Se connecter",
    submitSignUp: "Créer mon compte",
    or: "ou",
    google: "Continuer avec Google",
    apple: "Continuer avec Apple",
    consent: "En continuant, tu acceptes que Mood DJ crée un profil pour ton compte.",
  },
  app: {
    spotifyConnected: "Spotify connecté",
    connectSpotify: "Connecter Spotify",
    signIn: "Se connecter",
    generatePlaceholder:
      "Décris un mood… ex. conduire seul la nuit sous la pluie, mélancolique mais classe",
    generateBtn: "Générer la playlist",
    generatePushBtn: "Générer et publier sur Spotify",
    connectToPush: "Connecte-toi pour publier sur Spotify",
    hintConnected: "Génère un aperçu, ou publie-le directement sur ton compte Spotify.",
    hintNotConnected:
      "Tu peux générer un aperçu sans te connecter — Spotify n'est nécessaire que pour publier.",
    charsLeft: "caractères restants",
    options: {
      title: "Réglages",
      trackCount: "Nombre de titres",
      language: "Langue des titres",
      auto: "Auto",
      energy: "Énergie",
      chill: "Calme",
      intense: "Intense",
    },
  },
  settings: {
    title: "Réglages",
    back: "Retour",
    language: "Langue",
    languageDescription: "Change la langue de l'interface à tout moment.",
    account: "Compte",
    notSignedIn: "Non connecté",
    plan: "Plan actuel",
  },
};

export default fr;
