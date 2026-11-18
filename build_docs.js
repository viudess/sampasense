// Gera: SampaSense_NAS_Entrega.docx  e  SampaSense_Tutorial_PacketTracer.docx
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  AlignmentType, HeadingLevel, WidthType, ShadingType, BorderStyle, LevelFormat,
  PageBreak, Footer, Header, PageNumber, TableOfContents, HeightRule, VerticalAlign,
  ExternalHyperlink,
} = require("docx");

const X = parseInt(process.argv[2] || "77", 10);
const N = `192.168.${X}`;
const OUT = path.join(__dirname, "saida");
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- estilo
const FONT = "Arial";
const MONO = "Consolas";
const BLUE = "0B3D91";
const PAGE_W = 11906, MARGIN = 1134; // A4, margens 2 cm
const CW = PAGE_W - 2 * MARGIN;      // 9638 DXA

const styles = {
  default: { document: { run: { font: FONT, size: 21 } } },
  paragraphStyles: [
    { id: "Title", name: "Title", basedOn: "Normal", run: { font: FONT, size: 52, bold: true, color: BLUE },
      paragraph: { spacing: { before: 0, after: 200 }, alignment: AlignmentType.CENTER } },
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { font: FONT, size: 30, bold: true, color: BLUE },
      paragraph: { spacing: { before: 360, after: 160 }, keepNext: true, outlineLevel: 0 } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { font: FONT, size: 24, bold: true, color: "1F2937" },
      paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, outlineLevel: 1 } },
    { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { font: FONT, size: 22, bold: true, color: "374151" },
      paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 2 } },
  ],
};
const numbering = {
  config: [
    { reference: "bul", levels: [
      { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
      { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 1080, hanging: 270 } } } } ] },
    ...Array.from({ length: 30 }, (_, i) => ({ reference: `num${i}`, levels: [
      { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 360 } } } } ] })),
  ],
};
let numCounter = 0;

// ---------------------------------------------------------------- helpers
// texto com **negrito** e `codigo`
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), font: MONO, size: 19, color: "9A3412", ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}
const P = (t, o = {}) => new Paragraph({ children: runs(t, o.run || {}), spacing: { after: 120, line: 288 }, alignment: o.align || AlignmentType.JUSTIFIED, ...o.p });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const B = (t, level = 0) => new Paragraph({ numbering: { reference: "bul", level }, children: runs(t), spacing: { after: 60, line: 276 } });
function OL(items) {
  const ref = `num${numCounter++}`;
  return items.map((t) => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(t), spacing: { after: 60, line: 276 } }));
}
const PB = () => new Paragraph({ children: [new PageBreak()] });
const SP = (after = 120) => new Paragraph({ children: [], spacing: { after } });

const border = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };
const borders = { top: border, bottom: border, left: border, right: border };

function table(header, rows, widths, opts = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const mk = (txt, i, isHead, shade) => new TableCell({
    borders, width: { size: widths[i], type: WidthType.DXA },
    shading: isHead ? { fill: "DCE6F5", type: ShadingType.CLEAR, color: "auto" }
      : shade ? { fill: shade, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: String(txt).split("\n").map((line) => new Paragraph({
      children: runs(line, isHead ? { bold: true, size: opts.size || 18 } : { size: opts.size || 18 }),
      spacing: { after: 0, line: 252 } })),
  });
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => mk(h, i, true)) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => mk(c, i, false,
        opts.firstColShade && i === 0 ? "F1F5F9" : (opts.zebra && ri % 2 ? "F8FAFC" : undefined))) })),
    ],
  });
}

function code(text, title) {
  const lines = text.replace(/\s+$/, "").split("\n");
  const cellChildren = [];
  if (title) cellChildren.push(new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 17, color: "93C5FD", font: MONO })], spacing: { after: 60 } }));
  for (const l of lines) cellChildren.push(new Paragraph({
    children: [new TextRun({ text: l.length ? l : " ", font: MONO, size: 16, color: "E5E7EB" })],
    spacing: { after: 0, line: 228 } }));
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                 left: { style: BorderStyle.SINGLE, size: 24, color: "2563EB" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
      width: { size: CW, type: WidthType.DXA },
      shading: { fill: "111827", type: ShadingType.CLEAR, color: "auto" },
      margins: { top: 120, bottom: 120, left: 180, right: 120 },
      children: cellChildren })] })],
  });
}

function printBox(label, hint) {
  const dash = { style: BorderStyle.DASHED, size: 8, color: "94A3B8" };
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ height: { value: 3000, rule: HeightRule.ATLEAST }, cantSplit: true, children: [new TableCell({
      borders: { top: dash, bottom: dash, left: dash, right: dash },
      width: { size: CW, type: WidthType.DXA },
      shading: { fill: "F8FAFC", type: ShadingType.CLEAR, color: "auto" },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `[ COLE AQUI O PRINT — ${label} ]`, bold: true, color: "64748B", size: 20 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: hint, italics: true, color: "94A3B8", size: 17 })] }),
      ] })] })],
  });
}

function callout(text, fill = "EFF6FF", bar = "2563EB") {
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                 right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.SINGLE, size: 24, color: bar } },
      width: { size: CW, type: WidthType.DXA },
      shading: { fill, type: ShadingType.CLEAR, color: "auto" },
      margins: { top: 100, bottom: 100, left: 180, right: 140 },
      children: text.split("\n").map((t) => new Paragraph({ children: runs(t, { size: 19 }), spacing: { after: 40, line: 264 } })) })] })],
  });
}

function link(text, url) {
  return new Paragraph({ spacing: { after: 60 }, children: [new ExternalHyperlink({ link: url, children: [new TextRun({ text, style: "Hyperlink", size: 18 })] })] });
}

function footer(txt) {
  return { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
    new TextRun({ text: `${txt}  ·  página `, size: 16, color: "6B7280" }),
    new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "6B7280" }) ] })] }) };
}


// ---------------------------------------------------------------- prints
const { imageSize } = (() => {
  return { imageSize: (f) => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; } };
})();
let figN = 1;
function shot(name, maxW, maxH) {
  const f = path.join(__dirname, "prints", name + ".png");
  const { w, h } = imageSize(f);
  let sw = maxW, sh = Math.round(h * maxW / w);
  if (sh > maxH) { sh = maxH; sw = Math.round(w * maxH / h); }
  return new ImageRun({ type: "png", data: fs.readFileSync(f), transformation: { width: sw, height: sh },
    altText: { title: name, description: name, name } });
}
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
function shots(names) {
  if (names.length === 1) {
    const f = path.join(__dirname, "prints", names[0] + ".png"); const { w } = imageSize(f);
    const wide = w > 1200;
    return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, children: [shot(names[0], wide ? 640 : 300, wide ? 360 : 300)] });
  }
  const half = CW / 2;
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [half, half],
    rows: [new TableRow({ cantSplit: true, children: names.map((n) => new TableCell({
      borders: { top: NB, bottom: NB, left: NB, right: NB }, width: { size: half, type: WidthType.DXA },
      margins: { top: 80, bottom: 40, left: 40, right: 40 },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [shot(n, 312, 330)] })] })) })] });
}
function figCaption(t) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 160 },
    children: [new TextRun({ text: `Figura ${++figN} — ${t}.`, italics: true, size: 17, color: "6B7280" })] });
}

const cfg = (f) => fs.readFileSync(path.join(__dirname, "configs", f), "utf8");
function section(text, startRe, endRe) {
  const lines = text.split("\n");
  const s = lines.findIndex((l) => startRe.test(l));
  let e = lines.findIndex((l, i) => i > s && endRe.test(l));
  if (e < 0) e = lines.length;
  return lines.slice(s, e).join("\n");
}

