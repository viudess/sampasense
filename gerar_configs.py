#!/usr/bin/env python3
"""
SampaSense - Network Architect Solutions (GS 2026.2 FIAP)
Gera os scripts de configuracao IOS de todos os equipamentos a partir do
numero da equipe (X da faixa 192.168.X.0/24).

Uso:  python3 gerar_configs.py 77        -> gera configs/ para a equipe 77
"""
import sys, pathlib

X = int(sys.argv[1]) if len(sys.argv) > 1 else 77
OUT = pathlib.Path(__file__).parent / "configs"
OUT.mkdir(exist_ok=True)
N = f"192.168.{X}"

# ----------------------------------------------------------------- senhas (lab)
ENABLE = "SampaSense@Enable26"
ADMIN_USER, ADMIN_PASS = "admin", "SampaSense@Admin26"
DOMAIN = "sampasense.sp.gov.br"
BANNER = ("ACESSO RESTRITO - Rede SampaSense / Smart Sampa. "
          "Somente pessoal autorizado. Acesso indevido e crime (Lei 12.737/2012).")

COMMON_HARDEN = f"""no ip domain-lookup
ip domain-name {DOMAIN}
service password-encryption
security passwords min-length 10
enable secret {ENABLE}
username {ADMIN_USER} privilege 15 secret {ADMIN_PASS}
banner motd #{BANNER}#
"""

# ACL standard usada nas linhas VTY: SSH so a partir de Gerencia e Equipe
VTY_ACL = f"""access-list 10 remark SSH permitido somente da GERENCIA e da EQUIPE
access-list 10 permit {N}.224 0.0.0.15
access-list 10 permit {N}.128 0.0.0.63
access-list 10 deny any
"""

LINES = f"""crypto key generate rsa general-keys modulus 1024
ip ssh version 2
ip ssh time-out 60
ip ssh authentication-retries 3
!
line con 0
 login local
 exec-timeout 5 0
 logging synchronous
line vty 0 15
 access-class 10 in
 login local
 transport input ssh
 exec-timeout 5 0
 logging synchronous
"""

