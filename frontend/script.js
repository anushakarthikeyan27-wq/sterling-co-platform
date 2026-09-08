// ---------- Connects to your real backend ----------
const API_BASE = 'http://localhost:5000/api';

// Dashboard-only mock data (messaging/projects/notifications stay mock for now —
// those need login/auth wired up, which is a good next step after today).
const PROJECTS = [
  { id:101, title:"Structural audit — 3BHK independent house", client:"Deepak Nair", status:"pending", budget:"₹35,000", timeline:"2 weeks", date:"2 Sep 2026" },
  { id:102, title:"Seismic retrofit consultation", client:"Meera Krishnan", status:"progress", budget:"₹1,20,000", timeline:"6 weeks", date:"14 Aug 2026" },
  { id:103, title:"Foundation review, hillside plot", client:"Ashwin Rao", status:"accepted", budget:"₹28,000", timeline:"10 days", date:"28 Aug 2026" },
  { id:104, title:"Load calculation, additional floor", client:"Priyanka Shah", status:"completed", budget:"₹18,500", timeline:"1 week", date:"3 Jul 2026" },
  { id:105, title:"Site inspection — commercial unit", client:"Farhan Ali", status:"cancelled", budget:"₹22,000", timeline:"5 days", date:"19 Jun 2026" }
];

const THREADS = [
  { id:1, name:"Deepak Nair", online:true, unread:true, preview:"Could you share the audit checklist before Monday?",
    messages:[
      {from:"them", text:"Hi Elena, thanks for taking this on.", time:"10:02 AM"},
      {from:"me", text:"Happy to help — I'll need the original structural drawings if you have them.", time:"10:05 AM"},
      {from:"them", text:"Could you share the audit checklist before Monday?", time:"9:41 AM"}
    ]},
  { id:2, name:"Meera Krishnan", online:false, unread:false, preview:"Sounds good, see you on site Thursday.",
    messages:[
      {from:"me", text:"I can visit site Thursday morning to inspect the east wall.", time:"Yesterday"},
      {from:"them", text:"Sounds good, see you on site Thursday.", time:"Yesterday"}
    ]},
  { id:3, name:"Ashwin Rao", online:false, unread:false, preview:"Quote received — reviewing with my contractor.",
    messages:[
      {from:"them", text:"Quote received — reviewing with my contractor.", time:"Mon"}
    ]}
];

const NOTIFICATIONS = [
  { text:"Deepak Nair sent you a new message.", time:"12 minutes ago", read:false },
  { text:"New project request: \"Structural audit — 3BHK independent house\".", time:"1 hour ago", read:false },
  { text:"Ashwin Rao accepted your quote.", time:"Yesterday, 6:14 PM", read:true },
  { text:"Meera Krishnan left you a 5-star review.", time:"3 days ago", read:true },
  { text:"Your profile was viewed 14 times this week.", time:"5 days ago", read:true }
];

// ---------- Helpers ----------
function starString(rating){
  const full = Math.round(rating || 0);
  return "★".repeat(full) + "☆".repeat(5-full);
}

// Converts a professional document from the backend into the shape
// our card/profile rendering functions expect.
function mapProfessional(p){
  return {
    id: p._id,
    name: p.user?.name || 'Unnamed',
    role: p.role,
    specialty: p.specialty,
    location: p.user?.location || (p.locationsServed && p.locationsServed[0]) || '',
    years: p.yearsExperience || 0,
    rate: p.pricingNote || (p.hourlyRate ? `₹${p.hourlyRate}/hr` : 'Rate on request'),
    rating: p.ratingAverage || 0,
    reviews: p.ratingCount || 0,
    available: p.availability === 'open',
    bio: p.bio || '',
    tags: p.tags || [],
    portfolio: (p.portfolio || []).map(item => ({
      title: item.title, cat: item.category, desc: item.description,
      featured: item.featured, date: item.completedOn ? new Date(item.completedOn).getFullYear() : ''
    }))
  };
}

function proCardHTML(p){
  return `
  <a class="card pro-card" href="profile.html?id=${p.id}">
    <div class="pro-card-media">
      <span class="avail" style="${p.available ? '' : 'color:var(--ivory-faint);border-color:var(--hairline-light);'}">${p.available ? 'Open for work' : 'Currently booked'}</span>
    </div>
    <div class="pro-card-body">
      <div class="pro-card-name">${p.name}</div>
      <div class="pro-card-role">${p.role} · ${p.location}</div>
      <div class="pro-card-meta">${p.years} years experience</div>
      <div class="pro-card-tags">${p.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
      <div class="pro-card-foot">
        <span class="stars">${starString(p.rating)} <span style="color:var(--ivory-faint)">(${p.reviews})</span></span>
        <span class="rate">${p.rate}</span>
      </div>
    </div>
  </a>`;
}

