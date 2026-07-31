import { DB } from './db.js';

export class MemberProfile {
  static init() {
    DB.init();

    // Get Member ID from query string
    const urlParams = new URLSearchParams(window.location.search);
    let memberId = urlParams.get('id');

    // Default to Kolawole if none specified
    if (!memberId) {
      memberId = 'kolawole-lawal';
    }

    const member = DB.getMember(memberId);
    if (!member) {
      window.location.href = '404.html';
      return;
    }

    this.currentMember = member;

    // Render components
    this.renderBasicDetails(member);
    this.renderIdentityDetails(member);
    this.renderAcademicAndCareer(member);
    this.renderRelationships(member);
    this.renderMilestones(member);
    this.renderAttachedMedia(member);

    // Bind action buttons
    const viewTreeBtn = document.getElementById('tree-focus-action-btn');
    if (viewTreeBtn) {
      viewTreeBtn.addEventListener('click', () => {
        window.location.href = `tree.html?id=${member.id}`;
      });
    }

    const editBtn = document.getElementById('edit-profile-action-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        // Redirect to tree and open editing modal
        window.location.href = `tree.html?id=${member.id}&edit=true`;
      });
    }
  }

  static renderBasicDetails(member) {
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

  static renderRelationships(member) {
    const container = document.getElementById('relations-list');
    if (!container) return;

    const allMembers = DB.getMembers();
    const links = [];

    // 1. Spouses
    if (member.spouseId) {
      const spouse = allMembers.find(m => m.id === member.spouseId);
      if (spouse) {
        links.push({ rel: 'Spouse', name: `${spouse.firstName} ${spouse.lastName}`, id: spouse.id, icon: 'fa-ring text-gold' });
      }
    }

    // 2. Parents
    if (member.fatherId) {
      const father = allMembers.find(m => m.id === member.fatherId);
      if (father) {
        links.push({ rel: 'Father', name: `${father.firstName} ${father.lastName}`, id: father.id, icon: 'fa-user-tie text-blue-400' });
      }
    }
    if (member.motherId) {
      const mother = allMembers.find(m => m.id === member.motherId);
      if (mother) {
        links.push({ rel: 'Mother', name: `${mother.firstName} ${mother.lastName}`, id: mother.id, icon: 'fa-user text-pink-400' });
      }
    }

    // 3. Children
    const children = allMembers.filter(m => m.fatherId === member.id || m.motherId === member.id);
    children.forEach(c => {
      links.push({ rel: 'Child', name: `${c.firstName} ${c.lastName}`, id: c.id, icon: 'fa-child-reaching text-emerald' });
    });

    // 4. Siblings
    if (member.fatherId || member.motherId) {
      const siblings = allMembers.filter(m =>
        m.id !== member.id &&
        ((member.fatherId && m.fatherId === member.fatherId) || (member.motherId && m.motherId === member.motherId))
      );
      siblings.forEach(s => {
        links.push({ rel: 'Sibling', name: `${s.firstName} ${s.lastName}`, id: s.id, icon: 'fa-user-group text-slate-400' });
      });
    }

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
        <div class="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between hover:border-gold/20 hover:bg-slate-900 transition-all text-left">
          <div class="flex items-center gap-3 min-w-0">
            <i class="fa-solid ${item.icon} text-sm shrink-0"></i>
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-semibold text-white truncate">${item.title}</span>
              <span class="text-[9px] text-slate-500 mt-0.5">${item.type} • ${item.size}</span>
            </div>
          </div>
          <a href="documents.html" class="w-7 h-7 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg flex items-center justify-center transition-colors">
            <i class="fa-solid fa-download text-[10px]"></i>
          </a>
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
  MemberProfile.init();
});
