# Personalized Mutual Fund Selector — Frontend (with Fund Finder)

This is the **static frontend** you can host on **GitHub Pages**. It includes:
- The original 5‑step wizard and allocation engine (category‑level).
- A **Find Specific Funds (Beta)** panel that calls your **Vercel API** to research real schemes with citations.
- Chart.js fix (no SRI issues).

## How to use
1) Upload these files to a GitHub repo (e.g., `mutual-fund-selector`).
2) Turn on **GitHub Pages** (Settings → Pages → Deploy from a branch → `main` → `/ (root)`).
3) Edit **`config.js`** and set:
   ```js
   window.APP_CONFIG = {
     API_ENDPOINT: "https://<your-vercel-project>.vercel.app/api/find-funds"
   };
   ```
4) Open your Pages URL, complete the wizard, and click **Find Specific Funds**.

## Notes
- Your **OpenAI key is never in the browser**. The frontend calls your Vercel endpoint only.
- If you see CORS errors, set `ALLOW_ORIGIN` env var in your Vercel project to your Pages origin, e.g. `https://<username>.github.io`.
- If the donut chart doesn't appear, ensure you're online or self‑host Chart.js in `/assets` and change the script tag to `assets/chart.umd.min.js`.

## Required disclaimer
This is an **educational tool**. Recommendations are based on the information you provide and are **not financial advice**. Mutual fund investments are subject to market risks. Please consult a **SEBI‑registered** financial advisor before investing.
