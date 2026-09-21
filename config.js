/* ================================================================
   AXIUMLINK — Configuração do cliente
   ----------------------------------------------------------------
   Este arquivo é a fonte de verdade dos dados da página pública.
   Ele é gerado/exportado pelo Painel (admin.html) e também pode
   ser lido manualmente. O index.html consome este objeto na carga.

   ARQUITETURA: Apenas estilo individual por link (sem estilo global).
   Cada link carrega seu próprio objeto `style` completo.
   ================================================================ */
window.AXIUMLINK_CONFIG = {
  profile: {
    photo: null,
    verified: false,
    name: "Nome do Cliente",
    bio: "Biografia curta, serviços ou tags separadas por • vírgulas.",
    address: "Rua Exemplo, 123 – Cidade/UF"
  },
  links: [
    {
      id: "link-1",
      title: "Agende via WhatsApp",
      url: "https://wa.me/5500000000000",
      icon: "whatsapp",
      image: null,
      style: {
        variant: "solid",
        format: "rounded",
        animation: "none",
        shadow: { type: "soft", intensity: 30 },
        radius: 14,
        glow: "#22d3ee",
        gradient: { start: "#6366f1", end: "#ec4899", angle: 135 },
        glass: { enabled: false, blur: 20, saturate: 180, opacity: 16, color: "#ffffff", borderGlow: 40, shadowDepth: 18, highlight: true, noise: false, borderOpacity: 25 },
        colors: { background: "#2563eb", text: "#ffffff" },
        displayStyle: "box"
      }
    },
    {
      id: "link-2",
      title: "Conheça nosso Instagram",
      url: "https://instagram.com/seu_usuario",
      icon: "instagram",
      image: null,
      style: {
        variant: "gradient",
        format: "rounded",
        animation: "pulse",
        shadow: { type: "glow", intensity: 40 },
        radius: 14,
        glow: "#ec4899",
        gradient: { start: "#ec4899", end: "#f43f5e", angle: 135 },
        glass: { enabled: false, blur: 20, saturate: 180, opacity: 16, color: "#ffffff", borderGlow: 40, shadowDepth: 18, highlight: true, noise: false, borderOpacity: 25 },
        colors: { background: "", text: "#ffffff" },
        displayStyle: "box"
      }
    },
    {
      id: "link-3",
      title: "Confira nossa Localização",
      url: "https://www.google.com/maps",
      icon: "localizacao",
      image: null,
      style: {
        variant: "glass",
        format: "rounded",
        animation: "none",
        shadow: { type: "soft", intensity: 20 },
        radius: 14,
        glow: "#06b6d4",
        gradient: { start: "#06b6d4", end: "#0891b2", angle: 135 },
        glass: { enabled: true, blur: 20, saturate: 180, opacity: 16, color: "#ffffff", borderGlow: 40, shadowDepth: 18, highlight: true, noise: false, borderOpacity: 25 },
        colors: { background: "", text: "#0f172a" },
        displayStyle: "box"
      }
    }
  ],
  visual: {
    /* Apenas propriedades globais de página (fundo, fonte, raio dos cards de perfil) */
    pageBg: null,
    textColor: "#0f172a",
    borderColor: null,
    font: "Inter",
    bgImage: null
  },
  layout: {
    cardsMode: "list",
    items: {
      info: { order: 1, hidden: false },
      links: { order: 3 }
    }
  },
  design: {
    banner: {
      enabled: true,
      height: 190,
      bgType: "gradient",
      color: "#1e293b",
      image: null,
      blend: "normal",
      angle: 135,
      stops: [
        { color: "#0f172a", pos: 0, alpha: 100 },
        { color: "#334155", pos: 55, alpha: 100 },
        { color: "#64748b", pos: 100, alpha: 100 }
      ],
      glass: false,
      glassBlur: 18,
      scrim: "none",
      scrimOpacity: 45,
      overlayTitle: '',
      overlayCta: '',
      overlayCtaUrl: ''
    },
    page: {
      gradientOn: true,
      angle: 180,
      blend: "normal",
      stops: [
        { color: "#e2e8f0", pos: 0, alpha: 100 },
        { color: "#ffffff", pos: 100, alpha: 100 }
      ]
    },
    profile: {
      marginTop: 0,
      zIndex: 20,
      radius: { tl: 14, tr: 14, br: 14, bl: 14 },
      borderStyle: "solid",
      borderWidth: 3,
      borderColor: "",
      shadowOn: true,
      shadowX: 0, shadowY: 12, shadowBlur: 24, shadowSpread: -10,
      shadowColor: "#000000",
      shadowAlpha: 50,
      glass: false,
      glassBlur: 14,
      text: {
        name: { color: "", size: 0, weight: 0, align: "" },
        bio: { color: "", size: 0, weight: 0, align: "" },
        address: {
          color: "", size: 0, weight: 0,
          blockRadius: "999px",
          blockBg: "#0f172a",
          blockBorderColor: "#ffffff",
          blockBorderWidth: 1,
          blockFont: "Inter, sans-serif"
        }
      }
    }
  }
};