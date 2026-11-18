#!/usr/bin/env python3
"""Gera o diagrama de topologia (SVG + PNG) da rede SampaSense."""
import sys, subprocess, pathlib
X = int(sys.argv[1]) if len(sys.argv) > 1 else 77
N = f"192.168.{X}"
HERE = pathlib.Path(__file__).parent

W, H = 1600, 1000
C = {"v10": "#2563EB", "v20": "#EA580C", "v30": "#16A34A", "v99": "#7C3AED",
     "trunk": "#111827", "wan": "#6B7280", "ink": "#111827", "muted": "#4B5563"}
out = []
a = out.append
a(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" '
  'font-family="DejaVu Sans, Arial, sans-serif">')
a(f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>')
a(f'<text x="40" y="52" font-size="30" font-weight="700" fill="{C["ink"]}">SampaSense — Topologia da Base Comunitária (Equipe {X} · {N}.0/24)</text>')
a(f'<text x="40" y="82" font-size="17" fill="{C["muted"]}">Router-on-a-stick · trunks 802.1Q (nativa 999) · DHCP por VLAN · NAT/PAT · ACLs · SSH · Wi-Fi WPA2</text>')

def zone(x, y, w, h, title, color):
    a(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="18" fill="{color}" fill-opacity="0.06" '
      f'stroke="{color}" stroke-opacity="0.45" stroke-dasharray="8 6" stroke-width="2"/>')
    a(f'<text x="{x+18}" y="{y+30}" font-size="18" font-weight="700" fill="{color}">{title}</text>')

def line(x1, y1, x2, y2, color, w=3, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    a(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{w}"{d}/>')

def label(x, y, text, size=14, color=None, weight="400", anchor="middle"):
    color = color or C["ink"]
    a(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{color}" text-anchor="{anchor}" stroke="white" stroke-width="4" paint-order="stroke" stroke-linejoin="round">{text}</text>')

def router(x, y, name, sub, above=False):
    a(f'<circle cx="{x}" cy="{y}" r="38" fill="#0B3D91"/>')
    for dx, dy in [(-18, 0), (18, 0), (0, -18), (0, 18)]:
        a(f'<line x1="{x}" y1="{y}" x2="{x+dx}" y2="{y+dy}" stroke="white" stroke-width="4" stroke-linecap="round"/>')
    if above:
        top = y - 52 - 18 * len(sub)
        label(x, top - 4, name, 16, weight="700")
        for i, s in enumerate(sub):
            label(x, top + 16 + 18 * i, s, 13, C["muted"])
        return
    label(x, y + 62, name, 16, weight="700")
    for i, s in enumerate(sub):
        label(x, y + 82 + 18 * i, s, 13, C["muted"])

def switch(x, y, name, sub, side="left"):
    a(f'<rect x="{x-60}" y="{y-24}" width="120" height="48" rx="8" fill="#0F766E"/>')
    for i in range(5):
        a(f'<rect x="{x-46+i*20}" y="{y-6}" width="12" height="12" rx="2" fill="white" fill-opacity="0.85"/>')
    lx, anc = (x - 72, "end") if side == "left" else (x + 72, "start")
    label(lx, y - 2, name, 16, weight="700", anchor=anc)
    for i, s in enumerate(sub):
        label(lx, y + 16 + 17 * i, s, 13, C["muted"], anchor=anc)

def host(x, y, name, lines, color, kind="pc"):
    if kind == "server":
        a(f'<rect x="{x-20}" y="{y-30}" width="40" height="60" rx="5" fill="{color}"/>')
        for i in range(3):
            a(f'<rect x="{x-13}" y="{y-21+i*17}" width="26" height="8" rx="2" fill="white" fill-opacity="0.8"/>')
    elif kind == "ap":
        a(f'<rect x="{x-30}" y="{y-8}" width="60" height="22" rx="6" fill="{color}"/>')
        for r in (16, 28, 40):
            a(f'<path d="M {x-r*0.8} {y-10-r*0.35} Q {x} {y-10-r} {x+r*0.8} {y-10-r*0.35}" fill="none" stroke="{color}" stroke-width="3"/>')
    elif kind == "phone":
        a(f'<rect x="{x-13}" y="{y-24}" width="26" height="46" rx="5" fill="{color}"/>')
        a(f'<rect x="{x-9}" y="{y-18}" width="18" height="30" fill="white" fill-opacity="0.85"/>')
    elif kind == "iot":
        a(f'<rect x="{x-24}" y="{y-24}" width="48" height="48" rx="24" fill="{color}"/>')
        a(f'<circle cx="{x}" cy="{y}" r="8" fill="white" fill-opacity="0.9"/>')
    else:  # pc / laptop
        a(f'<rect x="{x-28}" y="{y-24}" width="56" height="36" rx="4" fill="{color}"/>')
        a(f'<rect x="{x-22}" y="{y-18}" width="44" height="24" fill="white" fill-opacity="0.85"/>')
        a(f'<rect x="{x-36}" y="{y+14}" width="72" height="8" rx="3" fill="{color}"/>')
    label(x, y + 46, name, 13.5, weight="700")
    for i, s in enumerate(lines):
        label(x, y + 63 + 16 * i, s, 12.5, C["muted"])

def port(x, y, text, anchor="middle"):
    label(x, y, text, 12, "#374151", anchor=anchor)

# ---------------- zonas
zone(1080, 110, 480, 300, "INTERNET SIMULADA (provedor)", C["wan"])
zone(40, 470, 720, 500, "BASE COMUNITÁRIA — sala de operação e rack", C["v10"])
zone(800, 470, 760, 500, "PRAÇA DA BANDEIRA — armário de rua do totem", C["v20"])

# ---------------- coordenadas
RS = (640, 250); RI = (1200, 250); WEB = (1440, 250)
SWB = (480, 560); SWP = (1150, 560)

# links
line(RS[0] + 38, RS[1], RI[0] - 38, RI[1], C["wan"], 4)
port(920, 236, "G0/1  203.0.113.1/30"); port(920, 290, "WAN /30  (ip nat outside)", )
port(RI[0] - 44, RI[1] - 14, "G0/0 .2", "end")
line(RI[0] + 38, RI[1], WEB[0] - 22, WEB[1], C["wan"], 3)
port(1320, 236, "G0/1 198.51.100.1/24")

line(RS[0], RS[1] + 38, SWB[0], SWB[1] - 24, C["trunk"], 6)
port(505, 372, "G0/0 ↔ G0/1", "middle")
port(505, 390, "TRUNK 802.1Q", "middle")
line(SWB[0] + 60, SWB[1], SWP[0] - 60, SWP[1], C["trunk"], 6)
port(815, 548, "G0/2 ↔ G0/1  ·  TRUNK 802.1Q (10,20,30,99 · nativa 999)")

router(RS[0], RS[1], "R-SAMPASENSE (2911)",
       ["G0/0.10  .129/26 · G0/0.20  .1/25", "G0/0.30  .193/27 · G0/0.99  .225/28",
        "NAT/PAT · DHCP · ACLs · SSH"], above=True)
router(RI[0], RI[1], "R-ISP (2911)", ["sem rota para 192.168 →", "só funciona via NAT"])
host(WEB[0], WEB[1], "WEB-INTERNET", ["198.51.100.10/24", "www.internet.com"], C["wan"], "server")
switch(SWB[0], SWB[1], "SW-BASE (2960)", [f"Gerência VLAN 99: {N}.226"])
switch(SWP[0], SWP[1], "SW-PRACA (2960)", [f"Gerência VLAN 99: {N}.227"], side="right")

# ---------------- hosts base
base = [
    (110, 800, "PC-OPERADOR-1", ["VLAN 10 · Fa0/1", "DHCP .134+"], C["v10"], "pc"),
    (270, 800, "PC-OPERADOR-2", ["VLAN 10 · Fa0/2", "DHCP"], C["v10"], "pc"),
    (450, 800, "SRV-SAMPASENSE", ["VLAN 30 · Fa0/9", f"{N}.194/27", "HTTP + DNS"], C["v30"], "server"),
    (640, 800, "NOTEBOOK-ADMIN", ["VLAN 99 · Fa0/24", "DHCP .230+", "SSH → rede"], C["v99"], "pc"),
]
for hx, hy, n, l, col, k in base:
    line(SWB[0], SWB[1] + 24, hx, hy - 32, col, 3)
    host(hx, hy, n, l, col, k)

# ---------------- hosts praça
AP = (930, 730)
line(SWP[0], SWP[1] + 24, AP[0], AP[1] - 8, C["v20"], 3)
host(AP[0], AP[1], "AP-WIFI-LIVRE-SP", ["VLAN 20 · Fa0/1", "SSID WiFi-Livre-SP", "WPA2-PSK (AES)"], C["v20"], "ap")
for wx, n in [(860, "CELULAR-CIDADAO"), (1010, "LAPTOP-CIDADAO")]:
    wy = 880
    line(AP[0], AP[1] + 96, wx, wy - 26, C["v20"], 2, "5 5")
    host(wx, wy, n, ["DHCP .6+"], C["v20"], "phone" if "CEL" in n else "pc")

iot = [
    (1135, 800, "SENSOR-AGUA", ["Fa0/2 · DHCP"]),
    (1255, 800, "CAMERA-01", ["Fa0/3 · DHCP"]),
    (1375, 800, "TOTEM-01", ["Fa0/4 · LED+sirene"]),
    (1495, 800, "SEMAFORO-01", ["Fa0/5 · DHCP"]),
]
for hx, hy, n, l in iot:
    line(SWP[0], SWP[1] + 24, hx, hy - 26, C["v30"], 3)
    host(hx, hy, n, ["VLAN 30"] + l, C["v30"], "iot")

# ---------------- legenda
lx, ly = 40, 120
a(f'<rect x="{lx}" y="{ly}" width="430" height="230" rx="12" fill="#F9FAFB" stroke="#E5E7EB"/>')
label(lx + 18, ly + 30, "Legenda e sub-redes (VLSM)", 16, weight="700", anchor="start")
leg = [
    (C["v20"], f"VLAN 20 CIDADÃO (Wi-Fi)   {N}.0/25"),
    (C["v10"], f"VLAN 10 EQUIPE                  {N}.128/26"),
    (C["v30"], f"VLAN 30 SERVIDORES/SENS. {N}.192/27"),
    (C["v99"], f"VLAN 99 GERÊNCIA             {N}.224/28"),
    (C["trunk"], "Trunk 802.1Q (nativa 999 sem uso)"),
    (C["wan"], "WAN 203.0.113.0/30 · Internet 198.51.100.0/24"),
]
for i, (col, t) in enumerate(leg):
    y = ly + 60 + i * 27
    line(lx + 18, y - 5, lx + 58, y - 5, col, 6 if col == C["trunk"] else 4)
    label(lx + 70, y, t, 13.5, anchor="start")

a('</svg>')
svg = HERE / "topologia.svg"
svg.write_text("\n".join(out), encoding="utf-8")
subprocess.run(["rsvg-convert", "-w", "2400", str(svg), "-o", str(HERE / "topologia.png")], check=True)
print("ok", svg)
