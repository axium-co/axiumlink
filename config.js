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
    textColor: "#000000",
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
      monogram: "",
      brand: "",
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
      textColor: "#ffffff",
      font: "system",
      monogramSize: 40,
      brandSize: 11,
      fontWeight: 800,
      align: "center",
      textShadowOn: true,
      textShadowBlur: 18,
      textShadowColor: "#000000",
      textShadowAlpha: 60,
      monogramBadge: false,
      monogramBg: "#000000",
      monogramBgAlpha: 35,
      monogramBorder: true,
      monogramBorderColor: "#ffffff",
      monogramBorderWidth: 2,
      monogramRadius: 12,
      scrim: "none",
      scrimOpacity: 45
    },
    profile: {
      marginTop: -38,
      zIndex: 2,
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
        address: { color: "", size: 0, align: "" }
      }
    }
  }
};
