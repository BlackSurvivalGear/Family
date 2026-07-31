import { DB } from './db.js';

export class EventsCalendar {
  static init() {
    DB.init();

    // Default to November 2024 for demonstration matching our seeded birthday
    this.currentDate = new Date(2024, 10, 1); // Month 10 represents November (0-indexed)

    // Bind DOM
    this.monthYearTitle = document.getElementById('calendar-month-year');
    this.daysGrid = document.getElementById('calendar-days-grid');
    this.agendaList = document.getElementById('agenda-list');

    this.prevBtn = document.getElementById('prev-month-btn');
    this.nextBtn = document.getElementById('next-month-btn');
    this.todayBtn = document.getElementById('today-btn');
    this.addEventBtn = document.getElementById('add-event-trigger-btn');

    this.render();
    this.bindControls();
  }

  static render() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // Set Month Year Title
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    if (this.monthYearTitle) {
      this.monthYearTitle.textContent = `${monthNames[month]} ${year}`;
    }

    this.renderDays(year, month);
    this.renderAgenda();
  }

  static renderDays(year, month) {
    if (!this.daysGrid) return;

    this.daysGrid.innerHTML = '';

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevLastDay = new Date(year, month, 0).getDate();

    const events = DB.getEvents();

    let daysHtml = '';

    // Previous month empty buffer spaces
    for (let i = firstDayIndex; i > 0; i--) {
      const prevNum = prevLastDay - i + 1;
      daysHtml += `
        <div class="h-20 p-1.5 rounded-xl bg-slate-900/10 text-slate-700 text-[10px] text-right font-light pointer-events-none">
          ${prevNum}
        </div>
      `;
    }

    // Current month active days
    const today = new Date();
    for (let day = 1; day <= lastDay; day++) {
      const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.date === formattedDate);

      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
      const todayClass = isToday ? 'border-gold bg-gold/5' : 'border-white/5 bg-slate-900/40 hover:bg-white/5';

      let eventsHtml = '';
      dayEvents.forEach(e => {
        let categoryColor = 'bg-gold/15 text-gold border-gold/20';
        if (e.category === 'Birthdays') categoryColor = 'bg-emerald/15 text-emerald border-emerald/20';
        if (e.category === 'Anniversaries') categoryColor = 'bg-pink-500/15 text-pink-400 border-pink-500/20';

        eventsHtml += `
          <div class="text-[8px] truncate px-1 py-0.5 rounded border ${categoryColor} mt-1 font-semibold" title="${e.title}">
            ${e.title}
          </div>
        `;
      });

      daysHtml += `
        <div class="h-20 p-2 rounded-xl border flex flex-col justify-between text-right cursor-pointer transition-colors ${todayClass}">
          <span class="text-[10px] font-bold text-slate-400 block">${day}</span>
          <div class="flex flex-col gap-0.5 w-full mt-1 overflow-y-auto">
            ${eventsHtml}
          </div>
        </div>
      `;
    }

    this.daysGrid.innerHTML = daysHtml;
  }

  static renderAgenda() {
    if (!this.agendaList) return;

    const events = DB.getEvents();
    // Sort upcoming first
    events.sort((a,b) => new Date(a.date) - new Date(b.date));

    if (events.length === 0) {
      this.agendaList.innerHTML = '<span class="text-xs text-slate-500 italic">No scheduled events listed.</span>';
      return;
    }

    this.agendaList.innerHTML = events.map(evt => {
      const isBirthday = evt.category === 'Birthdays';
      const isAnniversary = evt.category === 'Anniversaries';
      let icon = 'fa-calendar text-gold';
      if (isBirthday) icon = 'fa-cake-candles text-emerald';
      if (isAnniversary) icon = 'fa-ring text-pink-400';

      return `
        <div class="p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-gold/25 transition-all text-left">
          <div class="flex gap-3 items-start">
            <div class="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center shrink-0">
              <i class="fa-solid ${icon} text-sm"></i>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-semibold text-white truncate" title="${evt.title}">${evt.title}</span>
              <span class="text-[10px] text-slate-400 font-light mt-0.5">${evt.date} • ${evt.time || 'All day'}</span>
              <p class="text-[10px] text-slate-500 mt-1 leading-normal font-light truncate" title="${evt.description}">${evt.description}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  static bindControls() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
      });
    }

    if (this.todayBtn) {
      this.todayBtn.addEventListener('click', () => {
        this.currentDate = new Date();
        this.render();
      });
    }

    if (this.addEventBtn) {
      this.addEventBtn.addEventListener('click', () => {
        const title = prompt("Enter Event Title:", "Family Reunion Lagos");
        const category = prompt("Enter Category (Birthdays, Anniversaries, Reunions, Meetings):", "Reunions");
        const date = prompt("Enter Date (YYYY-MM-DD):", "2024-11-20");
        const time = prompt("Enter Time (HH:MM):", "12:00");
        const description = prompt("Enter description:", "Gathering of all descendants.");

        if (title && category && date && description) {
          DB.addEvent({
            title,
            category,
            date,
            time,
            description
          });
          this.render();
        }
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  EventsCalendar.init();
});
