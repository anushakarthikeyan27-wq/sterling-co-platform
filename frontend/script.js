// ---------- Connects to your real backend ----------
const API_BASE = 'https://sterling-co-platform.onrender.com/api';

// ---------- Auth helpers (uses localStorage — normal for a real deployed site) ----------
function getAuth(){
  try {
    const raw = localStorage.getItem('sterling_auth');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function setAuth(token, user){
  localStorage.setItem('sterling_auth', JSON.stringify({ token, user }));
}
function clearAuth(){
  localStorage.removeItem('sterling_auth');
}
function authHeaders(){
  const auth = getAuth();
  return auth ? { 'Authorization': `Bearer ${auth.token}` } : {};
}

// ---------- Helpers ----------
function starString(rating){
  const full = Math.round(rating || 0);
  return "★".repeat(full) + "☆".repeat(5-full);
}

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
let currentProfessionalId = null;

async function initProfile(){
  const container = document.getElementById('profileRoot');
  if(!container) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if(!id) return;
  currentProfessionalId = id;

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

// Real "Request a Quote" — creates an actual project request via the API
async function requestQuote(){
  const auth = getAuth();
  if(!auth){
    alert('Please sign in as a client first to request a quote.');
    window.location.href = 'login.html';
    return;
  }
  if(auth.user.role !== 'client'){
    alert('Only client accounts can request a quote. Sign in as a client to continue.');
    return;
  }
  const title = prompt('Briefly describe the project (e.g. "Structural audit for 3BHK house"):');
  if(!title) return;
  const description = prompt('Add a few more details about the project:') || '';
  const budget = prompt('Approximate budget (e.g. ₹35,000):') || '';
  const timeline = prompt('Expected timeline (e.g. 2 weeks):') || '';

  try {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ professionalId: currentProfessionalId, title, description, budget, timeline })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Could not submit request');
    alert('Your project request has been sent!');
  } catch (err) {
    alert('Something went wrong: ' + err.message);
  }
}

// ---------- Dashboard: tabs ----------
function switchTab(tabName){
  document.querySelectorAll('.tab-panel').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.dash-side a').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');
  document.getElementById('nav-' + tabName).classList.add('active');
}

function statusClass(status){
  return { pending:'status-pending', accepted:'status-accepted', in_progress:'status-progress', completed:'status-completed', cancelled:'status-cancelled' }[status] || 'status-pending';
}
function statusLabel(status){
  return { pending:'Pending', accepted:'Accepted', in_progress:'In Progress', completed:'Completed', cancelled:'Cancelled' }[status] || status;
}

