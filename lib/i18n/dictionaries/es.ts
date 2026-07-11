import type { Dictionary } from "@/lib/i18n/types";

const es: Dictionary = {
  nav: {
    features: "Funciones",
    preview: "Vista previa",
    pricing: "Precios",
    reviews: "Opiniones",
    signIn: "Iniciar sesión",
    tryFree: "Probar gratis",
  },
  hero: {
    badge: "Impulsado por IA + tu cuenta de Spotify",
    titleLine1: "Describe tu",
    titleHighlight: "mood",
    titleLine2: "Llévate la playlist.",
    subtitle:
      "Mood DJ convierte una frase — un ambiente, una escena, una emoción — en una playlist real de Spotify, creada directamente en tu cuenta en segundos.",
    placeholder: "Ej.: noche de verano en una terraza, atardecer…",
    generate: "Generar",
    freeNote: "Gratis para empezar · Sin tarjeta de crédito",
  },
  benefits: {
    title: "Pensado para",
    titleHighlight: "el momento",
    titleSuffix: ", no para la playlist perfecta",
    subtitle: "Mood DJ no intenta adivinar tus gustos para siempre — capta lo que sientes ahora mismo.",
    items: [
      {
        title: "Entiende de verdad el mood",
        description:
          "Describe una escena, una emoción o un ambiente en lenguaje natural — la IA construye un plan musical real, no solo palabras clave.",
      },
      {
        title: "Playlist lista en segundos",
        description: "Búsqueda, selección y creación en un solo paso. Sin ordenar manualmente, sin idas y vueltas.",
      },
      {
        title: "Directo a tu Spotify",
        description:
          "Sin copias, sin enlaces externos: la playlist se crea en tu propia cuenta, lista para escuchar en la app.",
      },
      {
        title: "Regenera las veces que quieras",
        description: "¿No te convence el primer intento? Vuelve a generar y ajusta el mood hasta encontrar el tempo justo.",
      },
    ],
  },
  preview: {
    eyebrow: "Vista previa",
    title: "De la frase a la",
    titleHighlight: "playlist real",
    description:
      "Cada tema se elige según la energía, el género y la escena que describes — y se añade directamente a tu cuenta de Spotify, con portada y descripción generadas para la ocasión.",
    bullets: [
      "Analiza el mood, la energía y el tempo buscados",
      "Selecciona temas reales del catálogo de Spotify",
      "Playlist nombrada, descrita y lista para compartir",
    ],
    playlistTitle: "Terraza, atardecer",
    playlistMeta: "Playlist Mood DJ · 18 temas",
    ctaListen: "Escuchar en Spotify",
  },
  testimonials: {
    title: "Dejaron que",
    titleHighlight: "la IA eligiera",
    items: [
      {
        name: "Léa Fontaine",
        role: "Organiza reuniones con amigos",
        content:
          "Escribí «aperitivo de verano, terraza, ambiente que sube poco a poco» y la playlist fue literalmente perfecta. Se acabó pasar 40 minutos buscando canciones antes de que llegue la gente.",
      },
      {
        name: "Malik Benali",
        role: "Entrenador deportivo independiente",
        content:
          "Genero una playlist distinta para cada sesión según la intensidad de la clase. Mis clientes me preguntan a menudo el nombre de la app.",
      },
      {
        name: "Chloé Rey",
        role: "Estudiante de arquitectura",
        content:
          "Para trabajar concentrada, describir el ambiente que quiero funciona mucho mejor que buscar una playlist ya hecha en Spotify. El único pero: a veces demasiados temas ya conocidos, me gustaría más descubrimientos.",
      },
    ],
  },
  cta: {
    title: "Tu próxima playlist está a",
    titleHighlight: "una frase de distancia",
    subtitle: "Conecta tu cuenta, describe tu mood, y deja que Mood DJ se encargue del resto.",
    button: "Empezar gratis",
  },
  footer: {
    pricing: "Precios",
    signIn: "Iniciar sesión",
    copyright: "Mood DJ. No afiliado a Spotify.",
  },
  pricing: {
    badge: "Sin compromiso, cancela cuando quieras",
    title: "Genera, o genera",
    titleHighlight: "y publica",
    subtitle: "Mood DJ siempre genera tu playlist. Publicarla en Spotify depende de ti.",
    plans: [
      {
        name: "Free",
        tagline: "Descubre Mood DJ",
        period: "siempre",
        cta: "Empezar gratis",
        features: [
          { text: "1 playlist generada gratis", included: true },
          { text: "Generación por IA con búsquedas reales en Spotify", included: true },
          { text: "Sin tarjeta de crédito", included: true },
          { text: "Publicación en Spotify", included: false },
        ],
      },
      {
        name: "Flow",
        tagline: "Todo lo que necesitas para generar la playlist perfecta.",
        period: "/ mes",
        cta: "Elegir Flow",
        features: [
          { text: "Generación de playlists por IA ilimitada", included: true },
          { text: "Crea una playlist a partir de cualquier mood o prompt", included: true },
          { text: "Recomendaciones de temas inteligentes", included: true },
          { text: "Generación rápida", included: true },
          { text: "Historial de tus playlists guardado", included: true },
          { text: "Acceso a todos los idiomas disponibles", included: true },
          { text: "Sincronización con Spotify en un clic", included: false },
        ],
      },
      {
        name: "Flow Sync",
        tagline: "Todo Flow, más integración instantánea con Spotify.",
        period: "/ mes",
        cta: "Elegir Flow Sync",
        features: [
          { text: "Todo lo incluido en Flow", included: true },
          { text: "Sincronización con Spotify en un clic", included: true },
          { text: "Creación automática de la playlist en tu cuenta de Spotify", included: true },
          { text: "Actualización de playlists existentes", included: true },
          { text: "Exportaciones a Spotify ilimitadas", included: true },
          { text: "Generación prioritaria", included: true },
          { text: "Acceso anticipado a nuevas funciones", included: true },
        ],
      },
      {
        name: "Lifetime",
        tagline: "Paga una vez, conserva Flow Sync para siempre.",
        period: "pago único",
        cta: "Desbloquear de por vida",
        features: [
          { text: "Todo lo incluido en Flow Sync", included: true },
          { text: "Pago único, sin suscripción", included: true },
          { text: "Generación ilimitada, para siempre", included: true },
          { text: "Sincronización con Spotify ilimitada, para siempre", included: true },
          { text: "Acceso anticipado a nuevas funciones", included: true },
        ],
      },
    ],
  },
  login: {
    signIn: "Iniciar sesión",
    signUp: "Crear una cuenta",
    namePlaceholder: "Tu nombre",
    emailPlaceholder: "Correo electrónico",
    passwordPlaceholder: "Contraseña",
    submitSignIn: "Iniciar sesión",
    submitSignUp: "Crear mi cuenta",
    or: "o",
    google: "Continuar con Google",
    apple: "Continuar con Apple",
    consent: "Al continuar, aceptas que Mood DJ cree un perfil para tu cuenta.",
  },
  app: {
    spotifyConnected: "Spotify conectado",
    connectSpotify: "Conectar Spotify",
    signIn: "Iniciar sesión",
    generatePlaceholder: "Describe un mood… ej. conducir solo de noche bajo la lluvia, melancólico pero elegante",
    generateBtn: "Generar playlist",
    generatePushBtn: "Generar y publicar en Spotify",
    connectToPush: "Conéctate para publicar en Spotify",
    hintConnected: "Genera una vista previa, o publícala directamente en tu cuenta de Spotify.",
    hintNotConnected: "Puedes generar una vista previa sin conectar — Spotify solo hace falta para publicar la playlist.",
    charsLeft: "caracteres restantes",
  },
  settings: {
    title: "Ajustes",
    back: "Volver",
    language: "Idioma",
    languageDescription: "Cambia el idioma de la interfaz cuando quieras.",
    account: "Cuenta",
    notSignedIn: "Sin sesión iniciada",
    plan: "Plan actual",
  },
};

export default es;
