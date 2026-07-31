// Seed beautiful high-resolution unsplash family vectors
const SEED_GALLERY_PHOTOS = [
  {
    id: "img-1",
    title: "The Lawal Grand Reunion Banquet",
    desc: "Extended relatives gathered in high spirits at the Civic Centre, Lagos, celebrating our foundational roots and academic milestones.",
    album: "Family Events",
    url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "img-2",
    title: "Alhaji Kolawole & Alhaja Fatima Marriage Traditional Solemnization",
    desc: "A gorgeous retro snapshot of Kolawole Lawal and Fatima Balogun during their traditional Yoruba nuptials in Lagos island, Dec 1963.",
    album: "Weddings",
    url: "https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "img-3",
    title: "Grandchildren Amina and Yusuf Playing in Hyde Park",
    desc: "A precious summer moment of Generation 3 branch children exploring the gardens of London.",
    album: "Children",
    url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "img-4",
    title: "Major Kunle Lawal Commissioning Ceremony",
    desc: "Officer cadet Kunle receiving military honors upon graduating from Royal Military Academy Sandhurst, UK.",
    album: "Military",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "img-5",
    title: "Dr. Tunde & Sade Family Travel in Switzerland",
    desc: "Enjoying snowscapes in Zermatt during their annual winter clinical retreat holidays.",
    album: "Travel",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "img-6",
    title: "Ancient Lawal Homestead survey blueprints",
    desc: "Rare vintage photographs showing layout designs of the Egba ancestral property in Abeokuta, 1928.",
    album: "Old Photographs",
    url: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "img-7",
    title: "Tolani Alabi HBS Graduation portrait",
    desc: "Proud parents Bayo and Funmi SAN Alabi surrounding Tolani outside Harvard Business School.",
    album: "Family Events",
    url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "img-8",
    title: "Traditional Weaving patterns in Abeokuta",
    desc: "Mama Lagos (Fatima) researching historic Yoruba lace motifs for her textile production houses.",
    album: "Old Photographs",
    url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80"
  }
];

export class FamilyGallery {
  static init() {
    this.activeAlbum = "All";
    this.photos = SEED_GALLERY_PHOTOS;
    this.filteredPhotos = SEED_GALLERY_PHOTOS;
    this.lightboxIndex = 0;

    // Bind DOM
    this.tabsContainer = document.getElementById('album-tabs');
    this.grid = document.getElementById('gallery-grid');
    this.lightbox = document.getElementById('lightbox-modal');

    this.renderTabs();
    this.renderPhotos();
    this.bindLightboxEvents();
  }

  static renderTabs() {
    if (!this.tabsContainer) return;

    const albums = ["All", "Family Events", "Weddings", "Children", "Military", "Travel", "Old Photographs"];

    this.tabsContainer.innerHTML = albums.map(alb => {
      const isActive = this.activeAlbum === alb;
      const actClass = isActive
        ? "bg-gold text-slate-950 font-bold"
        : "bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:border-white/10";
      return `
        <button class="px-4 py-1.5 rounded-full transition-all text-xs ${actClass}" data-album="${alb}">${alb}</button>
      `;
    }).join('');

    // Bind Clicks
    this.tabsContainer.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.activeAlbum = e.currentTarget.getAttribute('data-album');
        this.renderTabs();
        this.renderPhotos();
      });
    });
  }

  static renderPhotos() {
    if (!this.grid) return;

    if (this.activeAlbum === "All") {
      this.filteredPhotos = this.photos;
    } else {
      this.filteredPhotos = this.photos.filter(p => p.album === this.activeAlbum);
    }

    this.grid.innerHTML = this.filteredPhotos.map((p, idx) => {
      return `
        <div class="glass-panel p-2.5 rounded-2xl border border-white/5 hover:border-gold/25 cursor-pointer relative group overflow-hidden h-72 flex flex-col justify-between" data-index="${idx}">
          <div class="w-full h-48 rounded-xl overflow-hidden relative">
            <img src="${p.url}" alt="${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100">
            <span class="absolute top-2.5 left-2.5 text-[9px] uppercase tracking-wider font-bold bg-slate-950/80 text-gold border border-gold/15 px-2 py-0.5 rounded">
              ${p.album}
            </span>
          </div>
          <div class="p-2 text-left">
            <h3 class="text-xs font-semibold text-white truncate group-hover:text-gold transition-colors">${p.title}</h3>
            <p class="text-[10px] text-slate-500 font-light truncate mt-0.5 leading-relaxed">${p.desc}</p>
          </div>
        </div>
      `;
    }).join('');

    // Bind image clicks
    this.grid.querySelectorAll('[data-index]').forEach(card => {
      card.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'));
        this.openLightbox(idx);
      });
    });
  }

  static openLightbox(index) {
    if (!this.lightbox) return;

    this.lightboxIndex = index;
    const photo = this.filteredPhotos[index];
    if (!photo) return;

    // Set properties
    document.getElementById('lightbox-img').src = photo.url;
    document.getElementById('lightbox-category').textContent = photo.album;
    document.getElementById('lightbox-title').textContent = photo.title;
    document.getElementById('lightbox-desc').textContent = photo.desc;
    document.getElementById('lightbox-index').textContent = `${index + 1} / ${this.filteredPhotos.length}`;

    // Reveal
    this.lightbox.classList.remove('pointer-events-none', 'opacity-0');
    this.lightbox.classList.add('opacity-100');
    document.getElementById('lightbox-img').classList.remove('scale-95');
    document.getElementById('lightbox-img').classList.add('scale-100');
  }

  static closeLightbox() {
    if (!this.lightbox) return;
    this.lightbox.classList.add('pointer-events-none', 'opacity-0');
    this.lightbox.classList.remove('opacity-100');
    document.getElementById('lightbox-img').classList.add('scale-95');
    document.getElementById('lightbox-img').classList.remove('scale-100');
  }

  static nextPhoto() {
    let nextIdx = this.lightboxIndex + 1;
    if (nextIdx >= this.filteredPhotos.length) nextIdx = 0;
    this.openLightbox(nextIdx);
  }

  static prevPhoto() {
    let prevIdx = this.lightboxIndex - 1;
    if (prevIdx < 0) prevIdx = this.filteredPhotos.length - 1;
    this.openLightbox(prevIdx);
  }

  static bindLightboxEvents() {
    const closeBtn = document.getElementById('close-lightbox-btn');
    const prevBtn = document.getElementById('prev-lightbox-btn');
    const nextBtn = document.getElementById('next-lightbox-btn');

    if (closeBtn) closeBtn.addEventListener('click', () => this.closeLightbox());
    if (prevBtn) prevBtn.addEventListener('click', () => this.prevPhoto());
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextPhoto());

    // Close on click outside
    if (this.lightbox) {
      this.lightbox.addEventListener('click', (e) => {
        if (e.target === this.lightbox) this.closeLightbox();
      });
    }

    // Keyboard handlers
    window.addEventListener('keydown', (e) => {
      if (this.lightbox && !this.lightbox.classList.contains('pointer-events-none')) {
        if (e.key === 'ArrowRight') this.nextPhoto();
        if (e.key === 'ArrowLeft') this.prevPhoto();
        if (e.key === 'Escape') this.closeLightbox();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  FamilyGallery.init();
});