function renderCards(containerId, list){
  const el = document.getElementById(containerId);
  if(!el) return;
  el.innerHTML = list.map(proCardHTML).join('');
}

// ---------- Fetch real professionals from the backend ----------
async function fetchProfessionals(){
  try {
    const res = await fetch(`${API_BASE}/professionals`);
    if(!res.ok) throw new Error('Request failed');
    const data = await res.json();
    return data.map(mapProfessional);
  } catch (err) {
    console.error('Could not load professionals from backend:', err);
    return [];
  }
}

// ---------- Browse page filtering ----------
async function initBrowse(){
  const grid = document.getElementById('proGrid');
  if(!grid) return;

  const all = await fetchProfessionals();
  renderCards('proGrid', all);
  const countEl = document.getElementById('resultCount');
  if(countEl) countEl.textContent = all.length;

  const searchInput = document.getElementById('searchInput');
  const catFilter = document.getElementById('catFilter');
  const availFilter = document.getElementById('availFilter');
  const sortFilter = document.getElementById('sortFilter');

  function apply(){
    let list = all.slice();
    const q = (searchInput.value || '').toLowerCase().trim();
    if(q){
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q) || p.specialty.toLowerCase().includes(q));
    }
    if(catFilter.value !== 'all'){
      list = list.filter(p => p.specialty === catFilter.value);
    }
    if(availFilter.value === 'open'){
      list = list.filter(p => p.available);
    }
    if(sortFilter.value === 'rating'){
      list.sort((a,b)=> b.rating - a.rating);
    } else if(sortFilter.value === 'reviews'){
      list.sort((a,b)=> b.reviews - a.reviews);
    } else if(sortFilter.value === 'experience'){
      list.sort((a,b)=> b.years - a.years);
    }
    renderCards('proGrid', list);
    if(countEl) countEl.textContent = list.length;
  }

  [searchInput, catFilter, availFilter, sortFilter].forEach(el => {
    if(!el) return;
    el.addEventListener('input', apply);
    el.addEventListener('change', apply);
  });
}

// ---------- Profile page ----------
async function initProfile(){
  const container = document.getElementById('profileRoot');
  if(!container) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if(!id) return;

  try {
    const res = await fetch(`${API_BASE}/professionals/${id}`);
    if(!res.ok) throw new Error('Not found');
    const raw = await res.json();
    const p = mapProfessional(raw);

    document.getElementById('proInitial').textContent = p.name.split(' ').map(w=>w[0]).join('');
    document.getElementById('proName').textContent = p.name;
    document.getElementById('proRole').textContent = `${p.role} · ${p.specialty}`;
    document.getElementById('proMeta').textContent = `${p.location} · ${p.years} years experience · ${p.available ? 'Open for work' : 'Currently booked'}`;
    document.getElementById('proBio').textContent = p.bio;
    document.getElementById('proRate').textContent = p.rate;
    document.getElementById('proRating').textContent = `${starString(p.rating)} ${p.rating} (${p.reviews} reviews)`;
    document.title = `${p.name} — Sterling & Co`;

    document.getElementById('portfolioGrid').innerHTML = p.portfolio.map(item => `
      <div class="portfolio-item">
        <div class="thumb"></div>
        <div class="info">
          ${item.featured ? '<span class="featured-flag">FEATURED PROJECT</span><br>' : ''}
          <h4>${item.title}</h4>
          <p>${item.cat || ''} ${item.date ? '· ' + item.date : ''}</p>
          <p style="margin-top:8px;">${item.desc || ''}</p>
        </div>
      </div>`).join('');

    // Real reviews from the backend
    const reviewRes = await fetch(`${API_BASE}/reviews/professional/${id}`);
    const reviews = reviewRes.ok ? await reviewRes.json() : [];
    const reviewList = document.getElementById('reviewList');
    if(reviews.length === 0){
      reviewList.innerHTML = `<p style="color:var(--ivory-faint);">No reviews yet.</p>`;
    } else {
      reviewList.innerHTML = reviews.map(r => `
        <div class="review">
          <div class="review-head"><b>${r.client?.name || 'Client'}</b><span class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></div>
          <p>${r.text || ''}</p>
        </div>`).join('');
    }
  } catch (err) {
    console.error('Could not load this profile:', err);
  }
}

// ---------- Dashboard: tabs, projects, messages, notifications (still mock) ----------
function switchTab(tabName){
  document.querySelectorAll('.tab-panel').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.dash-side a').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');
  document.getElementById('nav-' + tabName).classList.add('active');
}

