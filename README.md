# R U Traders - Invoice App

Next.js (App Router) invoice generator. Mobile-first, PDF download + share.

## Run
```
npm install
npm run dev      # http://localhost:3000
npm run build && npm start   # production (Node.js)
```

## Deploy
Vercel (free): push to GitHub -> import project on vercel.com -> Deploy.
Ya apne server par `npm run build && npm start` (Node.js 18+).

## Business details badalne ke liye
`lib/business.js` edit karo (naam, address, GSTIN, declaration).

## Notes
- Invoice number auto: RU/2026-27/001, 002... (financial year Apr-Mar ke hisaab se).
- History is phone/browser ke localStorage me save hoti hai (us device par).
- PDF browser me hi banti hai, isliye internet slow ho tab bhi chalti hai.
