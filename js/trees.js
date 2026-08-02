import { DB } from './db.js';
import * as treeRepository from './repositories/treeRepository.js';
import * as familyRepository from './repositories/familyRepository.js';
import * as relationshipRepository from './repositories/relationshipRepository.js';
import { getCurrentUser } from './firebase/auth.js';
import { canEdit } from './firebase/permissions.js';

export class TreesPage {
  static async init() {
    DB.init();

    // Render tree cards and statistics
    await this.render();
  }

  static async render() {
    const grid = document.getElementById('trees-grid');
    if (!grid) return;

    try {
      // Predefined 4 static trees mapping
      const defaultTrees = [
        {
          id: "house-of-lawal",
          treeId: "house-of-lawal",
          name: "Lawal Family Tree",
          description: "The main Lawal ancestral tree, tracing the noble lineage of Alhaji Kolawole Lawal.",
          coverImage: "LawalNG1.png",
          themeColor: "gold",
          pageUrl: "tree-lawal.html"
        },
        {
          id: "grimster",
          treeId: "grimster",
          name: "Grimster Family Tree",
          description: "The Grimster family lineage from Bristol and London, UK.",
          coverImage: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80",
          themeColor: "emerald",
          pageUrl: "tree-grimster.html"
        },
        {
          id: "oluwanje",
          treeId: "oluwanje",
          name: "Oluwanje Family Tree",
          description: "The Oluwanje family ancestral lineage from Abeokuta and Lagos, Nigeria.",
          coverImage: "https://images.unsplash.com/photo-1464695115841-35f1954577df?auto=format&fit=crop&w=800&q=80",
          themeColor: "blue",
          pageUrl: "tree-oluwanje.html"
        },
        {
          id: "ogunronbi",
          treeId: "ogunronbi",
          name: "Ogunronbi Family Tree",
          description: "The Ogunronbi family ancestral lineage, holding rich cultural heritage.",
          coverImage: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80",
          themeColor: "purple",
          pageUrl: "tree-ogunronbi.html"
        }
      ];

      const [members, relationships] = await Promise.all([
        familyRepository.findAll(),
        relationshipRepository.findAll()
      ]);

      grid.innerHTML = defaultTrees.map(tree => {
        const treeId = tree.treeId || tree.id;

        // 1. Calculate stats for this specific tree
        const treeMembers = members.filter(m => {
          const tIds = m.treeIds || ["house-of-lawal"];
          return tIds.includes(treeId);
        });

        const totalMembers = treeMembers.length;

        const generations = treeMembers.map(m => m.generation || 1);
        const maxGenerations = generations.length > 0 ? Math.max(...generations) : 0;

        const livingCount = treeMembers.filter(m => m.status === 'Living' || m.living).length;
        const deceasedCount = totalMembers - livingCount;

        // Count marriages where both partners are members of the selected tree
        const treeMemberIds = new Set(treeMembers.map(m => m.memberId || m.id));
        const marriagesCount = relationships.filter(rel => {
          const type = rel.relationshipType.trim().toUpperCase();
          const isMarry = type === 'SPOUSE' || type === 'FORMER_SPOUSE';
          return isMarry && treeMemberIds.has(rel.personA) && treeMemberIds.has(rel.personB);
        }).length;

        // 2. Map theme colors to CSS classes
        let accentBorder = 'border-white/5 hover:border-gold/30';
        let accentBg = 'bg-gold/10 text-gold';
        let accentText = 'text-gold';
        let accentBtn = 'bg-gold hover:bg-gold-hover';

        if (tree.themeColor === 'emerald') {
          accentBorder = 'border-white/5 hover:border-emerald/30';
          accentBg = 'bg-emerald/10 text-emerald';
          accentText = 'text-emerald';
          accentBtn = 'bg-emerald hover:bg-emerald-hover text-slate-950';
        } else if (tree.themeColor === 'blue') {
          accentBorder = 'border-white/5 hover:border-blue-500/30';
          accentBg = 'bg-blue-500/10 text-blue-400';
          accentText = 'text-blue-400';
          accentBtn = 'bg-blue-600 hover:bg-blue-700 text-white';
        } else if (tree.themeColor === 'purple') {
          accentBorder = 'border-white/5 hover:border-purple-500/30';
          accentBg = 'bg-purple-500/10 text-purple-400';
          accentText = 'text-purple-400';
          accentBtn = 'bg-purple-600 hover:bg-purple-700 text-white';
        }

        return `
          <div class="glass-panel rounded-3xl border ${accentBorder} overflow-hidden shadow-2xl transition-all hover:scale-[1.01] duration-300 flex flex-col justify-between group" data-id="${treeId}">

            <!-- Cover image with linear cover overlay -->
            <div class="h-44 relative overflow-hidden select-none shrink-0">
              <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent z-10"></div>
              <img src="${tree.coverImage || 'LawalNG1.png'}" alt="${tree.name}" class="w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-700">
              <div class="absolute bottom-4 left-6 z-20">
                <span class="px-2.5 py-1 text-[9px] uppercase tracking-wider rounded font-extrabold ${accentBg} border border-current">${tree.themeColor || 'gold'}</span>
                <h3 class="font-serif text-lg md:text-xl font-bold text-white tracking-wide mt-2">${tree.name}</h3>
              </div>
            </div>

            <!-- Description -->
            <div class="p-6 flex-grow flex flex-col gap-4 text-left">
              <p class="text-xs text-slate-400 font-light leading-relaxed min-h-[48px]">${tree.description}</p>

              <!-- Separator line -->
              <div class="border-t border-white/5"></div>

              <!-- Quick Vitals Statistics Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div class="bg-white/5 border border-white/5 rounded-2xl p-2.5">
                  <span class="text-[9px] text-slate-500 uppercase tracking-wider font-semibold block">Members</span>
                  <span class="text-base font-serif font-bold text-white block mt-0.5">${totalMembers}</span>
                </div>
                <div class="bg-white/5 border border-white/5 rounded-2xl p-2.5">
                  <span class="text-[9px] text-slate-500 uppercase tracking-wider font-semibold block">Generations</span>
                  <span class="text-base font-serif font-bold text-white block mt-0.5">${maxGenerations}</span>
                </div>
                <div class="bg-white/5 border border-white/5 rounded-2xl p-2.5 col-span-1">
                  <span class="text-[9px] text-slate-500 uppercase tracking-wider font-semibold block">Vitals (L/D)</span>
                  <span class="text-[10px] font-bold text-white block mt-1.5">${livingCount}L / ${deceasedCount}D</span>
                </div>
                <div class="bg-white/5 border border-white/5 rounded-2xl p-2.5">
                  <span class="text-[9px] text-slate-500 uppercase tracking-wider font-semibold block">Marriages</span>
                  <span class="text-base font-serif font-bold text-white block mt-0.5">${marriagesCount}</span>
                </div>
              </div>
            </div>

            <!-- Actions block -->
            <div class="px-6 pb-6 pt-2 flex gap-3 z-10 shrink-0">
              <a href="${tree.pageUrl || 'tree.html?treeId=' + treeId}" class="flex-grow h-10 rounded-xl text-slate-950 font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors ${accentBtn}">
                Open Tree <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              </a>
            </div>

          </div>
        `;
      }).join('');

    } catch (error) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-12">
          <p class="text-xs text-red-500">Error loading family trees: ${error.message}</p>
        </div>
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  TreesPage.init();
});
