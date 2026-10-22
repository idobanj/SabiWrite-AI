import { getAvatar } from "../lib/avatars";

/** Original, shared vector portraits. No uploads or remote image requests. */
export function UserAvatar({ avatarId, className = "w-10 h-10", label }) {
  // While the profile is still loading, avatarId is undefined.
  // Render a neutral placeholder so the avatar doesn't flash to the
  // first avatar (id 0) before the real saved choice arrives.
  if (avatarId === undefined || avatarId === null) {
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`rounded-full flex-shrink-0 ${className}`}
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="60" cy="60" r="60" fill="#1e293b" />
        <circle cx="60" cy="48" r="18" fill="#334155" />
        <ellipse cx="60" cy="105" rx="30" ry="22" fill="#334155" />
      </svg>
    );
  }

  const avatar = getAvatar(avatarId);
  const { id, background, skin, shade, hair, shirt } = avatar;

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`rounded-full flex-shrink-0 ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <circle cx="60" cy="60" r="60" fill={background} />
      <circle cx="97" cy="28" r="13" fill="white" opacity=".28" />
      <path d="M0 93C29 72 87 120 120 76V120H0Z" fill="white" opacity=".18" />

      {/* Hair behind the face gives each character a distinct silhouette. */}
      {id === 0 && <path d="M28 68C19 54 24 23 42 21C50 8 74 13 83 25C99 29 99 56 91 76L78 87H40Z" fill={hair} />}
      {id === 1 && <path d="M32 49C28 27 43 18 60 20C77 14 91 31 86 50L79 60H37Z" fill={hair} />}
      {id === 2 && <>
        <circle cx="34" cy="31" r="16" fill={hair} />
        <circle cx="85" cy="31" r="16" fill={hair} />
        <path d="M29 59V43C29 23 46 18 60 18C78 18 91 29 91 48V63L81 78H39Z" fill={hair} />
      </>}
      {id === 3 && <path d="M30 54C23 35 35 18 55 19C67 10 95 24 89 48L83 62H35Z" fill={hair} />}
      {id === 4 && <>
        <path d="M34 51C25 28 42 18 61 20C85 16 94 33 86 56L84 95H31Z" fill={hair} />
        <path d="M77 23C96 12 108 27 100 42L86 63L80 47Z" fill={hair} />
      </>}

      <path d="M13 120C16 97 31 88 47 86H73C91 88 105 100 108 120Z" fill={shirt} />
      <path d="M51 75H69V91C64 99 55 99 51 91Z" fill={skin} />
      <path d="M51 76H69V84C62 90 55 87 51 84Z" fill={shade} opacity=".65" />
      <path d="M46 88L59 101L72 88L80 91L69 110L60 104L51 110L40 91Z" fill="white" opacity=".9" />
      <ellipse cx="35" cy="57" rx="6" ry="8" fill={skin} />
      <ellipse cx="85" cy="57" rx="6" ry="8" fill={skin} />
      <path d="M35 43C35 27 85 27 85 43V59C85 77 74 86 60 86C46 86 35 76 35 59Z" fill={skin} />
      <path d="M81 47V61C81 75 71 82 60 82C51 82 43 77 39 70C43 80 50 86 60 86C75 86 85 76 85 59V47Z" fill={shade} opacity=".25" />

      {/* The five hairstyles are drawn separately, rather than recoloring one face. */}
      {id === 0 && <>
        <path d="M33 48C31 35 35 24 48 23C58 15 79 23 85 34L85 49C76 42 69 39 64 31C58 42 43 44 33 48Z" fill={hair} />
        <circle cx="34" cy="32" r="9" fill={hair} /><circle cx="48" cy="24" r="10" fill={hair} />
        <circle cx="66" cy="24" r="10" fill={hair} /><circle cx="81" cy="34" r="10" fill={hair} />
      </>}
      {id === 1 && <path d="M33 47C28 33 39 24 50 25C61 13 81 23 87 33L83 48C73 42 61 41 53 33C48 40 41 44 33 47Z" fill={hair} />}
      {id === 2 && <>
        <path d="M33 48C31 31 46 24 60 24C76 24 88 32 87 48C77 42 70 38 61 31C53 41 41 44 33 48Z" fill={hair} />
        <path d="M42 27L38 38M51 24L47 35M68 25L74 36M78 30L83 39" stroke="#51404A" strokeWidth="2" strokeLinecap="round" />
      </>}
      {id === 3 && <path d="M31 48L33 29L46 29L51 19L63 25L76 21L87 34L84 48C71 43 59 39 52 33C46 42 39 45 31 48Z" fill={hair} />}
      {id === 4 && <path d="M33 49C30 33 43 23 57 25C73 19 89 32 86 48L78 44C72 40 68 35 65 31C56 43 46 48 33 49Z" fill={hair} />}

      <path d="M44 51C47 49 51 49 54 51M67 51C70 49 74 49 77 51" stroke={hair} strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="49" cy="57" rx="2.3" ry="3.1" fill="#282330" />
      <ellipse cx="72" cy="57" rx="2.3" ry="3.1" fill="#282330" />
      <circle cx="49.6" cy="56" r=".8" fill="white" /><circle cx="72.6" cy="56" r=".8" fill="white" />
      <path d="M60 58L58 65H62" stroke={shade} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="43" cy="65" rx="5" ry="2.5" fill="#F18184" opacity=".25" />
      <ellipse cx="78" cy="65" rx="5" ry="2.5" fill="#F18184" opacity=".25" />
      <path d="M52 71C56 77 65 77 69 71" fill="white" />
      <path d="M52 71C56 76 65 76 69 71" stroke={shade} strokeWidth="1.4" strokeLinecap="round" />

      {(id === 1 || id === 4) && <g stroke={hair} strokeWidth="2.2">
        <rect x="39" y="51" width="18" height="14" rx={id === 1 ? "6" : "4"} />
        <rect x="64" y="51" width="18" height="14" rx={id === 1 ? "6" : "4"} />
        <path d="M57 56C59 54 62 54 64 56M35 54L39 55M82 55L86 54" />
      </g>}
      {(id === 0 || id === 2) && <>
        <circle cx="35" cy="68" r="3.8" stroke="#EDBC69" strokeWidth="2.3" />
        <circle cx="85" cy="68" r="3.8" stroke="#EDBC69" strokeWidth="2.3" />
      </>}
      {id === 3 && <path d="M60 104V119" stroke="white" strokeWidth="2" opacity=".6" />}
    </svg>
  );
}
