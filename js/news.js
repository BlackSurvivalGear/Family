import { DB } from './db.js';

export class FamilyNews {
  static init() {
    DB.init();
    this.activeCategory = "All";

    this.feed = document.getElementById('news-timeline-feed');
    this.filtersContainer = document.getElementById('news-category-filters');
    this.addBtn = document.getElementById('add-news-trigger-btn');

    this.renderFilters();
    this.render();

    // Bind Add notice trigger
    if (this.addBtn) {
      this.addBtn.addEventListener('click', () => {
        const title = prompt("Enter Announcement Title:", "Amina Lawal secures research grant!");
        const category = prompt("Enter Category (Births, Graduations, Marriages, Achievements, Obituaries):", "Achievements");
        const excerpt = prompt("Enter Brief Teaser excerpt:", "Amina awarded Oxford Artificial Intelligence research funding...");
        const content = prompt("Enter Full announcement content story:", "Detailed description of the scholastic merit...");

        if (title && category && excerpt && content) {
          const user = JSON.parse(localStorage.getItem('lawal_current_user')) || { firstName: "Administrator" };
          DB.addNews({
            title,
            category,
            excerpt,
            content,
            author: `${user.firstName} ${user.lastName || ''}`,
            avatar: user.avatar
          });
          this.render();
        }
      });
    }
  }

  static renderFilters() {
    if (!this.filtersContainer) return;

    const categories = ["All", "Births", "Graduations", "Marriages", "Achievements", "Obituaries"];

    this.filtersContainer.innerHTML = categories.map(cat => {
      const isActive = this.activeCategory === cat;
      const actClass = isActive
        ? "bg-gold text-slate-950 font-bold"
        : "bg-white/5 border border-white/5 text-slate-400 hover:text-white";
      return `
        <button class="w-full h-9 px-4 rounded-xl text-xs text-left transition-all ${actClass}" data-filter="${cat}">${cat}</button>
      `;
    }).join('');

    // Bind clicks
    this.filtersContainer.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.activeCategory = e.currentTarget.getAttribute('data-filter');
        this.renderFilters();
        this.render();
      });
    });
  }

  static render() {
    if (!this.feed) return;

    const news = DB.getNews();
    const filtered = this.activeCategory === "All" ? news : news.filter(n => n.category === this.activeCategory);

    if (filtered.length === 0) {
      this.feed.innerHTML = `
        <div class="glass-panel p-8 text-center text-xs text-slate-500 font-light rounded-2xl">
          No family notices registered in this category.
        </div>
      `;
      return;
    }

    this.feed.innerHTML = filtered.map(item => {
      return `
        <article class="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4 text-left group hover:border-gold/20 hover:bg-slate-900/40 transition-colors">
          <div class="flex items-center justify-between">
            <span class="text-[9px] uppercase tracking-wider bg-emerald/10 text-emerald border border-emerald/15 px-2.5 py-0.5 rounded font-bold">${item.category}</span>
            <span class="text-xs text-slate-500 font-light">${item.date}</span>
          </div>

          <div class="flex flex-col gap-2">
            <h3 class="text-base font-serif font-bold text-white group-hover:text-gold transition-colors">${item.title}</h3>
            <p class="text-xs text-slate-300 font-light leading-relaxed whitespace-pre-wrap">${item.content || item.excerpt}</p>
          </div>

          <div class="border-t border-white/5 pt-4 flex items-center gap-2.5">
            <img src="${item.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&q=80'}" alt="${item.author}" class="w-7 h-7 rounded-full object-cover">
            <span class="text-[10px] text-slate-500 font-light">Eulogy / News by <strong class="text-slate-300 font-medium">${item.author}</strong></span>
          </div>
        </article>
      `;
    }).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  FamilyNews.init();
});
