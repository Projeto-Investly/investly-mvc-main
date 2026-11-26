const { validationResult } = require("express-validator");

/* =========================================================
   DADOS TEMPORÁRIOS (até existir banco de dados)
   ========================================================= */

const usuario = {
    nome: "Guilherme",
    inicial: "G",
    email: "voce@exemplo.com",
    renda: 2500,
    nivel: "Iniciante"
};

const transacoes = [];
const metas = [];

const conteudos = [
    { id: 1, categoria: "Finanças pessoais", titulo: "Como montar um orçamento", resumo: "Aprenda a organizar receitas, despesas e prioridades." },
    { id: 2, categoria: "Economia", titulo: "O que é inflação?", resumo: "Entenda como a inflação afeta o poder de compra." },
    { id: 3, categoria: "Investimentos", titulo: "Renda fixa e renda variável", resumo: "Conheça as diferenças entre os principais tipos de investimento." }
];

const categorias = ["Finanças pessoais", "Economia", "Investimentos"];

const usuariosAdmin = [
    { nome: "Guilherme", email: "voce@exemplo.com", cadastro: "08/09/2026", status: "Ativo" },
    { nome: "Ana Silva", email: "ana@exemplo.com", cadastro: "07/09/2026", status: "Ativo" }
];

/* =========================================================
   FUNÇÕES AUXILIARES
   ========================================================= */

function arredondar(valor) {
    return Math.round(valor * 100) / 100;
}

// "2026-08-24" -> "24/08/2026" (sem new Date, para evitar problema de fuso)
function formatarData(iso) {
    const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
    return `${dia}/${mes}/${ano}`;
}

function proximoId(lista) {
    return lista.length ? Math.max(...lista.map(item => item.id)) + 1 : 1;
}

function ordenarTransacoes() {
    transacoes.sort((a, b) => b.dataISO.localeCompare(a.dataISO) || b.id - a.id);
}

function adicionarTransacao(tipo, { description, value, date, category }) {
    const valor = arredondar(parseFloat(value));
    transacoes.push({
        id: proximoId(transacoes),
        descricao: description.trim(),
        categoria: category.trim(),
        dataISO: date,
        data: formatarData(date),
        tipo,
        valor: tipo === "Despesa" ? -valor : valor
    });
    ordenarTransacoes();
}

function calcularResumo() {
    const receitas = arredondar(transacoes.filter(t => t.valor > 0).reduce((soma, t) => soma + t.valor, 0));
    const despesas = arredondar(transacoes.filter(t => t.valor < 0).reduce((soma, t) => soma + Math.abs(t.valor), 0));

    return {
        receitas,
        despesas,
        saldo: arredondar(receitas - despesas),
        orcamento: receitas > 0 ? Math.min(100, Math.round((despesas / receitas) * 100)) : 0,
        transacoes: transacoes.length
    };
}

function calcularProgresso(atual, objetivo) {
    return objetivo > 0 ? Math.min(100, Math.round((atual / objetivo) * 100)) : 0;
}

function adicionarMeta({ title, target, current, deadline }) {
    const objetivo = arredondar(parseFloat(target));
    const atual = arredondar(parseFloat(current) || 0);

    const hoje = new Date();
    const prazo = new Date(`${deadline}T00:00:00`);
    const meses = Math.max(1, Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24 * 30)));
    const falta = Math.max(0, objetivo - atual);

    metas.push({
        id: proximoId(metas),
        nome: title.trim(),
        atual,
        objetivo,
        progresso: calcularProgresso(atual, objetivo),
        prazo: formatarData(deadline),
        mensal: Math.ceil(falta / meses)
    });
}

function atualizarPerfil({ name, email }) {
    usuario.nome = name.trim();
    usuario.inicial = usuario.nome.charAt(0).toUpperCase();
    usuario.email = email.trim();
}

/* Dados iniciais de demonstração */
[
    ["Receita", "Salário", "Trabalho", "2026-08-01", 2500],
    ["Despesa", "Aluguel", "Moradia", "2026-08-05", 1200],
    ["Despesa", "Internet", "Moradia", "2026-08-10", 100],
    ["Despesa", "Energia", "Moradia", "2026-08-15", 150],
    ["Despesa", "Farmácia", "Saúde", "2026-08-18", 75],
    ["Despesa", "Lazer", "Lazer", "2026-08-20", 150],
    ["Despesa", "Uber", "Transporte", "2026-08-23", 25],
    ["Despesa", "Supermercado", "Alimentação", "2026-08-24", 150]
].forEach(([tipo, description, category, date, value]) => {
    adicionarTransacao(tipo, { description, category, date, value });
});

metas.push(
    { id: 1, nome: "Comprar um notebook", atual: 3000, objetivo: 4000, progresso: calcularProgresso(3000, 4000), prazo: "30/11/2026", mensal: 250 },
    { id: 2, nome: "Viagem", atual: 4000, objetivo: 10000, progresso: calcularProgresso(4000, 10000), prazo: "15/01/2027", mensal: 600 },
    { id: 3, nome: "Reserva de emergência", atual: 6000, objetivo: 10000, progresso: calcularProgresso(6000, 10000), prazo: "30/06/2027", mensal: 500 }
);

