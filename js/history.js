import { DB } from './db.js';

export class HistoryTimeline {
  static init() {
    DB.init();
    this.renderTimeline();
  }

  static renderTimeline() {
    const container = document.getElementById('history-timeline-container');
    if (!container) return;

    // Fetch history logs
    const timeline = DB.getStorageItem('lawal_timeline', []);
    if (timeline.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-500 italic">No historical timeline seeded.</p>';
      return;
    }

    container.innerHTML = timeline.map((item, idx) => {
      return `
        <div class="flex gap-6 relative">
          <!-- Stem connector lines -->
          ${idx < timeline.length - 1 ? '<div class="absolute left-[15px] top-9 bottom-0 w-[1px] bg-white/5"></div>' : ''}

          <!-- Glowing timeline dot -->
          <div class="w-8 h-8 rounded-full bg-slate-900 border border-gold/40 flex items-center justify-center text-xs text-gold font-bold shrink-0 z-10 shadow-lg">
            <i class="fa-solid fa-feather text-[10px]"></i>
          </div>

          <!-- Description detail Card -->
          <div class="glass-panel border border-white/5 p-5 rounded-2xl flex flex-col gap-2 flex-grow hover:border-gold/20 hover:bg-slate-900/40 transition-colors">
            <span class="text-xs font-serif font-bold text-gold tracking-widest uppercase">${item.year}</span>
            <h3 class="text-sm font-serif font-bold text-white tracking-wide">${item.title}</h3>
            <p class="text-xs text-slate-400 font-light leading-relaxed">${item.description}</p>
          </div>
        </div>
      `;
    }).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  HistoryTimeline.init();
});
