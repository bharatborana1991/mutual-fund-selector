# Personalized Mutual Fund Selector

A lightweight, static web app that recommends **mutual fund categories** (not specific schemes) based on a user's age, cash flows, EMIs, and risk tolerance. It follows the specification you provided and is designed for clarity, speed, and mobile‑first use.

> **Disclaimer**: This is an educational tool. Outputs are based on user inputs and are **not** financial advice. Mutual fund investments are subject to market risks. Consult a **SEBI‑registered** advisor before investing.

---

## Quick Start

1. Download the ZIP from your assistant and unzip it.
2. Open `index.html` in any modern browser.
3. Complete the 5‑step wizard and view your personalized plan.

No build step or server is required. (Chart.js is loaded from a CDN to draw the donut chart.)

---

## Features

- **Multi‑step wizard** with inline tooltips for terms like EMI and fund categories.
- **Profile engine** that computes:
  - Investable Surplus = Income − Expenses − EMI.
  - Investment Horizon from age:
    - **Long‑Term (10+ years)**: age 20–45
    - **Medium‑Term (5–10 years)**: age 46–55
    - **Short‑Term (1–5 years)**: age 56+
  - **Final Risk Profile**: starts from the stated tolerance (Low/Medium/High) and adjusts based on:
    - High EMIs (>40% of income) or **low surplus** (<10% of income) ⇒ **downgrade 1 level**.
    - **Short‑term horizon** ⇒ cap to **Low** for capital preservation.
    - **Long‑term horizon** AND EMI ≤20% of income AND savings rate ≥25% ⇒ **nudge up 1 level**.
- **Recommendation Engine** (category‑level, not specific funds):
  - **Low Risk**  
    - 80% **Debt Funds** (Liquid, Short‑Term, Corporate Bond)  
    - 20% **Equity/Hybrid** (Conservative Hybrid or Large‑Cap Index)
  - **Medium Risk**  
    - 30% **Debt** (Short‑Term Debt)  
    - 70% **Equity** (40% Large‑Cap, 20% Flexi‑Cap, 10% Mid‑Cap)
  - **High Risk**  
    - 10% **Debt** (Corporate Bond for stability)  
    - 90% **Equity** (30% Flexi‑Cap, 30% Mid‑Cap, 20% Small‑Cap, 10% ELSS)
- **Visual allocation** donut chart (Equity vs Debt) and **clear category list** with one‑sentence explanations.
- **Responsive** layout; accessible labels; keyboard‑friendly.
- **Print to PDF** support via your browser’s print dialog.

---

## How the Rules Are Implemented

- The rules live in `script.js` as constants under `RULES` and templates under `TEMPLATES`.
- You can tune the thresholds without touching UI code:
  ```js
  const RULES = {
    EMI_HIGH_RATIO: 0.40,      // downgrade if EMI > 40% of income
    LOW_SURPLUS_RATIO: 0.10,   // downgrade if surplus < 10% of income
    NUDGE_UP_EMI_MAX: 0.20,    // for long horizon
    NUDGE_UP_SAVINGS_MIN: 0.25 // and healthy savings rate
  };
  ```
- Horizons are inferred strictly from age bucket definitions you provided.

---

## Extending the App

- **Data export**: Add a button that downloads a JSON of the plan for a user to share.
- **Currency**: Change the `Intl.NumberFormat` currency code in `fmt()`.
- **Persistence**: Replace `sessionStorage` with API calls to store plans on a backend.
- **More buckets**: Add an optional “Medium‑Low” template if you want a 60/40 tilt for short‑term users.

---

## Notes

- The app intentionally avoids recommending **specific fund schemes**. It only suggests **categories**.
- Examples of platforms (non‑endorsement): AMFI, Morningstar India, Value Research, Zerodha Coin, Groww.
- If you need a framework version (React/Next.js), the logic can be dropped into a hook or store without changes.

---

## License

MIT — please retain the disclaimer and educate users responsibly.
