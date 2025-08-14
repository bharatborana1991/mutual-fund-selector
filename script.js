/* Business rules and UI controller for the Personalized Mutual Fund Selector */

/** ---------- Helpers ---------- */
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const fmt = (n) => {
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
};
const pct = (n) => `${n.toFixed(0)}%`;

/** ---------- Thresholds (tunable) ---------- */
const RULES = Object.freeze({
  EMI_HIGH_RATIO: 0.40,      // >40% of income ⇒ downgrade risk
  LOW_SURPLUS_RATIO: 0.10,   // <10% of income ⇒ downgrade risk
  NUDGE_UP_EMI_MAX: 0.20,    // long horizon and EMI ratio <= 20%
  NUDGE_UP_SAVINGS_MIN: 0.25 // and savings rate >= 25% ⇒ nudge up risk
});

/** ---------- Horizon buckets ---------- */
const HORIZON = Object.freeze({
  LONG: 'Long‑Term (10+ years)',
  MED:  'Medium‑Term (5–10 years)',
  SHORT:'Short‑Term (1–5 years)'
});

/** ---------- Allocation templates ---------- */
const EXPLANATIONS = Object.freeze({
  'Liquid Funds': 'Ultra‑short‑duration debt funds that aim to park money safely and provide quick access.',
  'Short‑Term Debt Funds': 'Debt funds investing in short‑duration bonds to seek relatively stable returns.',
  'Corporate Bond Funds': 'Debt funds holding high‑quality corporate bonds for stability and modest income.',
  'Conservative Hybrid Funds': 'Mix of mostly debt with a small equity portion for limited growth potential.',
  'Large‑Cap Index Funds': 'Equity funds tracking India’s biggest companies for broad, steady exposure.',
  'Large‑Cap Funds': 'Actively or passively invest in top‑tier companies to provide resilient growth.',
  'Flexi‑Cap Funds': 'Equity funds that move across large, mid, and small caps to balance growth and flexibility.',
  'Mid‑Cap Funds': 'Equity funds in mid‑sized companies with higher growth potential and higher volatility.',
  'Small‑Cap Funds': 'Equity funds in smaller companies with high growth potential and significant volatility.',
  'ELSS (Tax‑saving)': 'Equity funds with a 3‑year lock‑in that may offer Section 80C tax benefits.',
});

const TEMPLATES = Object.freeze({
  LOW: {
    assetSplit: { Debt: 80, Equity: 20 },
    categories: [
      { name: 'Liquid Funds' },
      { name: 'Short‑Term Debt Funds' },
      { name: 'Corporate Bond Funds' },
      { name: 'Conservative Hybrid Funds', alt: 'Large‑Cap Index Funds' }
    ]
  },
  MEDIUM: {
    assetSplit: { Debt: 30, Equity: 70 },
    categories: [
      { name: 'Short‑Term Debt Funds', percent: 30 },
      { name: 'Large‑Cap Funds', percent: 40 },
      { name: 'Flexi‑Cap Funds', percent: 20 },
      { name: 'Mid‑Cap Funds', percent: 10 }
    ]
  },
  HIGH: {
    assetSplit: { Debt: 10, Equity: 90 },
    categories: [
      { name: 'Corporate Bond Funds', percent: 10 },
      { name: 'Flexi‑Cap Funds', percent: 30 },
      { name: 'Mid‑Cap Funds', percent: 30 },
      { name: 'Small‑Cap Funds', percent: 20 },
      { name: 'ELSS (Tax‑saving)', percent: 10 }
    ]
  }
});

/** ---------- Wizard Controller ---------- */
const steps = $$('.step');
const progressBar = $('#progress-bar');
let currentStep = 0;