# =================================================================== ROTEADOR
router = f"""! ================================================================
! R-SAMPASENSE  (Cisco 2911)  - Base Comunitaria SampaSense
! Router-on-a-stick + DHCP + NAT/PAT + ACLs + SSH
! Equipe {X}  ->  faixa {N}.0/24
! Cole no modo EXEC privilegiado (Router#). Ver tutorial.
! ================================================================
enable
configure terminal
hostname R-SAMPASENSE
{COMMON_HARDEN}login block-for 120 attempts 3 within 60
!
! ---------------- DHCP: um pool por VLAN (exclui gateway e servidor)
ip dhcp excluded-address {N}.1 {N}.5
ip dhcp excluded-address {N}.129 {N}.133
ip dhcp excluded-address {N}.193 {N}.199
ip dhcp excluded-address {N}.225 {N}.229
!
ip dhcp pool CIDADAO_WIFI
 network {N}.0 255.255.255.128
 default-router {N}.1
 dns-server {N}.194
ip dhcp pool EQUIPE
 network {N}.128 255.255.255.192
 default-router {N}.129
 dns-server {N}.194
ip dhcp pool SERVIDORES_SENSORES
 network {N}.192 255.255.255.224
 default-router {N}.193
 dns-server {N}.194
ip dhcp pool GERENCIA
 network {N}.224 255.255.255.240
 default-router {N}.225
 dns-server {N}.194
!
! ---------------- ACL 1: redes internas que saem para a internet (PAT)
access-list 1 remark Redes internas SampaSense traduzidas por PAT
access-list 1 permit {N}.0 0.0.0.255
!
! ---------------- ACL 10: quem pode abrir SSH no roteador
{VTY_ACL}!
! ---------------- ACL estendida do Wi-Fi do cidadao (entrada da VLAN 20)
ip access-list extended ACL_CIDADAO
 remark Permite o celular obter IP por DHCP
 permit udp any eq bootpc any eq bootps
 remark Cidadao acessa SOMENTE HTTP e DNS do servidor SampaSense
 permit tcp {N}.0 0.0.0.127 host {N}.194 eq www
 permit udp {N}.0 0.0.0.127 host {N}.194 eq domain
 remark Nada da VLAN EQUIPE
 deny ip {N}.0 0.0.0.127 {N}.128 0.0.0.63
 remark Nada de sensores, totens, semaforos, gerencia ou do proprio roteador
 deny ip {N}.0 0.0.0.127 {N}.0 0.0.0.255
 deny ip {N}.0 0.0.0.127 host 203.0.113.1
 remark Internet liberada
 permit ip {N}.0 0.0.0.127 any
!
! ---------------- ACL de MODO EMERGENCIA (portal de alerta / captive portal)
! Aplicada no lugar da ACL_CIDADAO quando ha alagamento: o Wi-Fi so entrega
! a pagina de alerta e a rota segura do servidor SampaSense.
ip access-list extended ACL_CIDADAO_EMERGENCIA
 remark Modo emergencia: Wi-Fi so alcanca o portal de alerta
 permit udp any eq bootpc any eq bootps
 permit tcp {N}.0 0.0.0.127 host {N}.194 eq www
 permit udp {N}.0 0.0.0.127 host {N}.194 eq domain
 deny ip any any
!
! ---------------- ACL de protecao da VLAN de Servidores/Sensores (saida p/ VLAN 30)
ip access-list extended ACL_SERVIDORES
 remark DHCP para os sensores
 permit udp any eq bootps any eq bootpc
 remark EQUIPE e GERENCIA administram servidores, totens e semaforos
 permit ip {N}.128 0.0.0.63 {N}.192 0.0.0.31
 permit ip {N}.224 0.0.0.15 {N}.192 0.0.0.31
 remark Qualquer outra origem: apenas portal (HTTP/HTTPS) e DNS do servidor
 permit tcp any host {N}.194 eq www
 permit tcp any host {N}.194 eq 443
 permit udp any host {N}.194 eq domain
 remark Respostas a conexoes iniciadas pela propria VLAN 30
 permit tcp any {N}.192 0.0.0.31 established
 permit icmp any {N}.192 0.0.0.31 echo-reply
 permit icmp any {N}.192 0.0.0.31 unreachable
 remark Ninguem mais fala com sensores/totens: evita disparo de alerta falso
 deny ip any any
!
! ---------------- Interfaces (router-on-a-stick)
interface GigabitEthernet0/0
 description TRUNK 802.1Q para SW-BASE G0/1
 no ip address
 no shutdown
!
interface GigabitEthernet0/0.10
 description VLAN10 EQUIPE - operadores
 encapsulation dot1Q 10
 ip address {N}.129 255.255.255.192
 ip nat inside
!
interface GigabitEthernet0/0.20
 description VLAN20 CIDADAO - Wi-Fi Livre SP publico
 encapsulation dot1Q 20
 ip address {N}.1 255.255.255.128
 ip nat inside
 ip access-group ACL_CIDADAO in
!
interface GigabitEthernet0/0.30
 description VLAN30 SERVIDORES e SENSORES
 encapsulation dot1Q 30
 ip address {N}.193 255.255.255.224
 ip nat inside
 ip access-group ACL_SERVIDORES out
!
interface GigabitEthernet0/0.99
 description VLAN99 GERENCIA
 encapsulation dot1Q 99
 ip address {N}.225 255.255.255.240
 ip nat inside
!
interface GigabitEthernet0/0.999
 description VLAN999 NATIVA sem uso (seguranca)
 encapsulation dot1Q 999 native
!
interface GigabitEthernet0/1
 description WAN para R-ISP (provedor)
 ip address 203.0.113.1 255.255.255.252
 ip nat outside
 no shutdown
!
interface GigabitEthernet0/2
 description SEM USO
 shutdown
!
! ---------------- NAT/PAT + rota padrao
ip nat inside source list 1 interface GigabitEthernet0/1 overload
ip route 0.0.0.0 0.0.0.0 203.0.113.2
!
! ---------------- SSH e linhas
{LINES}end
write memory
"""