// =================================================================== DADOS
const subnets = [
  ["20", "CIDADAO_WIFI", `${N}.0/25`, "255.255.255.128", `${N}.1`, `.1 – .126`, `.127`, "126", `.6 – .126`],
  ["10", "EQUIPE", `${N}.128/26`, "255.255.255.192", `${N}.129`, `.129 – .190`, `.191`, "62", `.134 – .190`],
  ["30", "SERVIDORES_SENSORES", `${N}.192/27`, "255.255.255.224", `${N}.193`, `.193 – .222`, `.223`, "30", `.200 – .222`],
  ["99", "GERENCIA", `${N}.224/28`, "255.255.255.240", `${N}.225`, `.225 – .238`, `.239`, "14", `.230 – .238`],
  ["—", "Reserva (expansão)", `${N}.240/28`, "255.255.255.240", "—", `.241 – .254`, `.255`, "14", "—"],
  ["999", "NATIVA_BLACKHOLE", "sem IP", "—", "—", "—", "—", "—", "—"],
];

const staticIPs = [
  ["R-SAMPASENSE", "G0/0.10", `${N}.129/26`, "Gateway VLAN 10 EQUIPE"],
  ["R-SAMPASENSE", "G0/0.20", `${N}.1/25`, "Gateway VLAN 20 CIDADÃO"],
  ["R-SAMPASENSE", "G0/0.30", `${N}.193/27`, "Gateway VLAN 30 SERVIDORES/SENSORES"],
  ["R-SAMPASENSE", "G0/0.99", `${N}.225/28`, "Gateway VLAN 99 GERÊNCIA"],
  ["R-SAMPASENSE", "G0/0.999", "sem IP", "VLAN nativa sem uso (dot1Q native)"],
  ["R-SAMPASENSE", "G0/1", "203.0.113.1/30", "WAN · ip nat outside"],
  ["R-ISP", "G0/0", "203.0.113.2/30", "Link com o cliente"],
  ["R-ISP", "G0/1", "198.51.100.1/24", "Gateway da internet simulada"],
  ["SW-BASE", "VLAN 99", `${N}.226/28`, `Gerência · gw ${N}.225`],
  ["SW-PRACA", "VLAN 99", `${N}.227/28`, `Gerência · gw ${N}.225`],
  ["SRV-SAMPASENSE", "Fa0", `${N}.194/27`, `gw ${N}.193 · DNS ${N}.194 · HTTP + DNS`],
  ["WEB-INTERNET", "Fa0", "198.51.100.10/24", "gw 198.51.100.1 · HTTP"],
  ["Demais hosts", "—", "DHCP", "Pool da VLAN correspondente"],
];

const cabling = [
  ["R-SAMPASENSE G0/0", "SW-BASE G0/1", "Cobre direto", "Trunk 802.1Q (router-on-a-stick)"],
  ["R-SAMPASENSE G0/1", "R-ISP G0/0", "Cobre cruzado", "WAN /30"],
  ["R-ISP G0/1", "WEB-INTERNET Fa0", "Cobre cruzado", "Internet simulada"],
  ["SW-BASE G0/2", "SW-PRACA G0/1", "Cobre cruzado", "Trunk 802.1Q"],
  ["SW-BASE Fa0/1", "PC-OPERADOR-1", "Cobre direto", "Acesso VLAN 10"],
  ["SW-BASE Fa0/2", "PC-OPERADOR-2", "Cobre direto", "Acesso VLAN 10"],
  ["SW-BASE Fa0/9", "SRV-SAMPASENSE", "Cobre direto", "Acesso VLAN 30"],
  ["SW-BASE Fa0/24", "NOTEBOOK-ADMIN", "Cobre direto", "Acesso VLAN 99"],
  ["SW-PRACA Fa0/1", "AP-WIFI-LIVRE-SP (Port 0)", "Cobre direto", "Acesso VLAN 20"],
  ["SW-PRACA Fa0/2", "SENSOR-AGUA", "Cobre direto", "Acesso VLAN 30"],
  ["SW-PRACA Fa0/3", "CAMERA-01", "Cobre direto", "Acesso VLAN 30"],
  ["SW-PRACA Fa0/4", "TOTEM-01", "Cobre direto", "Acesso VLAN 30"],
  ["SW-PRACA Fa0/5", "SEMAFORO-01", "Cobre direto", "Acesso VLAN 30"],
  ["AP-WIFI-LIVRE-SP", "CELULAR-CIDADAO, LAPTOP-CIDADAO", "Sem fio", "SSID WiFi-Livre-SP · WPA2-PSK/AES"],
];

const dnsRecords = [
  ["www.sampasense.sp", "A", `${N}.194`, "Portal com a Ficha da CitizenTech"],
  ["sampasense.sp", "A", `${N}.194`, "Atalho do portal"],
  ["alerta.sampasense.sp", "A", `${N}.194`, "Nome alternativo do servidor"],
  ["www.internet.com", "A", "198.51.100.10", "Servidor externo (teste de NAT)"],
];