function showStep(idx){
  steps.forEach((s,i)=> s.classList.toggle('active', i===idx));
  currentStep = idx;
  const pct = ((idx+1)/steps.length)*100;
  progressBar.style.width = `${pct}%`;
  progressBar.setAttribute('aria-valuenow', String(pct));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep(){
  if(!validateStep(currentStep)) return;
  if(currentStep < steps.length-1) showStep(currentStep+1);
}

function prevStep(){
  if(currentStep>0) showStep(currentStep-1);
}

function validateStep(stepIndex){
  clearErrors();
  let valid = true;
  if(stepIndex===0){ // age
    const age = Number($('#age').value);
    if(!age || age < 16 || age > 100){
      setError('#age-error', 'Enter a valid age between 16 and 100.');
      valid=false;
    }
  }
  if(stepIndex===1){ // income/expenses
    const income = Number($('#income').value);
    const expenses = Number($('#expenses').value);
    if(!income || income<=0){
      setError('#income-error', 'Enter a positive monthly income.');
      valid=false;
    }
    if(expenses<0){
      setError('#expenses-error', 'Expenses cannot be negative.');
      valid=false;
    }
  }
  if(stepIndex===2){ // EMI
    const has = $$('input[name="hasEmi"]').find(r=>r.checked)?.value;
    if(!has){
      setError('#hasEmi-error', 'Please select Yes or No.');
      valid=false;
    }else if(has==='yes'){
      const emi = Number($('#emiAmount').value);
      if(Number.isNaN(emi) || emi<0){
        setError('#emiAmount-error', 'EMI amount cannot be negative.');
        valid=false;
      }
    }
  }
  if(stepIndex===3){ // risk
    const risk = $$('input[name="risk"]').find(r=>r.checked)?.value;
    if(!risk){
      setError('#risk-error', 'Please choose a risk tolerance.');
      valid=false;
    }
  }
  return valid;
}

function setError(sel, msg){ const n = $(sel); if(n){ n.textContent = msg; } }
function clearErrors(){ $$('.error').forEach(n=> n.textContent=''); }

// Event wiring
$$('.next').forEach(btn=> btn.addEventListener('click', nextStep));
$$('.prev').forEach(btn=> btn.addEventListener('click', prevStep));

// EMI toggle
$$('input[name="hasEmi"]').forEach(r=> r.addEventListener('change', (e)=>{
  const has = e.target.value === 'yes';
  const field = $('#emiAmountField');
  field.hidden = !has;
  if(!has) $('#emiAmount').value = '';
}));

// Submit: compute plan
$('#wizard').addEventListener('submit', (e)=>{
  e.preventDefault();
  if(!validateStep(currentStep)) return;
  const inputs = getInputs();
  const profile = buildProfile(inputs);
  renderResults(profile);
});

// Footer year
$('#year').textContent = new Date().getFullYear();

// Results actions
$('#startOver')?.addEventListener('click', ()=>{
  $('#wizard').reset();
  $('#emiAmountField').hidden = true;
  showStep(0);
  $('#results').hidden = true;
  $('#wizard-card').hidden = false;
});
$('#editAnswers')?.addEventListener('click', ()=>{
  $('#wizard-card').hidden = false;
  showStep(0);
  $('#results').hidden = true;
});
$('#printPlan')?.addEventListener('click', ()=>{
  window.print();
});

/** ---------- Core logic ---------- */
function getInputs(){
  const age = Number($('#age').value);
  const income = Number($('#income').value);
  const expenses = Number($('#expenses').value);
  const hasEmi = $$('input[name="hasEmi"]').find(r=>r.checked)?.value === 'yes';
  const emiAmount = hasEmi ? Number($('#emiAmount').value||0) : 0;
  const risk = $$('input[name="risk"]').find(r=>r.checked)?.value || 'LOW';
  return { age, income, expenses, hasEmi, emiAmount, statedRisk: risk };
}

function horizonFromAge(age){
  if(age >= 20 && age <= 45) return HORIZON.LONG;
  if(age >= 46 && age <= 55) return HORIZON.MED;
  if(age >= 56) return HORIZON.SHORT;
  return HORIZON.LONG;
}

function adjustRisk({ statedRisk, horizon, income, expenses, emiAmount }){
  const order = ['LOW','MEDIUM','HIGH'];
  const idx = order.indexOf(statedRisk);
  let finalIdx = idx<0 ? 0 : idx;

  const emiRatio = income>0 ? (emiAmount / income) : 0;
  const surplus = income - expenses - emiAmount;
  const savingsRate = income>0 ? (surplus / income) : 0;

  if(emiRatio > RULES.EMI_HIGH_RATIO || savingsRate < RULES.LOW_SURPLUS_RATIO){
    finalIdx = Math.max(0, finalIdx - 1);
  }
  if(horizon === HORIZON.SHORT){
    finalIdx = 0;
  }
  if(horizon === HORIZON.LONG && emiRatio <= RULES.NUDGE_UP_EMI_MAX && savingsRate >= RULES.NUDGE_UP_SAVINGS_MIN){
    finalIdx = Math.min(2, finalIdx + 1);
  }
  return order[finalIdx];
}

function buildProfile(inputs){
  const { age, income, expenses, emiAmount, statedRisk } = inputs;
  const horizon = horizonFromAge(age);
  const investableSurplus = income - expenses - emiAmount;
  const finalRisk = adjustRisk({ ...inputs, horizon });
  const template = TEMPLATES[finalRisk];

  const categories = template.categories.map(c => ({
    name: c.name,
    alt: c.alt || null,
    percent: c.percent ?? null,
    why: EXPLANATIONS[c.name] || ''
  }));

  const split = template.assetSplit;

  return {
    inputs, horizon, investableSurplus, finalRisk,
    assetSplit: split, categories
  };
}

/** ---------- Render ---------- */
let chartInstance = null;

function renderResults(profile){
  $('#wizard-card').hidden = true;
  $('#results').hidden = false;

  $('#surplus').textContent = fmt(profile.investableSurplus);
  $('#horizon').textContent = profile.horizon;
  $('#finalRisk').textContent = profile.finalRisk;

  const { income, expenses, emiAmount } = profile.inputs;
  const alerts = [];
  const emiRatio = income>0 ? (emiAmount / income) : 0;
  const savingsRate = income>0 ? ((income - expenses - emiAmount) / income) : 0;

  if(profile.investableSurplus <= 0){
    alerts.push('Your investable surplus is zero or negative. Consider lowering expenses or EMIs and building an emergency fund before investing.');
  }
  if(emiRatio > RULES.EMI_HIGH_RATIO){
    alerts.push('Your EMI is a high share of income (>40%). We lowered your risk profile to prioritize stability.');
  }
  if(profile.horizon === HORIZON.SHORT){
    alerts.push('Short‑term goals call for capital preservation. We capped your risk at Low.');
  }
  const alertsBox = $('#alerts');
  if(alerts.length){
    alertsBox.hidden = false;
    alertsBox.innerHTML = '<ul>' + alerts.map(a=>`<li>${a}</li>`).join('') + '</ul>';
  }else{
    alertsBox.hidden = true;
    alertsBox.innerHTML = '';
  }

  // Chart
  const labels = Object.keys(profile.assetSplit);
  const data = Object.values(profile.assetSplit);
  const ctx = document.getElementById('allocationChart');
  if(chartInstance){ chartInstance.destroy(); }
  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom', labels: { color: '#e6ecff' } },
        title: { display: true, text: 'Recommended Asset Allocation', color: '#e6ecff' },
        tooltip: { callbacks: { label: (ctx)=> `${ctx.label}: ${ctx.raw}%` } }
      }
    }
  });

  // Categories list
  const wrap = $('#categories');
  wrap.innerHTML = '';
  profile.categories.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'category';
    const pct = typeof cat.percent === 'number' ? `<span class="badge">${cat.percent}%</span>` : '';
    const alt = cat.alt ? `<div class="small muted">Alternative: <em>${cat.alt}</em></div>` : '';
    div.innerHTML = `<h4>${cat.name} ${pct}</h4>
      <p>${cat.why}</p>
      ${alt}`;
    wrap.appendChild(div);
  });

  // Pre-fill API endpoint input from config
  const cfg = (window.APP_CONFIG && window.APP_CONFIG.API_ENDPOINT) || "";
  const ep = $('#apiEndpoint');
  if (cfg && !ep.value) ep.value = cfg;

  // Attach finder action
  $('#runFinder').onclick = () => runFinder(profile);
}

