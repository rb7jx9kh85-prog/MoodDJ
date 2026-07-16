# 🎧 Mood DJ

**Describe a vibe. Get the perfect playlist.**

Mood DJ turns any mood, scene or feeling into a **real Spotify playlist** on your
account. You describe a vibe in plain language, OpenAI designs a structured
musical direction, Spotify finds the tracks, and Mood DJ builds the playlist and
hands you a direct link.

> _"Driving alone at night under the rain, melancholic but classy."_ → a 15-track
> cinematic playlist, created on your Spotify in seconds.

---

## ✨ Features

- 🤖 **AI music direction** — OpenAI turns free text into a structured plan
  (genres, energy, search queries, transition logic).
- 🎵 **Real Spotify playlists** — created on the connected user's account via OAuth.
- 🔗 **Direct Spotify link** — one big button opens the playlist instantly.
- 🎨 **Premium dark UI** — glassmorphism, animated background, Framer Motion.
- 📱 **Installable PWA** — add it to your iPhone home screen as a standalone app.
- 🔒 **Secure by default** — secrets stay server-side, tokens in httpOnly cookies.

---

## 🧱 Stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- Next.js API Routes
- [OpenAI API](https://platform.openai.com/) — musical intelligence
- [Spotify Web API](https://developer.spotify.com/) + OAuth
- Deployed on [Vercel](https://vercel.com/)

---

## 🚀 Local setup

### 1. Install

```bash
npm install
```

### 2. Configure OpenAI

Create an API key at <https://platform.openai.com/api-keys>. The model is set in
`lib/openai.ts` (`OPENAI_MODEL`, default `gpt-5.6-luna`) — change it there. Generation
uses the Responses API with a strict JSON schema and `reasoning: { effort: "low" }`;
note that GPT-5's reasoning-model family (including 5.6) rejects `temperature`.

### 3. Create a Spotify Developer app

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. **Create app** → copy the **Client ID** and **Client Secret**.
3. Open **Settings → Redirect URIs** and add (exactly):
   ```
   http://localhost:3000/api/auth/spotify/callback
   ```
   (Add your production URL later too — see Deployment.)
4. Save.

### 4. Environment variables

Copy the example file and fill it in:

```bash
cp .env.example .env.local
```

```env
OPENAI_API_KEY=sk-...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
COOKIE_SECRET=a-long-random-string
MOODDJ_PUBLISHER_OWNER_UID=your-firebase-auth-uid
```

> Generate a `COOKIE_SECRET` with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>, click **Connect Spotify**, describe a vibe and
generate your first playlist.

### Useful commands

```bash
npm run dev      # start dev server
npm run build    # production build
npm run start    # run the production build
npm run lint     # lint
npm run icons    # regenerate PWA / favicon icons from scripts/icon-source.svg
```

---

## ☁️ Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **New Project → Import** the repo.
3. Add the environment variables in **Project Settings → Environment Variables**:

   ```env
   OPENAI_API_KEY=sk-...
   SPOTIFY_CLIENT_ID=...
   SPOTIFY_CLIENT_SECRET=...
   SPOTIFY_REDIRECT_URI=https://your-domain.vercel.app/api/auth/spotify/callback
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   COOKIE_SECRET=a-long-random-string
   ```

4. In the **Spotify Dashboard**, add the production Redirect URI:
   ```
   https://your-domain.vercel.app/api/auth/spotify/callback
   ```
5. Redeploy.
6. Test: connect Spotify → generate a playlist.

### Shared public Mood DJ Spotify account (optional)

To let listeners publish a playlist publicly on one dedicated Mood DJ Spotify
profile, set `MOODDJ_PUBLISHER_OWNER_UID` to the Firebase UID of the one
administrator allowed to configure it. After redeploying, sign in as that
administrator, open **Settings**, and select **Connect Mood DJ Spotify**.

Spotify opens its normal OAuth consent screen so you can choose the dedicated
Mood DJ account. The refresh token is encrypted server-side in Firestore and
is never displayed in the browser. Do not put a Spotify password, access token,
or refresh token in source control or Vercel client variables.

> `SPOTIFY_REDIRECT_URI` must match the Spotify dashboard entry **character for
> character**, including `https` and trailing path.

---

## 📱 Add to iPhone home screen

On iPhone: open the app in **Safari → Share → Add to Home Screen**. Mood DJ then
launches full-screen as a standalone web app with its own icon.

---

## 🗂️ Project structure

```
app/
  layout.tsx            # metadata, fonts, background
  page.tsx              # reads connection state, renders the app
  globals.css           # design system + animations
  manifest.ts           # PWA manifest (served at /manifest.webmanifest)
  api/
    auth/spotify/
      login/route.ts     # start OAuth
      callback/route.ts  # exchange code, set cookies
      logout/route.ts    # clear cookies
    generate/route.ts    # OpenAI → Spotify → playlist
components/              # UI (Hero, MoodInput, PlaylistResult, LogoMark, …)
lib/
  openai.ts             # generateMoodPlan() + fallback
  spotify.ts            # search / create / add / refresh
  auth.ts               # token validation + refresh
  cookies.ts            # signed, httpOnly cookie helpers
  utils.ts              # sanitisation, dedupe, shuffle
  animations.ts         # Framer Motion variants
types/index.ts          # shared types
public/                 # generated icons, favicon, apple-touch-icon
scripts/                # icon-source.svg + generate-icons.mjs
```

---

## 🔐 Security notes

- `OPENAI_API_KEY` and `SPOTIFY_CLIENT_SECRET` are **only** used server-side.
- Spotify tokens are stored in `httpOnly`, `secure` (in production), `sameSite`
  cookies — never exposed to client JS.
- The OAuth `state` is random and verified via an HMAC-signed cookie.
- User prompts are sanitised and length-limited (≤ 2000 chars).
- Tokens are never logged.

---

## 🧯 Troubleshooting

| Symptom | Fix |
| --- | --- |
| `INVALID_CLIENT: Invalid redirect URI` | The `SPOTIFY_REDIRECT_URI` doesn't exactly match the dashboard entry. |
| Stuck on "Connect Spotify" after login | Check cookies are allowed and `NEXT_PUBLIC_APP_URL` matches your domain. |
| "Mood DJ could not read the vibe" | `OPENAI_API_KEY` missing/invalid, or OpenAI quota exceeded. |
| "No tracks found" | Try a richer or more musical description. |
| Session expired repeatedly | Reconnect Spotify; ensure `COOKIE_SECRET` is stable across deploys. |

---

## 🎨 Replacing the logo

The mark is defined once in `scripts/icon-source.svg` (and as a React component
in `components/LogoMark.tsx`). Edit the SVG, then run `npm run icons` to
regenerate `favicon.ico`, `apple-touch-icon.png` and the PWA icons.

---

Built with Next.js, OpenAI and the Spotify Web API.