// =================================================================== ENTREGA
function entrega() {
  const c = [];
  // ---------- capa
  c.push(SP(1600));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "FIAP · GLOBAL SOLUTION 2026.2 · CITIZENTECH", size: 20, color: "6B7280", bold: true })], spacing: { after: 200 } }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Network Architect Solutions", size: 28, color: "374151" })], spacing: { after: 400 } }));
  c.push(new Paragraph({ style: "Title", children: [new TextRun("SampaSense")] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Rede segmentada da Base Comunitária SampaSense", size: 26, color: "374151" })], spacing: { after: 120 } }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Resiliência climática com a infraestrutura do Smart Sampa", size: 22, italics: true, color: "6B7280" })], spacing: { after: 900 } }));
  c.push(table(["Integrante (ordem alfabética)", "RM"], [
    ["Anna Clara Ruggeri da Silva", "RM565553"], ["Eduardo Viudes Chorro", "RM564075"],
    ["Giovanna da Silva Santos", "RM566301"], ["Giovanna Luiza Bento", "RM563203"],
    ["Victor Tadashi Saito Barra", "RM563582"]], [6638, 3000], { size: 20 }));
  c.push(SP(300));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Engenharia de Software · 2º ano (2ES) · Equipe ${X} · faixa ${N}.0/24`, size: 20, color: "374151" })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "São Paulo, novembro de 2026", size: 20, color: "6B7280" })] }));
  c.push(PB());

  // ---------- sumario
  c.push(new Paragraph({ children: [new TextRun({ text: "Sumário", bold: true, size: 30, color: BLUE })], spacing: { after: 200 } }));
  ["1. Ficha da CitizenTech","2. O local físico e o papel da rede","3. Topologia","4. Plano de endereçamento","5. VLANs, trunks e router-on-a-stick","6. Serviços (DHCP, NAT/PAT, DNS/HTTP, Wi-Fi WPA2)","7. Segurança (matriz de acesso, ACLs, SSH)","8. Trechos do show running-config","9. Testes","10. Requisitos atendidos","11. Referências"].forEach((t) => c.push(new Paragraph({ children: [new TextRun({ text: t, size: 22 })], spacing: { after: 140 }, border: { bottom: { style: BorderStyle.DOTTED, size: 4, color: "CBD5E1", space: 4 } } })));
  c.push(PB());

  // ---------- 1 ficha
  c.push(H1("1. Ficha da CitizenTech"));
  c.push(table(["Campo", "SampaSense"], [
    ["Nome da CitizenTech", "SampaSense"],
    ["Cidade e bairro", "São Paulo (SP) · Centro: Vale do Anhangabaú e Praça da Bandeira (piloto)"],
    ["Cidadão beneficiado", "Pedestres, motoristas, moradores e comerciantes de vales e túneis que alagam, com atenção a idosos e pessoas com deficiência."],
    ["Problema, em uma frase", "Em chuvas fortes, vales e túneis de São Paulo alagam em minutos e quem está na rua não recebe aviso a tempo de sair do caminho da água."],
    ["Como funciona", "Totens do Smart Sampa e sensores de nível d’água alimentam um modelo que estima a chance de alagamento pela chuva da última hora. Ao passar do limite, o SampaSense fecha o semáforo de acesso ao trecho, aciona LED e sirene do totem, coloca o Wi-Fi Livre SP da praça em modo emergência (tela de alerta com rota segura), envia WhatsApp/SMS a moradores cadastrados e pede Cell Broadcast à Defesa Civil. Moradores confirmam “alagou aqui” / “já baixou”."],
    ["O que cada parte faz", "Data Science: previsão do alagamento · Dynamic Programming: rota segura e acessível · Java/DDD: API de ocorrências e alertas · Database: sensores, ocorrências e relatório pós-evento · Network: rede segmentada, Wi-Fi público isolado e proteção contra alerta falso · AR/VR: simulação do alagamento · Agile: personas, backlog e protótipos."],
    ["Link do repositório", "https://github.com/viudess/sampasense"],
    ["Indicador de impacto", "Tempo entre detecção e alerta (meta: menos de 60 s) e número de pessoas avisadas por ocorrência."],
    ["ODS conectados", "ODS 11 Cidades sustentáveis · ODS 13 Ação climática · ODS 3 Saúde e bem-estar · ODS 9 Inovação e infraestrutura · ODS 10 Redução das desigualdades"],
  ], [2600, 7038], { firstColShade: true, size: 19 }));

  // ---------- 2 contexto
  c.push(H1("2. O local físico e o papel da rede"));
  c.push(P("A rede modelada é a da **Base Comunitária SampaSense**, instalada junto à Praça da Bandeira, na borda do Vale do Anhangabaú — um dos pontos clássicos de alagamento do Centro. Ela tem dois ambientes físicos ligados por um trunk 802.1Q:"));
  c.push(B("**Sala de operação e rack (SW-BASE):** estações dos operadores (equipe da Defesa Civil/CGE), o servidor SRV-SAMPASENSE (portal HTTP + DNS) e o notebook do administrador de rede."));
  c.push(B("**Armário de rua do totem (SW-PRACA):** o ponto de acesso do Wi-Fi Livre SP usado pelo cidadão e os equipamentos de campo — sensor de nível d’água, câmera, totem com LED/sirene e controlador do semáforo."));
  c.push(P("A rede precisa cumprir duas missões que puxam para lados opostos: ser **aberta** para o cidadão que passa (Wi-Fi público, portal de alerta, internet) e ser **fechada** para quem quiser mexer nos equipamentos que disparam alertas, fecham semáforos e tocam sirenes. Por isso a arquitetura separa os setores em VLANs e coloca ACLs entre eles."));
  c.push(callout("**Por que segurança é o diferencial.** Em 20/06/2026, um invasor usou credenciais vazadas de servidores da Defesa Civil do Pará para entrar na plataforma IDAP e disparar alertas falsos de “Alerta Extremo” a cerca de 30 milhões de pessoas; a plataforma saiu do ar e a PF foi acionada. Em 20/10/2026, veio a público que credenciais de acesso ao Smart Sampa ficaram expostas por cerca de 11 meses em um repositório público, abrindo mais de 58 mil câmeras. Os dois casos mostram o mesmo risco: quem obtém acesso indevido a um sistema de alertas pode causar pânico ou cegar a cidade. No SampaSense, um alerta só pode ser acionado de dentro da VLAN de servidores ou pela equipe autenticada — o Wi-Fi público não alcança sensores, totens, semáforos nem a gerência, e os equipamentos só aceitam administração por SSH a partir da VLAN de gerência e da equipe.", "FEF3C7", "D97706"));

  // ---------- 3 topologia
  c.push(H1("3. Topologia"));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "png", data: fs.readFileSync(path.join(__dirname, "diagrama", "topologia.png")), transformation: { width: 642, height: 401 }, altText: { title: "Topologia", description: "Topologia da rede SampaSense", name: "topologia" } })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: "Figura 1 — Topologia lógica e física da Base Comunitária SampaSense.", italics: true, size: 17, color: "6B7280" })] }));
  c.push(shots(["00_topologia"]));
  c.push(figCaption("Topologia montada no Packet Tracer (GS_SampaSense_Equipe77.pkt), com todos os links ativos"));
  c.push(H2("3.1 Equipamentos"));
  c.push(table(["Dispositivo", "Modelo no Packet Tracer", "Função"], [
    ["R-SAMPASENSE", "Router 2911", "Roteamento entre VLANs (router-on-a-stick), DHCP, NAT/PAT, ACLs, SSH"],
    ["R-ISP", "Router 2911", "Provedor; simula a internet (não conhece 192.168.0.0/16)"],
    ["SW-BASE", "Switch 2960-24TT", "Acesso da sala de operação e rack; trunk para roteador e praça"],
    ["SW-PRACA", "Switch 2960-24TT", "Armário de rua: AP público e equipamentos de campo"],
    ["AP-WIFI-LIVRE-SP", "AccessPoint-PT", "Wi-Fi do cidadão, SSID WiFi-Livre-SP, WPA2-PSK/AES"],
    ["SRV-SAMPASENSE", "Server-PT", "Portal HTTP (Ficha + tela de alerta) e DNS"],
    ["WEB-INTERNET", "Server-PT", "Site externo www.internet.com"],
    ["PC-OPERADOR-1/2", "PC-PT", "Estações dos operadores (VLAN 10)"],
    ["NOTEBOOK-ADMIN", "Laptop-PT", "Administração da rede por SSH (VLAN 99)"],
    ["CELULAR-CIDADAO / LAPTOP-CIDADAO", "Smartphone-PT / Laptop-PT", "Cidadão no Wi-Fi público (VLAN 20)"],
    ["SENSOR-AGUA, CAMERA-01, TOTEM-01, SEMAFORO-01", "Dispositivos IoT (ou PC-PT)", "Equipamentos de campo do Smart Sampa (VLAN 30)"],
  ], [3000, 2400, 4238], { zebra: true }));
  c.push(H2("3.2 Cabeamento"));
  c.push(table(["Origem", "Destino", "Cabo", "Uso"], cabling, [2500, 2900, 1600, 2638], { zebra: true }));

  // ---------- 4 enderecamento
  c.push(H1("4. Plano de endereçamento"));
  c.push(P(`A faixa da equipe, **${N}.0/24**, foi dividida com **VLSM**, alocando primeiro a maior sub-rede. O Wi-Fi público recebe uma /25 porque concentra o maior número de dispositivos (pessoas que passam pela praça); a equipe recebe uma /26; servidores e sensores, uma /27; a gerência, uma /28. Sobra uma /28 de reserva para expansão (por exemplo, um segundo totem).`));
  c.push(H2("4.1 Sub-redes e VLANs"));
  c.push(table(["VLAN", "Nome", "Rede/prefixo", "Máscara", "Gateway", "Faixa útil", "Bcast", "Hosts", "Pool DHCP"], subnets,
    [600, 1400, 1500, 1400, 1300, 1100, 700, 638, 1000], { size: 15, zebra: true }));
  c.push(new Paragraph({ spacing: { before: 60, after: 80 }, children: [new TextRun({ text: `Faixa útil, broadcast (Bcast) e pool mostram o último octeto (todos em ${N}.x).`, italics: true, size: 16, color: "6B7280" })] }));
  c.push(SP(80));
  c.push(P("Cálculo (exemplo da VLAN 20): /25 deixa 7 bits de host → 2⁷ − 2 = 126 endereços utilizáveis. A VLAN 10 (/26) tem 2⁶ − 2 = 62; a VLAN 30 (/27), 2⁵ − 2 = 30; a VLAN 99 (/28), 2⁴ − 2 = 14.", { run: { size: 19 } }));
  c.push(H2("4.2 Endereços estáticos"));
  c.push(table(["Equipamento", "Interface", "Endereço", "Observação"], staticIPs, [2300, 1500, 2300, 3538], { zebra: true }));
  c.push(H2("4.3 Exclusões de DHCP"));
  c.push(P(`Em cada pool, o gateway e uma pequena reserva ficam fora da distribuição: **.1–.5** (Cidadão), **.129–.133** (Equipe), **.193–.199** (Servidores/Sensores — inclui o gateway .193 e o servidor .194) e **.225–.229** (Gerência — inclui o gateway e os switches .226/.227).`));

  // ---------- 5 VLANs e trunks
  c.push(H1("5. VLANs, trunks e router-on-a-stick"));
  c.push(table(["Switch", "Portas", "Modo", "VLAN", "Proteções"], [
    ["SW-BASE", "G0/1, G0/2", "Trunk 802.1Q", "10,20,30,99,999 (nativa 999)", "nonegotiate (sem DTP)"],
    ["SW-BASE", "Fa0/1–8", "Acesso", "10 EQUIPE", "port-security sticky (máx. 2), PortFast, BPDU Guard"],
    ["SW-BASE", "Fa0/9–12", "Acesso", "30 SERVIDORES", "PortFast, BPDU Guard"],
    ["SW-BASE", "Fa0/24", "Acesso", "99 GERÊNCIA", "PortFast, BPDU Guard"],
    ["SW-BASE", "Fa0/13–23", "Desligadas", "999", "shutdown"],
    ["SW-PRACA", "G0/1", "Trunk 802.1Q", "10,20,30,99,999 (nativa 999)", "nonegotiate"],
    ["SW-PRACA", "Fa0/1", "Acesso", "20 CIDADÃO (AP)", "PortFast"],
    ["SW-PRACA", "Fa0/2–8", "Acesso", "30 SENSORES", "port-security sticky (máx. 1, violation shutdown), BPDU Guard"],
    ["SW-PRACA", "Fa0/9–24, G0/2", "Desligadas", "999", "shutdown"],
  ], [1300, 1500, 1350, 2400, 3088], { zebra: true }));
  c.push(SP(80));
  c.push(P("O roteador R-SAMPASENSE usa uma única interface física (G0/0) dividida em subinterfaces, uma por VLAN, cada uma com `encapsulation dot1Q <vlan>` e o gateway da sub-rede. A VLAN nativa foi movida para a **999**, que não tem hosts nem IP — isso evita ataques de VLAN hopping por dupla marcação e impede que tráfego sem tag caia numa VLAN útil. O VTP está em modo transparente, para que um switch novo plugado na praça não sobrescreva o banco de VLANs."));

  // ---------- 6 servicos
  c.push(H1("6. Serviços"));
  c.push(H2("6.1 DHCP"));
  c.push(P("O próprio R-SAMPASENSE é o servidor DHCP, com **um pool por VLAN** (CIDADAO_WIFI, EQUIPE, SERVIDORES_SENSORES e GERENCIA). Cada pool entrega gateway e o DNS do servidor SampaSense. O servidor e os gateways têm IP fixo e estão excluídos dos pools."));
  c.push(H2("6.2 NAT/PAT e internet"));
  c.push(P("Todas as redes internas saem para a internet traduzidas para o IP público **203.0.113.1** (PAT/overload, `ip nat inside source list 1 interface G0/1 overload`). As subinterfaces são `ip nat inside` e a G0/1 é `ip nat outside`. O R-ISP **não tem rota** para 192.168.0.0/16: se o servidor externo responde, é porque o NAT funcionou."));
  c.push(H2("6.3 DNS e HTTP (SRV-SAMPASENSE)"));
  c.push(table(["Nome", "Tipo", "Endereço", "Uso"], dnsRecords, [2700, 800, 2000, 4138], { zebra: true }));
  c.push(SP(80));
  c.push(P("O serviço HTTP publica **index.html**, com a Ficha da CitizenTech, e **alerta.html**, a tela que o Wi-Fi mostra em modo emergência (alerta, rota segura e acessível, botões “alagou aqui / já baixou” e telefones 199/193/192)."));
  c.push(H2("6.4 Wi-Fi público com WPA2"));
  c.push(P("O AP-WIFI-LIVRE-SP anuncia o SSID **WiFi-Livre-SP** com **WPA2-PSK e criptografia AES**. A senha é exibida no painel do totem e em QR code, de modo que o tráfego do cidadão vai cifrado no ar e um curioso não monta um AP falso com o mesmo nome sem conhecer a chave. O AP está numa porta de acesso da VLAN 20: tudo o que entra por ele cai na sub-rede do cidadão e passa obrigatoriamente pela ACL_CIDADAO."));

  // ---------- 7 seguranca
  c.push(H1("7. Segurança"));
  c.push(H2("7.1 Matriz de acesso"));
  c.push(table(["Origem \\ Destino", "Equipe (10)", "Cidadão (20)", "Servidor .194", "Sensores (30)", "Gerência (99)", "Internet", "SSH nos equipamentos"], [
    ["Equipe (10)", "✔", "✘", "✔ total", "✔", "✔", "✔ (PAT)", "✔"],
    ["Cidadão (20)", "✘", "✔", "só HTTP e DNS", "✘", "✘", "✔ (PAT)", "✘"],
    ["Serv./Sensores (30)", "✔", "✘", "✔", "✔", "✔", "✔ (PAT)", "✘"],
    ["Gerência (99)", "✔", "✘", "✔ total", "✔", "✔", "✔ (PAT)", "✔"],
    ["Internet", "✘ (NAT)", "✘", "✘", "✘", "✘", "—", "✘"],
  ], [1600, 1050, 1100, 1250, 1150, 1100, 1100, 1288], { firstColShade: true, size: 16 }));
  c.push(SP(80));
  c.push(P("O cidadão é isolado das demais VLANs pela ACL_CIDADAO. A comunicação Cidadão ↔ Equipe falha nos dois sentidos, porque as respostas da Equipe também batem na regra de bloqueio.", { run: { size: 19 } }));
  c.push(H2("7.2 ACL estendida do Wi-Fi do cidadão (ACL_CIDADAO)"));
  c.push(P("Aplicada **na entrada** da subinterface G0/0.20, o ponto mais próximo da origem — o tráfego indevido é descartado antes de ser roteado."));
  c.push(table(["#", "Regra", "Motivo"], [
    ["1", "permit udp any eq bootpc any eq bootps", "O celular precisa pedir IP por DHCP"],
    ["2", `permit tcp ${N}.0/25 → host ${N}.194 eq www`, "Portal SampaSense (HTTP)"],
    ["3", `permit udp ${N}.0/25 → host ${N}.194 eq domain`, "Resolução de nomes (DNS)"],
    ["4", `deny ip ${N}.0/25 → ${N}.128/26`, "Nada da VLAN EQUIPE (regra explícita, com contador próprio)"],
    ["5", `deny ip ${N}.0/25 → ${N}.0/24`, "Nada de sensores, totens, semáforos, gerência ou do gateway"],
    ["6", "deny ip … → host 203.0.113.1", "Nem a interface WAN do roteador"],
    ["7", `permit ip ${N}.0/25 → any`, "Internet liberada"],
  ], [500, 4800, 4338], { size: 17 }));
  c.push(H2("7.3 ACL de proteção dos servidores e sensores (ACL_SERVIDORES)"));
  c.push(P("Aplicada **na saída** da G0/0.30 (tráfego entrando na VLAN de servidores e sensores). É a defesa em profundidade contra alerta falso: além da Equipe e da Gerência, ninguém conversa com totens, sensores e semáforos; qualquer outra origem só alcança o portal (HTTP/HTTPS) e o DNS do servidor. Respostas a conexões abertas pela própria VLAN 30 passam (`established`, echo-reply)."));
  c.push(H2("7.4 Modo emergência (ACL_CIDADAO_EMERGENCIA)"));
  c.push(P("Durante um alagamento, a equipe troca a ACL da G0/0.20 pela ACL_CIDADAO_EMERGENCIA: o Wi-Fi da praça deixa de dar acesso à internet e passa a entregar **somente** o portal de alerta (www.sampasense.sp/alerta.html) com a rota segura. É a versão em rede do “captive portal” da ideia, e pode ser revertida com um comando."));
  c.push(H2("7.5 Acesso administrativo"));
  c.push(B("**Somente SSH v2** nas linhas VTY (`transport input ssh`); Telnet recusado. Chave RSA de 1024 bits."));
  c.push(B("**access-class 10**: SSH aceito apenas da Gerência (.224/28) e da Equipe (.128/26)."));
  c.push(B("**Usuário local** com `secret` (hash), **enable secret**, `service password-encryption` e `security passwords min-length 10`."));
  c.push(B("**login block-for 120 attempts 3 within 60**: após 3 senhas erradas em 60 s, o roteador bloqueia novos logins por 2 minutos (contra força bruta)."));
  c.push(B("**exec-timeout 5 0** no console e nas VTY, e banner MOTD de acesso restrito."));
  c.push(B("Switches gerenciados apenas pela VLAN 99, com VLAN 1 desligada, portas sem uso em shutdown na VLAN 999 e port-security sticky nas portas de campo — se alguém trocar um sensor por um notebook no armário da praça, a porta é desativada."));

  // ---------- 8 running-config
  c.push(H1("8. Trechos do show running-config"));
  c.push(P("Os trechos abaixo correspondem à configuração aplicada. As senhas aparecem como hash (`secret 5 …`) ou cifradas (`7 …`) na saída real do equipamento.", { run: { size: 19 } }));
  const R = cfg("R-SAMPASENSE.txt");
  c.push(H2("8.1 R-SAMPASENSE — subinterfaces, NAT e rota padrão"));
  c.push(code(`R-SAMPASENSE#show running-config
