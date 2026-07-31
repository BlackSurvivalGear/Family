import { DB } from './db.js';
import * as memberService from './services/memberService.js';

export class MembersDirectory {
  static async init() {
    DB.init();

    // Bind inputs
    this.searchInput = document.getElementById('directory-search-input');
    this.filterStatus = document.getElementById('filter-status');
    this.filterGeneration = document.getElementById('filter-generation');
    this.filterCountry = document.getElementById('filter-country');
    this.filterSurname = document.getElementById('filter-surname');
    this.filterOccupation = document.getElementById('filter-occupation');
    this.filterMilitary = document.getElementById('filter-military');
    this.resetBtn = document.getElementById('reset-filters-btn');

    this.grid = document.getElementById('members-grid');
    this.emptyState = document.getElementById('empty-state');
    this.countEl = document.getElementById('members-count');

    // Register listeners
    const triggerFilter = () => this.render();
    if (this.searchInput) this.searchInput.addEventListener('input', triggerFilter);
    if (this.filterStatus) this.filterStatus.addEventListener('change', triggerFilter);
    if (this.filterGeneration) this.filterGeneration.addEventListener('change', triggerFilter);
    if (this.filterCountry) this.filterCountry.addEventListener('change', triggerFilter);
    if (this.filterSurname) this.filterSurname.addEventListener('change', triggerFilter);
    if (this.filterOccupation) this.filterOccupation.addEventListener('change', triggerFilter);
    if (this.filterMilitary) this.filterMilitary.addEventListener('change', triggerFilter);

    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => {
        if (this.searchInput) this.searchInput.value = '';
        if (this.filterStatus) this.filterStatus.value = '';
        if (this.filterGeneration) this.filterGeneration.value = '';
        if (this.filterCountry) this.filterCountry.value = '';
        if (this.filterSurname) this.filterSurname.value = '';
        if (this.filterOccupation) this.filterOccupation.value = '';
        if (this.filterMilitary) this.filterMilitary.checked = false;
        this.render();
      });
    }

    // Initial render
    await this.render();
  }

  static async render() {
    const rawMembers = await memberService.searchMembers({ includeDeleted: false });
    const members = rawMembers.map(m => ({
      ...m,
      id: m.memberId || m.id
    }));

    if (!this.grid) return;

    // Get filter values
    const query = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';
    const status = this.filterStatus ? this.filterStatus.value : '';
    const gen = this.filterGeneration ? this.filterGeneration.value : '';
    const country = this.filterCountry ? this.filterCountry.value : '';
    const surname = this.filterSurname ? this.filterSurname.value : '';
    const occupation = this.filterOccupation ? this.filterOccupation.value : '';
    const military = this.filterMilitary ? this.filterMilitary.checked : false;

    // Filter list
    const filtered = members.filter(m => {
      // 1. Text Query Search
      if (query) {
        const matchesQuery =
          m.firstName.toLowerCase().includes(query) ||
          m.lastName.toLowerCase().includes(query) ||
          (m.nickname && m.nickname.toLowerCase().includes(query)) ||
          (m.birthPlace && m.birthPlace.toLowerCase().includes(query)) ||
          (m.career?.occupation && m.career.occupation.toLowerCase().includes(query)) ||
          (m.education?.university && m.education.university.toLowerCase().includes(query)) ||
          (m.military?.service && m.military.service.toLowerCase().includes(query)) ||
          (m.hobbies && m.hobbies.toLowerCase().includes(query)) ||
          (m.role && m.role.toLowerCase().includes(query));

        if (!matchesQuery) return false;
      }

      // 2. Status Filter
      if (status && m.status !== status) return false;

      // 3. Generation Filter
      if (gen && m.generation !== parseInt(gen)) return false;

      // 4. Country/Territory Filter
      if (country && (!m.birthPlace || !m.birthPlace.toLowerCase().includes(country.toLowerCase()))) return false;

      // 5. Surname Filter
      if (surname && (!m.lastName || !m.lastName.toLowerCase().includes(surname.toLowerCase()))) return false;

      // 6. Career Filter
      if (occupation) {
        const mOcc = m.career?.occupation ? m.career.occupation.toLowerCase() : '';
        const matchesCareer = mOcc.includes(occupation.toLowerCase());
        if (!matchesCareer) return false;
      }

      // 7. Military Service Filter
      if (military) {
        const hasService = m.military?.service && m.military.service !== "None" && m.military.service !== "";
        if (!hasService) return false;
      }

      return true;
    });

    // Update Counter
    if (this.countEl) {
      this.countEl.textContent = filtered.length;
    }

    // Render results
    if (filtered.length === 0) {
      this.grid.innerHTML = '';
      if (this.emptyState) this.emptyState.classList.remove('hidden');
      return;
    }

    if (this.emptyState) this.emptyState.classList.add('hidden');

    this.grid.innerHTML = filtered.map(m => {
      const isMale = m.gender === 'Male';
      const borderClass = isMale ? 'border-blue-500/10 hover:border-blue-500/50' : 'border-pink-500/10 hover:border-pink-500/50';
      const statusPill = m.status === 'Living'
        ? '<span class="text-[9px] font-bold bg-emerald/10 text-emerald border border-emerald/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5"><span class="w-1.5 h-1.5 bg-emerald rounded-full animate-pulse"></span> Living</span>'
        : '<span class="text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-0.5 rounded-full flex items-center gap-1.5"><span class="w-1.5 h-1.5 bg-slate-500 rounded-full"></span> Deceased</span>';

      // Add Adopted badge
      const relBadge = m.relationshipType === 'Adopted'
        ? `<span class="px-1.5 py-0.5 bg-sky-500/10 text-sky-400 text-[8px] tracking-wider uppercase font-extrabold border border-sky-500/20 rounded">Adopted</span>`
        : '';

      return `
        <div class="glass-panel p-5 rounded-3xl border-2 ${borderClass} transition-all duration-300 flex flex-col justify-between h-[235px] shadow-lg hover:scale-[1.03] group text-left">
          <div class="flex items-start gap-3.5">
            <div class="relative shrink-0">
              <img src="${m.avatar}" alt="${m.firstName}" class="w-12 h-12 rounded-2xl object-cover border-2 border-gold/25 group-hover:border-gold transition-colors shadow-inner">
              <span class="absolute -top-1 -left-1 w-4.5 h-4.5 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-[8px] text-slate-400">
                ${isMale ? '<i class="fa-solid fa-mars text-blue-400"></i>' : '<i class="fa-solid fa-venus text-pink-400"></i>'}
              </span>
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1.5 min-w-0">
                <h3 class="text-xs font-serif font-bold text-white truncate group-hover:text-gold transition-colors">${m.firstName} ${m.lastName}</h3>
                <span class="text-[10px] shrink-0" title="Flag Country">${m.countryFlag || "🇳🇬"}</span>
              </div>
              <span class="text-[10px] text-gold italic font-light truncate">"${m.nickname || 'None'}"</span>
              <span class="text-[9px] text-slate-500 font-light truncate mt-0.5 flex items-center gap-1">${m.role || 'Member'} ${relBadge}</span>
            </div>
          </div>

          <div class="flex items-center justify-between border-t border-white/5 pt-3.5 text-[10px] text-slate-400 mt-1">
            <div class="flex flex-col gap-0.5">
              <span>Born: ${m.birthDate || 'N/A'}</span>
              <span>${m.deathDate ? 'Died: ' + m.deathDate.substring(0, 4) : 'Age: ' + this.calculateAge(m.birthDate)}</span>
            </div>
            <div class="flex flex-col items-end gap-1 shrink-0">
              <span class="text-[8px] font-extrabold uppercase bg-gold/15 text-gold px-2 py-0.5 rounded border border-gold/10">Gen ${m.generation}</span>
              ${statusPill}
            </div>
          </div>

          <div class="border-t border-white/5 pt-3.5 mt-2 flex gap-2">
            <a href="member.html?id=${m.id}" class="flex-grow h-8 bg-white/5 hover:bg-gold hover:text-slate-950 font-bold text-[9px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all">
              <i class="fa-solid fa-id-card"></i> Profile Detail
            </a>
          </div>
        </div>
      `;
    }).join('');
  }

  static calculateAge(birthDate) {
    if (!birthDate) return 'N/A';
    const dob = new Date(birthDate);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  MembersDirectory.init();
});
