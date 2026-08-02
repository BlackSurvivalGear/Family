import { DB } from './db.js';
import * as memberService from './services/memberService.js';
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

export class MemberProfile {
  static async init() {
    DB.init();

    // Get Member ID from query string
    const urlParams = new URLSearchParams(window.location.search);
    let memberId = urlParams.get('id');

    // Default to Kolawole if none specified
    if (!memberId) {
      memberId = 'kolawole-lawal';
    }

    const member = await memberService.getMember(memberId);
    if (!member) {
      window.location.href = '404.html';
      return;
    }

    // Adapt to UI expecting '.id'
    member.id = member.memberId || member.id;

    this.currentMember = member;

    // Render components
    await this.renderBasicDetails(member);
    this.renderIdentityDetails(member);
    this.renderAcademicAndCareer(member);
    await this.renderRelationships(member);
    this.renderMilestones(member);
    this.renderAttachedMedia(member);

    // Bind action buttons
    const viewTreeBtn = document.getElementById('tree-focus-action-btn');
    if (viewTreeBtn) {
      viewTreeBtn.addEventListener('click', () => {
        const primaryTreeId = (member.treeIds && member.treeIds.length > 0) ? member.treeIds[0] : 'house-of-lawal';
        let targetPage = 'tree-lawal.html';
        if (primaryTreeId === 'grimster') targetPage = 'tree-grimster.html';
        else if (primaryTreeId === 'oluwanje') targetPage = 'tree-oluwanje.html';
        else if (primaryTreeId === 'ogunronbi') targetPage = 'tree-ogunronbi.html';

        window.location.href = `${targetPage}?treeId=${primaryTreeId}&id=${member.id}`;
      });
    }

    const editBtn = document.getElementById('edit-profile-action-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const primaryTreeId = (member.treeIds && member.treeIds.length > 0) ? member.treeIds[0] : 'house-of-lawal';
        let targetPage = 'tree-lawal.html';
        if (primaryTreeId === 'grimster') targetPage = 'tree-grimster.html';
        else if (primaryTreeId === 'oluwanje') targetPage = 'tree-oluwanje.html';
        else if (primaryTreeId === 'ogunronbi') targetPage = 'tree-ogunronbi.html';

        // Redirect to tree and open editing modal
        window.location.href = `${targetPage}?treeId=${primaryTreeId}&id=${member.id}&edit=true`;
      });
    }

    // Bind collapsible accordions
    this.bindAccordions();
  }

  static async renderBasicDetails(member) {
    const isLiving = member.status === 'Living';

    document.getElementById('m-avatar').src = member.avatar || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80";
    document.getElementById('m-fullName').textContent = `${member.firstName} ${member.lastName}`;
    document.getElementById('m-generation').textContent = `Gen ${member.generation}`;
    document.getElementById('m-role').textContent = member.role || "Family Member";
    document.getElementById('m-dob').textContent = member.birthDate || "N/A";
    document.getElementById('m-nationality').textContent = member.nationality || "Nigerian";

    const statusEl = document.getElementById('m-status');
    if (statusEl) {
      if (isLiving) {
        statusEl.innerHTML = `<span class="text-emerald">Living (${this.calculateAge(member.birthDate)} years old)</span>`;
      } else {
        const deathYear = member.deathDate ? member.deathDate.substring(0, 4) : 'N/A';
        statusEl.innerHTML = `<span class="text-slate-400">Deceased (Passed away ${deathYear})</span>`;
      }
    }

    // Adopted Badge container
    const adoptContainer = document.getElementById('adopt-badge-container');
    if (adoptContainer) {
      if (member.relationshipType === 'Adopted') {
        adoptContainer.innerHTML = `<span class="text-[10px] tracking-wider uppercase bg-sky-500/15 border border-sky-500/25 text-sky-400 px-2 py-0.5 rounded-full font-bold">Adopted</span>`;
      } else {
        adoptContainer.innerHTML = '';
      }
    }

    // Relationship summary with logged-in user
    const loggedUser = JSON.parse(localStorage.getItem('lawal_current_user'));
    if (loggedUser && (loggedUser.uid || loggedUser.id)) {
      const loggedUserMemId = loggedUser.uid || loggedUser.id;
      if (loggedUserMemId !== member.id) {
        const relation = await findRelationship(member.id, loggedUserMemId);
        if (relation && relation !== "UNRELATED") {
          const roleEl = document.getElementById('m-role');
          if (roleEl) {
            roleEl.innerHTML += ` <span class="text-gold font-normal block sm:inline sm:ml-2 border-l border-white/10 sm:pl-2"><i class="fa-solid fa-network-wired text-[10px]"></i> ${relation} to you</span>`;
          }
        }
      }
    }
  }

  static renderIdentityDetails(member) {
    document.getElementById('det-nickname').textContent = member.nickname ? `"${member.nickname}"` : "None";
    document.getElementById('det-gender').textContent = member.gender || "Male";
    document.getElementById('det-birthplace').textContent = member.birthPlace || "N/A";
    document.getElementById('det-languages').textContent = member.languages || "English";
    document.getElementById('det-hobbies').textContent = member.hobbies || "N/A";
    document.getElementById('det-books').textContent = member.books || "N/A";
    document.getElementById('det-music').textContent = member.music || "N/A";
    document.getElementById('det-travel').textContent = member.travel || "N/A";

    const mil = member.military?.service && member.military.service !== "None"
      ? `${member.military.service} (${member.military.history || 'Honored Officer'})`
      : "No military service";
    document.getElementById('det-military').textContent = mil;

    document.getElementById('det-biography').textContent = member.biography || "No family stories recorded yet.";
  }

  static renderAcademicAndCareer(member) {
    const edu = member.education
      ? `<strong>Schools:</strong> ${member.education.schools || 'N/A'}<br><br><strong>University/Further:</strong> ${member.education.university || 'N/A'}`
      : "Not documented.";
    document.getElementById('det-education').innerHTML = edu;

    const ach = member.achievements || "None recorded yet.";
    document.getElementById('det-achievements').textContent = ach;
  }

  static async renderRelationships(member) {
    const container = document.getElementById('relations-list');
    if (!container) return;

    const links = [];

    // 1. Spouses (including multi-spouses) via Relationship Engine
    const currentSpouses = await getCurrentSpouses(member.id);
    const formerSpouses = await getFormerSpouses(member.id);

    currentSpouses.forEach(s => {
      links.push({
        rel: "Spouse",
        name: `${s.firstName} ${s.lastName}`,
        id: s.memberId,
        icon: 'fa-ring text-gold'
      });
    });

    formerSpouses.forEach(s => {
      links.push({
        rel: "Former Spouse",
        name: `${s.firstName} ${s.lastName}`,
        id: s.memberId,
        icon: 'fa-ring text-gold'
      });
    });

    // 2. Parents via Relationship Engine
    const father = await getFather(member.id);
    const mother = await getMother(member.id);

    if (father) {
      links.push({
        rel: 'Father',
        name: `${father.firstName} ${father.lastName}`,
        id: father.memberId,
        icon: 'fa-user-tie text-blue-400'
      });
    }

    if (mother) {
      links.push({
        rel: 'Mother',
        name: `${mother.firstName} ${mother.lastName}`,
        id: mother.memberId,
        icon: 'fa-user text-pink-400'
      });
    }

    // 3. Children via Relationship Engine
    const children = await getChildren(member.id);
    children.forEach(c => {
      const relLabel = c.relationshipType === 'Adopted' ? "Adopted Child" : "Child";
      links.push({
        rel: relLabel,
        name: `${c.firstName} ${c.lastName}`,
        id: c.memberId,
        icon: 'fa-child-reaching text-emerald'
      });
    });

    // 4. Siblings via Relationship Engine
    const siblings = await getSiblings(member.id);
    siblings.forEach(s => {
      // Check if full sibling or half sibling
      const isFullSibling = (member.fatherId && s.fatherId === member.fatherId) && (member.motherId && s.motherId === member.motherId);
      const relLabel = isFullSibling ? 'Sibling' : 'Half-Sibling';
      links.push({
        rel: relLabel,
        name: `${s.firstName} ${s.lastName}`,
        id: s.memberId,
        icon: 'fa-user-group text-slate-400'
      });
    });

    if (links.length === 0) {
      container.innerHTML = '<span class="text-xs text-slate-500 italic font-light">No direct records connected.</span>';
      return;
    }

    container.innerHTML = links.map(lnk => {
      return `
        <a href="member.html?id=${lnk.id}" class="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-white/5 border border-white/5 hover:border-gold/20 transition-all">
          <div class="flex items-center gap-3">
            <i class="fa-solid ${lnk.icon} text-xs w-4"></i>
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-white">${lnk.name}</span>
              <span class="text-[9px] text-slate-500 uppercase font-bold tracking-wider">${lnk.rel}</span>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right text-[9px] text-slate-600"></i>
        </a>
      `;
    }).join('');
  }

  static renderMilestones(member) {
    const container = document.getElementById('milestones-timeline');
    if (!container) return;

    const timeline = member.timeline || [];
    if (timeline.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-500 italic font-light">No milestones recorded for this relative yet.</p>';
      return;
    }

    container.innerHTML = timeline.map((evt, idx) => {
      return `
        <div class="flex gap-4 items-start text-left relative">
          <!-- Timeline stem line link -->
          ${idx < timeline.length - 1 ? '<div class="absolute left-[11px] top-7 bottom-0 w-[1px] bg-white/5"></div>' : ''}

          <div class="w-6 h-6 rounded-full bg-slate-950 border border-gold/30 flex items-center justify-center text-[10px] text-gold shrink-0 z-10 font-bold">
            •
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs font-bold text-white font-serif tracking-wide">${evt.year} — ${evt.title}</span>
            <p class="text-xs text-slate-400 font-light leading-relaxed">${evt.description}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  static renderAttachedMedia(member) {
    const container = document.getElementById('media-vault-grid');
    if (!container) return;

    // Filter documents matching first name
    const allDocs = DB.getDocuments();
    const matchedDocs = allDocs.filter(d => d.title.toLowerCase().includes(member.firstName.toLowerCase()));

    const baseMedia = [
      { title: `${member.firstName} Portrait (Archival JPG)`, type: 'Image', icon: 'fa-image text-blue-400', size: '1.2 MB' },
      { title: `${member.firstName} Oral History (Voice Recording)`, type: 'Audio', icon: 'fa-microphone text-pink-400', size: '14.5 MB' }
    ];

    const finalDocs = [
      ...baseMedia,
      ...matchedDocs.map(d => ({ title: d.title, type: 'PDF Document', icon: 'fa-file-pdf text-red-400', size: d.size }))
    ];

    container.innerHTML = finalDocs.map(item => {
      return `
        <div class="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between hover:border-gold/20 hover:bg-slate-900 transition-all text-left w-full">
          <div class="flex items-center gap-3 min-w-0">
            <i class="fa-solid ${item.icon} text-sm shrink-0"></i>
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-semibold text-white truncate" title="${item.title}">${item.title}</span>
              <span class="text-[9px] text-slate-500 mt-0.5">${item.type} • ${item.size}</span>
            </div>
          </div>
          <a href="documents.html" class="w-7 h-7 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg flex items-center justify-center transition-colors shrink-0">
            <i class="fa-solid fa-download text-[10px]"></i>
          </a>
        </div>
      `;
    }).join('');
  }

  // Interactive Premium Accordion functionality
  static bindAccordions() {
    const headers = document.querySelectorAll('.accordion-header');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const targetId = header.getAttribute('data-target');
        const content = document.getElementById(targetId);
        const icon = header.querySelector('.fa-chevron-up, .fa-chevron-down');

        if (!content) return;

        // Toggle collapsible view
        const isHidden = content.style.maxHeight === '0px';

        if (isHidden) {
          content.style.maxHeight = `${content.scrollHeight + 40}px`;
          content.style.opacity = '1.0';
          if (icon) {
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
          }
        } else {
          content.style.maxHeight = '0px';
          content.style.opacity = '0';
          if (icon) {
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
          }
        }
      });
    });

    // Initialize all as open, by calculating height initially
    setTimeout(() => {
      headers.forEach(header => {
        const targetId = header.getAttribute('data-target');
        const content = document.getElementById(targetId);
        if (content) {
          content.style.maxHeight = `${content.scrollHeight + 40}px`;
          content.style.opacity = '1.0';
          content.style.transition = 'max-height 0.3s ease-out, opacity 0.3s ease-out';
        }
      });
    }, 100);
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
  MemberProfile.init();
});