${section(R, /^interface GigabitEthernet0\/0$/, /^interface GigabitEthernet0\/2/).replace(/^!$/gm, "!")}
ip nat inside source list 1 interface GigabitEthernet0/1 overload
ip route 0.0.0.0 0.0.0.0 203.0.113.2`, "router-on-a-stick + NAT/PAT"));
  c.push(SP());
  c.push(H2("8.2 R-SAMPASENSE — DHCP"));
  c.push(code(section(R, /^ip dhcp excluded-address/, /^! -+ ACL 1/), "pools por VLAN"));
  c.push(SP());
  c.push(H2("8.3 R-SAMPASENSE — ACLs"));
  c.push(code(section(R, /^access-list 1 remark/, /^! -+ Interfaces/).replace(/^! -+.*\n/gm, "").replace(/^! (Aplicada|a pagina).*\n/gm, ""), "ACL_CIDADAO, ACL_CIDADAO_EMERGENCIA, ACL_SERVIDORES, NAT e VTY"));
  c.push(SP());
  c.push(H2("8.4 R-SAMPASENSE — senhas, SSH e linhas"));
  c.push(code(`hostname R-SAMPASENSE
service password-encryption
security passwords min-length 10
enable secret 5 $1$mERr$.......................   (hash gerado)
username admin privilege 15 secret 5 $1$mERr$..........
ip domain-name sampasense.sp.gov.br
ip ssh version 2
ip ssh time-out 60
ip ssh authentication-retries 3
login block-for 120 attempts 3 within 60
banner motd ^CACESSO RESTRITO - Rede SampaSense / Smart Sampa ...^C
!
line con 0
 exec-timeout 5 0
 logging synchronous
 login local
