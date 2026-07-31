import { DB } from './db.js';
import * as memberService from './services/memberService.js';
import * as relationshipService from './services/relationshipService.js';
import * as relationshipRepository from './repositories/relationshipRepository.js';
import { getFather, getMother, getCurrentSpouses, getFormerSpouses } from './genealogy/relationshipEngine.js';
import { subscribe } from './services/eventBus.js';

// Global variables for canvas states
let transformX = -1300;
let transformY = -50;
let scale = 0.75;
let isDragging = false;
let startX = 0;
let startY = 0;

// Tracking highlighted node id & categories
let activeSelectedNodeId = null;

// Tracking collapsed state of nodes by relative ID
const collapsedNodes = new Set();

export class Tree {
  static async init() {
    DB.init();

    // Check query params for initial action
    const urlParams = new URLSearchParams(window.location.search);
    const focusId = urlParams.get('id');
    const triggerEdit = urlParams.get('edit') === 'true';

    // Bind Canvas Dragging, Touch gestures, keyboard events
    this.bindCanvasControls();

    // Render the initial tree
    await this.render();

    // Bind Toolbar Controls
    this.bindToolbarControls();

    // Bind Search Auto-complete inside Tree
    this.bindSearchControls();

    // Bind Add Member global trigger button
    this.bindAddMemberControls();

    // Focus if requested
    if (focusId) {
      setTimeout(async () => {
        this.centerOnMember(focusId);
        if (triggerEdit) {
          const matched = await memberService.getMember(focusId);
          if (matched) {
            const enriched = await this.enrichMember(matched);
            this.openEditModal(enriched);
          }
        }
      }, 500);
    }

    // Subscribe to Event Bus to automatically refresh tree
    subscribe("memberCreated", () => this.render());
    subscribe("memberUpdated", () => this.render());
    subscribe("memberDeleted", () => this.render());
    subscribe("relationshipCreated", () => this.render());
    subscribe("relationshipUpdated", () => this.render());
    subscribe("relationshipDeleted", () => this.render());

    // Bind window resize
    window.addEventListener('resize', () => {
      this.updateSVGConnectors();
      this.updateMinimap();
    });
  }

  static async enrichMember(m) {
    if (!m) return null;
    const id = m.memberId || m.id;
    const father = await getFather(id);
    const mother = await getMother(id);
    const currentSpouses = await getCurrentSpouses(id);
    const formerSpouses = await getFormerSpouses(id);
    const spousesList = [];
    currentSpouses.forEach(s => {
      spousesList.push({ id: s.memberId, type: "current", label: "Spouse" });
    });
    formerSpouses.forEach(s => {
      spousesList.push({ id: s.memberId, type: "former", label: "Former Spouse" });
    });

    return {
      ...m,
      id,
      fatherId: father ? father.memberId : null,
      motherId: mother ? mother.memberId : null,
      spouseId: currentSpouses[0] ? currentSpouses[0].memberId : null,
      spouses: spousesList
    };
  }

  static async enrichMembers(members) {
    return await Promise.all(members.map(m => this.enrichMember(m)));
  }

