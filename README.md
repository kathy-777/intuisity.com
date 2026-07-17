# intuisity.com

## Intuisity

Awaken Your Intuition. Expand Your Awareness. Unlock Your Inner Wisdom.

Intuisity is a daily training platform designed to help people develop intuition, awareness, insight, consciousness, mindfulness, synchronicity recognition, and their natural sixth sense through fun, engaging challenges and real-world experiences.

Every day, users can complete guided activities that help strengthen inner knowing, improve decision-making, sharpen pattern recognition, and increase awareness of the opportunities and signals around them.

Whether someone is interested in personal growth, spiritual awakening, consciousness expansion, mindfulness, intuition development, remote viewing, manifestation, or self-discovery, Intuisity provides a structured and measurable path to explore their potential.

## Current MVP Features

- Profile setup with name, email, phone number, language, birthdate, optional birth time, birthplace, and current location
- Challenge 1: Treasure Chest, a friend or computer intuition game
- Challenge 2: Train Your Knowing, a color-box inner knowing exercise with hidden images
- Challenge 3: Positivity Practice, a daily learning and reflection challenge
- Challenge 4: Read the Person, using real public or historical adults with real photos, hidden names, and attribute guessing
- Challenge 5: Daily Astrology Tips, using saved birth details to provide three daily insights and a personal self-challenge
- Challenge 6: Remote Viewing Challenge, with a drawing area and rotating image targets
- Daily results page with module results, cumulative scoring, and apparent strengths
- 10-star module ratings and improvement comment boxes
- Admin reporting area for visits, module time, ratings, comments, results, and user insights
- Downloadable user insights CSV for reporting similar to a Mailchimp-style export
- Local backend database API for profiles, daily answers, analytics, friends, ratings, comments, and results
- Premium subscription screen prepared for future Stripe integration

## Tech Stack

- React Native
- Expo
- TypeScript
- React Native Web
- Node backend API
- Local JSON database for MVP testing
- Vercel-ready web build

## Search Themes

The site includes natural language around these search themes:

- Awareness
- Insight
- Consciousness
- Mindfulness
- Sixth Sense
- Synchronicity
- Inner Wisdom
- Inner Knowing
- Personal Growth
- Spiritual Awakening
- Self-Discovery
- Remote Viewing
- Manifestation

## Project Structure

```text
App.tsx                         Main app, navigation, profile, admin, and app shell
src/components/                 Challenge screens and reusable app components
src/data/                       Challenge text, lessons, people, images, and mock content
src/services/                   Scoring, astrology, backend sync, analytics, and storage
backend/server.js               Local backend API server
backend/database.js             Local database read/write/reporting logic
backend/data/intuisity-db.json  Local private database file created while testing
tests/                          Basic scoring and astrology tests
```

## Run Locally

Open a terminal in this project folder:

```text
C:\Users\kathy\Documents\Codex\2026-06-04\build-me-a-react-native-app
```

Install the project files:

```bash
npm.cmd install
```

Start the backend database server:

```bash
npm.cmd run backend
```

Open a second terminal in the same project folder and start the local website:

```bash
npm.cmd run web:offline
```

Then open:

```text
http://localhost:8081
```

The backend runs at:

```text
http://localhost:4000
```

If PowerShell says scripts are disabled, use `npm.cmd` instead of `npm`.

## Useful Backend Links

```text
http://localhost:4000/api/health
http://localhost:4000/api/admin/report
http://localhost:4000/api/admin/user-insights.csv
http://localhost:4000/api/admin/database
```

The user insights CSV includes fields such as name, email, phone, location, most clicked module, most time spent module, average score, ratings, comments, saved friends, and last active date.

## Test

Run the app tests:

```bash
npm.cmd test
```

Run a TypeScript check:

```bash
npm.cmd exec tsc -- --noEmit
```

## Build For Web

Create the website build:

```bash
npm.cmd run build:web
```

The web build is created in:

```text
dist
```

## Backend Database

The backend stores local MVP records in:

```text
backend/data/intuisity-db.json
```

This file is intentionally ignored by Git so private user data is not uploaded to GitHub.

Backend records include:

- User profiles
- Daily answers
- Daily results and module scores
- Time spent in each module
- Friend contacts
- Module ratings
- Report page improvement comments
- User insight reporting data

## Vercel Deployment Settings

Use these settings in Vercel:

```text
Framework Preset: Other
Install Command: npm install
Build Command: npm run build:web
Output Directory: dist
Development Command: npm run web
```

If Vercel asks for a root directory, choose the folder that contains `package.json`. If the repository opens directly to `package.json`, leave the root directory blank.

## Domain Setup

The intended production domain is:

```text
intuisity.com
```

Recommended hosting flow:

```text
Local project -> GitHub -> Vercel -> GoDaddy domain
```

GoDaddy should point the domain DNS records to Vercel after the Vercel project is deployed.

## Notes For Production

The current app has a real local backend database foundation for MVP testing. Before a public launch, these items should be connected to hosted production services:

- Hosted database for user accounts, results, comments, friends, and admin reporting
- Production backend API hosting
- SMS or email provider for real friend invitations, such as Twilio, SendGrid, Resend, or another provider
- Stripe backend checkout and subscription webhooks
- Secure login and admin authentication
- Privacy policy, terms, and consent language for collecting profile and activity data

## Important MVP Notes

- The current backend is local unless deployed to a hosted backend service.
- The app can fall back to browser storage while testing.
- Friend phone/email invitations need a real messaging provider before they can send live messages.
- Stripe subscription screens are prepared, but live payments need backend Stripe setup.
- Community comparisons and admin reports need a shared production database for real public users.

## Project Status

This project is actively being developed as the MVP foundation for Intuisity.
