import { DB } from './db.js';

export class EventsCalendar {
  static init() {
    DB.init();
    this.renderCalendar();
    this.renderOccurrences();

    // Bind Add Event simulation trigger
    const addBtn = document.getElementById('add-event-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const title = prompt("Enter Event Title:", "Graduation Dinner - Amina");
        const date = prompt("Enter Event Date (YYYY-MM-DD):", "2024-07-15");
        const category = prompt("Enter Category (Birthdays, Anniversaries, Reunions, Meetings):", "Meetings");
        const description = prompt("Enter Description:", "Celebrating Amina's educational achievements in London.");

        if (title && date && category && description) {
          DB.addEvent({
            title,
            date,
            category,
            description,
            time: "18:30"
          });
          this.renderCalendar();
          this.renderOccurrences();
        }
      });
    }
  }

  static renderCalendar() {
    const block = document.getElementById('calendar-grid-block');
    if (!block) return;

    const events = DB.getEvents();

    // Render a high-quality summary representation of months containing events
    const months = [
      { name: "January", index: "01" },
      { name: "May", index: "05" },
      { name: "September", index: "09" },
      { name: "October", index: "10" },
      { name: "November", index: "11" },
      { name: "December", index: "12" }
    ];

    block.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        ${months.map(m => {
          // Find events in this month
          const monthEvents = events.filter(e => e.date.substring(5, 7) === m.index);
          const dotsHtml = monthEvents.map(me => {
            let color = "bg-gold";
            if (me.category === "Birthdays") color = "bg-blue-500";
            if (me.category === "Reunions") color = "bg-emerald";
            if (me.category === "Anniversaries") color = "bg-pink-500";
            return `
              <div class="flex gap-2 items-center text-[10px] text-slate-300 border-b border-white/5 py-1 last:border-none">
                <span class="w-1.5 h-1.5 rounded-full ${color} shrink-0"></span>
                <span class="truncate font-light" title="${me.title}">${me.title} (${me.date.substring(8)})</span>
              </div>
            `;
          }).join('');

          return `
            <div class="bg-slate-900 border border-white/5 p-4 rounded-xl flex flex-col gap-3">
              <span class="text-xs font-serif font-bold text-white tracking-wide border-b border-white/5 pb-2 block">${m.name} 2024</span>
              <div class="flex flex-col gap-1.5">
                ${dotsHtml || '<span class="text-[10px] text-slate-600 italic">No scheduled occurrences</span>'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  static renderOccurrences() {
    const feed = document.getElementById('calendar-occurrences-feed');
    if (!feed) return;

    const events = DB.getEvents();
    if (events.length === 0) {
      feed.innerHTML = '<span class="text-xs text-slate-500 italic">No events mapped.</span>';
      return;
    }

    feed.innerHTML = events.slice(0, 5).map(evt => {
      let icon = "fa-cake-candles text-blue-400 bg-blue-500/10";
      if (evt.category === "Reunions") icon = "fa-handshake text-emerald bg-emerald/10";
      if (evt.category === "Anniversaries") icon = "fa-ring text-pink-500 bg-pink-500/10";
      if (evt.category === "Meetings") icon = "fa-bullhorn text-gold bg-gold/10";

      return `
        <div class="flex gap-3 items-start border-b border-white/5 pb-3 last:border-none text-left">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${icon} text-xs">
            <i class="fa-solid"></i>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-semibold text-white truncate">${evt.title}</span>
            <span class="text-[10px] text-slate-400 mt-0.5 leading-relaxed truncate" title="${evt.description}">${evt.description}</span>
            <span class="text-[9px] text-slate-500 font-light mt-1">${evt.date} • ${evt.time || 'All Day'}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  EventsCalendar.init();
});