// ---------- Real projects ----------
async function renderProjects(){
  const el = document.getElementById('projectList');
  if(!el) return;
  el.innerHTML = `<p style="color:var(--ivory-faint);">Loading your projects…</p>`;
  try {
    const res = await fetch(`${API_BASE}/projects/mine`, { headers: authHeaders() });
    const projects = await res.json();
    if(!res.ok) throw new Error(projects.error || 'Could not load projects');

    if(projects.length === 0){
      el.innerHTML = `<p style="color:var(--ivory-faint);">No projects yet.</p>`;
      return;
    }

    const auth = getAuth();
    el.innerHTML = projects.map(p => {
      const otherParty = auth.user.role === 'client'
        ? (p.professional?.user?.name || 'Professional')
        : (p.client?.name || 'Client');
      return `
      <div class="list-row">
        <div>
          <div class="title">${p.title}</div>
          <div class="sub">${auth.user.role === 'client' ? 'Professional' : 'Client'}: ${otherParty} · Budget ${p.budget || 'Not set'} · Timeline ${p.timeline || 'Not set'} · Requested ${new Date(p.createdAt).toLocaleDateString()}</div>
        </div>
        <div class="list-row-actions">
          <span class="status-pill ${statusClass(p.status)}">${statusLabel(p.status)}</span>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    el.innerHTML = `<p style="color:var(--ivory-faint);">Could not load projects: ${err.message}</p>`;
  }
}

// ---------- Real messaging ----------
let activeThreadId = null;
let threadCache = [];

async function renderThreads(){
  const el = document.getElementById('threadList');
  if(!el) return;
  try {
    const res = await fetch(`${API_BASE}/messages/threads`, { headers: authHeaders() });
    const threads = await res.json();
    if(!res.ok) throw new Error(threads.error || 'Could not load messages');
    threadCache = threads;

    if(threads.length === 0){
      el.innerHTML = `<p style="padding:20px;color:var(--ivory-faint);font-size:13px;">No conversations yet.</p>`;
      return;
    }

    const auth = getAuth();
    el.innerHTML = threads.map(t => {
      const other = t.participants.find(p => p._id !== auth.user.id) || t.participants[0];
      return `
      <div class="thread-item ${t._id === activeThreadId ? 'active' : ''}" onclick="openThread('${t._id}')">
        <div class="name">${other?.name || 'Conversation'}</div>
        <div class="preview">${t.lastMessage || 'No messages yet'}</div>
      </div>`;
    }).join('');

    if(!activeThreadId && threads.length > 0){
      openThread(threads[0]._id);
    }
  } catch (err) {
    el.innerHTML = `<p style="padding:20px;color:var(--ivory-faint);font-size:13px;">Could not load messages: ${err.message}</p>`;
  }
}

async function openThread(id){
  activeThreadId = id;
  renderThreads();
  const t = threadCache.find(x => x._id === id);
  const auth = getAuth();
  const other = t?.participants.find(p => p._id !== auth.user.id) || t?.participants[0];
  document.getElementById('chatName').textContent = other?.name || 'Conversation';
  document.getElementById('chatStatus').textContent = other?.role || '';

  try {
    const res = await fetch(`${API_BASE}/messages/threads/${id}`, { headers: authHeaders() });
    const messages = await res.json();
    document.getElementById('chatBody').innerHTML = messages.map(m => `
      <div class="bubble ${m.sender === auth.user.id ? 'me' : 'them'}">${m.text || ''}<span class="time">${new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>`).join('');
    const body = document.getElementById('chatBody');
    body.scrollTop = body.scrollHeight;
  } catch (err) {
    console.error(err);
  }
}

async function sendMessage(event){
  event.preventDefault();
  const input = document.getElementById('chatInput');
  if(!input.value.trim() || !activeThreadId) return;
  try {
    await fetch(`${API_BASE}/messages/threads/${activeThreadId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ text: input.value.trim() })
    });
    input.value = '';
    openThread(activeThreadId);
    renderThreads();
  } catch (err) {
    alert('Could not send message: ' + err.message);
  }
}

// ---------- Real notifications ----------
async function renderNotifications(){
  const el = document.getElementById('notifList');
  if(!el) return;
  try {
    const res = await fetch(`${API_BASE}/notifications`, { headers: authHeaders() });
    const notifications = await res.json();
    if(!res.ok) throw new Error(notifications.error || 'Could not load notifications');

    if(notifications.length === 0){
      el.innerHTML = `<p style="color:var(--ivory-faint);">No notifications yet.</p>`;
      return;
    }

    el.innerHTML = notifications.map(n => `
      <div class="notif-row">
        <div class="notif-dot ${n.read ? 'read' : ''}"></div>
        <div><p>${n.text}</p><span>${new Date(n.createdAt).toLocaleString()}</span></div>
      </div>`).join('');
  } catch (err) {
    el.innerHTML = `<p style="color:var(--ivory-faint);">Could not load notifications: ${err.message}</p>`;
  }
}

function initDashboard(){
  if(!document.getElementById('dashRoot')) return;

  const auth = getAuth();
  if(!auth){
    alert('Please sign in to view your dashboard.');
    window.location.href = 'login.html';
    return;
  }

  const welcome = document.getElementById('dashWelcome');
  if(welcome) welcome.textContent = `Welcome back, ${auth.user.name.split(' ')[0]}.`;

  renderProjects();
  renderThreads();
  renderNotifications();
}

function logout(){
  clearAuth();
  window.location.href = 'index.html';
}

// ---------- Login page ----------
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
    setAuth(data.token, data.user);
    alert(`Welcome back, ${data.user.name}!`);
    window.location.href = 'dashboard.html';
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
    setAuth(data.token, data.user);
    alert(`Account created for ${data.user.name}!`);
    window.location.href = 'dashboard.html';
  } catch (err) {
    alert('Signup failed: ' + err.message);
  }
}

// ---------- Nav: show Sign in vs Sign out depending on auth state ----------
function updateNavAuthState(){
  const auth = getAuth();
  document.querySelectorAll('[data-auth-action]').forEach(el => {
    if(auth){
      el.textContent = 'Sign out';
      el.href = '#';
      el.onclick = (e) => { e.preventDefault(); logout(); };
    }
  });
}

// ---------- Init on load ----------
document.addEventListener('DOMContentLoaded', async () => {
  updateNavAuthState();
  initBrowse();
  initProfile();
  initDashboard();
  const featured = document.getElementById('featuredGrid');
  if(featured){
    const all = await fetchProfessionals();
    renderCards('featuredGrid', all.slice(0,3));
  }
});
