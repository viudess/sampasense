# SampaSense — Network Architect Solutions (GS 2026.2)

**Repositório:** https://github.com/viudess/sampasense

**Integrantes:** Anna Clara Ruggeri da Silva (RM565553) · Eduardo Viudes Chorro (RM564075) · Giovanna da Silva Santos (RM566301) · Giovanna Luiza Bento (RM563203) · Victor Tadashi Saito Barra (RM563582)

| Pasta / arquivo | Conteúdo |
|---|---|
| `configs/` | Configuração IOS pronta para colar: R-SAMPASENSE, R-ISP, SW-BASE, SW-PRACA |
| `servidor/` | `index.html` (Ficha), `alerta.html` (modo emergência) e `internet_index.html` (WEB-INTERNET) |
| `diagrama/` | Topologia (PNG/SVG) e o script que a gera |
| `saida/SampaSense_NAS_Entrega.docx` | Documento de entrega: colar os prints e exportar em PDF |
| `saida/SampaSense_Tutorial_PacketTracer.pdf` | Passo a passo para montar o .pkt |
| `gerar_configs.py`, `diagrama/topologia.py`, `build_docs.js` | Regeneram tudo para outro número de equipe |

Outro número de equipe (ex.: 7; sem número, o padrão é 77):
```
python3 gerar_configs.py 7
python3 diagrama/topologia.py 7
node build_docs.js 7        # requer: npm install docx
```
Credenciais de laboratório: admin / SampaSense@Admin26 · enable secret SampaSense@Enable26 · Wi-Fi WPA2: SampaSense2026
