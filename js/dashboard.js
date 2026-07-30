import { DB } from './db.js';

export class Dashboard {
  static init() {
    DB.init();

    // 1. Welcome Message personalization
    this.personalizeWelcome();

    // 2. Compute and bind dashboard statistics
    this.renderStats();

    // 3. Render Upcoming Birthdays
    this.renderBirthdays();

    // 4. Render News Announcements Feed
    this.renderNewsFeed();

    // 5. Render Activity Logs
    this.renderActivityLogs();

    // Bind Clear log trigger
    const clearBtn = document.getElementById('clear-activity-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        localStorage.removeItem('lawal_activity');
        this.renderActivityLogs();
      });
    }
  }

  static personalizeWelcome() {
    const user = JSON.parse(localStorage.getItem('lawal_current_user'));
    const welcome = document.getElementById('dashboard-welcome-msg');
    if (user && welcome) {
      welcome.innerHTML = `Welcome back, <strong class="text-gold font-semibold">${user.firstName} ${user.lastName}</strong>. Private session active.`;
    }
  }

  static renderStats() {
    const members = DB.getMembers();
    const docs = DB.getDocuments();

    // Set metrics
    document.getElementById('stat-members').textContent = members.length;
    document.getElementById('stat-documents').textContent = docs.length;

    // Branches
    document.getElementById('stat-countries').textContent = "4 Branches"; // Lagos, London, Abuja, US

    // Max generation
    const maxGen = members.length > 0 ? Math.max(...members.map(m => m.generation || 1)) : 1;
    document.getElementById('stat-generations').textContent = maxGen;

    // Media Photos
    document.getElementById('stat-photos').textContent = "5 Albums";
  }

  static renderBirthdays() {
    const container = document.getElementById('birthdays-carousel');
    if (!container) return;

    const events = DB.getEvents().filter(e => e.category === 'Birthdays' || e.category === 'Anniversaries');
    if (events.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-500 font-light">No upcoming anniversaries listed.</p>';
      return;
    }

    container.innerHTML = events.slice(0, 4).map(evt => {
      // Find matching family member if applicable to show profile avatar
      const members = DB.getMembers();
      const relative = members.find(m => evt.title.includes(m.firstName));
      const avatarHtml = relative
        ? `<img src="${relative.avatar}" alt="${relative.firstName}" class="w-8 h-8 rounded-full object-cover border border-gold/25">`
        : `<div class="w-8 h-8 rounded-full bg-gold/10 text-gold flex items-center justify-center text-xs font-serif"><i class="fa-solid fa-gift"></i></div>`;

      return `
        <div class="glass-panel p-4 rounded-xl border border-white/5 hover:border-gold/20 hover:translate-y-[-1px] transition-all flex items-center gap-3 shadow-sm">
          ${avatarHtml}
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-semibold text-white truncate">${evt.title}</span>
            <span class="text-[10px] text-slate-400 mt-0.5 font-light">${evt.date} • ${evt.time || 'All day'}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  static renderNewsFeed() {
    const container = document.getElementById('news-feed-container');
    if (!container) return;

    const news = DB.getNews();
    if (news.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-500 font-light">No family announcements posted yet.</p>';
      return;
    }

    container.innerHTML = news.slice(0, 3).map(item => {
      return `
        <article class="glass-panel p-5 rounded-2xl border border-white/5 hover:border-emerald/10 transition-all flex flex-col gap-3 group">
          <div class="flex items-center justify-between">
            <span class="text-[9px] uppercase tracking-wider bg-emerald/10 text-emerald px-2.5 py-0.5 rounded-full font-bold">${item.category}</span>
            <span class="text-[10px] text-slate-500 font-light">${item.date}</span>
          </div>
          <div class="flex flex-col gap-1.5 text-left">
            <h3 class="text-sm font-serif font-bold text-white group-hover:text-gold transition-colors">${item.title}</h3>
            <p class="text-xs text-slate-400 font-light leading-relaxed">${item.excerpt}</p>
          </div>
          <div class="border-t border-white/5 pt-3.5 flex items-center gap-2.5">
            <img src="${item.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&q=80'}" alt="${item.author}" class="w-6 h-6 rounded-full object-cover">
            <span class="text-[10px] text-slate-500 font-light">Posted by <strong class="text-slate-300 font-medium">${item.author}</strong></span>
          </div>
        </article>
      `;
    }).join('');
  }

  static renderActivityLogs() {
    const container = document.getElementById('activity-log-container');
    if (!container) return;

    const logs = DB.getActivityLog();
    if (logs.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-500 font-light italic">No activity registered yet.</p>';
      return;
    }

    container.innerHTML = logs.map(log => {
      return `
        <div class="flex gap-3 items-start border-b border-white/5 pb-3 last:border-none text-left">
          <div class="w-6 h-6 rounded bg-slate-950 border border-gold/15 text-gold flex items-center justify-center text-[10px] mt-0.5 shrink-0">
            <i class="fa-solid fa-bell-concierge"></i>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-semibold text-white truncate">${log.action}</span>
            <span class="text-[10px] text-slate-400 mt-0.5 leading-relaxed">${log.detail}</span>
            <span class="text-[9px] text-slate-500 font-light mt-1">${log.time}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Automatically initiate on page load
document.addEventListener('DOMContentLoaded', () => {
  Dashboard.init();
});
