/* ============================================================
   RESTAURANTE — CONFIGURAÇÃO CENTRAL
   ============================================================ */

const CONFIG = {
  empresa: {
    nome: "Restaurante Digital",
    slogan: "Comida caseira à porta de casa",
    tipo: "Restaurante",
    cidade: "Quelimane",
    pais: "Moçambique",
    endereco: "Av. Marginal, Quelimane, Moçambique",
    horario: "Segunda a Domingo — 10h00 às 22h00",
    email: "sabordequelimane@gmail.com",
    telefone: "258871632577",
    logo: "assets/images/logo.png"
  },

  whatsapp: "258871632577",

  // ============ PRATOS ============
  // Aqui defines o menu. Cada prato tem nome, preço, categoria e descrição.
  pratos: {
    frango_zambeziana: 450,
    matapa: 380,
    camarão_grelhado: 250,
    peixe_corvina: 200,
    xima_carne: 300,
    arroz_feijao: 150,
    frango_e_batatas: 350,
    bife_molho: 500
  },

  // ============ ENTREGA ============
  entrega: {
    ativa: true,
    gratisAcimaDe: 1000,   // pedido acima de 1000 MT → entrega grátis
    retirada: 0,           // retirar no restaurante = grátis
    zonas: [
      { nome: "Centro de Quelimane", valor: 50,  tempo: "20-30 min" },
      { nome: "Arredores",           valor: 30,  tempo: "15-25 min" },
      { nome: "Bairros distantes",    valor: 60, tempo: "30-40 min" },
      { nome: "Periferia",           valor: 80, tempo: "40-60 min" }
    ],
    premium: {
      ativo: true,
      tempo: "até 15 min",
      multiplicador: 1.5
    }
  },

  quantidade: {
    minima: 1,
    maxima: 20,
    rapida: [1, 2, 3, 5],
    unidade: "un"
  },

  admin: {
    user: "restaurante",
    pass: "sabor2025"
  },

  mensagemWhatsApp: "Olá, Restaurante! Gostaria de fazer um pedido.",

    // ============ SUPABASE ============
  supabase: {
    url: "https://cazvzrotdtndcmjdjgvy.supabase.co",
    key: "sb_publishable_kg2lLW51Rw3Xl_octDqaOw_8B-XXnHz"
  }
};

// ============ MENU (pratos com categorias) ============
const PRATOS_PADRAO = [
  {
    id: "frango_zambeziana",
    nome: "Frango à Zambeziana",
    preco: 450,
    unidade: "MT",
    categoria: "pratos",
    disponivel: true,
    icon: "🍗",
    desc: "Frango grelhado com molho de coco e piri-piri"
  },
  {
    id: "matapa",
    nome: "Matapa com Xima",
    preco: 380,
    unidade: "MT",
    categoria: "pratos",
    disponivel: true,
    icon: "🥬",
    desc: "Folhas de mandioqueira com amendoim e xima"
  },
  {
    id: "camarão_grelhado",
    nome: "Camarão Grelhado",
    preco: 750,
    unidade: "MT",
    categoria: "pratos",
    disponivel: true,
    icon: "🦐",
    desc: "Camarão fresco da costa, grelhado no carvão"
  },
  {
    id: "peixe_corvina",
    nome: "Peixe Corvina",
    preco: 650,
    unidade: "MT",
    categoria: "pratos",
    disponivel: true,
    icon: "🐟",
    desc: "Corvina grelhada com arroz de coco"
  },
  {
    id: "xima_carne",
    nome: "Xima com Carne",
    preco: 300,
    unidade: "MT",
    categoria: "pratos",
    disponivel: true,
    icon: "🍲",
    desc: "Xima tradicional com carne de vaca estufada"
  },
  {
    id: "arroz_feijao",
    nome: "Arroz com Feijão",
    preco: 180,
    unidade: "MT",
    categoria: "acompanhamentos",
    disponivel: true,
    icon: "🍚",
    desc: "Prato simples e caseiro"
  },
  {
    id: "frango_piri",
    nome: "Frango Piri-Piri",
    preco: 420,
    unidade: "MT",
    categoria: "pratos",
    disponivel: true,
    icon: "🌶️",
    desc: "Frango picante com batatas fritas"
  },
  {
    id: "bife_molho",
    nome: "Bife ao Molho",
    preco: 550,
    unidade: "MT",
    categoria: "pratos",
    disponivel: true,
    icon: "🥩",
    desc: "Bife de vaca com molho especial da casa"
  }
];

window.CONFIG = CONFIG;
window.PRATOS_PADRAO = PRATOS_PADRAO;