/** ---------- Fund Finder (calls your Vercel API) ---------- */
async function runFinder(profile){
  const endpoint = ($('#apiEndpoint').value || '').trim();
  const plan = $('#plan').value || 'Direct';
  const maxEr = Number($('#maxEr').value || 0.4);
  const minAum = Number($('#minAum').value || 1000);

  const status = $('#finderStatus');
  const tableWrap = $('#fundTableWrap');
  const tbody = $('#fundTable tbody');

  if(!endpoint){
    status.textContent = 'Enter your API Endpoint (Vercel) first.';
    status.classList.remove('loading');
    return;
  }

  // Map category preference from our profile to a default search category
  // Heuristic: pick the largest equity category under the final risk template
  let category = 'Large-Cap Index';
  if(profile.finalRisk === 'MEDIUM'){
    category = 'Large-Cap Funds';
  }else if(profile.finalRisk === 'HIGH'){
    category = 'Flexi-Cap Funds';
  }else if(profile.finalRisk === 'LOW'){
    // For low risk, prefer index / conservative options
    category = 'Large-Cap Index';
  }

  const payload = {
    country: "IN",
    category,
    risk: profile.finalRisk,
    plan,
    max_expense_ratio: maxEr,
    min_aum_cr: minAum,
    index: "Nifty 50 TRI",
    max_candidates: 5
  };

  status.textContent = 'Contacting research backend...';
  status.classList.add('loading');
  tbody.innerHTML = '';
  tableWrap.hidden = true;

  try{
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if(!res.ok){
      const txt = await res.text();
      throw new Error(`API ${res.status}: ${txt}`);
    }
    const data = await res.json();
    const funds = Array.isArray(data.funds) ? data.funds : [];
    if(!funds.length){
      status.textContent = 'No candidates returned (filters may be too strict). Try relaxing AUM/expense thresholds.';
      status.classList.remove('loading');
      return;
    }

    // Render table rows
    funds.forEach(f => {
      const tr = document.createElement('tr');
      const cites = (f.citations || []).slice(0,4).map(c => `<a class="badge-link" target="_blank" rel="noopener" href="${c.url}">${c.title || 'Source'}</a>`).join(' ');
      tr.innerHTML = `
        <td>${escapeHtml(f.scheme_name || '')}</td>
        <td>${escapeHtml(f.plan || '')}</td>
        <td>${escapeHtml(f.category || '')}</td>
        <td>${formatNum(f.expense_ratio)}</td>
        <td>${formatNum(f.aum_cr)}</td>
        <td>${formatNum(f.returns_1y)}</td>
        <td>${formatNum(f.cagr_3y)}</td>
        <td>${formatNum(f.cagr_5y)}</td>
        <td class="small">${escapeHtml(f.rationale || '')}</td>
        <td>${cites}</td>
      `;
      tbody.appendChild(tr);
    });

    tableWrap.hidden = false;
    status.textContent = `Found ${funds.length} candidate fund(s). As of: ${funds[0]?.as_of || data.as_of || ''}`;
    status.classList.remove('loading');

  }catch(err){
    status.textContent = 'Error: ' + (err?.message || err);
    status.classList.remove('loading');
  }
}

