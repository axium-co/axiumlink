/* Fixtures de configuração usados pelos testes headless de independência.
   Espelham o JSONB `config` real de `public.clients`.
   LEGACY_CONFIG: schema antigo — personalização GLOBAL/compartilhada,
   sem design.profile.elem (precisa migrar para os elementos separados).
   NEW_CONFIG:     schema alvo — element.name/bio/address/avatar completos. */

export const LEGACY_CONFIG = {
  profile: {
    displayName: 'Maria Silva',
    bio: 'Designer & fotógrafa',
    address: 'São Paulo, SP',
    avatar: '',
    verified: false
  },
  banner: '',
  links: [],
  style: {
    theme: 'indigo',
    pageBgColor: '#11111f',
    pageTextColor: '#f8fafc',
    btnBgColor: '',
    btnTextColor: '',
    font: 'Poppins',
    titleFont: 'Syne',
    titleSize: 24,
    bioSize: 16,
    fontWeight: 900,
    letterSpacing: 0.5,
    lineHeight: 1.2,
    typoName: { font: 'Syne', size: 26, weight: 800, ls: 1, lh: 1.3 },
    typoBio: { font: 'Lora', size: 15, weight: 500, ls: 0, lh: 1.6 },
    blockGap: 12,
    textGlass: { enabled: true, blur: 18, saturate: 160, opacity: 22, color: '#ffffff', borderGlow: 60, shadowDepth: 25, highlight: true, noise: false },
    nameGlass: { enabled: true, blur: 12, saturate: 150, opacity: 28, color: '#123456', borderGlow: 55, shadowDepth: 30, highlight: false, noise: true },
    bioGlass: { enabled: true, blur: 20, saturate: 180, opacity: 15, color: '#ffffff', borderGlow: 40, shadowDepth: 18, highlight: true, noise: false }
  },
  design: {
    banner: { enabled: false },
    profile: {
      radius: { tl: 26, tr: 26, br: 26, bl: 26 },
      shape: 'rounded',
      borderOn: true,
      borderStyle: 'solid',
      borderColor: '#ffcc00',
      borderWidth: 5,
      size: 112,
      shadowOn: true,
      shadowX: 0,
      shadowY: 10,
      shadowBlur: 28,
      shadowSpread: -6,
      shadowColor: '#000000',
      shadowAlpha: 45,
      addrShow: true,
      address: { style: 'pill', bg: '#0c0e16', color: '#fbbf24', showIcon: true },
      text: {
        name: { color: '#dc2626', align: 'right' },
        bio: { color: '#334155', align: 'left', weight: 400 },
        address: {
          align: 'center',
          blockRadius: '20px',
          blockBg: '#1e293b',
          blockBorderColor: '#ffffff',
          blockBorderWidth: 2,
          blockFont: 'Montserrat',
          color: '#ffffff',
          size: 13,
          weight: 700
        }
      }
    }
  }
};

export const NEW_CONFIG = {
  profile: {
    displayName: 'Maria Silva',
    bio: 'Designer & fotógrafa',
    address: 'São Paulo, SP',
    avatar: '',
    verified: false
  },
  banner: '',
  links: [],
  style: {
    theme: 'indigo',
    pageBgColor: '#11111f',
    pageTextColor: '#f8fafc',
    btnBgColor: '',
    btnTextColor: '',
    font: 'Poppins',
    blockGap: 12,
    /* Vidro independente por elemento */
    nameGlass: { enabled: false, blur: 20, saturate: 180, opacity: 16, color: '#ffffff', borderGlow: 40, shadowDepth: 18, highlight: true, noise: false },
    bioGlass: { enabled: false, blur: 20, saturate: 180, opacity: 16, color: '#ffffff', borderGlow: 40, shadowDepth: 18, highlight: true, noise: false },
    addressGlass: { enabled: false, blur: 20, saturate: 180, opacity: 16, color: '#ffffff', borderGlow: 40, shadowDepth: 18, highlight: true, noise: false },
    buttonGlass: {},
    bannerGlass: {}
  },
  design: {
    banner: { enabled: false },
    profile: {
      addrShow: true,
      elem: {
        name: { font: 'Inter', size: 20, weight: 700, ls: 0, lh: 1.4, color: '#111827', align: 'center', bg: '', radius: 10, padding: [4, 14] },
        bio: { font: '', size: 14, weight: 400, ls: 0, lh: 1.4, color: '#334155', align: 'center', bg: '', radius: 10, padding: [4, 14] },
        address: { font: '', size: 12, weight: 600, ls: 0, lh: 1.4, color: '#ffffff', align: 'center', bg: 'rgba(12,14,22,.82)', radius: 999, padding: [8, 16] },
        avatar: {
          size: 96,
          shape: 'circle',
          radius: 999,
          borderStyle: 'solid',
          borderWidth: 4,
          borderColor: '#ffffff',
          shadowOn: true,
          shadowColor: '#000000',
          shadowAlpha: 50,
          shadowX: 0,
          shadowY: 12,
          shadowBlur: 24,
          shadowSpread: -10,
          glowOn: false,
          glowColor: '',
          glowIntensity: 35
        }
      }
    }
  }
};

export const ELEM_KEYS = ['name', 'bio', 'address', 'avatar'];

/* Valores distantes e verificáveis por elemento — usados para provar que
   mutar UM elemento NÃO toca os outros três. */
export const TEST_VALUES = {
  name: { font: 'Playfair Display', size: 31, weight: 900, ls: 2, lh: 1.15, color: '#0a1234', align: 'right', bg: '#aabbcc', radius: 26, padding: [14, 26] },
  bio: { font: 'Syne', size: 23, weight: 800, ls: 1.5, lh: 1.7, color: '#441100', align: 'right', bg: '#ff00aa', radius: 0, padding: [0, 10] },
  address: { font: 'Space Grotesk', size: 19, weight: 300, ls: 3, lh: 0.9, color: '#00ff11', align: 'right', bg: '#ff00ff', radius: 30, padding: [1, 2] },
  avatar: { size: 148, shape: 'square', radius: 6, borderStyle: 'dashed', borderWidth: 8, borderColor: '#ff0000', shadowOn: false, shadowSpread: 9, shadowColor: '#000000', shadowAlpha: 97, glowOn: true, glowColor: '#00ddff', glowIntensity: 80 }
};

export const GLASS_OF = { name: 'nameGlass', bio: 'bioGlass', address: 'addressGlass' };

export const TEST_GLASS = {
  enabled: true, blur: 39, saturate: 240, opacity: 48, color: '#102030',
  borderGlow: 95, shadowDepth: 55, highlight: false, noise: true
};