line vty 0 4
 access-class 10 in
 exec-timeout 5 0
 logging synchronous
 login local
 transport input ssh`, "acesso administrativo"));
  c.push(SP());
  const SB = cfg("SW-BASE.txt");
  c.push(H2("8.5 SW-BASE — VLANs, trunk e portas de acesso"));
  c.push(code(`${section(SB, /^vlan 10$/, /^interface GigabitEthernet0\/2/)}
${section(SB, /^interface range FastEthernet0\/1 - 8/, /^interface range FastEthernet0\/9/)}
interface Vlan99
 description Gerencia do switch
 ip address ${N}.226 255.255.255.240
ip default-gateway ${N}.225`, "SW-BASE"));
  c.push(SP());
  const SPR = cfg("SW-PRACA.txt");
  c.push(H2("8.6 SW-PRACA — AP público e portas de campo"));
  c.push(code(`${section(SPR, /^interface FastEthernet0\/1$/, /^interface range FastEthernet0\/9 - 24/)}`, "SW-PRACA"));

  // ---------- 9 testes
  c.push(PB());
  c.push(H1("9. Testes"));
  c.push(P("Cada teste traz o objetivo, os comandos executados, o resultado obtido e os prints do Packet Tracer como evidência. Os testes 9.1 a 9.5 são os exigidos pelo enunciado; 9.6 a 9.8 são extras que reforçam a segurança."));
  const tests = [
    ["9.1 Ping entre VLANs", "Provar o roteamento entre VLANs pelo router-on-a-stick.",
      `PC-OPERADOR-1 (VLAN 10) > ping ${N}.194      (SRV-SAMPASENSE, VLAN 30)\nPC-OPERADOR-1 (VLAN 10) > ping ${N}.226      (SW-BASE, VLAN 99)`,
      "O primeiro ping de cada destino perdeu pacotes enquanto o ARP era resolvido; a repetição teve 0% de perda tanto para o servidor (VLAN 30) quanto para o switch (VLAN 99). TTL 127 confirma a passagem pelo roteador.",
      [["91a_ping_vlans", "91b_ping_vlans"]], "PC-OPERADOR-1 (VLAN 10) alcançando a VLAN 30 e a VLAN 99"],
    ["9.2 PC recebendo IP por DHCP", "Provar que cada VLAN tem seu pool e que os clientes recebem endereço automaticamente.",
      `CELULAR-CIDADAO > ipconfig /all\nPC-OPERADOR-1   > ipconfig /all\nR-SAMPASENSE#show ip dhcp binding`,
      `Celular recebeu ${N}.6/25 (gateway ${N}.1) e o operador ${N}.134/26 (gateway ${N}.129), ambos com DNS ${N}.194. O binding lista 9 clientes nas VLANs 10, 20, 30 e 99, todos fora das faixas excluídas.`,
      [["92a_ipconfig_celular", "92b_ipconfig_operador"], ["92c_dhcp_binding"]], "ipconfig do celular (VLAN 20) e do operador (VLAN 10) e show ip dhcp binding"],
    ["9.3 Página abrindo pelo nome", "Provar DNS + HTTP do servidor da solução, acessados pelo Wi-Fi do cidadão.",
      `CELULAR-CIDADAO > Web Browser > http://www.sampasense.sp`,
      "O nome foi resolvido pelo DNS do SRV-SAMPASENSE e a página com a Ficha da CitizenTech carregou no celular conectado ao Wi-Fi público.",
      [["93_pagina_nome"]], "Ficha da CitizenTech aberta pelo nome www.sampasense.sp"],
    ["9.4 NAT/PAT — show ip nat translations", "Provar que as redes internas saem para a internet traduzidas para 203.0.113.1.",
      `LAPTOP-CIDADAO > Web Browser > http://www.internet.com\nPC-OPERADOR-1  > ping 198.51.100.10\nR-SAMPASENSE#show ip nat translations`,
      `O laptop do cidadão abriu o site externo e o operador alcançou 198.51.100.10 com 0% de perda. A tabela de NAT mostra o endereço interno ${N}.7:1025 traduzido para o público 203.0.113.1:1025 — o R-ISP não tem rota para 192.168.0.0/16, então a resposta só volta graças ao PAT.`,
      [["94a_laptop_internet", "94b_ping_internet"], ["94c_nat_translations"]], "Acesso à internet simulada e tabela de traduções NAT/PAT"],
    ["9.5 Acesso barrado pela ACL", "Provar que o Wi-Fi do cidadão não alcança a VLAN Equipe.",
      `CELULAR-CIDADAO > ping ${N}.134      (PC-OPERADOR-1, VLAN Equipe)\nR-SAMPASENSE#show access-lists ACL_CIDADAO`,
      `O roteador respondeu “Destination host unreachable” e a linha “deny ip ${N}.0 0.0.0.127 ${N}.128 0.0.0.63” registrou 4 matches — exatamente os 4 pings bloqueados. As linhas permit de HTTP (25 matches) e DNS (5 matches) mostram que o portal continua acessível.`,
      [["95a_ping_bloqueado", "95b_show_acl"]], "Ping do cidadão para a Equipe barrado e contadores da ACL_CIDADAO"],
    ["9.6 Extra — SSH permitido e Telnet recusado", "Provar que o roteador só aceita administração por SSH.",
      `NOTEBOOK-ADMIN > ssh -l admin ${N}.225\nR-SAMPASENSE#exit\nNOTEBOOK-ADMIN > telnet ${N}.225`,
      "O SSH pediu a senha, exibiu o banner de acesso restrito e entregou o prompt R-SAMPASENSE#. O Telnet foi encerrado pelo roteador imediatamente, sem sequer pedir usuário ou senha (transport input ssh) — é assim que o Packet Tracer exibe a recusa.",
      [["96_ssh_telnet"]], "SSH aceito e Telnet encerrado pelo roteador"],
    ["9.7 Extra — VLANs, trunks e port-security", "Provar a segmentação e a proteção de portas nos dois switches.",
      `SW-BASE#show vlan brief\nSW-BASE#show interfaces trunk\nSW-BASE#show port-security\nSW-PRACA#show vlan brief\nSW-PRACA#show interfaces trunk\nSW-PRACA#show port-security`,
      "VLANs 10/20/30/99/999 com as portas corretas e portas sem uso na VLAN 999; trunks 802.1Q em G0/1 e G0/2 (SW-BASE) e G0/1 (SW-PRACA) com nativa 999 e só as VLANs necessárias; port-security ativo — no SW-PRACA cada equipamento de campo está travado em 1 MAC com ação shutdown.",
      [["97a_swbase_vlan", "97b_swbase_trunk"], ["97c_swbase_portsec", "97d_swpraca_vlan"], ["97e_swpraca_trunk", "97f_swpraca_portsec"]], "Verificação de VLANs, trunks e port-security em SW-BASE e SW-PRACA"],
    ["9.8 Extra — Modo emergência", "Provar que o Wi-Fi vira portal de alerta durante o alagamento.",
      `R-SAMPASENSE(config)#interface g0/0.20\nR-SAMPASENSE(config-subif)#no ip access-group ACL_CIDADAO in\nR-SAMPASENSE(config-subif)#ip access-group ACL_CIDADAO_EMERGENCIA in\nCELULAR-CIDADAO > http://www.internet.com                (Request Timeout)\nCELULAR-CIDADAO > http://www.sampasense.sp/alerta.html   (abre o alerta)`,
      "Com a ACL de emergência, a internet ficou indisponível no Wi-Fi da praça e o celular passou a alcançar apenas o portal de alerta com a rota segura e acessível. Ao final, a ACL_CIDADAO foi reaplicada e a configuração salva.",
      [["98a_acl_emergencia", "98b_internet_bloqueada"], ["98c_alerta"]], "Troca para o modo emergência, internet bloqueada e tela de alerta"],
  ];
  tests.forEach(([title, obj, cmd, exp, rows, caption], i) => {
    if (i > 0) c.push(PB());
    c.push(H2(title));
    c.push(P(`**Objetivo:** ${obj}`));
    c.push(code(cmd, "comandos executados"));
    c.push(new Paragraph({ spacing: { before: 100, after: 60 }, children: runs("**Resultado obtido:**") }));
    c.push(P(exp));
    rows.forEach((r) => c.push(shots(r)));
    c.push(figCaption(caption));
  });

  // ---------- 10 checklist
  c.push(PB());
  c.push(H1("10. Requisitos atendidos"));
  c.push(table(["Requisito do enunciado", "Como foi atendido", "Evidência"], [
    ["Faixa 192.168.X.0/24 com ≥ 3 sub-redes (Equipe, Cidadão, Servidores/Sensores)", `${N}.0/24 em 4 sub-redes VLSM + reserva`, "Seção 4"],
    ["Uma VLAN por setor, trunk 802.1Q e router-on-a-stick", "VLANs 10/20/30/99 (+999 nativa); trunks SW-BASE↔R e SW-BASE↔SW-PRACA; subinterfaces G0/0.x", "Seções 5, 8.1, 9.7"],
    ["DHCP com um pool por VLAN, excluindo gateway e servidor", "4 pools; excluded-address por sub-rede", "Seções 6.1, 8.2, 9.2"],
    ["NAT/PAT até roteador provedor com servidor externo", "PAT overload em G0/1; R-ISP + WEB-INTERNET", "Seções 6.2, 9.4"],
    ["Servidor da solução com DNS e HTTP (página com a Ficha)", "SRV-SAMPASENSE com 4 registros DNS e index.html", "Seções 6.3, 9.3"],
    ["ACL estendida: cidadão só HTTP/DNS do servidor e internet, nada da Equipe", "ACL_CIDADAO na entrada da G0/0.20", "Seções 7.2, 9.5"],
    ["Roteador só por SSH, com senhas e enable secret", "SSH v2, transport input ssh, access-class, enable secret, login local", "Seções 7.5, 8.4, 9.6"],
    ["Wi-Fi com WPA2", "WPA2-PSK/AES no AP-WIFI-LIVRE-SP", "Seção 6.4"],
    ["Testes: ping entre VLANs, DHCP, página pelo nome, NAT, acesso barrado", "Testes 9.1 a 9.5 com prints (+ 3 testes extras)", "Seção 9"],
  ], [3400, 4038, 2200], { zebra: true, size: 17 }));

  c.push(H1("11. Referências"));
  c.push(link("Tecnoblog — Câmeras do Smart Sampa foram expostas em vazamento; MP investiga (out/2026)", "https://tecnoblog.net/noticias/smart-sampa-teve-imagens-de-cameras-expostas-em-vazamento/"));
  c.push(link("Canaltech — Falha no Smart Sampa expôs acesso a 58 mil câmeras de SP por quase um ano (out/2026)", "https://canaltech.com.br/mercado/falha-no-smart-sampa-expos-acesso-a-58-mil-cameras-de-sp-por-quase-um-ano/"));
  c.push(link("Metrópoles — Governo confirma invasão a sistema da Defesa Civil de disparos de alertas (20/06/2026)", "https://www.metropoles.com/brasil/governo-confirma-invasao-a-sistema-da-defesa-civil-de-disparos-de-alertas"));
  c.push(link("Idec — Ataque à Defesa Civil expõe fragilidade de sistema crítico de alertas (jul/2026)", "https://idec.org.br/release/ataque-defesa-civil-expoe-fragilidade-de-sistema-critico-de-alertas"));
  c.push(link("SouBrasília — Hacker na Defesa Civil: como foi a invasão e o que se sabe do caso (jun/2026)", "https://soubrasilia.com/?p=6952"));
  c.push(P("Cisco Networking Academy — CCNA: Switching, Routing and Wireless Essentials (VLANs, inter-VLAN routing, DHCPv4, segurança de switch, WLAN) e Enterprise Networking, Security and Automation (ACLs, NAT).", { run: { size: 18 } }));
  c.push(P("Endereços 203.0.113.0/24 e 198.51.100.0/24 são faixas reservadas para documentação (RFC 5737), usadas aqui para simular a internet.", { run: { size: 18 } }));
  return c;
}