# =================================================================== PROVEDOR
isp = f"""! ================================================================
! R-ISP  (Cisco 2911)  - Provedor simulando a internet
! NAO tem rota para {N}.0/24: o acesso so funciona gracas ao NAT/PAT
! ================================================================
enable
configure terminal
hostname R-ISP
no ip domain-lookup
enable secret Provedor@Enable26
banner motd #Roteador do PROVEDOR (internet simulada)#
!
interface GigabitEthernet0/0
 description Link para cliente SampaSense (R-SAMPASENSE G0/1)
 ip address 203.0.113.2 255.255.255.252
 no shutdown
!
interface GigabitEthernet0/1
 description Rede "internet" com servidor externo
 ip address 198.51.100.1 255.255.255.0
 no shutdown
!
line con 0
 exec-timeout 5 0
 logging synchronous
end
write memory
"""

VLANS = """vtp mode transparent
vlan 10
 name EQUIPE
vlan 20
 name CIDADAO_WIFI
vlan 30
 name SERVIDORES_SENSORES
vlan 99
 name GERENCIA
vlan 999
 name NATIVA_BLACKHOLE
"""

def trunk(intf, desc):
    return f"""interface {intf}
 description {desc}
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 10,20,30,99,999
 switchport nonegotiate
 no shutdown
"""

def switch_mgmt(ip):
    return f"""interface Vlan1
 no ip address
 shutdown
interface Vlan99
 description Gerencia do switch
 ip address {ip} 255.255.255.240
 no shutdown
ip default-gateway {N}.225
"""

sw_base = f"""! ================================================================
! SW-BASE  (Cisco 2960)  - Sala de operacao da Base SampaSense
! ================================================================
enable
configure terminal
hostname SW-BASE
{COMMON_HARDEN}!
{VLANS}!
{trunk("GigabitEthernet0/1", "TRUNK 802.1Q para R-SAMPASENSE G0/0")}!
{trunk("GigabitEthernet0/2", "TRUNK 802.1Q para SW-PRACA G0/1")}!
interface range FastEthernet0/1 - 8
 description VLAN10 EQUIPE - estacoes dos operadores
 switchport mode access
 switchport access vlan 10
 switchport port-security
 switchport port-security maximum 2
 switchport port-security mac-address sticky
 switchport port-security violation restrict
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
!
interface range FastEthernet0/9 - 12
 description VLAN30 SERVIDORES - rack da base
 switchport mode access
 switchport access vlan 30
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
!
interface FastEthernet0/24
 description VLAN99 GERENCIA - notebook do administrador de rede
 switchport mode access
 switchport access vlan 99
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
!
interface range FastEthernet0/13 - 23
 description PORTAS SEM USO (desligadas)
 switchport mode access
 switchport access vlan 999
 shutdown
!
{switch_mgmt(f"{N}.226")}!
{VTY_ACL}!
{LINES}end
write memory
"""

sw_praca = f"""! ================================================================
! SW-PRACA  (Cisco 2960)  - Armario de rua junto ao totem da praca
! ================================================================
enable
configure terminal
hostname SW-PRACA
{COMMON_HARDEN}!
{VLANS}!
{trunk("GigabitEthernet0/1", "TRUNK 802.1Q para SW-BASE G0/2")}!
interface FastEthernet0/1
 description VLAN20 CIDADAO - Access Point Wi-Fi Livre SP
 switchport mode access
 switchport access vlan 20
 spanning-tree portfast
 no shutdown
!
interface range FastEthernet0/2 - 8
 description VLAN30 SENSORES - nivel d'agua, camera, totem, semaforo
 switchport mode access
 switchport access vlan 30
 switchport port-security
 switchport port-security maximum 1
 switchport port-security mac-address sticky
 switchport port-security violation shutdown
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
!
interface range FastEthernet0/9 - 24
 description PORTAS SEM USO (desligadas)
 switchport mode access
 switchport access vlan 999
 shutdown
interface GigabitEthernet0/2
 description PORTA SEM USO (desligada)
 switchport mode access
 switchport access vlan 999
 shutdown
!
{switch_mgmt(f"{N}.227")}!
{VTY_ACL}!
{LINES}end
write memory
"""

files = {
    "R-SAMPASENSE.txt": router,
    "R-ISP.txt": isp,
    "SW-BASE.txt": sw_base,
    "SW-PRACA.txt": sw_praca,
}
for name, txt in files.items():
    (OUT / name).write_text(txt, encoding="utf-8")
print(f"Configs geradas para a equipe {X} em {OUT}")
