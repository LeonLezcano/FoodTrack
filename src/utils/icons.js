/**
 * FoodTrack Inline SVG Icon Registry
 * Consistent 2px stroke industrial icon primitives without emojis.
 */

const ICONS = {
  brand: '<path d="M4 11h16v3a8 8 0 0 1-16 0v-3z" /><path d="M7 7h10" /><path d="M6 21h12" />',
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />',
  totem: '<rect x="5" y="2" width="14" height="20" rx="2" /><line x1="9" y1="6" x2="15" y2="6" /><line x1="9" y1="10" x2="15" y2="10" /><line x1="12" y1="16" x2="12.01" y2="16" />',
  production: '<path d="M3 13h18" /><path d="M5 13v3a7 7 0 0 0 14 0v-3" /><path d="M9 5v3" /><path d="M12 4v4" /><path d="M15 5v3" />',
  employees: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />',
  haccp: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z" />',
  billing: '<rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />',
  sun: '<circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />',
  check: '<circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />',
  ban: '<circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />',
  close: '<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />',
  trash: '<polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />',
  plus: '<line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />'
};

export function iconSvg(name, className = 'w-4 h-4 shrink-0') {
  const paths = ICONS[name] || ICONS.check;
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}