// =================================================================== TUTORIAL
function tutorial() {
  const c = [];
  c.push(new Paragraph({ style: "Title", children: [new TextRun("Tutorial — montando o .pkt do SampaSense")] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: `Network Architect Solutions · GS 2026.2 · Equipe ${X} (${N}.0/24) · entrega até 19/11, 23h55`, color: "6B7280", size: 20 })] }));
  c.push(callout(`**O que já está pronto:** configurações completas dos 4 equipamentos de rede (pasta configs/), páginas do servidor (pasta servidor/), diagrama da topologia e o documento de entrega com espaços para os prints.\n**O que vocês precisam fazer no Packet Tracer:** montar a topologia, colar as configurações, ajustar servidor, AP e clientes, rodar os testes, tirar os prints, salvar o .pkt e exportar o documento em PDF. Tempo estimado: 1h30 a 2h.\n**Número da equipe:** tudo foi gerado para a equipe ${X}. Se o número de vocês for outro, rodem \`python3 gerar_configs.py <numero>\` e \`python3 diagrama/topologia.py <numero>\` (ou peçam para regenerar).`));
  c.push(SP());

  c.push(H1("Passo 0 — Preparação"));
  c.push(...OL([
    "Instale o **Cisco Packet Tracer 8.2.x** (download gratuito em netacad.com / Skills for All, com login).",
    "Abra um arquivo novo e salve já como `GS_SampaSense_Equipe" + X + ".pkt`. Salve de novo a cada etapa (Ctrl+S).",
    "Deixe os arquivos `configs/*.txt` e `servidor/*.html` abertos num editor de texto (Bloco de Notas) para copiar e colar.",
  ]));

  c.push(H1("Passo 1 — Inserir os dispositivos"));
  c.push(P("Arraste cada equipamento da barra inferior para a área de trabalho e renomeie clicando no nome abaixo do ícone (ou em Config > Display Name). Organize como no diagrama: provedor em cima à direita, base embaixo à esquerda e praça embaixo à direita. Dá para desenhar retângulos coloridos (ferramenta Draw Rectangle) e rótulos (Place Note) para as zonas — fica bonito no print."));
  c.push(table(["Quantidade", "Onde fica no Packet Tracer", "Nomes"], [
    ["2", "Network Devices > Routers > 2911", "R-SAMPASENSE, R-ISP"],
    ["2", "Network Devices > Switches > 2960 (2960-24TT)", "SW-BASE, SW-PRACA"],
    ["1", "Network Devices > Wireless Devices > AccessPoint-PT", "AP-WIFI-LIVRE-SP"],
    ["2", "End Devices > Server-PT", "SRV-SAMPASENSE, WEB-INTERNET"],
    ["2", "End Devices > PC-PT", "PC-OPERADOR-1, PC-OPERADOR-2"],
    ["2", "End Devices > Laptop-PT", "NOTEBOOK-ADMIN, LAPTOP-CIDADAO"],
    ["1", "End Devices > Smartphone-PT", "CELULAR-CIDADAO"],
    ["4", "End Devices > IoT (ou PC-PT, se preferir o simples)", "SENSOR-AGUA, CAMERA-01, TOTEM-01, SEMAFORO-01"],
  ], [1300, 4800, 3538], { zebra: true }));
  c.push(SP(80));
  c.push(callout("**Dispositivos IoT com cabo:** sugestões de ícone — Water Level Monitor (sensor), Webcam (câmera), Siren ou Smart LED (totem) e um MCU/SBC ou PC-PT (semáforo). Em cada um: aba **Advanced** > **I/O Config** > **Network Adapter** = `PT-IOT-NM-1CFE` (placa FastEthernet). Se algum modelo não oferecer essa opção, use **PC-PT** renomeado: o requisito é de rede, e o PC-PT funciona igual para os testes.", "F0FDF4", "16A34A"));

  c.push(H1("Passo 2 — Cabear"));
  c.push(P("Use **Connections** (raio) e escolha o tipo de cabo; clique no dispositivo e escolha exatamente a porta indicada. Router–switch e switch–host: cobre direto. Router–router, router–servidor e switch–switch: cobre cruzado."));
  c.push(table(["Origem", "Destino", "Cabo"], cabling.map((r) => [r[0], r[1], r[2]]), [3300, 4000, 2338], { zebra: true }));
  c.push(SP(80));
  c.push(P("Os triângulos dos links ficam laranja por ~30 s e depois verdes. Use o botão **Fast Forward Time** (canto inferior direito) para acelerar. Os links do roteador ficam vermelhos até o `no shutdown` do Passo 3."));

  c.push(H1("Passo 3 — Colar as configurações nos switches e roteadores"));
  c.push(...OL([
    "Clique no equipamento > aba **CLI**. Se aparecer “Would you like to enter the initial configuration dialog? [yes/no]”, digite `no` e Enter. Aperte Enter até ver `Router>` / `Switch>`.",
    "Abra o arquivo correspondente: `R-SAMPASENSE.txt`, `R-ISP.txt`, `SW-BASE.txt`, `SW-PRACA.txt`. Copie **em blocos** (de um `!` até o próximo) e cole no CLI com o botão direito > Paste (ou Ctrl+V). Colar tudo de uma vez também funciona, mas em blocos fica fácil achar erros.",
    "Ordem recomendada: **SW-BASE → SW-PRACA → R-SAMPASENSE → R-ISP**.",
    "Na linha `crypto key generate rsa general-keys modulus 1024`, se o Packet Tracer perguntar “How many bits in the modulus”, responda `1024`.",
    "Confira se nenhuma linha voltou com `% Invalid input`. Se voltar, digite aquela linha à mão.",
    "O arquivo termina com `write memory` (salva a configuração). Faça isso nos 4 equipamentos.",
  ]));
  c.push(callout(`**Credenciais de laboratório** (anotem no README e troquem se quiserem):\nusuário \`admin\` / senha \`SampaSense@Admin26\` · enable secret \`SampaSense@Enable26\` · enable do R-ISP \`Provedor@Enable26\`.\nO console também pede usuário e senha (\`login local\`). Se errarem a senha 3 vezes no roteador, ele bloqueia login por 2 minutos (login block-for) — esperem ou usem Fast Forward Time.`, "FEF3C7", "D97706"));

  c.push(H1("Passo 4 — Servidor da solução (SRV-SAMPASENSE)"));
  c.push(...OL([
    `Desktop > **IP Configuration** > Static: IP \`${N}.194\`, máscara \`255.255.255.224\`, gateway \`${N}.193\`, DNS \`${N}.194\`.`,
    "Services > **HTTP**: deixe HTTP On. Em File Manager, clique em **edit** no `index.html`, apague o conteúdo e cole o arquivo `servidor/index.html`. Salve.",
    "Ainda em HTTP, clique em **New File**, nome `alerta.html`, cole `servidor/alerta.html` e salve.",
    "Services > **DNS**: DNS Service On. Adicione os registros do tipo **A Record** (Name + Address > Add):",
  ]));
  c.push(table(["Name", "Address"], dnsRecords.map((r) => [r[0], r[2]]), [4800, 4838]));
  c.push(SP(80));
  c.push(P("Opcional (segurança): em Services, desligue o que não for usado (FTP, EMAIL, etc.)."));

  c.push(H1("Passo 5 — Servidor externo (WEB-INTERNET)"));
  c.push(...OL([
    "Desktop > IP Configuration > Static: IP `198.51.100.10`, máscara `255.255.255.0`, gateway `198.51.100.1`.",
    "Services > HTTP > edite o `index.html` e cole `servidor/internet_index.html`.",
  ]));

  c.push(H1("Passo 6 — Wi-Fi com WPA2"));
  c.push(H3("Access Point"));
  c.push(...OL([
    "AP-WIFI-LIVRE-SP > Config > **Port 1**: SSID `WiFi-Livre-SP`.",
    "Authentication: **WPA2-PSK** · PSK Pass Phrase: `SampaSense2026` · Encryption Type: **AES**.",
  ]));
  c.push(H3("Celular do cidadão"));
  c.push(...OL([
    "CELULAR-CIDADAO > Config > **Wireless0**: SSID `WiFi-Livre-SP`, WPA2-PSK, mesma senha, AES; IP Configuration = **DHCP**.",
    "Em alguns segundos aparece a linha tracejada até o AP.",
  ]));
  c.push(H3("Laptop do cidadão (trocar a placa)"));
  c.push(...OL([
    "LAPTOP-CIDADAO > aba **Physical**: desligue o botão de energia, arraste a placa `PT-LAPTOP-NM-1CFE` para fora e arraste a `WPC300N` para o slot vazio. Ligue de novo.",
    "Config > Wireless0: mesmos SSID/WPA2-PSK/senha/AES e DHCP.",
  ]));

  c.push(H1("Passo 7 — Clientes cabeados por DHCP"));
  c.push(P("Em PC-OPERADOR-1, PC-OPERADOR-2, NOTEBOOK-ADMIN e nos 4 equipamentos de campo: Desktop (ou Config) > IP Configuration > **DHCP**. Deve aparecer “DHCP request successful”. Se der “DHCP failed”, clique em Static e de novo em DHCP."));
  c.push(callout("**Atenção à port-security do SW-PRACA:** as portas Fa0/2–8 aprendem o primeiro MAC e desligam a porta se outro aparelho for plugado (violation shutdown). Se precisarem trocar um equipamento de porta: `SW-PRACA(config)#interface fa0/X` → `shutdown` → `no switchport port-security mac-address sticky` → `switchport port-security mac-address sticky` → `no shutdown`. Isso também rende um print extra de segurança (`show port-security interface fa0/X`).", "FEF2F2", "DC2626"));

  c.push(H1("Passo 8 — Testes e prints"));
  c.push(P("Para recortar: **Win + Shift + S** (Windows) ou **Cmd + Shift + 4** (Mac). Faça cada teste na ordem e cole o print no quadro correspondente do documento de entrega (seção 9). Os comandos exatos e o resultado esperado estão lá; o resumo:"));
  c.push(table(["Teste", "Onde", "O que fazer"], [
    ["9.1 Ping entre VLANs", "PC-OPERADOR-1 > Desktop > Command Prompt", `ping ${N}.194 e ping ${N}.226`],
    ["9.2 DHCP", "CELULAR-CIDADAO e PC-OPERADOR-1 > Command Prompt; CLI do roteador", "ipconfig /all · show ip dhcp binding"],
    ["9.3 Página pelo nome", "CELULAR-CIDADAO > Web Browser", "http://www.sampasense.sp"],
    ["9.4 NAT", "LAPTOP-CIDADAO (browser) e PC-OPERADOR-1 (ping); depois CLI do R-SAMPASENSE", "http://www.internet.com · ping 198.51.100.10 · show ip nat translations"],
    ["9.5 Acesso barrado", "CELULAR-CIDADAO > Command Prompt; CLI do R-SAMPASENSE", `ping ${N}.134 · show access-lists ACL_CIDADAO`],
    ["9.6 SSH (extra)", "NOTEBOOK-ADMIN > Command Prompt", `ssh -l admin ${N}.225 · telnet ${N}.225`],
    ["9.7 VLAN/trunk (extra)", "CLI do SW-BASE / SW-PRACA", "show vlan brief · show interfaces trunk · show port-security"],
    ["9.8 Modo emergência (extra)", "CLI do R-SAMPASENSE + navegador do celular", "trocar a ACL da G0/0.20 e abrir http://www.sampasense.sp/alerta.html"],
  ], [2300, 3600, 3738], { zebra: true, size: 17 }));
  c.push(SP(80));
  c.push(callout("**Dicas para os prints:** o primeiro ping entre VLANs costuma perder 1–2 pacotes (ARP) — rode de novo e printe o segundo. O `show ip nat translations` só mostra algo logo depois de gerar tráfego (as traduções expiram), então abra a página e rode o comando em seguida. Para o 9.5, rode o `show access-lists` depois do ping bloqueado para aparecer o contador de matches. No 9.8, lembrem de voltar a `ACL_CIDADAO` antes de salvar o .pkt.", "EFF6FF", "2563EB"));

  c.push(H1("Passo 9 — Fechar a entrega"));
  c.push(...OL([
    "Em cada switch/roteador: `copy running-config startup-config` (ou `write memory`). Depois **File > Save** no Packet Tracer.",
    "Abra `SampaSense_NAS_Entrega.docx`: confira nomes, RMs e o link do repositório, e cole os prints nos quadros tracejados (apague o texto do quadro).",
    "**Arquivo > Exportar / Salvar como > PDF.**",
    "Um integrante envia no Teams (ou Portal) o **.pkt + o PDF** até **19/11, 23h55**.",
  ]));

  c.push(H1("Solução de problemas"));
  c.push(table(["Sintoma", "Causa provável", "Como resolver"], [
    ["Cliente não pega IP (DHCP failed)", "Trunk sem a VLAN, subinterface errada ou porta na VLAN errada", "SW: show interfaces trunk / show vlan brief · R: show ip interface brief · repetir DHCP"],
    ["Celular não conecta no Wi-Fi", "SSID/senha/criptografia diferentes do AP", "Conferir WPA2-PSK + AES + senha idêntica"],
    ["Ping entre VLANs falha", "Gateway errado no host ou G0/0 em shutdown", "ipconfig no host; show ip interface brief no roteador"],
    ["Página não abre pelo nome", "DNS desligado, registro faltando ou DNS do cliente ≠ .194", "Conferir Services > DNS e o ipconfig /all do cliente; testar http://IP"],
    ["show ip nat translations vazio", "Sem tráfego recente ou nat inside/outside faltando", "Gerar tráfego e rodar logo em seguida; show ip nat statistics"],
    ["SSH “Connection refused”", "Chave RSA não gerada, origem fora da ACL 10 ou senha errada", "show ip ssh · testar do NOTEBOOK-ADMIN · aguardar o bloqueio de 2 min"],
    ["Porta do SW-PRACA ficou laranja/vermelha (err-disabled)", "Port-security disparou", "show port-security · shutdown / no shutdown na porta"],
    ["% Invalid input ao colar", "Versão do Packet Tracer não aceita o comando", "Digitar a linha manualmente ou pular (ex.: login block-for, established) e anotar"],
  ], [2500, 3300, 3838], { zebra: true, size: 17 }));

  c.push(H1("Como cada item vira nota"));
  c.push(table(["Critério (peso)", "O que garante os pontos"], [
    ["Arquitetura e endereçamento (3)", "Topologia limpa com nomes, VLSM correto, tabelas das seções 3 e 4 coerentes com o .pkt"],
    ["Configuração (3)", "VLANs, trunks, subinterfaces, DHCP, NAT e servidor funcionando — prints 9.1 a 9.4"],
    ["Segurança (2)", "ACL_CIDADAO bloqueando, SSH only com enable secret, WPA2 — prints 9.5 e 9.6 (+ extras)"],
    ["Testes (2)", "Os 5 testes obrigatórios com print legível e o comando visível"],
  ], [3000, 6638], { zebra: true }));
  return c;
}

async function build(children, file, footerTxt) {
  const doc = new Document({
    creator: "Equipe SampaSense", title: footerTxt, styles, numbering,
    features: { updateFields: true },
    sections: [{ properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      footers: footer(footerTxt), children }],
  });
  fs.writeFileSync(path.join(OUT, file), await Packer.toBuffer(doc));
  console.log("ok", file);
}

(async () => {
  await build(entrega(), "SampaSense_NAS_Entrega.docx", "SampaSense · Network Architect Solutions · GS 2026.2");
  numCounter = 0;
  await build(tutorial(), "SampaSense_Tutorial_PacketTracer.docx", "SampaSense · Tutorial Packet Tracer");
})();