function statusClass(status){
  return { pending:'status-pending', accepted:'status-accepted', progress:'status-progress', completed:'status-completed', cancelled:'status-cancelled' }[status];
}
function statusLabel(status){
  return { pending:'Pending', accepted:'Accepted', progress:'In Progress', completed:'Completed', cancelled:'Cancelled' }[status];
}

function renderProjects(){
  const el = document.getElementById('projectList');
  if(!el) return;
  el.innerHTML = PROJECTS.map(p => `
    <div class="list-row">
      <div>
        <div class="title">${p.title}</div>
        <div class="sub">Client: ${p.client} · Budget ${p.budget} · Timeline ${p.timeline} · Requested ${p.date}</div>
      </div>
      <div class="list-row-actions">
        <span class="status-pill ${statusClass(p.status)}">${statusLabel(p.status)}</span>
      </div>
    </div>`).join('');
}

let activeThreadId = 1;
function renderThreads(){
  const el = document.getElementById('threadList');
  if(!el) return;
  el.innerHTML = THREADS.map(t => `
    <div class="thread-item ${t.id === activeThreadId ? 'active' : ''}" onclick="openThread(${t.id})">
      <div class="name">${t.unread ? '<span class="dot"></span>' : ''}${t.name}</div>
      <div class="preview">${t.preview}</div>
    </div>`).join('');
}

function openThread(id){
  activeThreadId = id;
  const t = THREADS.find(x => x.id === id);
  t.unread = false;
  renderThreads();
  document.getElementById('chatName').textContent = t.name;
  document.getElementById('chatStatus').textContent = t.online ? 'Online' : 'Offline';
  document.getElementById('chatBody').innerHTML = t.messages.map(m => `
    <div class="bubble ${m.from === 'me' ? 'me' : 'them'}">${m.text}<span class="time">${m.time}</span></div>`).join('');
  const body = document.getElementById('chatBody');
  body.scrollTop = body.scrollHeight;
}

function sendMessage(event){
  event.preventDefault();
  const input = document.getElementById('chatInput');
  if(!input.value.trim()) return;
  const t = THREADS.find(x => x.id === activeThreadId);
  t.messages.push({ from:'me', text: input.value.trim(), time:'Just now' });
  t.preview = input.value.trim();
  input.value = '';
  openThread(activeThreadId);
  renderThreads();
}

function renderNotifications(){
  const el = document.getElementById('notifList');
  if(!el) return;
  el.innerHTML = NOTIFICATIONS.map(n => `
    <div class="notif-row">
      <div class="notif-dot ${n.read ? 'read' : ''}"></div>
      <div><p>${n.text}</p><span>${n.time}</span></div>
    </div>`).join('');
}

function initDashboard(){
  if(!document.getElementById('dashRoot')) return;
  renderProjects();
  renderThreads();
  openThread(activeThreadId);
  renderNotifications();
}

// ---------- Login page: now calls the real backend ----------
function setRole(role, el){
  document.querySelectorAll('.role-toggle button').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  window.__selectedRole = role;
}
function setFormTab(tab, el){
  document.querySelectorAll('.form-tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('panel-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('panel-signup').style.display = tab === 'signup' ? 'block' : 'none';
}

async function handleLogin(event){
  event.preventDefault();
  const email = document.getElementById('li-email').value;
  const password = document.getElementById('li-pass').value;
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.removeItem('placeholder'); // no browser storage used for real data
    alert(`Welcome back, ${data.user.name}! (Token received — dashboard wiring is a future step.)`);
  } catch (err) {
    alert('Login failed: ' + err.message);
  }
}

async function handleSignup(event){
  event.preventDefault();
  const name = document.getElementById('su-name').value;
  const email = document.getElementById('su-email').value;
  const password = document.getElementById('su-pass').value;
  const location = document.getElementById('su-loc').value;
  const role = window.__selectedRole || 'client';
  try {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, location, role })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Signup failed');
    alert(`Account created for ${data.user.name}! You can now sign in.`);
  } catch (err) {
    alert('Signup failed: ' + err.message);
  }
}

// ---------- Init on load ----------
document.addEventListener('DOMContentLoaded', async () => {
  initBrowse();
  initProfile();
  initDashboard();
  const featured = document.getElementById('featuredGrid');
  if(featured){
    const all = await fetchProfessionals();
    renderCards('featuredGrid', all.filter(p => p.rating >= 4.5).slice(0,3).length ? all.filter(p => p.rating >= 0).slice(0,3) : all.slice(0,3));
  }
});
