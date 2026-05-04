/**
 * Shared SVG icon library — all icons use currentColor and accept a className prop.
 * Baseball-specific icons are hand-crafted; UI icons match standard design conventions.
 */

const ico = (content, viewBox = '0 0 24 24') =>
  ({ className = 'w-5 h-5' }) => (
    <svg className={className} viewBox={viewBox} fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {content}
    </svg>
  );

// ── Baseball ────────────────────────────────────────────────────────────────

export const IcoBaseball = ico(<>
  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
  <path d="M6.5 6.5 C8 9 8 15 6.5 17.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
  <path d="M17.5 6.5 C16 9 16 15 17.5 17.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
  <path d="M7 9.5 C9 9 15 9 17 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
  <path d="M7 14.5 C9 15 15 15 17 14.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
</>);

export const IcoBat = ico(<>
  {/* barrel */}
  <path d="M4 20 L16.5 7.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
  {/* handle taper */}
  <path d="M16.5 7.5 L19.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  {/* knob */}
  <circle cx="20.5" cy="4.5" r="1.5" fill="currentColor" />
</>);

export const IcoHomePlate = ico(<>
  <path d="M4 5 H20 V14 L12 20 L4 14 Z"
    stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
</>);

export const IcoDiamond = ico(<>
  <path d="M12 3 L21 12 L12 21 L3 12 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
  <circle cx="12" cy="3"  r="1.5" fill="currentColor" />
  <circle cx="21" cy="12" r="1.5" fill="currentColor" />
  <circle cx="12" cy="21" r="1.5" fill="currentColor" />
  <circle cx="3"  cy="12" r="1.5" fill="currentColor" />
</>);

export const IcoRunner = ico(<>
  <circle cx="14.5" cy="3.5" r="2" fill="currentColor" />
  <path d="M13 6.5 L10 13 L7 18 L9.5 18.5 L12 14 L14 16.5 L16.5 20 L19 19 L16 14.5 L16.5 10 L19 8 L17.5 6 L13.5 8 Z"
    fill="currentColor" />
</>);

export const IcoFourBalls = ico(<>
  <circle cx="6.5"  cy="6.5"  r="3.5" stroke="currentColor" strokeWidth="1.5" />
  <circle cx="17.5" cy="6.5"  r="3.5" stroke="currentColor" strokeWidth="1.5" />
  <circle cx="6.5"  cy="17.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
  <circle cx="17.5" cy="17.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
</>);

export const IcoBatContact = ico(<>
  <path d="M3 21 L17 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  <path d="M17 7 L19.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  <circle cx="20.5" cy="4.5" r="1.5" fill="currentColor" />
  <path d="M17 3 L19 1"  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  <path d="M20 6 L22 5"  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  <path d="M21 9 L23 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
</>);

export const IcoBases = ico(<>
  <rect x="3"  y="15" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
  <rect x="10" y="10" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
  <rect x="17" y="5"  width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
  <path d="M8 17.5 L10 12.5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5" strokeLinecap="round" />
  <path d="M15 12.5 L17 7.5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5" strokeLinecap="round" />
</>);

export const IcoSteal = ico(<>
  <circle cx="17" cy="3.5" r="2" fill="currentColor" />
  <path d="M15.5 6.5 L13 12 L10 11 L7.5 13 L9.5 14 L12 12.5 L14.5 15 L13 19 L15.5 19.5 L17.5 15 L20 11 L18 8 Z"
    fill="currentColor" />
  <path d="M2 9.5 H7"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  <path d="M3 12.5 H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  <path d="M4 15.5 H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
</>);

export const IcoFlame = ico(<>
  <path d="M12 2 C12 2 7 8 7 13 C7 16.3 9.4 19 12 19 C9 19 8 17 8 15.5 C8 13 10 11 10 11 C10 13 11 14 12 14 C13 14 14 13 14 11.5 C14 10 13 8.5 13 8.5 C15 9.5 17 12 17 15 C17 17.8 14.8 20 12 20 C16.4 20 20 16.4 20 12 C20 7 15 3 12 2 Z"
    fill="currentColor" />
</>);

export const IcoStrikeout = ico(<>
  <path d="M6 4 V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  <path d="M6 12 L18 4"  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  <path d="M6 12 L18 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
</>);

export const IcoPitcher = ico(<>
  {/* head */}
  <circle cx="12" cy="4" r="2.2" fill="currentColor" />
  {/* body winding up */}
  <path d="M12 6.5 L10 11 L7 9 L5.5 11 L9 13 L8 18 L12 18.5 L13 14 L16 16 L18 14 L15 11.5 L14 6.5 Z"
    fill="currentColor" />
  {/* ball in hand */}
  <circle cx="19" cy="13" r="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
  <path d="M18 12.2 C18.5 13 19.5 13 20 12.2" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" fill="none" />
</>);

// ── General UI ───────────────────────────────────────────────────────────────

export const IcoSearch = ico(<>
  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
  <path d="M16.5 16.5 L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
</>);

