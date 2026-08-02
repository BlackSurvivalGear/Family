import { DB } from './db.js';
import * as treeRepository from './repositories/treeRepository.js';
import * as memberService from './services/memberService.js';
import * as relationshipService from './services/relationshipService.js';
import * as relationshipRepository from './repositories/relationshipRepository.js';
import * as documentService from './services/documentService.js';
import * as mediaService from './services/mediaService.js';
import {
  getFather,
  getMother,
  getParents,
  getChildren,
  getSpouses,
  getCurrentSpouses,
  getFormerSpouses,
  getSiblings,
  findRelationship
} from './genealogy/relationshipEngine.js';
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
  static getThemeColorHex() {
    const theme = this.treeData?.themeColor || 'gold';
    if (theme === 'emerald') return '#10B981';
    if (theme === 'blue') return '#3B82F6';
    if (theme === 'purple') return '#8B5CF6';
    return '#D4AF37'; // gold
  }

  static getThemeColorClass() {
    const theme = this.treeData?.themeColor || 'gold';
    if (theme === 'emerald') return 'emerald';
    if (theme === 'blue') return 'blue-500';
    if (theme === 'purple') return 'purple-500';
    return 'gold';
  }

  static getThemeTextClass() {
    const theme = this.treeData?.themeColor || 'gold';
    if (theme === 'emerald') return 'text-emerald';
    if (theme === 'blue') return 'text-blue-400';
    if (theme === 'purple') return 'text-purple-400';
    return 'text-gold';
  }

  static async init() {
    DB.init();

    // Map filename to predefined tree IDs if treeId param is not specified
    const filename = window.location.pathname.substring(window.location.pathname.lastIndexOf('/') + 1);
    let defaultTreeId = 'house-of-lawal';
    if (filename === 'tree-grimster.html') defaultTreeId = 'grimster';
    else if (filename === 'tree-oluwanje.html') defaultTreeId = 'oluwanje';
    else if (filename === 'tree-ogunronbi.html') defaultTreeId = 'ogunronbi';

    // Check query params for initial action
    const urlParams = new URLSearchParams(window.location.search);
    const treeId = urlParams.get('treeId') || defaultTreeId;
    const focusId = urlParams.get('id');
    const triggerEdit = urlParams.get('edit') === 'true';

    // Fetch tree repository
    const treeData = await treeRepository.findById(treeId) || {
      name: "House of Lawal",
      description: "The main Lawal ancestral tree, tracing the noble lineage of Alhaji Kolawole Lawal.",
      coverImage: "LawalNG1.png",
      themeColor: "gold"
    };

    this.selectedTreeId = treeId;
    this.treeData = treeData;

    // Dynamically update banner elements
    const titleEl = document.getElementById('tree-banner-title');
    const descEl = document.getElementById('tree-banner-desc');
    const imgEl = document.getElementById('tree-banner-img');
    if (titleEl) titleEl.textContent = treeData.name;
    if (descEl) descEl.textContent = treeData.description;
    if (imgEl) imgEl.src = treeData.coverImage || 'LawalNG1.png';

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
      this.openAddModal();
    });

    // Check and append the Restore Member button if it doesn't exist
    if (addBtn && !document.getElementById('restore-member-trigger-btn')) {
      const restoreBtn = document.createElement('button');
      restoreBtn.id = 'restore-member-trigger-btn';
      restoreBtn.className = 'px-3.5 h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-wider text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-md ml-2';
      restoreBtn.innerHTML = '<i class="fa-solid fa-trash-arrow-up text-[10px]"></i> Restore';
      addBtn.parentNode.insertBefore(restoreBtn, addBtn.nextSibling);

      restoreBtn.addEventListener('click', () => this.openRestoreModal());
    }
  }

  static async openRestoreModal() {
    const modal = document.getElementById('tree-edit-modal');
    if (!modal) return;

    modal.classList.remove('pointer-events-none', 'opacity-0');
    modal.classList.add('opacity-100');

    const allMembers = await memberService.searchMembers({ includeDeleted: true });
    const deletedMembers = allMembers.filter(m => m.deleted === true);

    modal.innerHTML = `
      <div class="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-fade-in">
        <!-- Header -->
        <div class="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950/40">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-blue-600/10 text-blue-500 flex items-center justify-center text-lg">
              <i class="fa-solid fa-trash-arrow-up"></i>
            </div>
            <div>
              <h3 class="text-base font-serif font-bold text-white">Restore Deleted Members</h3>
              <p class="text-[10px] text-slate-500 font-light">Bring back archived/deleted relatives into the active family tree.</p>
            </div>
          </div>
          <button id="close-restore-modal-btn" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- List -->
        <div class="p-6 overflow-y-auto flex-grow flex flex-col gap-3 text-left">
          ${deletedMembers.length === 0 ? `
            <p class="text-xs text-slate-500 italic text-center py-8">No deleted members found in archives.</p>
          ` : deletedMembers.map(m => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div class="flex items-center gap-3 min-w-0">
                <img src="${m.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80'}" class="w-10 h-10 rounded-xl object-cover border border-white/10" />
                <div class="flex flex-col min-w-0">
                  <span class="text-xs font-bold text-white truncate">${m.firstName} ${m.lastName}</span>
                  <span class="text-[10px] text-slate-400">Gen ${m.generation || 'N/A'} • ${m.gender}</span>
                </div>
              </div>
              <button class="restore-member-btn px-3 h-8 bg-emerald hover:bg-emerald-hover text-slate-950 font-bold text-xs rounded-lg transition-colors shrink-0" data-id="${m.memberId || m.id}">
                Restore
              </button>
            </div>
          `).join('')}
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-white/5 bg-slate-950/20 flex justify-end">
          <button id="close-restore-modal-cancel-btn" class="h-10 px-4 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold tracking-wider uppercase text-[10px] transition-colors">Close</button>
        </div>
      </div>
    `;

    const closeModal = () => {
      modal.classList.add('pointer-events-none', 'opacity-0');
      modal.classList.remove('opacity-100');
    };

    modal.querySelector('#close-restore-modal-btn').addEventListener('click', closeModal);
    modal.querySelector('#close-restore-modal-cancel-btn').addEventListener('click', closeModal);

    modal.querySelectorAll('.restore-member-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const memberId = e.currentTarget.getAttribute('data-id');
        try {
          await memberService.restoreMember(memberId);
          alert("Member successfully restored!");
          closeModal();
          await this.render();
        } catch (error) {
          alert(`Error restoring member: ${error.message}`);
        }
      });
    });
  }

  static openAddModal(options = {}) {
    const modal = document.getElementById('tree-edit-modal');
    if (!modal) return;

    modal.classList.remove('pointer-events-none', 'opacity-0');
    modal.classList.add('opacity-100');

    const members = this.currentMembersList || [];
    const fathers = members.filter(m => m.gender === 'Male');
    const mothers = members.filter(m => m.gender === 'Female');
    const spouses = members;

    // Default values based on options
    const defaultGender = options.defaultGender || 'Male';
    const relType = options.relationshipType || '';
    const relativeId = options.relativeId || '';
    const relativeName = relativeId ? (() => {
      const match = members.find(m => m.id === relativeId);
      return match ? `${match.firstName} ${match.lastName}` : '';
    })() : '';

    let headerSubtitle = "Insert details and connect them directly to the generations tree.";
    if (relativeId && relType) {
      headerSubtitle = `Creating a new relative to connect as <span class="text-gold font-bold">${relType}</span> of <span class="text-emerald font-bold">${relativeName}</span>.`;
    }

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
              <p class="text-[10px] text-slate-500 font-light">${headerSubtitle}</p>
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
              <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Middle Name</label>
              <input type="text" id="add-middleName" placeholder="Middle Name" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
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
                <option value="Male" ${defaultGender === 'Male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${defaultGender === 'Female' ? 'selected' : ''}>Female</option>
                <option value="Unknown" ${defaultGender === 'Unknown' ? 'selected' : ''}>Unknown</option>
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
              <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Living Status</label>
              <select id="add-living-status" required class="h-10 px-2 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold">
                <option value="Living">Living</option>
                <option value="Deceased">Deceased</option>
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Branch</label>
              <input type="text" id="add-branch" placeholder="e.g. Lagos" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Date of Birth</label>
              <input type="date" id="add-birthDate" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Place of Birth</label>
              <input type="text" id="add-birthPlace" placeholder="e.g. Lagos, Nigeria" class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Photo URL (Optional)</label>
              <input type="url" id="add-avatar" placeholder="https://..." class="h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold"/>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Notes / Biography</label>
            <textarea id="add-biography" rows="3" placeholder="Brief notes or chronicle story..." class="p-3 rounded-lg bg-slate-950 border border-white/10 text-xs focus:outline-none focus:border-gold resize-none"></textarea>
          </div>

          <!-- Lineage connections dropdowns -->
          ${relativeId ? '' : `
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
          `}

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

    modal.querySelector('#node-add-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();

      const submitBtn = modal.querySelector('#add-submit-btn');
      if (submitBtn.disabled) return;
      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Creating...`;

      const firstName = modal.querySelector('#add-firstName').value.trim();
      const middleName = modal.querySelector('#add-middleName').value.trim();
      const lastName = modal.querySelector('#add-lastName').value.trim();
      const nickname = modal.querySelector('#add-nickname').value.trim();
      const gender = modal.querySelector('#add-gender').value;
      const role = modal.querySelector('#add-role').value.trim() || "Family Member";
      const generation = parseInt(modal.querySelector('#add-generation').value);
      const livingStatus = modal.querySelector('#add-living-status').value;
      const branch = modal.querySelector('#add-branch').value.trim() || "Lagos";
      const birthDate = modal.querySelector('#add-birthDate').value;
      const birthPlace = modal.querySelector('#add-birthPlace').value.trim();
      const avatar = modal.querySelector('#add-avatar').value.trim() || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80";
      const biography = modal.querySelector('#add-biography').value.trim();

      const newMember = {
        firstName,
        middleName,
        lastName,
        nickname,
        gender,
        role,
        generation,
        living: livingStatus === 'Living',
        status: livingStatus,
        branch,
        branchId: branch,
        notes: biography,
        birthDate,
        birthPlace,
        avatar,
        biography,
        education: { university: "Awaiting inputs" },
        timeline: [],
        treeIds: [Tree.selectedTreeId]
      };

      try {
        const valResult = memberService.validateMember(newMember);
        if (!valResult.isValid) {
          throw new Error(valResult.errors.join("; "));
        }

        const memberId = await memberService.createMember(newMember);

        if (relativeId && relType) {
          if (relType === 'BIOLOGICAL_FATHER') {
            await relationshipService.addFather(relativeId, memberId);
          } else if (relType === 'BIOLOGICAL_MOTHER') {
            await relationshipService.addMother(relativeId, memberId);
          } else if (relType === 'CHILD') {
            await relationshipService.addChild(relativeId, memberId);
          } else if (relType === 'SPOUSE') {
            await relationshipService.addSpouse(relativeId, memberId);
          } else if (relType === 'FORMER_SPOUSE') {
            await relationshipService.addFormerSpouse(relativeId, memberId);
          }
        } else {
          const fatherId = modal.querySelector('#add-father')?.value || null;
          const motherId = modal.querySelector('#add-mother')?.value || null;
          const spouseId = modal.querySelector('#add-spouse')?.value || null;

          if (fatherId) {
            await relationshipService.addFather(memberId, fatherId);
          }
          if (motherId) {
            await relationshipService.addMother(memberId, motherId);
          }
          if (spouseId) {
            await relationshipService.addSpouse(memberId, spouseId);
          }
        }

        closeAddModal();
        await this.render();
      } catch (error) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        alert(`Error: ${error.message}`);
      }
    });
  }

  static async render() {
    const rawMembers = await memberService.searchMembers({ includeDeleted: false });
    const filteredMembers = rawMembers.filter(m => {
      const tIds = m.treeIds || ["house-of-lawal"];
      return tIds.includes(Tree.selectedTreeId);
    });
    const members = await this.enrichMembers(filteredMembers);
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

    const themeCls = Tree.getThemeColorClass();
    // Apply specific classes if matches highlighted search/highlight relationships
    if (activeSelectedNodeId) {
      if (member.id === activeSelectedNodeId) {
        div.className += ` ring-4 ring-${themeCls} border-${themeCls} scale-105`;
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
        <button class="collapse-toggle-btn absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-slate-900 border border-${themeCls}/30 hover:border-${themeCls} flex items-center justify-center text-xs text-${themeCls} transition-all z-20 shadow-lg" data-id="${member.id}" title="${isCollapsed ? 'Expand lineage' : 'Collapse lineage'}">
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
          <img src="${member.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80'}" alt="${member.firstName}" class="w-12 h-12 rounded-2xl object-cover border-2 border-${themeCls}/25 group-hover:border-${themeCls} transition-all shadow-inner">
          <span class="absolute -top-1 -left-1 w-4.5 h-4.5 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-[8px]">
            ${isMale ? '<i class="fa-solid fa-mars text-blue-400"></i>' : '<i class="fa-solid fa-venus text-pink-400"></i>'}
          </span>
        </div>
        <div class="flex flex-col min-w-0 flex-grow text-left">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="text-xs font-serif font-bold text-white truncate group-hover:text-${themeCls} transition-colors">${member.firstName} ${member.lastName}</span>
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
          <span class="text-[8px] uppercase tracking-wider bg-${themeCls}/15 text-${themeCls} px-2 py-0.5 rounded font-extrabold border border-${themeCls}/10">Gen ${member.generation}</span>
          ${statusPill}
        </div>
      </div>

      <!-- Quick Actions bar -->
      <div class="flex gap-1.5 border-t border-white/5 pt-2.5 mt-1.5 relative z-10">
        <button class="view-profile-btn flex-grow h-7.5 bg-white/5 hover:bg-${themeCls} hover:text-slate-950 rounded-lg text-[9px] font-extrabold tracking-wider uppercase transition-all flex items-center justify-center gap-1" data-id="${member.id}">
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
          const themeHex = Tree.getThemeColorHex();
          const color = marriageHighlight ? "#10B981" : themeHex;
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

    window.mousemoveHandler = (e) => {
      if (!isDragging) return;
      transformX = e.clientX - startX;
      transformY = e.clientY - startY;
      applyTransform();
    };
    window.addEventListener('mousemove', window.mousemoveHandler);

    window.mouseupHandler = () => {
      isDragging = false;
    };
    window.addEventListener('mouseup', window.mouseupHandler);

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
    const scopeSelect = document.getElementById('tree-search-scope');
    if (!input || !autoBox) return;

    input.addEventListener('input', async (e) => {
      const val = e.target.value.toLowerCase().trim();
      if (!val) {
        autoBox.classList.add('hidden');
        return;
      }

      const scope = scopeSelect ? scopeSelect.value : 'current';
      let searchPool = [];
      const allTrees = await treeRepository.findAll();

      if (scope === 'all') {
        searchPool = await memberService.searchMembers({ includeDeleted: false });
      } else {
        searchPool = this.currentMembersList || [];
      }

      const matched = searchPool.filter(m =>
        m.firstName.toLowerCase().includes(val) ||
        m.lastName.toLowerCase().includes(val) ||
        (m.nickname && m.nickname.toLowerCase().includes(val))
      );

      if (matched.length === 0) {
        autoBox.innerHTML = '<span class="text-[10px] text-slate-500 p-2">No relative found...</span>';
        autoBox.classList.remove('hidden');
        return;
      }

      autoBox.innerHTML = matched.map(m => {
        const tIds = m.treeIds || ["house-of-lawal"];
        const treeNames = tIds.map(tid => {
          const match = allTrees.find(t => t.treeId === tid);
          return match ? match.name : tid;
        }).join(', ');

        const themeCls = Tree.getThemeColorClass();
        return `
          <button class="w-full text-left p-2 hover:bg-white/5 rounded text-white flex flex-col gap-0.5 text-xs" data-id="${m.id}" data-tree-id="${tIds[0]}">
            <div class="flex items-center justify-between w-full">
              <span class="font-bold">${m.firstName} ${m.lastName}</span>
              <span class="text-[8px] uppercase tracking-wider bg-${themeCls}/10 text-${themeCls} px-1.5 py-0.5 rounded">Gen ${m.generation}</span>
            </div>
            <span class="text-[9px] text-slate-400 font-light truncate">Trees: ${treeNames}</span>
          </button>
        `;
      }).join('');

      autoBox.classList.remove('hidden');

      // Add click behavior on autocompletes
      autoBox.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (ev) => {
          const mId = ev.currentTarget.getAttribute('data-id');
          const targetTreeId = ev.currentTarget.getAttribute('data-tree-id');
          autoBox.classList.add('hidden');
          input.value = '';

          if (scope === 'all' && targetTreeId !== Tree.selectedTreeId) {
            let targetPage = 'tree-lawal.html';
            if (targetTreeId === 'grimster') targetPage = 'tree-grimster.html';
            else if (targetTreeId === 'oluwanje') targetPage = 'tree-oluwanje.html';
            else if (targetTreeId === 'ogunronbi') targetPage = 'tree-ogunronbi.html';

            window.location.href = `${targetPage}?treeId=${targetTreeId}&id=${mId}`;
          } else {
            this.centerOnMember(mId);
          }
        });
      });
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !autoBox.contains(e.target)) {
        autoBox.classList.add('hidden');
      }
    });
  }

  // Helper to expand collapsed ancestors upward so the targeted member becomes visible
  static expandAncestors(memberId) {
    let currentId = memberId;
    while (currentId) {
      const current = this.currentMembersList.find(m => m.id === currentId);
      if (!current) break;

      if (current.fatherId) {
        collapsedNodes.delete(current.fatherId);
      }
      if (current.motherId) {
        collapsedNodes.delete(current.motherId);
      }

      // Traverse upwards to parent nodes
      currentId = current.fatherId || current.motherId;
    }
  }

  // Smooth focus center camera on selected relative
  static async centerOnMember(memberId) {
    // Expand parents/ancestors first
    this.expandAncestors(memberId);
    await this.render();

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
  static async openQuickView(member) {
    const drawer = document.getElementById('quick-view-drawer');
    if (!drawer) return;

    drawer.classList.remove('hidden');
    // Force transition reflow
    setTimeout(() => {
      drawer.classList.remove('translate-x-full');
    }, 50);

    const isLiving = member.status === 'Living';

    // Live data fetching from Firestore/Simulation layers
    const father = await getFather(member.id);
    const mother = await getMother(member.id);
    const parents = await getParents(member.id);
    const children = await getChildren(member.id);
    const currentSpouses = await getCurrentSpouses(member.id);
    const formerSpouses = await getFormerSpouses(member.id);
    const siblings = await getSiblings(member.id);

    // Fetch related documents matching member name
    const allDocs = await documentService.getAllDocuments();
    const matchedDocs = allDocs.filter(d =>
      d.memberId === member.id ||
      d.title.toLowerCase().includes(member.firstName.toLowerCase())
    );

    // Fetch related media gallery files
    const allMedia = await mediaService.getAllMedia();
    const matchedMedia = allMedia.filter(m =>
      m.memberId === member.id ||
      (m.caption && m.caption.toLowerCase().includes(member.firstName.toLowerCase()))
    );

    // Relationship summary to active logged-in user
    const loggedUser = JSON.parse(localStorage.getItem('lawal_current_user') || '{}');
    let summaryText = "No active user session";
    if (loggedUser && (loggedUser.uid || loggedUser.id)) {
      const loggedId = loggedUser.uid || loggedUser.id;
      if (loggedId === member.id) {
        summaryText = "You (This is your own profile)";
      } else {
        const computedRel = await findRelationship(member.id, loggedId);
        summaryText = computedRel === 'UNRELATED' ? 'Extended Relative' : computedRel;
      }
    }

    const allTrees = await treeRepository.findAll();
    const treeNamesList = (member.treeIds || ["house-of-lawal"]).map(tid => {
      const match = allTrees.find(t => t.treeId === tid);
      return match ? match.name : tid;
    }).join(', ');

    drawer.innerHTML = `
      <div class="flex flex-col gap-6 text-left pb-12">
        <!-- Close button & title -->
        <div class="flex items-center justify-between border-b border-white/5 pb-4">
          <span class="font-serif text-lg font-bold text-white tracking-wide">Quick Profile Drawer</span>
          <button id="close-drawer-btn" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Meta card -->
        <div class="flex items-center gap-4">
          <img src="${member.avatar}" alt="${member.firstName}" class="w-16 h-16 rounded-2xl object-cover border border-gold/30">
          <div class="flex flex-col min-w-0">
            <h3 class="text-lg font-serif font-bold text-white truncate">${member.firstName} ${member.lastName}</h3>
            <span class="text-xs text-gold truncate">"${member.nickname || 'None'}"</span>
            <span class="text-[11px] text-slate-500 font-light mt-0.5 truncate">${member.role}</span>
          </div>
        </div>

        <!-- Relationship Summary Pill -->
        <div class="p-3.5 bg-gold/10 border border-gold/20 rounded-xl flex flex-col gap-1">
          <span class="text-[9px] uppercase tracking-wider text-gold font-bold"><i class="fa-solid fa-network-wired"></i> Connection to You</span>
          <span class="text-xs text-white font-medium">${summaryText}</span>
        </div>

        <!-- Tree memberships row -->
        <div class="p-3.5 bg-emerald/10 border border-emerald/20 rounded-xl flex flex-col gap-1">
          <span class="text-[9px] uppercase tracking-wider text-emerald font-bold"><i class="fa-solid fa-tree"></i> Tree Memberships</span>
          <span class="text-xs text-white font-medium">${treeNamesList}</span>
        </div>

        <!-- Demographics Grid -->
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="bg-white/5 p-3 rounded-xl border border-white/5">
            <span class="text-[10px] text-slate-500 block uppercase font-semibold">DOB / Age</span>
            <span class="text-slate-200 mt-1 block font-medium">${member.birthDate || 'N/A'} (${this.calculateAge(member.birthDate)} yrs)</span>
          </div>
          <div class="bg-white/5 p-3 rounded-xl border border-white/5">
            <span class="text-[10px] text-slate-500 block uppercase font-semibold">Status</span>
            <span class="text-slate-200 mt-1 block flex items-center gap-1.5 font-medium">
              <span class="w-1.5 h-1.5 rounded-full ${isLiving ? 'bg-emerald' : 'bg-slate-500'}"></span>
              ${member.status}
            </span>
          </div>
          <div class="bg-white/5 p-3 rounded-xl border border-white/5 col-span-2">
            <span class="text-[10px] text-slate-500 block uppercase font-semibold">Place of Birth</span>
            <span class="text-slate-200 mt-1 block truncate font-medium" title="${member.birthPlace || 'N/A'}">${member.birthPlace || 'N/A'}</span>
          </div>
        </div>

        <!-- Career / Occupation Section -->
        <div class="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col gap-1.5">
          <span class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
            <i class="fa-solid fa-briefcase text-gold/80"></i> Occupation & Career
          </span>
          <span class="text-xs text-slate-200 font-bold">${member.career?.occupation || member.role || 'Family Member'}</span>
          <p class="text-[11px] text-slate-400 font-light mt-1">${member.career?.history || 'No professional chronicle recorded.'}</p>
        </div>

        <!-- Military Service Section -->
        <div class="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col gap-1.5">
          <span class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
            <i class="fa-solid fa-shield-halved text-gold/80"></i> Military Service
          </span>
          <span class="text-xs text-slate-200 font-bold">${member.military?.service && member.military.service !== "None" ? member.military.service : 'No Military Service Record'}</span>
          ${member.military?.history ? `<p class="text-[11px] text-slate-400 font-light mt-1">${member.military.history}</p>` : ''}
        </div>

        <!-- Lineage Contacts List (Parents, Children, Spouses, Siblings) -->
        <div class="flex flex-col gap-2.5">
          <span class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold border-b border-white/5 pb-1">Lineage Connections</span>
          <div class="flex flex-col gap-1.5 text-xs">
            <!-- Parents -->
            ${father ? `
              <div class="flex items-center justify-between p-2 bg-slate-900/60 border border-white/5 rounded-lg">
                <span class="text-slate-400">Father</span>
                <span class="text-white font-semibold cursor-pointer hover:text-gold" onclick="Tree.centerOnMember('${father.memberId}')">${father.firstName} ${father.lastName}</span>
              </div>
            ` : ''}
            ${mother ? `
              <div class="flex items-center justify-between p-2 bg-slate-900/60 border border-white/5 rounded-lg">
                <span class="text-slate-400">Mother</span>
                <span class="text-white font-semibold cursor-pointer hover:text-gold" onclick="Tree.centerOnMember('${mother.memberId}')">${mother.firstName} ${mother.lastName}</span>
              </div>
            ` : ''}
            <!-- Spouses -->
            ${currentSpouses.map(s => `
              <div class="flex items-center justify-between p-2 bg-slate-900/60 border border-white/5 rounded-lg">
                <span class="text-gold">Spouse</span>
                <span class="text-white font-semibold cursor-pointer hover:text-gold" onclick="Tree.centerOnMember('${s.memberId}')">${s.firstName} ${s.lastName}</span>
              </div>
            `).join('')}
            ${formerSpouses.map(s => `
              <div class="flex items-center justify-between p-2 bg-slate-900/60 border border-white/5 rounded-lg">
                <span class="text-slate-500">Former Spouse</span>
                <span class="text-white font-semibold cursor-pointer hover:text-gold" onclick="Tree.centerOnMember('${s.memberId}')">${s.firstName} ${s.lastName}</span>
              </div>
            `).join('')}
            <!-- Children -->
            ${children.map(c => `
              <div class="flex items-center justify-between p-2 bg-slate-900/60 border border-white/5 rounded-lg">
                <span class="text-emerald">Child</span>
                <span class="text-white font-semibold cursor-pointer hover:text-gold" onclick="Tree.centerOnMember('${c.memberId}')">${c.firstName} ${c.lastName}</span>
              </div>
            `).join('')}
            <!-- Siblings -->
            ${siblings.map(s => `
              <div class="flex items-center justify-between p-2 bg-slate-900/60 border border-white/5 rounded-lg">
                <span class="text-blue-400">Sibling</span>
                <span class="text-white font-semibold cursor-pointer hover:text-gold" onclick="Tree.centerOnMember('${s.memberId}')">${s.firstName} ${s.lastName}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Timeline / Chronological Milestones -->
        <div class="flex flex-col gap-2">
          <span class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold border-b border-white/5 pb-1">Timeline & Milestones</span>
          <div class="flex flex-col gap-3 mt-1.5">
            ${(member.timeline || []).length === 0 ? `
              <span class="text-xs text-slate-500 italic">No milestones recorded.</span>
            ` : member.timeline.map(evt => `
              <div class="flex gap-3 text-xs text-left relative">
                <div class="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 shrink-0"></div>
                <div>
                  <span class="font-bold text-white">${evt.year} — ${evt.title}</span>
                  <p class="text-slate-400 font-light text-[11px] mt-0.5">${evt.description}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Attached Documents -->
        <div class="flex flex-col gap-2">
          <span class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold border-b border-white/5 pb-1">Documents Vault</span>
          <div class="flex flex-col gap-1.5 mt-1">
            ${matchedDocs.length === 0 ? `
              <span class="text-xs text-slate-500 italic">No attached documents found.</span>
            ` : matchedDocs.map(d => `
              <div class="p-2.5 bg-white/5 border border-white/5 rounded-lg flex items-center justify-between text-xs">
                <div class="flex items-center gap-2 min-w-0">
                  <i class="fa-solid fa-file-pdf text-red-400"></i>
                  <span class="text-white font-medium truncate" title="${d.title}">${d.title}</span>
                </div>
                <span class="text-[10px] text-slate-500 shrink-0">${d.size || 'PDF'}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Gallery / Photos Section -->
        <div class="flex flex-col gap-2">
          <span class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold border-b border-white/5 pb-1">Gallery Album</span>
          <div class="grid grid-cols-3 gap-2 mt-1">
            ${matchedMedia.length === 0 ? `
              <div class="col-span-3 text-xs text-slate-500 italic py-2">No photos in personal album yet.</div>
            ` : matchedMedia.map(m => `
              <img src="${m.url}" alt="${m.caption || 'Photo'}" class="w-full h-16 object-cover rounded-lg border border-white/10 hover:scale-105 transition-transform" />
            `).join('')}
          </div>
        </div>

        <!-- Brief Biography Story -->
        <div class="flex flex-col gap-1.5">
          <span class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Biography Chronicle</span>
          <p class="text-xs text-slate-400 font-light leading-relaxed bg-slate-900/60 p-3.5 border border-white/5 rounded-xl max-h-40 overflow-y-auto">
            ${member.biography || 'No biography recorded yet.'}
          </p>
        </div>
      </div>

      <!-- Button actions -->
      <div class="flex flex-col gap-2 border-t border-white/5 pt-4 bg-slate-950 sticky bottom-0 z-30">
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

    // Expose Tree on window so global click handlers can invoke centerOnMember
    window.Tree = Tree;
  }

  static getSelectedTreeId() {
    return this.selectedTreeId;
  }

  // Open the detailed Add/Edit relation modification Modal
  static async openEditModal(member) {
    const modal = document.getElementById('tree-edit-modal');
    if (!modal) return;

    modal.classList.remove('pointer-events-none', 'opacity-0');
    modal.classList.add('opacity-100');

    const parents = this.currentMembersList.filter(m => m.gender === 'Male' && m.id !== member.id);
    const mothersList = this.currentMembersList.filter(m => m.gender === 'Female' && m.id !== member.id);
    const spouses = this.currentMembersList.filter(m => m.id !== member.id);

    // Fetch and enrich the exact relationships linked to this specific node to support dynamic Remove Relationship actions
    const allRels = await relationshipRepository.findAll();
    const memberRels = allRels.filter(r => r.personA === member.id || r.personB === member.id);

    // Map connected names
    const enrichedRels = memberRels.map(r => {
      const otherId = r.personA === member.id ? r.personB : r.personA;
      const matchedOther = this.currentMembersList.find(x => x.id === otherId);
      const otherName = matchedOther ? `${matchedOther.firstName} ${matchedOther.lastName}` : otherId;
      return {
        ...r,
        otherName,
        otherId
      };
    });

    const allTrees = await treeRepository.findAll();
    const treeCheckboxesHtml = allTrees.map(t => {
      const checked = (member.treeIds || ["house-of-lawal"]).includes(t.treeId) ? 'checked' : '';
      return `
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="edit-treeIds" value="${t.treeId}" ${checked} class="rounded border-white/10 bg-slate-950 text-gold focus:ring-0 w-4 h-4"/>
          <span>${t.name}</span>
        </label>
      `;
    }).join('');

    modal.innerHTML = `
      <div class="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" id="edit-modal-card">

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

          <!-- Tree Memberships checklist -->
          <div class="border-t border-white/5 pt-4">
            <h4 class="text-white font-serif font-semibold text-xs tracking-wide mb-3 flex items-center gap-1.5">
              <i class="fa-solid fa-tree text-gold"></i> Tree Memberships
            </h4>
            <div class="flex flex-wrap gap-4 text-white">
              ${treeCheckboxesHtml}
            </div>
          </div>

          <!-- Active Relationships list to allow Removal of Relationships -->
          <div class="border-t border-white/5 pt-4">
            <h4 class="text-white font-serif font-semibold text-xs tracking-wide mb-3 flex items-center gap-1.5">
              <i class="fa-solid fa-link text-gold"></i> Connected Relationships (${enrichedRels.length})
            </h4>
            <div class="flex flex-col gap-2">
              ${enrichedRels.length === 0 ? `
                <span class="text-slate-500 italic text-[11px]">No structural connections found.</span>
              ` : enrichedRels.map(rel => `
                <div class="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div class="flex flex-col text-left">
                    <span class="text-white font-semibold">${rel.otherName}</span>
                    <span class="text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">${rel.relationshipType}</span>
                  </div>
                  <button type="button" class="remove-rel-btn w-8 h-8 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white flex items-center justify-center transition-all" data-id="${rel.relationshipId}" title="Remove Relationship">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Tree Actions for adding new connections directly connected to this member -->
          <div class="border-t border-white/5 pt-4">
            <h4 class="text-white font-serif font-semibold text-xs tracking-wide mb-3 flex items-center gap-1.5">
              <i class="fa-solid fa-diagram-project text-emerald"></i> Tree Actions & New Connections
            </h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button type="button" class="action-add-rel-btn h-9 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-[10px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5" data-type="BIOLOGICAL_FATHER" data-gender="Male">
                <i class="fa-solid fa-user-plus text-blue-400"></i> Add Father
              </button>
              <button type="button" class="action-add-rel-btn h-9 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-[10px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5" data-type="BIOLOGICAL_MOTHER" data-gender="Female">
                <i class="fa-solid fa-user-plus text-pink-400"></i> Add Mother
              </button>
              <button type="button" class="action-add-rel-btn h-9 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-[10px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5" data-type="CHILD" data-gender="Male">
                <i class="fa-solid fa-child text-emerald"></i> Add Son
              </button>
              <button type="button" class="action-add-rel-btn h-9 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-[10px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5" data-type="CHILD" data-gender="Female">
                <i class="fa-solid fa-child text-pink-400"></i> Add Daughter
              </button>
              <button type="button" class="action-add-rel-btn h-9 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-[10px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5" data-type="SPOUSE" data-gender="Female">
                <i class="fa-solid fa-ring text-gold"></i> Add Spouse
              </button>
              <button type="button" class="action-add-rel-btn h-9 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-[10px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5" data-type="FORMER_SPOUSE" data-gender="Female">
                <i class="fa-solid fa-ring text-slate-400"></i> Former Spouse
              </button>
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

    // Handle Add relative action buttons inside the edit modal
    modal.querySelectorAll('.action-add-rel-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.getAttribute('data-type');
        const defaultGender = e.currentTarget.getAttribute('data-gender');
        closeModal();
        this.openAddModal({
          defaultGender,
          relationshipType: type,
          relativeId: member.id
        });
      });
    });

    // Handle Remove Relationship buttons
    modal.querySelectorAll('.remove-rel-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const relId = e.currentTarget.getAttribute('data-id');
        if (confirm("Are you completely sure you want to disconnect this relationship connection?")) {
          try {
            await relationshipService.removeRelationship(relId);
            alert("Relationship removed successfully!");
            closeModal();
            await this.render();
          } catch (error) {
            alert(`Error: ${error.message}`);
          }
        }
      });
    });

    // Handle form submit for basic details updating
    const editForm = modal.querySelector('#node-edit-form');
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = modal.querySelector('#edit-submit-btn');
      if (submitBtn.disabled) return;
      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Saving...`;

      const selectedTreeIds = Array.from(modal.querySelectorAll('input[name="edit-treeIds"]:checked')).map(cb => cb.value);
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
        living: modal.querySelector('#edit-status').value === 'Living',
        treeIds: selectedTreeIds
      };

      try {
        await memberService.updateMember(member.id, updateData);
        closeModal();
        await this.render();
      } catch (error) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        alert(`Error: ${error.message}`);
      }
    });

    // Delete Member (Soft Delete)
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
