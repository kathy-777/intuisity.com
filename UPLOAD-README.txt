Intuisity VS / GitHub upload package

Use this folder when you need to put the real Intuisity app files into the GitHub repository connected to Vercel.

Important:

1. Upload the CONTENTS of this folder, not the folder itself.
2. These files and folders should appear at the top level of GitHub:

- App.tsx
- App.txt
- README.md
- app.json
- babel.config.js
- metro.config.js
- package-lock.json
- package.json
- supabase-schema.sql
- tsconfig.json
- vercel.json
- api
- assets
- domain
- legal
- scripts
- src
- tests

3. The api folder should include api/public-config.js.
4. Do not add these deleted testing files back:

- api/health.js
- api/admin/diagnostics.js

Reason:

Vercel Hobby allows up to 12 Serverless Functions. This package keeps Intuisity under that limit while keeping Google login, reporting, friend invites, profiles, daily results, and astrology lookup.

After uploading:

1. Commit the changes to the main branch.
2. In Vercel, redeploy with build cache off.
3. Test this URL:

https://www.intuisity.com/api/public-config

It should show your Google Client ID.

4. Open the site in a private browser and look for the Continue with Google button.
