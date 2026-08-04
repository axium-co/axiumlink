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
  quickActions: {
    contactLink: "https://wa.me/5500000000000",
    vcf: "contato.vcf",
    phone: "+5500000000000",
    pixKey: "sua.chave@pix.com.br"
  },
  cards: {
    whatsapp: {
      link: "https://wa.me/5500000000000",
      title: "Agende via WhatsApp",
      description: "Fale conosco e agende seu horário.",
      icon: null
    },
    instagram: {
      link: "https://instagram.com/seu_usuario",
      title: "Conheça nosso Instagram",
      description: "Acompanhe novidades e bastidores.",
      icon: null
    },
    maps: {
      link: "https://www.google.com/maps",
      title: "Confira nossa Localização",
      description: "Abra no Google Maps e venha nos visitar.",
      icon: null
    }
  },
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
    info: { order: 1, hidden: false },
    items: {
      quickContact:  { order: 2, width: "half" },
      quickVcf:      { order: 3, width: "half" },
      quickPhone:    { order: 4, width: "half" },
      pixKey:        { order: 5, width: "half" },
      cardWhatsapp:  { order: 6, width: "full" },
      cardInstagram: { order: 7, width: "full" },
      cardMaps:      { order: 8, width: "full" }
    }
  }
};
