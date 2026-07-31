import { DB } from './db.js';

export class HistoryTimeline {
  static init() {
    DB.init();
    this.renderTimeline();
    this.bindInteractiveMap();
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
        <div class="flex gap-6 relative text-left">
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

  // Interactive Coordinates Info cards panel binding
  static bindInteractiveMap() {
    const markers = document.querySelectorAll('.map-marker');
    const infoPanel = document.getElementById('map-info-content');

    if (!infoPanel) return;

    const mapData = {
      abeokuta: {
        title: "Abeokuta, Nigeria",
        badge: "The Core Cradle",
        desc: "Birthplace of late Patriarch Alhaji Kolawole Lawal in 1940. Nestled underneath the shadow of the historic Olumo Rock, our Egba ancestors traded scholarly insights and cotton craft.",
        users: "Seed Patriarch: Kolawole",
        date: "Established: 1890s"
      },
      lagos: {
        title: "Lagos, Nigeria",
        badge: "Consolidation Hub",
        desc: "The primary headquarters of our commercial enterprises. Alhaji Kolawole relocated here in the early 1970s, establishing construction firms, textile trades in Balogun market, and senior legal advocates operations.",
        users: "Matriarch Fatima, Funmilayo SAN, Major Kunle",
        date: "Relocated: 1970s"
      },
      london: {
        title: "London, United Kingdom",
        badge: "Transatlantic Bridge",
        desc: "Our primary healthcare and high academic engineering branch. Tunde studied at Oxford and co-founded Harley orthodontist practices, while Abiodun leads principal structural concrete designs.",
        users: "Dr. Tunde, Dr. Folasade, Abiodun, Amina (AI Startup)",
        date: "Established: Late 1980s"
      },
      newyork: {
        title: "New York & Boston, USA",
        badge: "Next Frontiers",
        desc: "Our newest investment and venture funding frontier. Tolani studied economics at Yale and completed an MBA at Harvard Business School, presently directing global private impact capital.",
        users: "Tolani Alabi (Impact Private Equity)",
        date: "Established: 2015"
      }
    };

    markers.forEach(marker => {
      // Toggle card details on hover or click
      const showDetails = () => {
        const loc = marker.getAttribute('data-loc');
        const data = mapData[loc];
        if (!data) return;

        infoPanel.innerHTML = `
          <h3 class="font-serif text-sm font-bold text-gold animate-fade-in">${data.title}</h3>
          <span class="text-[9px] uppercase tracking-wider bg-gold/15 text-gold px-2 py-0.5 rounded border border-gold/10 font-bold w-max block my-1">${data.badge}</span>
          <p class="text-xs text-slate-300 font-light leading-relaxed animate-fade-in">
            ${data.desc}
          </p>
          <div class="text-[10px] text-slate-500 font-light mt-2 flex flex-col gap-1.5">
            <span class="flex items-center gap-1.5"><i class="fa-solid fa-users text-gold"></i> Representatives: ${data.users}</span>
            <span class="flex items-center gap-1.5"><i class="fa-solid fa-calendar"></i> Landmark Date: ${data.date}</span>
          </div>
        `;
      };

      marker.addEventListener('click', showDetails);
      marker.addEventListener('mouseenter', showDetails);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  HistoryTimeline.init();
});