export const IcoPencil = ico(<>
  <path d="M17 3 L21 7 L8 20 L3 21 L4 16 Z"
    stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
  <path d="M15 5 L19 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
</>);

export const IcoTrash = ico(<>
  <path d="M3 6 H21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  <path d="M8 6 V4 H16 V6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill="none" />
  <path d="M5 6 L6 20 H18 L19 6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
  <path d="M10 10 V17 M14 10 V17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
</>);

export const IcoStar = ({ className = 'w-5 h-5', filled = false }) => (
  <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2 L14.9 8.6 L22 9.5 L17 14.3 L18.2 21.5 L12 18.2 L5.8 21.5 L7 14.3 L2 9.5 L9.1 8.6 Z" />
  </svg>
);

export const IcoLock = ico(<>
  <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" fill="none" />
  <path d="M8 11 V7 A4 4 0 0 1 16 7 V11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none" />
  <circle cx="12" cy="16" r="1.5" fill="currentColor" />
</>);

export const IcoSettings = ico(<>
  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
  <path d="M12 2 V4 M12 20 V22 M2 12 H4 M20 12 H22 M5.6 5.6 L7 7 M17 17 L18.4 18.4 M18.4 5.6 L17 7 M7 17 L5.6 18.4"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
</>);

export const IcoCamera = ico(<>
  <path d="M23 19 A2 2 0 0 1 21 21 H3 A2 2 0 0 1 1 19 V9 A2 2 0 0 1 3 7 H7 L9 4 H15 L17 7 H21 A2 2 0 0 1 23 9 Z"
    stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
  <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.5" />
</>);

export const IcoFileText = ico(<>
  <path d="M14 2 H6 A2 2 0 0 0 4 4 V20 A2 2 0 0 0 6 22 H18 A2 2 0 0 0 20 20 V8 Z"
    stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
  <path d="M14 2 V8 H20" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
  <path d="M8 13 H16 M8 17 H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
</>);

export const IcoSmartphone = ico(<>
  <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
  <path d="M10 18 H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
</>);

export const IcoBarChart = ico(<>
  <path d="M3 20 H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  <rect x="4"  y="10" width="4" height="10" rx="0.5" fill="currentColor" />
  <rect x="10" y="5"  width="4" height="15" rx="0.5" fill="currentColor" />
  <rect x="16" y="13" width="4" height="7"  rx="0.5" fill="currentColor" />
</>);

export const IcoBookOpen = ico(<>
  <path d="M12 6 C10 4.5 6 4 3 5 V19 C6 18 10 18.5 12 20 C14 18.5 18 18 21 19 V5 C18 4 14 4.5 12 6 Z"
    stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
  <path d="M12 6 V20" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 2" />
</>);

export const IcoCelebrate = ico(<>
  {/* party horn */}
  <path d="M19 5 L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  <path d="M7 17 L3 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  <path d="M3 17 L7 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  {/* confetti */}
  <circle cx="10" cy="6"  r="1" fill="currentColor" />
  <circle cx="18" cy="14" r="1" fill="currentColor" />
  <circle cx="14" cy="4"  r="1" fill="currentColor" />
  <circle cx="20" cy="9"  r="1" fill="currentColor" />
  <path d="M7 10 L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  <path d="M15 17 L16 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  {/* horn shape */}
  <path d="M15 9 L19 5 L20 8 L17 7 Z" fill="currentColor" />
</>);

export const IcoUser = ico(<>
  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.7" fill="none" />
  <path d="M3 21 C3 17.1 7.1 14 12 14 C16.9 14 21 17.1 21 21"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none" />
</>);

export const IcoStadium = ico(<>
  {/* outfield arc */}
  <path d="M3 18 C3 10 8 4 12 4 C16 4 21 10 21 18"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
  {/* foul lines */}
  <path d="M3 18 L12 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  <path d="M21 18 L12 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  {/* infield diamond */}
  <path d="M12 10 L15 13.5 L12 17 L9 13.5 Z"
    stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
  {/* base path */}
  <path d="M3 18 H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
</>);

export const IcoJersey = ico(<>
  <path d="M7 3 L3 7 L6 9 L6 21 H18 V9 L21 7 L17 3 C16 5 13.5 6 12 6 C10.5 6 8 5 7 3 Z"
    stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
</>);

export const IcoSprayChart = ico(<>
  {/* outfield arc */}
  <path d="M4 20 C4 10 8 3 12 3 C16 3 20 10 20 20"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  <path d="M4 20 H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  {/* hit dots */}
  <circle cx="9"  cy="12" r="1.2" fill="currentColor" />
  <circle cx="14" cy="9"  r="1.2" fill="currentColor" />
  <circle cx="17" cy="13" r="1.2" fill="currentColor" />
  <circle cx="11" cy="7"  r="1.2" fill="currentColor" />
</>);

export const IcoImport = ico(<>
  <path d="M21 15 V19 A2 2 0 0 1 19 21 H5 A2 2 0 0 1 3 19 V15"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none" />
  <path d="M12 3 V15 M7 10 L12 15 L17 10"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
</>);
