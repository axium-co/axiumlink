/* ================================================================
   AXIUMLINK — Configuração do cliente
   ----------------------------------------------------------------
   Este arquivo é a fonte de verdade dos dados da página pública.
   Ele é gerado/exportado pelo Painel (admin.html) e também pode
   ser lido manualmente. O index.html consome este objeto na carga.

   Estrutura idêntica ao payload salvo pelo painel (console.log).
   ================================================================ */
window.AXIUMLINK_CONFIG = {
  profile: {
    photo: null,
    name: "Nome do Cliente",
    bio: "Biografia curta, serviços ou tags separadas por • vírgulas.",
    address: "Rua Exemplo, 123 – Cidade/UF"
  },
  quickActions: [
    { title: "Contato", url: "https://wa.me/5500000000000", icon: "mensagem" },
    { title: "Salvar Contato", url: "contato.vcf", icon: "download" },
    { title: "Ligar", url: "+5500000000000", icon: "telefone" },
    { title: "PIX", url: "sua.chave@pix.com.br", icon: "pix" }
  ],
  links: [
    {
      id: "link-1",
      title: "Agende via WhatsApp",
      url: "https://wa.me/5500000000000",
      icon: "whatsapp",
      image: null
    },
    {
      id: "link-2",
      title: "Conheça nosso Instagram",
      url: "https://instagram.com/seu_usuario",
      icon: "instagram",
      image: null
    },
    {
      id: "link-3",
      title: "Confira nossa Localização",
      url: "https://www.google.com/maps",
      icon: "localizacao",
      image: null
    }
  ],
  visual: {
    pageBg: "#ffffff",
    textColor: "#ffffff",
    borderColor: "#000000",
    quickBg: "#000000",
    quickText: "#ffffff",
    cardBg: "#000000",
    cardText: "#ffffff",
    radius: "arredondado",
    radiusLabel: "Arredondado",
    font: "Inter",
    bgImage: null
  },
  layout: {
    quickMode: "grid2x2",
    cardsMode: "list",
    items: {
      info: { order: 1, hidden: false },
      quick: { order: 2 },
      links: { order: 3 }
    }
  },
  design: {
    banner: {
      enabled: true,
      height: 132,
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
      scrimOpacity: 45
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
      marginTop: -38,
      zIndex: 20,
      radius: { tl: 14, tr: 14, br: 14, bl: 14 },
      borderStyle: "solid",
      borderWidth: 3,
      borderColor: "#ffffff",
      shadowOn: true,
      shadowX: 0, shadowY: 12, shadowBlur: 24, shadowSpread: -10,
      shadowColor: "#000000",
      shadowAlpha: 50,
      glass: false,
      glassBlur: 14,
      text: {
        name: { color: "", size: 0, weight: 0, align: "" },
        bio: { color: "", size: 0, weight: 0, align: "" },
        address: { color: "", size: 0, weight: 0 }
      }
    }
  }
};