function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function formatNum(n){
  if(n==null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  if(Math.abs(v) >= 1000) return v.toFixed(0);
  if(Math.abs(v) >= 100) return v.toFixed(1);
  return v.toFixed(2);
}

/** ---------- Init ---------- */
showStep(0);

// Persist text fields
['age','income','expenses','emiAmount'].forEach(id=>{
  const el = document.getElementById(id);
  el?.addEventListener('input', ()=> sessionStorage.setItem(id, el.value));
  const saved = sessionStorage.getItem(id);
  if(saved) el.value = saved;
});
$$('input[name="hasEmi"]').forEach(r=> r.addEventListener('change', ()=>{
  sessionStorage.setItem('hasEmi', $$('input[name="hasEmi"]').find(x=>x.checked)?.value || '');
}));
$$('input[name="risk"]').forEach(r=> r.addEventListener('change', ()=>{
  sessionStorage.setItem('risk', $$('input[name="risk"]').find(x=>x.checked)?.value || '');
}));
const savedHasEmi = sessionStorage.getItem('hasEmi');
if(savedHasEmi){ $$('input[name="hasEmi"]').find(r=>r.value===savedHasEmi).checked = true; if(savedHasEmi==='yes') $('#emiAmountField').hidden = false; }
const savedRisk = sessionStorage.getItem('risk');
if(savedRisk){ $$('input[name="risk"]').find(r=>r.value===savedRisk).checked = true; }