/* =========================================================
   RENDERIZAÇÃO
   ========================================================= */

function dadosBase(extra = {}) {
    return {
        usuario,
        errors: [],
        dados: {},
        ...extra
    };
}

// "extra" pode ser um objeto ou uma função (executada a cada requisição,
// para sempre mostrar os dados atualizados)
function render(nome, titulo, extra = {}) {
    return (req, res) => {
        const dados = typeof extra === "function" ? extra(req) : extra;
        res.render(`pages/${nome}`, dadosBase({ title: titulo, ...dados }));
    };
}

// "salvar" é opcional: recebe req.body quando a validação passa
function renderComValidacao(nome, titulo, sucesso, salvar) {
    return (req, res) => {
        const errors = validationResult(req);
        const dados = req.body || {};

        if (!errors.isEmpty()) {
            return res.status(400).render(`pages/${nome}`, dadosBase({
                title: titulo,
                errors: errors.array(),
                dados
            }));
        }

        if (salvar) {
            salvar(dados);
        }

        res.redirect(sucesso);
    };
}

/* =========================================================
   CONTROLLER
   ========================================================= */

const controller = {
    // Públicas
    home: render("home", "Início"),
    comoFunciona: render("como-funciona", "Como funciona"),
    aprenda: render("aprenda", "Aprenda", () => ({ conteudos })),
    artigo: render("artigo", "Conteúdo"),
    faq: render("faq", "FAQ"),
    contato: render("contato", "Contato"),

    // Autenticação
    login: render("login", "Entrar"),
    cadastro: render("cadastro", "Criar conta"),
    recuperarSenha: render("recuperar-senha", "Recuperar senha"),
    redefinirSenha: render("redefinir-senha", "Redefinir senha"),

    // Área do usuário
    dashboard: render("dashboard", "Dashboard", () => ({
        resumo: calcularResumo(),
        transacoes: transacoes.slice(0, 5),
        metas
    })),

    financas: render("financas", "Finanças", () => ({
        resumo: calcularResumo(),
        transacoes: transacoes.slice(0, 5)
    })),

    novaReceita: render("receita-nova", "Adicionar receita"),
    novaDespesa: render("despesa-nova", "Adicionar despesa"),
    historico: render("historico", "Histórico", () => ({ transacoes })),

    metas: render("metas", "Metas", () => ({ metas })),
    novaMeta: render("meta-nova", "Criar meta"),
    metaDetalhe(req, res) {
        const id = Number(req.params.id);
        const meta = metas.find(item => item.id === id);

        if (!meta) {
            return res.status(404).render("pages/404", dadosBase({ title: "Página não encontrada" }));
        }

        res.render("pages/meta-detalhe", dadosBase({
            title: "Detalhe da meta",
            meta: { ...meta, falta: arredondar(Math.max(0, meta.objetivo - meta.atual)) }
        }));
    },

    perfil: render("perfil", "Perfil"),
    configuracoes: render("configuracoes", "Configurações"),

    // Admin
    adminDashboard: render("admin-dashboard", "Admin", () => ({
        totalUsuarios: usuariosAdmin.length,
        totalConteudos: conteudos.length,
        totalCategorias: categorias.length
    })),
    adminUsuarios: render("admin-usuarios", "Usuários", () => ({ usuarios: usuariosAdmin })),
    adminConteudos: render("admin-conteudos", "Conteúdos", () => ({ conteudos })),
    adminCategorias: render("admin-categorias", "Categorias"),

    // Formulários
    processarLogin: renderComValidacao("login", "Entrar", "/dashboard"),
    processarCadastro: renderComValidacao("cadastro", "Criar conta", "/dashboard"),
    processarContato: renderComValidacao("contato", "Contato", "/contato"),
    processarRecuperacao: renderComValidacao("recuperar-senha", "Recuperar senha", "/login"),
    processarRedefinicao: renderComValidacao("redefinir-senha", "Redefinir senha", "/login"),
    processarReceita: renderComValidacao("receita-nova", "Adicionar receita", "/financas",
        dados => adicionarTransacao("Receita", dados)),
    processarDespesa: renderComValidacao("despesa-nova", "Adicionar despesa", "/financas",
        dados => adicionarTransacao("Despesa", dados)),
    processarMeta: renderComValidacao("meta-nova", "Criar meta", "/metas", adicionarMeta),
    processarPerfil: renderComValidacao("perfil", "Perfil", "/perfil", atualizarPerfil),

    // Erros
    erro403(req, res) {
        res.status(403).render("pages/403", dadosBase({ title: "Acesso não permitido" }));
    },
    erro500(req, res) {
        res.status(500).render("pages/500", dadosBase({ title: "Erro interno" }));
    },
    erro404(req, res) {
        res.status(404).render("pages/404", dadosBase({ title: "Página não encontrada" }));
    }
};

module.exports = controller;
