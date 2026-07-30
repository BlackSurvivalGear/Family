import { DB } from './db.js';

export class DocumentsLibrary {
  static init() {
    DB.init();
    this.activeCategory = "All";
    this.zoomLevel = 100;

    // Bind DOM elements
    this.tabsContainer = document.getElementById('doc-category-tabs');
    this.grid = document.getElementById('documents-grid');
    this.searchInput = document.getElementById('doc-search-input');
    this.modal = document.getElementById('pdf-viewer-modal');
    this.pdfCard = document.getElementById('pdf-card');
    this.pdfCanvas = document.getElementById('pdf-simulated-canvas');

    // Controls
    this.zoomPercent = document.getElementById('pdf-zoom-percent');
    this.zoomInBtn = document.getElementById('pdf-zoom-in');
    this.zoomOutBtn = document.getElementById('pdf-zoom-out');
    this.closeBtn = document.getElementById('close-pdf-btn');
    this.printBtn = document.getElementById('pdf-print-btn');
    this.downloadBtn = document.getElementById('pdf-download-btn');
    this.addBtn = document.getElementById('add-doc-trigger-btn');

    // Register filters
    const triggerRender = () => this.render();
    if (this.searchInput) this.searchInput.addEventListener('input', triggerRender);

    this.renderTabs();
    this.render();
    this.bindPdfControls();

    // Bind Upload Document simulation trigger
    if (this.addBtn) {
      this.addBtn.addEventListener('click', () => {
        const title = prompt("Enter Document Title:", "Educational Transcript - Oxford (1989)");
        const category = prompt("Enter Category (Birth Certificates, Marriage Certificates, Letters, Military Records, Family Documents):", "Family Documents");
        const desc = prompt("Enter Document Description:", "Academic records from Oxford matriculation.");

        if (title && category && desc) {
          DB.addDocument({
            title,
            category,
            description: desc,
            size: "1.5 MB",
            type: "PDF",
            fileUrl: "#placeholder-pdf"
          });
          this.render();
        }
      });
    }
  }

  static renderTabs() {
    if (!this.tabsContainer) return;

    const categories = ["All", "Birth Certificates", "Marriage Certificates", "Letters", "Military Records", "Family Documents"];

    this.tabsContainer.innerHTML = categories.map(cat => {
      const isActive = this.activeCategory === cat;
      const actClass = isActive
        ? "bg-gold text-slate-950 font-bold"
        : "bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:border-white/10";
      return `
        <button class="px-3.5 py-1.5 rounded-full transition-all text-xs shrink-0 ${actClass}" data-category="${cat}">${cat}</button>
      `;
    }).join('');

    // Bind Clicks
    this.tabsContainer.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.activeCategory = e.currentTarget.getAttribute('data-category');
        this.renderTabs();
        this.render();
      });
    });
  }

  static render() {
    if (!this.grid) return;

    const docs = DB.getDocuments();
    const query = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';

    // Filter
    const filtered = docs.filter(d => {
      if (this.activeCategory !== "All" && d.category !== this.activeCategory) return false;
      if (query && !d.title.toLowerCase().includes(query)) return false;
      return true;
    });

    if (filtered.length === 0) {
      this.grid.innerHTML = `
        <div class="col-span-full text-center py-12 text-xs text-slate-500 font-light">
          No archived documents match your selection.
        </div>
      `;
      return;
    }

    this.grid.innerHTML = filtered.map(d => {
      return `
        <div class="glass-panel p-5 rounded-2xl border border-white/5 hover:border-gold/20 transition-all flex flex-col justify-between text-left h-[200px] shadow-sm relative group">
          <div class="flex flex-col gap-2.5">
            <div class="flex justify-between items-center">
              <span class="text-[9px] uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/15 px-2 py-0.5 rounded font-bold">${d.type}</span>
              <span class="text-[9px] text-slate-500">${d.dateAdded}</span>
            </div>
            <h3 class="text-xs font-semibold text-white truncate group-hover:text-gold transition-colors">${d.title}</h3>
            <p class="text-[10px] text-slate-400 font-light leading-relaxed h-[60px] overflow-hidden">${d.description}</p>
          </div>

          <div class="border-t border-white/5 pt-3 mt-1 flex items-center justify-between">
            <span class="text-[9px] text-slate-500 font-light">${d.size}</span>
            <button class="view-pdf-btn text-[10px] font-bold text-gold hover:underline flex items-center gap-1.5" data-id="${d.id}">
              Open Viewer <i class="fa-solid fa-arrow-right-long"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Bind triggers
    this.grid.querySelectorAll('.view-pdf-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const docId = e.currentTarget.getAttribute('data-id');
        this.openPdfViewer(docId);
      });
    });
  }

  static openPdfViewer(docId) {
    if (!this.modal) return;

    const doc = DB.getDocuments().find(d => d.id === docId);
    if (!doc) return;

    // Populate modal components
    document.getElementById('pdf-viewer-title').textContent = `${doc.title}.pdf`;
    document.getElementById('pdf-viewer-size').textContent = doc.size;
    document.getElementById('pdf-cert-header').textContent = doc.category.toUpperCase();
    document.getElementById('pdf-meta-id').textContent = doc.id;
    document.getElementById('pdf-meta-date').textContent = doc.dateAdded;
    document.getElementById('pdf-cert-desc').textContent = doc.description;

    // Reset Zoom
    this.zoomLevel = 100;
    if (this.zoomPercent) this.zoomPercent.textContent = "100%";
    if (this.pdfCanvas) this.pdfCanvas.style.transform = "scale(1.0)";

    // Reveal modal
    this.modal.classList.remove('pointer-events-none', 'opacity-0');
    this.modal.classList.add('opacity-100');
    this.pdfCard.classList.remove('scale-95');
    this.pdfCard.classList.add('scale-100');
  }

  static closePdfViewer() {
    if (!this.modal) return;
    this.modal.classList.add('pointer-events-none', 'opacity-0');
    this.modal.classList.remove('opacity-100');
    this.pdfCard.classList.add('scale-95');
    this.pdfCard.classList.remove('scale-100');
  }

  static bindPdfControls() {
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.closePdfViewer());

    if (this.zoomInBtn && this.pdfCanvas) {
      this.zoomInBtn.addEventListener('click', () => {
        this.zoomLevel = Math.min(150, this.zoomLevel + 10);
        this.zoomPercent.textContent = `${this.zoomLevel}%`;
        this.pdfCanvas.style.transform = `scale(${this.zoomLevel / 100})`;
      });
    }

    if (this.zoomOutBtn && this.pdfCanvas) {
      this.zoomOutBtn.addEventListener('click', () => {
        this.zoomLevel = Math.max(70, this.zoomLevel - 10);
        this.zoomPercent.textContent = `${this.zoomLevel}%`;
        this.pdfCanvas.style.transform = `scale(${this.zoomLevel / 100})`;
      });
    }

    if (this.printBtn) {
      this.printBtn.addEventListener('click', () => {
        alert("Initializing dynamic printer connection... Page layout sent.");
      });
    }

    if (this.downloadBtn) {
      this.downloadBtn.addEventListener('click', () => {
        alert("Downloading encrypted certificate PDF. Safe file initiated.");
      });
    }

    // Escape listener
    window.addEventListener('keydown', (e) => {
      if (this.modal && !this.modal.classList.contains('pointer-events-none') && e.key === 'Escape') {
        this.closePdfViewer();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  DocumentsLibrary.init();
});