  static bindAddMemberControls() {
    const addBtn = document.getElementById('add-member-trigger-btn');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
      const modal = document.getElementById('tree-edit-modal');
      if (!modal) return;

      modal.classList.remove('pointer-events-none', 'opacity-0');
      modal.classList.add('opacity-100');

      const members = this.currentMembersList || [];
      const fathers = members.filter(m => m.gender === 'Male');
      const mothers = members.filter(m => m.gender === 'Female');
      const spouses = members;

      modal.innerHTML = `
        <div class="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in" id="add-modal-card">

          <!-- Header -->
          <div class="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950/40">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-emerald/10 text-emerald flex items-center justify-center text-lg">
                <i class="fa-solid fa-user-plus"></i>
              </div>
              <div>
                <h3 class="text-base font-serif font-bold text-white">Add New Family Node</h3>
                <p class="text-[10px] text-slate-500 font-light">Insert details and connect them directly to the generations tree.</p>
              </div>
            </div>
            <button id="close-add-modal-btn" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Scrollable Form -->
          <form id="node-add-form" class="p-6 overflow-y-auto flex-grow flex flex-col gap-5 text-left text-xs text-slate-300">

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">First Name</label>
                <input type="text" id="add-firstName" required placeholder="First Name" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Last Name</label>
                <input type="text" id="add-lastName" required placeholder="Last Name" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Nickname</label>
                <input type="text" id="add-nickname" placeholder="Nickname" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Gender</label>
                <select id="add-gender" required class="h-10 px-2 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Role Description</label>
                <input type="text" id="add-role" placeholder="e.g. Grandchild / Engineer" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Generation</label>
                <select id="add-generation" required class="h-10 px-2 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold">
                  <option value="1">Generation 1 (Patriarchs)</option>
                  <option value="2">Generation 2 (Parents)</option>
                  <option value="3" selected>Generation 3 (Grandchildren)</option>
                  <option value="4">Generation 4 (Next-Gen)</option>
                </select>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Date of Birth</label>
                <input type="date" id="add-birthDate" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Place of Birth</label>
                <input type="text" id="add-birthPlace" placeholder="e.g. Lagos, Nigeria" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Photo URL (Placeholder)</label>
                <input type="url" id="add-avatar" placeholder="https://..." class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Attached Doc Title (Placeholder)</label>
                <input type="text" id="add-doc-title" placeholder="e.g. Birth Certificate" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Biography Teaser</label>
              <textarea id="add-biography" rows="3" placeholder="Brief chronicle story..." class="p-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold resize-none"></textarea>
            </div>

            <!-- Connections section -->
            <div class="border-t border-white/5 pt-4">
              <h4 class="text-white font-serif font-semibold text-xs tracking-wide mb-3 flex items-center gap-1.5">
                <i class="fa-solid fa-link text-emerald"></i> Set Lineage Connections
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Father Link</label>
                  <select id="add-father" class="h-10 px-2 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold">
                    <option value="">-- None --</option>
                    ${fathers.map(f => `<option value="${f.id}">${f.firstName} ${f.lastName}</option>`).join('')}
                  </select>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Mother Link</label>
                  <select id="add-mother" class="h-10 px-2 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold">
                    <option value="">-- None --</option>
                    ${mothers.map(m => `<option value="${m.id}">${m.firstName} ${m.lastName}</option>`).join('')}
                  </select>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Primary Spouse Link</label>
                  <select id="add-spouse" class="h-10 px-2 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold">
                    <option value="">-- None --</option>
                    ${spouses.map(s => `<option value="${s.id}">${s.firstName} ${s.lastName}</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>

            <!-- Actions footer -->
            <div class="border-t border-white/5 pt-5 flex items-center justify-end gap-2.5">
              <button type="button" id="add-cancel-btn" class="h-10 px-4 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold tracking-wider uppercase text-[10px] transition-colors">Cancel</button>
              <button type="submit" id="add-submit-btn" class="h-10 px-6 bg-emerald text-slate-950 hover:bg-emerald-hover rounded-lg font-bold tracking-wider uppercase text-[10px] transition-colors">Create Relative</button>
            </div>

          </form>
        </div>
      `;

      const closeAddModal = () => {
        modal.classList.add('pointer-events-none', 'opacity-0');
        modal.classList.remove('opacity-100');
      };

      modal.querySelector('#close-add-modal-btn').addEventListener('click', closeAddModal);
      modal.querySelector('#add-cancel-btn').addEventListener('click', closeAddModal);

      // Handle form submission
      modal.querySelector('#node-add-form').addEventListener('submit', async (ev) => {
        ev.preventDefault();

        // Prevent double submission
        const submitBtn = modal.querySelector('#add-submit-btn');
        if (submitBtn.disabled) return;
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Creating...`;

        const firstName = modal.querySelector('#add-firstName').value.trim();
        const lastName = modal.querySelector('#add-lastName').value.trim();
        const nickname = modal.querySelector('#add-nickname').value.trim();
        const gender = modal.querySelector('#add-gender').value;
        const role = modal.querySelector('#add-role').value.trim() || "Family Member";
        const generation = parseInt(modal.querySelector('#add-generation').value);
        const birthDate = modal.querySelector('#add-birthDate').value;
        const birthPlace = modal.querySelector('#add-birthPlace').value.trim();
        const avatar = modal.querySelector('#add-avatar').value.trim() || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80";
        const biography = modal.querySelector('#add-biography').value.trim();
        const fatherId = modal.querySelector('#add-father').value || null;
        const motherId = modal.querySelector('#add-mother').value || null;
        const spouseId = modal.querySelector('#add-spouse').value || null;

        const newMember = {
          firstName,
          lastName,
          nickname,
          gender,
          role,
          generation,
          birthDate,
          birthPlace,
          living: true,
          status: "Living",
          avatar,
          biography,
          education: { university: "Awaiting inputs" },
          timeline: []
        };

        try {
          // Call member service
          const memberId = await memberService.createMember(newMember);

          // Build relationships
          if (fatherId) {
            await relationshipService.addFather(memberId, fatherId);
          }
          if (motherId) {
            await relationshipService.addMother(memberId, motherId);
          }
          if (spouseId) {
            await relationshipService.addSpouse(memberId, spouseId);
          }

          closeAddModal();
          await this.render();
        } catch (error) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
          alert(`Error: ${error.message}`);
        }
      });
    });
  }

  static async render() {
    const rawMembers = await memberService.searchMembers({ includeDeleted: false });
    const members = await this.enrichMembers(rawMembers);
    const cardsLayer = document.getElementById('tree-cards-layer');
    if (!cardsLayer) return;

    cardsLayer.innerHTML = '';

    // Save active members list on Tree class for quick retrieval in other functions
    this.currentMembersList = members;

    // 1. Calculate horizontal/vertical grid offsets for each member
    const coordinates = this.calculateTreeLayout(members);

    // Save coordinates
    this.coordinates = coordinates;

    // Filter out descendants of collapsed nodes
    const visibleMembers = this.filterVisibleMembers(members, coordinates);

    // 2. Render Cards
    visibleMembers.forEach(member => {
      const coord = coordinates[member.id];
      if (!coord) return;

      const card = this.createMemberCard(member, coord);
      cardsLayer.appendChild(card);
    });

    // 3. Render connection lines
    this.updateSVGConnectors();

    // 4. Update Minimap
    this.updateMinimap();

    // 5. Update Breadcrumbs to current highlighted root
    this.updateBreadcrumbs();
  }

  // layout math mapping generation & sequential horizontal placements
  static calculateTreeLayout(members) {
    const coords = {};
    const genHeight = 380;
    const cardWidth = 260;
    const cardSpacing = 120;
    const centerX = 2500;

    // Group members by Generation
    const gens = {};
    members.forEach(m => {
      const g = m.generation || 1;
      if (!gens[g]) gens[g] = [];
      gens[g].push(m);
    });

    // Sort individuals: Group multi-spouses sequentially together next to core person
    Object.keys(gens).forEach(g => {
      const list = gens[g];
      const sorted = [];
      const visited = new Set();

      list.forEach(m => {
        if (visited.has(m.id)) return;

        sorted.push(m);
        visited.add(m.id);

        // Find any other spouses (from multi-spouse list or spouseId)
        const allSpouseIds = new Set();
        if (m.spouseId) allSpouseIds.add(m.spouseId);
        if (m.spouses) {
          m.spouses.forEach(sp => allSpouseIds.add(sp.id));
        }

        allSpouseIds.forEach(spId => {
          const spouse = list.find(s => s.id === spId);
          if (spouse && !visited.has(spouse.id)) {
            sorted.push(spouse);
            visited.add(spouse.id);
          }
        });
      });

      gens[g] = sorted;
    });

    // Assign dynamic non-overlapping horizontal coordinates
    Object.keys(gens).forEach(g => {
      const level = parseInt(g);
      const list = gens[g];
      const totalWidth = list.length * cardWidth + (list.length - 1) * cardSpacing;
      const startX = centerX - (totalWidth / 2);

      let currentX = startX;
      list.forEach((m, idx) => {
        // Multi-spouse visual adjustments: if they are spouses, lock their positions closer
        const isSpouseOfPrev = idx > 0 && (
          list[idx - 1].spouseId === m.id ||
          (list[idx - 1].spouses && list[idx - 1].spouses.some(sp => sp.id === m.id))
        );

        if (isSpouseOfPrev) {
          // Pull closer horizontally to create marital pair layouts
          currentX -= (cardSpacing - 40);
        }

        coords[m.id] = {
          x: currentX,
          y: (level - 1) * genHeight + 150
        };

        currentX += cardWidth + cardSpacing;
      });
    });

    return coords;
  }

  // Filter out relatives whose ancestors are collapsed
  static filterVisibleMembers(members, coordinates) {
    const visible = [];
    members.forEach(m => {
      let current = m;
      let isHidden = false;

      // Trace parents upward: if any parent is collapsed, hide this member
      while (current) {
        if (current.fatherId && collapsedNodes.has(current.fatherId)) {
          isHidden = true;
          break;
        }
        if (current.motherId && collapsedNodes.has(current.motherId)) {
          isHidden = true;
          break;
        }
        // Step up
        const nextParent = current.fatherId ? this.currentMembersList.find(x => x.id === current.fatherId) : (current.motherId ? this.currentMembersList.find(x => x.id === current.motherId) : null);
        current = nextParent;
      }

      if (!isHidden && coordinates[m.id]) {
        visible.push(m);
      }
    });
    return visible;
  }

  // HTML premium card generation with visual vitals status and interactions
  static createMemberCard(member, coord) {
    const div = document.createElement('div');
    div.className = 'absolute w-[260px] glass-panel rounded-3xl border-2 transition-all p-4.5 flex flex-col gap-3 group text-left shadow-lg cursor-pointer hover:scale-[1.03] duration-300';
    div.style.left = `${coord.x}px`;
    div.style.top = `${coord.y}px`;
    div.style.zIndex = '10';
    div.id = `tree-card-${member.id}`;

    // Apply specific classes if matches highlighted search/highlight relationships
    if (activeSelectedNodeId) {
      if (member.id === activeSelectedNodeId) {
        div.className += ' ring-4 ring-gold border-gold scale-105';
      } else if (this.isRelated(member.id, activeSelectedNodeId)) {
        div.className += ' ring-2 ring-emerald/40 border-emerald scale-[1.01]';
      } else {
        div.className += ' opacity-40';
      }
    }

    // Gender styling
    const isMale = member.gender === 'Male';
    const genderBorder = isMale ? 'border-blue-500/20 hover:border-blue-500' : 'border-pink-500/20 hover:border-pink-500';
    div.className += ` ${genderBorder}`;

    // Living/Deceased status pill with glowing dot
    const isLiving = member.status === 'Living';
    const statusPill = isLiving
      ? '<span class="px-2.5 py-0.5 rounded-full bg-emerald/10 text-emerald text-[9px] font-bold border border-emerald/20 flex items-center gap-1 shrink-0"><span class="w-1.5 h-1.5 bg-emerald rounded-full animate-pulse"></span> Living</span>'
      : '<span class="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[9px] font-bold border border-slate-700 flex items-center gap-1 shrink-0"><span class="w-1.5 h-1.5 bg-slate-500 rounded-full"></span> Deceased</span>';

    // Collapse toggle indicator if has children
    const children = this.currentMembersList.filter(m => m.fatherId === member.id || m.motherId === member.id);
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedNodes.has(member.id);

    const collapseToggleHtml = hasChildren
      ? `
        <button class="collapse-toggle-btn absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-slate-900 border border-gold/30 hover:border-gold flex items-center justify-center text-xs text-gold transition-all z-20 shadow-lg" data-id="${member.id}" title="${isCollapsed ? 'Expand lineage' : 'Collapse lineage'}">
          <i class="fa-solid ${isCollapsed ? 'fa-angle-down' : 'fa-angle-up'}"></i>
        </button>
      `
      : '';

    // Add Adopted badge
    const relBadge = member.relationshipType === 'Adopted'
      ? `<span class="px-2 py-0.5 bg-sky-500/10 text-sky-400 text-[8px] tracking-wider uppercase font-extrabold border border-sky-500/20 rounded">Adopted</span>`
      : '';

    div.innerHTML = `
      <!-- User basic metadata -->
      <div class="flex items-start gap-3 relative">
        <div class="relative shrink-0">
          <img src="${member.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80'}" alt="${member.firstName}" class="w-12 h-12 rounded-2xl object-cover border-2 border-gold/25 group-hover:border-gold transition-all shadow-inner">
          <span class="absolute -top-1 -left-1 w-4.5 h-4.5 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-[8px]">
            ${isMale ? '<i class="fa-solid fa-mars text-blue-400"></i>' : '<i class="fa-solid fa-venus text-pink-400"></i>'}
          </span>
        </div>
        <div class="flex flex-col min-w-0 flex-grow text-left">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="text-xs font-serif font-bold text-white truncate group-hover:text-gold transition-colors">${member.firstName} ${member.lastName}</span>
            <span class="text-[10px] shrink-0" title="Flag Country">${member.countryFlag || "🇳🇬"}</span>
          </div>
          <span class="text-[9px] text-slate-400 font-light truncate italic">"${member.nickname || 'None'}"</span>
          <span class="text-[9px] text-slate-500 font-light truncate mt-0.5 flex items-center gap-1.5">${member.role || 'Member'} ${relBadge}</span>
        </div>
      </div>

      <!-- Quick stats (Dates / Generation) -->
      <div class="flex items-center justify-between border-t border-white/5 pt-2.5 text-[10px] text-slate-400 mt-1">
        <div class="flex flex-col text-left">
          <span class="font-light text-slate-400">Born: ${member.birthDate ? member.birthDate.substring(0, 4) : 'N/A'}</span>
          <span class="font-light text-slate-400">${member.deathDate ? 'Died: ' + member.deathDate.substring(0, 4) : 'Age: ' + this.calculateAge(member.birthDate)}</span>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          <span class="text-[8px] uppercase tracking-wider bg-gold/15 text-gold px-2 py-0.5 rounded font-extrabold border border-gold/10">Gen ${member.generation}</span>
          ${statusPill}
        </div>
      </div>

      <!-- Quick Actions bar -->
      <div class="flex gap-1.5 border-t border-white/5 pt-2.5 mt-1.5 relative z-10">
        <button class="view-profile-btn flex-grow h-7.5 bg-white/5 hover:bg-gold hover:text-slate-950 rounded-lg text-[9px] font-extrabold tracking-wider uppercase transition-all flex items-center justify-center gap-1" data-id="${member.id}">
          <i class="fa-solid fa-id-card"></i> Profile
        </button>
        <button class="quick-info-btn w-7.5 h-7.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg flex items-center justify-center transition-all text-xs" data-id="${member.id}" title="Quick View">
          <i class="fa-solid fa-eye"></i>
        </button>
        <button class="edit-node-btn w-7.5 h-7.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg flex items-center justify-center transition-all text-xs" data-id="${member.id}" title="Modify Profile / Relations">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
      </div>

      ${collapseToggleHtml}
    `;

    // Dynamic triggers on buttons inside the card
    div.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleNodeHighlight(member.id);
    });

    div.querySelector('.view-profile-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = `member.html?id=${member.id}`;
    });

    div.querySelector('.quick-info-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openQuickView(member);
    });

    div.querySelector('.edit-node-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openEditModal(member);
    });

    if (hasChildren) {
      div.querySelector('.collapse-toggle-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const mId = e.currentTarget.getAttribute('data-id');
        if (collapsedNodes.has(mId)) {
          collapsedNodes.delete(mId);
        } else {
          collapsedNodes.add(mId);
        }
        this.render();
      });
    }

    return div;
  }

  // Interactive highlighting relationships checker
  static toggleNodeHighlight(memberId) {
    if (activeSelectedNodeId === memberId) {
      activeSelectedNodeId = null;
    } else {
      activeSelectedNodeId = memberId;
    }
    this.render();
  }

  static isRelated(targetId, activeId) {
    const target = this.currentMembersList.find(m => m.id === targetId);
    const active = this.currentMembersList.find(m => m.id === activeId);
    if (!target || !active) return false;

    // 1. Spouses
    if (active.spouseId === targetId || target.spouseId === activeId) return true;
    if (active.spouses && active.spouses.some(sp => sp.id === targetId)) return true;
    if (target.spouses && target.spouses.some(sp => sp.id === activeId)) return true;

    // 2. Siblings (or Half-siblings)
    if ((active.fatherId && active.fatherId === target.fatherId) || (active.motherId && active.motherId === target.motherId)) return true;

    // 3. Parents / Descendants
    if (active.fatherId === targetId || active.motherId === targetId) return true;
    if (target.fatherId === activeId || target.motherId === activeId) return true;

    return false;
  }

  // Draw Orthogonal Connector SVG lines dynamically between related cards
  static updateSVGConnectors() {
    const svgLayer = document.getElementById('tree-svg-layer');
    if (!svgLayer) return;

    svgLayer.innerHTML = '';
    const members = this.currentMembersList || [];
    const coords = this.coordinates;
    if (!coords) return;

    const lines = [];
    const cardWidth = 260;
    const cardHeight = 160;

    // We keep track of drawn marriage pairings to avoid redundant lines
    const processedMarriages = new Set();

    members.forEach(member => {
      if (collapsedNodes.has(member.id)) return; // Don't draw descendants connections if parent collapsed

      const parentCoord = coords[member.id];
      if (!parentCoord) return;

      // multi-spouse marriages
      const spouseIds = new Set();
      if (member.spouseId) spouseIds.add(member.spouseId);
      if (member.spouses) {
        member.spouses.forEach(sp => spouseIds.add(sp.id));
      }

      spouseIds.forEach(spouseId => {
        const spouseCoord = coords[spouseId];
        if (!spouseCoord) return;

        // Draw marriage bridge once per couple
        const pairKey = [member.id, spouseId].sort().join('-');
        if (!processedMarriages.has(pairKey)) {
          processedMarriages.add(pairKey);

          // Find which partner is drawn on the left side
          const leftIsMember = parentCoord.x < spouseCoord.x;
          const leftCoord = leftIsMember ? parentCoord : spouseCoord;
          const rightCoord = leftIsMember ? spouseCoord : parentCoord;

          const startX = leftCoord.x + cardWidth;
          const endX = rightCoord.x;
          const marriageY = leftCoord.y + (cardHeight / 2);

          // Highlight path if matching selected relationship
          const marriageHighlight = activeSelectedNodeId && (
            (member.id === activeSelectedNodeId || spouseId === activeSelectedNodeId) ||
            (this.isRelated(member.id, activeSelectedNodeId) && this.isRelated(spouseId, activeSelectedNodeId))
          );
          const color = marriageHighlight ? "#10B981" : "#D4AF37";
          const width = marriageHighlight ? "3.5" : "2.5";
          const op = marriageHighlight ? "1.0" : "0.6";

          // Render marriage bar
          lines.push(`
            <path d="M ${startX} ${marriageY} L ${endX} ${marriageY}"
                  stroke="${color}" stroke-width="${width}" fill="none" opacity="${op}"/>
          `);

          // Drop a vertical stem down from the bridge mid-point
          const midX = (startX + endX) / 2;
          const stemEndY = marriageY + 110; // Point below where branching horizontal bar sits

          lines.push(`
            <path d="M ${midX} ${marriageY} L ${midX} ${stemEndY}"
                  stroke="${color}" stroke-width="${width}" fill="none" opacity="${op}"/>
          `);

          // Find children linked to this mother-father pair
          const children = members.filter(child =>
            (child.fatherId === member.id && child.motherId === spouseId) ||
            (child.fatherId === spouseId && child.motherId === member.id)
          ).filter(child => coords[child.id]);

          if (children.length > 0) {
            // Draw horizontal branching bar that spans from first child to last child X
            const childCoords = children.map(c => coords[c.id]);
            const minChildX = Math.min(...childCoords.map(c => c.x)) + (cardWidth / 2);
            const maxChildX = Math.max(...childCoords.map(c => c.x)) + (cardWidth / 2);

            lines.push(`
              <path d="M ${minChildX} ${stemEndY} L ${maxChildX} ${stemEndY}"
                    stroke="#10B981" stroke-width="1.8" fill="none" opacity="0.5" />
            `);

            // Drop individual vertical stems to each child
            children.forEach(child => {
              const childCoord = coords[child.id];
              const childCenterX = childCoord.x + (cardWidth / 2);
              const childTopY = childCoord.y;

              const childHighlight = activeSelectedNodeId && (child.id === activeSelectedNodeId || child.fatherId === activeSelectedNodeId || child.motherId === activeSelectedNodeId);
              const childStroke = childHighlight ? "#10B981" : "#10B981";
              const childStrokeWidth = childHighlight ? "2.5" : "1.8";

              lines.push(`
                <path d="M ${childCenterX} ${stemEndY} L ${childCenterX} ${childTopY}"
                      stroke="${childStroke}" stroke-width="${childStrokeWidth}" stroke-dasharray="${childHighlight ? 'none' : '2,2'}" fill="none" opacity="0.7"/>
              `);
            });
          }
        }
      });

      // Single parent / unknown spouse fallback
      const hasDefinedSpouse = spouseIds.size > 0;
      if (!hasDefinedSpouse) {
        const children = members.filter(child => child.fatherId === member.id || child.motherId === member.id).filter(c => coords[c.id]);
        if (children.length > 0) {
          const stemStartX = parentCoord.x + (cardWidth / 2);
          const stemStartY = parentCoord.y + cardHeight;
          const stemEndY = stemStartY + 60;

          lines.push(`
            <path d="M ${stemStartX} ${stemStartY} L ${stemStartX} ${stemEndY}"
                  stroke="#10B981" stroke-width="1.8" fill="none" opacity="0.5"/>
          `);

          const childCoords = children.map(c => coords[c.id]);
          const minChildX = Math.min(...childCoords.map(c => c.x)) + (cardWidth / 2);
          const maxChildX = Math.max(...childCoords.map(c => c.x)) + (cardWidth / 2);

          lines.push(`
            <path d="M ${minChildX} ${stemEndY} L ${maxChildX} ${stemEndY}"
                  stroke="#10B981" stroke-width="1.8" fill="none" opacity="0.4" />
          `);

          children.forEach(child => {
            const childCoord = coords[child.id];
            const childCenterX = childCoord.x + (cardWidth / 2);
            const childTopY = childCoord.y;

            lines.push(`
              <path d="M ${childCenterX} ${stemEndY} L ${childCenterX} ${childTopY}"
                    stroke="#10B981" stroke-width="1.8" stroke-dasharray="2,2" fill="none" opacity="0.5"/>
            `);
          });
        }
      }
    });

    svgLayer.innerHTML = lines.join('');
  }

  // Camera canvas binding: mouse drag, momentum scroll, zoom wheel and trackpad touch
  static bindCanvasControls() {
    const viewport = document.getElementById('viewport-container');
    const canvas = document.getElementById('tree-canvas');
    if (!viewport || !canvas) return;

    const applyTransform = () => {
      canvas.style.transform = `translate3d(${transformX}px, ${transformY}px, 0) scale(${scale})`;
      this.updateMinimapViewport();
    };

    applyTransform();

    // Keyboard handlers
    window.addEventListener('keydown', (e) => {
      const step = 45;
      if (e.key === 'ArrowUp') { transformY += step; applyTransform(); }
      if (e.key === 'ArrowDown') { transformY -= step; applyTransform(); }
      if (e.key === 'ArrowLeft') { transformX += step; applyTransform(); }
      if (e.key === 'ArrowRight') { transformX -= step; applyTransform(); }
      if (e.key === '=' || e.key === '+') { scale = Math.min(2.0, scale + 0.1); applyTransform(); }
      if (e.key === '-') { scale = Math.max(0.2, scale - 0.1); applyTransform(); }
      if (e.key === 'Escape') {
        activeSelectedNodeId = null;
        this.render();
      }
    });

    // 1. Mouse Dragging
    viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;

      isDragging = true;
      startX = e.clientX - transformX;
      startY = e.clientY - transformY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      transformX = e.clientX - startX;
      transformY = e.clientY - startY;
      applyTransform();
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Touch Support with basic pinch/zoom
    let lastTouchDist = 0;
    viewport.addEventListener('touchstart', (e) => {
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
      if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX - transformX;
        startY = e.touches[0].clientY - transformY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        transformX = e.touches[0].clientX - startX;
        transformY = e.touches[0].clientY - startY;
        applyTransform();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / lastTouchDist;
        if (factor > 1.0) {
          scale = Math.min(2.0, scale + 0.03);
        } else {
          scale = Math.max(0.2, scale - 0.03);
        }
        lastTouchDist = dist;
        applyTransform();
      }
    });

    window.addEventListener('touchend', () => {
      isDragging = false;
    });

    // 2. Mouse Wheel Zooming
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = 0.05;
      if (e.deltaY < 0) {
        scale = Math.min(2.0, scale + zoomFactor);
      } else {
        scale = Math.max(0.2, scale - zoomFactor);
      }
      applyTransform();
    }, { passive: false });
  }

  // Bind side control actions (Zoom, Recenter, Minimap, Legend)
  static bindToolbarControls() {
    const zoomIn = document.getElementById('zoom-in-btn');
    const zoomOut = document.getElementById('zoom-out-btn');
    const zoomReset = document.getElementById('zoom-reset-btn');
    const recenterRoots = document.getElementById('recenter-patriarch-btn');
    const toggleMinimap = document.getElementById('toggle-minimap-btn');
    const minimapPanel = document.getElementById('minimap-panel');
    const legendBtn = document.getElementById('legend-btn');
    const legendOverlay = document.getElementById('legend-overlay');
    const closeLegendBtn = document.getElementById('close-legend-btn');

    const canvas = document.getElementById('tree-canvas');
    const applyTransform = () => {
      canvas.style.transform = `translate3d(${transformX}px, ${transformY}px, 0) scale(${scale})`;
      this.updateMinimapViewport();
    };

    if (zoomIn) {
      zoomIn.addEventListener('click', () => {
        scale = Math.min(2.0, scale + 0.15);
        applyTransform();
      });
    }

    if (zoomOut) {
      zoomOut.addEventListener('click', () => {
        scale = Math.max(0.2, scale - 0.15);
        applyTransform();
      });
    }

    if (zoomReset) {
      zoomReset.addEventListener('click', () => {
        scale = 0.75;
        transformX = -1300;
        transformY = -50;
        applyTransform();
      });
    }

    if (recenterRoots) {
      recenterRoots.addEventListener('click', () => {
        // Center camera around roots
        scale = 0.75;
        transformX = -1300;
        transformY = -50;
        applyTransform();
      });
    }

    if (toggleMinimap && minimapPanel) {
      toggleMinimap.addEventListener('click', () => {
        minimapPanel.classList.toggle('hidden');
      });
    }

    if (legendBtn && legendOverlay) {
      legendBtn.addEventListener('click', () => {
        legendOverlay.classList.toggle('hidden');
      });
    }

    if (closeLegendBtn && legendOverlay) {
      closeLegendBtn.addEventListener('click', () => {
        legendOverlay.classList.add('hidden');
      });
    }
  }

  // Render Mini Map preview with relative coordinates
  static updateMinimap() {
    const layer = document.getElementById('minimap-cards-layer');
    if (!layer) return;

    layer.innerHTML = '';
    const coords = this.coordinates;
    if (!coords) return;

    // Boundary of complete tree: approx 5000x2000
    // Minimap boundary: approx 160x100
    const minimapW = 160;
    const minimapH = 100;
    const scaleFactorX = minimapW / 5000;
    const scaleFactorY = minimapH / 2000;

    Object.keys(coords).forEach(memberId => {
      const coord = coords[memberId];
      if (!coord) return;

      const m = this.currentMembersList.find(x => x.id === memberId);
      if (!m || collapsedNodes.has(memberId)) return;

      const dot = document.createElement('div');
      dot.className = 'absolute w-1 h-1 rounded-full';
      dot.style.left = `${coord.x * scaleFactorX}px`;
      dot.style.top = `${coord.y * scaleFactorY}px`;

      const isMale = m.gender === 'Male';
      dot.className += isMale ? ' bg-blue-500' : ' bg-pink-500';

      layer.appendChild(dot);
    });

    this.updateMinimapViewport();
  }

  // Update Red outline indicating viewport positions inside Minimap
  static updateMinimapViewport() {
    const box = document.getElementById('minimap-viewport-box');
    const viewport = document.getElementById('viewport-container');
    if (!box || !viewport) return;

    const minimapW = 160;
    const minimapH = 100;
    const scaleFactorX = minimapW / 5000;
    const scaleFactorY = minimapH / 2000;

    const viewW = viewport.clientWidth;
    const viewH = viewport.clientHeight;

    // Back-calculate how much of 5000x2000 canvas is visible inside viewport
    const visibleWidth = (viewW / scale) * scaleFactorX;
    const visibleHeight = (viewH / scale) * scaleFactorY;

    const visibleLeft = (-transformX / scale) * scaleFactorX;
    const visibleTop = (-transformY / scale) * scaleFactorY;

    box.style.width = `${Math.min(minimapW, Math.max(8, visibleWidth))}px`;
    box.style.height = `${Math.min(minimapH, Math.max(8, visibleHeight))}px`;
    box.style.left = `${Math.max(0, Math.min(minimapW - 8, visibleLeft))}px`;
    box.style.top = `${Math.max(0, Math.min(minimapH - 8, visibleTop))}px`;
  }

  // Real-time searching within tree canvas & auto-zoom center
  static bindSearchControls() {
    const input = document.getElementById('tree-search-input');
    const autoBox = document.getElementById('tree-search-autocomplete');
    if (!input || !autoBox) return;

    input.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase().trim();
      if (!val) {
        autoBox.classList.add('hidden');
        return;
      }

      const members = this.currentMembersList || [];
      const matched = members.filter(m =>
        m.firstName.toLowerCase().includes(val) ||
        m.lastName.toLowerCase().includes(val) ||
        (m.nickname && m.nickname.toLowerCase().includes(val))
      );

      if (matched.length === 0) {
        autoBox.innerHTML = '<span class="text-[10px] text-slate-500 p-2">No relative found...</span>';
        autoBox.classList.remove('hidden');
        return;
      }

      autoBox.innerHTML = matched.map(m => `
        <button class="w-full text-left p-2 hover:bg-white/5 rounded text-white flex items-center justify-between text-xs" data-id="${m.id}">
          <span>${m.firstName} ${m.lastName}</span>
          <span class="text-[9px] uppercase tracking-wider bg-gold/10 text-gold px-1.5 py-0.5 rounded">Gen ${m.generation}</span>
        </button>
      `).join('');

      autoBox.classList.remove('hidden');

      // Add click behavior on autocompletes
      autoBox.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (ev) => {
          const mId = ev.currentTarget.getAttribute('data-id');
          this.centerOnMember(mId);
          autoBox.classList.add('hidden');
          input.value = '';
        });
      });
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !autoBox.contains(e.target)) {
        autoBox.classList.add('hidden');
      }
    });
  }

  // Smooth focus center camera on selected relative
  static centerOnMember(memberId) {
    const coord = this.coordinates ? this.coordinates[memberId] : null;
    if (!coord) return;

    const viewport = document.getElementById('viewport-container');
    const canvas = document.getElementById('tree-canvas');
    if (!viewport || !canvas) return;

    const cardWidth = 260;
    const cardHeight = 160;
    const viewW = viewport.clientWidth;
    const viewH = viewport.clientHeight;

    // Apply target zoom & compute centered offsets
    scale = 1.0;
    transformX = -coord.x + (viewW / 2) - (cardWidth / 2);
    transformY = -coord.y + (viewH / 2) - (cardHeight / 2);

    canvas.style.transform = `translate3d(${transformX}px, ${transformY}px, 0) scale(${scale})`;
    this.updateMinimapViewport();

    // Highlight card with dynamic blinking effect
    activeSelectedNodeId = memberId;
    this.render();

    const card = document.getElementById(`tree-card-${memberId}`);
    if (card) {
      card.classList.add('ring-4', 'ring-gold', 'scale-105', 'shadow-2xl');
      setTimeout(() => {
        card.classList.remove('ring-4', 'ring-gold', 'scale-105', 'shadow-2xl');
      }, 3000);
    }
  }

  // Dynamically compute breadcrumbs list
  static updateBreadcrumbs() {
    const container = document.getElementById('tree-breadcrumbs');
    if (!container) return;

    // Default breadcrumb representing founder
    container.innerHTML = `
      <span class="hover:text-gold cursor-pointer transition-colors" id="bc-root">Patriarch Kolawole</span>
      <i class="fa-solid fa-angle-right text-[10px] text-slate-600"></i>
      <span class="text-gold font-medium">Interactive Canvas</span>
    `;

    const rootBtn = document.getElementById('bc-root');
    if (rootBtn) {
      rootBtn.addEventListener('click', () => this.centerOnMember('kolawole-lawal'));
    }
  }

  // View Quick Side Drawer
  static openQuickView(member) {
    const drawer = document.getElementById('quick-view-drawer');
    if (!drawer) return;

    drawer.classList.remove('hidden');
    // Force transition reflow
    setTimeout(() => {
      drawer.classList.remove('translate-x-full');
    }, 50);

    const isLiving = member.status === 'Living';

    drawer.innerHTML = `
      <div class="flex flex-col gap-6 text-left">
        <!-- Close button & title -->
        <div class="flex items-center justify-between border-b border-white/5 pb-4">
          <span class="font-serif text-lg font-bold text-white tracking-wide">Quick Profile</span>
          <button id="close-drawer-btn" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Meta card -->
        <div class="flex items-center gap-4">
          <img src="${member.avatar}" alt="${member.firstName}" class="w-16 h-16 rounded-2xl object-cover border border-gold/30">
          <div class="flex flex-col">
            <h3 class="text-lg font-serif font-bold text-white">${member.firstName} ${member.lastName}</h3>
            <span class="text-xs text-gold">"${member.nickname || 'None'}"</span>
            <span class="text-[11px] text-slate-500 font-light mt-0.5">${member.role}</span>
          </div>
        </div>

        <!-- Brief stats grid -->
        <div class="grid grid-cols-2 gap-3.5 text-xs">
          <div class="bg-white/5 p-3 rounded-xl border border-white/5">
            <span class="text-[10px] text-slate-500 block uppercase font-medium">DOB / Age</span>
            <span class="text-slate-200 mt-1 block">${member.birthDate || 'N/A'} (${this.calculateAge(member.birthDate)} yrs)</span>
          </div>
          <div class="bg-white/5 p-3 rounded-xl border border-white/5">
            <span class="text-[10px] text-slate-500 block uppercase font-medium">Status</span>
            <span class="text-slate-200 mt-1 block flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full ${isLiving ? 'bg-emerald' : 'bg-slate-500'}"></span>
              ${member.status}
            </span>
          </div>
          <div class="bg-white/5 p-3 rounded-xl border border-white/5">
            <span class="text-[10px] text-slate-500 block uppercase font-medium">Place of Birth</span>
            <span class="text-slate-200 mt-1 block truncate" title="${member.birthPlace || 'N/A'}">${member.birthPlace || 'N/A'}</span>
          </div>
          <div class="bg-white/5 p-3 rounded-xl border border-white/5">
            <span class="text-[10px] text-slate-500 block uppercase font-medium">Occupation</span>
            <span class="text-slate-200 mt-1 block truncate" title="${member.career?.occupation || 'N/A'}">${member.career?.occupation || 'N/A'}</span>
          </div>
        </div>

        <!-- Small Biography teaser -->
        <div class="flex flex-col gap-1.5">
          <span class="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Short Chronicle</span>
          <p class="text-xs text-slate-400 font-light leading-relaxed bg-slate-900/60 p-3.5 border border-white/5 rounded-xl max-h-40 overflow-y-auto">
            ${member.biography || 'No biography recorded yet.'}
          </p>
        </div>

        <!-- Educational snapshot -->
        <div class="flex flex-col gap-2 bg-white/5 p-4 rounded-xl border border-white/5">
          <span class="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
            <i class="fa-solid fa-graduation-cap text-gold/80"></i> Academic background
          </span>
          <span class="text-xs text-slate-300 font-light">${member.education?.university || 'None recorded'}</span>
        </div>
      </div>

      <!-- Button actions -->
      <div class="flex flex-col gap-2 mt-8">
        <a href="member.html?id=${member.id}" class="h-10 bg-gold text-slate-950 font-semibold text-xs tracking-wider uppercase rounded-xl flex items-center justify-center gap-2 hover:bg-gold-hover transition-colors">
          Full Timeline Chronicles <i class="fa-solid fa-arrow-right-long"></i>
        </a>
        <button id="drawer-edit-btn" class="h-10 border border-white/10 hover:border-white/30 text-xs font-semibold tracking-wider uppercase rounded-xl flex items-center justify-center gap-2 text-slate-200 transition-all">
          <i class="fa-solid fa-pen-to-square"></i> Modify Details
        </button>
      </div>
    `;

    // Bind Close drawer
    const closeBtn = drawer.querySelector('#close-drawer-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        drawer.classList.add('translate-x-full');
        setTimeout(() => drawer.classList.add('hidden'), 300);
      });
    }

    // Bind Edit node from inside drawer
    const editBtn = drawer.querySelector('#drawer-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        drawer.classList.add('translate-x-full');
        setTimeout(() => {
          drawer.classList.add('hidden');
          this.openEditModal(member);
        }, 300);
      });
    }
  }

  // Open the detailed Add/Edit relation modification Modal
  static openEditModal(member) {
    const modal = document.getElementById('tree-edit-modal');
    if (!modal) return;

    modal.classList.remove('pointer-events-none', 'opacity-0');
    modal.classList.add('opacity-100');

    const parents = this.currentMembersList.filter(m => m.gender === 'Male' && m.id !== member.id);
    const spouses = this.currentMembersList.filter(m => m.id !== member.id);

    modal.innerHTML = `
      <div class="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in" id="edit-modal-card">

        <!-- Header -->
        <div class="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950/40">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gold/10 text-gold flex items-center justify-center text-lg">
              <i class="fa-solid fa-pen-nib"></i>
            </div>
            <div>
              <h3 class="text-base font-serif font-bold text-white">Modify Family Node: ${member.firstName}</h3>
              <p class="text-[10px] text-slate-500 font-light">Edit demographic stats, photos, or connect structural relations.</p>
            </div>
          </div>
          <button id="close-modal-btn" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Scrollable Form -->
        <form id="node-edit-form" class="p-6 overflow-y-auto flex-grow flex flex-col gap-5 text-left text-xs text-slate-300">

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">First Name</label>
              <input type="text" id="edit-firstName" value="${member.firstName}" required class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Last Name</label>
              <input type="text" id="edit-lastName" value="${member.lastName}" required class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Nickname</label>
              <input type="text" id="edit-nickname" value="${member.nickname || ''}" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Role Description</label>
              <input type="text" id="edit-role" value="${member.role || ''}" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Date of Birth</label>
              <input type="date" id="edit-birthDate" value="${member.birthDate || ''}" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Place of Birth</label>
              <input type="text" id="edit-birthPlace" value="${member.birthPlace || ''}" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status</label>
              <select id="edit-status" class="h-10 px-2 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold">
                <option value="Living" ${member.status === 'Living' ? 'selected' : ''}>Living</option>
                <option value="Deceased" ${member.status === 'Deceased' ? 'selected' : ''}>Deceased</option>
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Date of Death (If applicable)</label>
              <input type="date" id="edit-deathDate" value="${member.deathDate || ''}" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Avatar Image URL</label>
            <input type="url" id="edit-avatar" value="${member.avatar || ''}" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Full Chronicle Biography</label>
            <textarea id="edit-biography" rows="4" class="p-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold resize-none">${member.biography || ''}</textarea>
          </div>

          <!-- Relationships Connection section -->
          <div class="border-t border-white/5 pt-4">
            <h4 class="text-white font-serif font-semibold text-xs tracking-wide mb-3 flex items-center gap-1.5">
              <i class="fa-solid fa-diagram-project text-emerald"></i> Tree Connections & Structure
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Father</label>
                <select id="edit-father" class="h-10 px-2 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold">
                  <option value="">-- None --</option>
                  ${parents.map(p => `<option value="${p.id}" ${member.fatherId === p.id ? 'selected' : ''}>${p.firstName} ${p.lastName}</option>`).join('')}
                </select>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Spouse / Partner</label>
                <select id="edit-spouse" class="h-10 px-2 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold">
                  <option value="">-- None --</option>
                  ${spouses.map(s => `<option value="${s.id}" ${member.spouseId === s.id ? 'selected' : ''}>${s.firstName} ${s.lastName}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

          <!-- Buttons actions -->
          <div class="border-t border-white/5 pt-5 flex items-center justify-between">
            <button type="button" id="delete-node-btn" class="h-10 px-4 bg-red-600/10 hover:bg-red-600 hover:text-white border border-red-500/20 text-red-400 rounded-lg font-semibold tracking-wider uppercase text-[10px] transition-colors">
              Delete Member Node
            </button>
            <div class="flex gap-2">
              <button type="button" id="modal-cancel-btn" class="h-10 px-4 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold tracking-wider uppercase text-[10px] transition-colors">Cancel</button>
              <button type="submit" id="edit-submit-btn" class="h-10 px-6 bg-gold text-slate-950 hover:bg-gold-hover rounded-lg font-bold tracking-wider uppercase text-[10px] transition-colors">Save Updates</button>
            </div>
          </div>

        </form>
      </div>
    `;

    // Bind Close events
    const closeModal = () => {
      modal.classList.add('pointer-events-none', 'opacity-0');
      modal.classList.remove('opacity-100');
    };

    modal.querySelector('#close-modal-btn').addEventListener('click', closeModal);
    modal.querySelector('#modal-cancel-btn').addEventListener('click', closeModal);

    // Click outside to close modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Handle form submit
    const editForm = modal.querySelector('#node-edit-form');
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Prevent double submission
      const submitBtn = modal.querySelector('#edit-submit-btn');
      if (submitBtn.disabled) return;
      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Saving...`;

      // Read values
      const updateData = {
        firstName: modal.querySelector('#edit-firstName').value.trim(),
        lastName: modal.querySelector('#edit-lastName').value.trim(),
        nickname: modal.querySelector('#edit-nickname').value.trim(),
        role: modal.querySelector('#edit-role').value.trim(),
        birthDate: modal.querySelector('#edit-birthDate').value,
        birthPlace: modal.querySelector('#edit-birthPlace').value.trim(),
        status: modal.querySelector('#edit-status').value,
        deathDate: modal.querySelector('#edit-deathDate').value || null,
        avatar: modal.querySelector('#edit-avatar').value.trim(),
        biography: modal.querySelector('#edit-biography').value.trim(),
        living: modal.querySelector('#edit-status').value === 'Living'
      };

      const fatherId = modal.querySelector('#edit-father').value || null;
      const spouseId = modal.querySelector('#edit-spouse').value || null;

      try {
        // Save Updates using memberService
        await memberService.updateMember(member.id, updateData);

        // Update relationships if father changed
        if (fatherId !== member.fatherId) {
          const existingRels = await relationshipRepository.findAll();
          const prevFatherRel = existingRels.find(r => r.relationshipType === "BIOLOGICAL_FATHER" && r.personB === member.id);
          if (prevFatherRel) {
            await relationshipService.removeRelationship(prevFatherRel.relationshipId);
          }
          if (fatherId) {
            await relationshipService.addFather(member.id, fatherId);
          }
        }

        // Update relationships if spouse changed
        if (spouseId !== member.spouseId) {
          const existingRels = await relationshipRepository.findAll();
          const prevSpouseRel = existingRels.find(r => r.relationshipType === "SPOUSE" && r.status === "Current" && (r.personA === member.id || r.personB === member.id));
          if (prevSpouseRel) {
            await relationshipService.removeRelationship(prevSpouseRel.relationshipId);
          }
          if (spouseId) {
            await relationshipService.addSpouse(member.id, spouseId);
          }
        }

        closeModal();
        await this.render();
      } catch (error) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        alert(`Error: ${error.message}`);
      }
    });

    // Delete Member
    modal.querySelector('#delete-node-btn').addEventListener('click', async () => {
      if (confirm(`Are you completely sure you want to delete ${member.firstName} ${member.lastName} and disconnect all relations?`)) {
        try {
          await memberService.softDeleteMember(member.id);
          closeModal();
          await this.render();
        } catch (error) {
          alert(`Error: ${error.message}`);
        }
      }
    });
  }

  // Helper static utilities
  static calculateAge(birthDate) {
    if (!birthDate) return 'N/A';
    const dob = new Date(birthDate);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }
}

// Fire on DOM load
document.addEventListener('DOMContentLoaded', () => {
  Tree.init();
});
