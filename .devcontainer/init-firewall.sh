#!/bin/bash
# Pare-feu sortant du devcontainer (ADR 0010, design D10).
# Refus par défaut, liste blanche de domaines. Lancé au démarrage (postStartCommand).
# Inspiré du devcontainer de référence de Claude Code (anthropics/claude-code).
#
# Pour autoriser un nouveau service : ajouter son domaine à ALLOWED_DOMAINS, puis
# reconstruire ou redémarrer le conteneur. Toute modification passe par une PR.
set -euo pipefail
IFS=$'\n\t'

ALLOWED_DOMAINS=(
  # Paquets
  "registry.npmjs.org"
  # GitHub : en plus des plages publiées, certains noms se résolvent vers des IP non listées
  "github.com"
  "api.github.com"
  "codeload.github.com"
  "objects.githubusercontent.com"
  "raw.githubusercontent.com"
  # Agents de codage
  "api.anthropic.com"
  "api.openai.com"
  "auth.openai.com"
  "chatgpt.com"
  # Classifieur (ADR 0004)
  "openrouter.ai"
  # Expo (CLI, manifestes, tunnel exclu)
  "api.expo.dev"
  "exp.host"
  "expo.dev"
  "u.expo.dev"
  # Outils (mises à jour asdf/Node)
  "nodejs.org"
)
# GitHub (web, API, git) est aussi autorisé via ses plages IP publiées (api.github.com/meta).

# Ports de développement joignables depuis l'hôte (redirection de ports). Entrée seulement :
# les sorties restent limitées à la liste blanche.
DEV_PORTS=(8081 8082)

# 1. Conserver la résolution DNS interne de Docker avant de tout vider.
DOCKER_DNS_RULES=$(iptables-save -t nat | grep "127\.0\.0\.11" || true)

# Idempotent : on repart de politiques ouvertes le temps de la configuration.
iptables -P INPUT ACCEPT
iptables -P OUTPUT ACCEPT
iptables -P FORWARD ACCEPT
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X
ipset destroy allowed-domains 2>/dev/null || true

if [ -n "$DOCKER_DNS_RULES" ]; then
  iptables -t nat -N DOCKER_OUTPUT 2>/dev/null || true
  iptables -t nat -N DOCKER_POSTROUTING 2>/dev/null || true
  echo "$DOCKER_DNS_RULES" | xargs -L 1 iptables -t nat
fi

# 2. DNS, SSH (git) et boucle locale.
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A INPUT -p udp --sport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --sport 22 -m state --state ESTABLISHED -j ACCEPT
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

ipset create allowed-domains hash:net

# 3. Plages GitHub.
gh_ranges=$(curl -fsS --connect-timeout 10 https://api.github.com/meta)
echo "$gh_ranges" | jq -e '.web and .api and .git' >/dev/null || {
  echo "ERREUR : réponse inattendue de api.github.com/meta" >&2
  exit 1
}
while read -r cidr; do
  [[ "$cidr" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}/[0-9]{1,2}$ ]] || { echo "ERREUR : CIDR invalide $cidr" >&2; exit 1; }
  ipset add allowed-domains "$cidr" -exist
done < <(echo "$gh_ranges" | jq -r '(.web + .api + .git)[] | select(contains(":") | not)' | aggregate -q)

# 4. Domaines de la liste blanche (résolus à chaque démarrage).
for domain in "${ALLOWED_DOMAINS[@]}"; do
  ips=$(dig +short A "$domain" | grep -E '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' || true)
  if [ -z "$ips" ]; then
    echo "ERREUR : impossible de résoudre $domain" >&2
    exit 1
  fi
  while read -r ip; do
    ipset add allowed-domains "$ip" -exist
  done <<< "$ips"
  echo "Autorisé : $domain"
done

# 5. Réseau de l'hôte (redirection de ports, Metro ↔ simulateur).
HOST_IP=$(ip route | awk '/default/ {print $3; exit}')
[ -n "$HOST_IP" ] || { echo "ERREUR : IP de l'hôte introuvable" >&2; exit 1; }
HOST_NETWORK=$(echo "$HOST_IP" | sed 's/\.[0-9]*$/.0\/24/')
iptables -A INPUT -s "$HOST_NETWORK" -j ACCEPT
iptables -A OUTPUT -d "$HOST_NETWORK" -j ACCEPT
# Docker Desktop relaie les ports redirigés depuis une adresse hors de ce réseau.
for port in "${DEV_PORTS[@]}"; do
  iptables -A INPUT -p tcp --dport "$port" -j ACCEPT
done

# 6. Refus par défaut.
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT
iptables -A OUTPUT -j REJECT --reject-with icmp-admin-prohibited

# IPv6 : tout bloquer en sortie (hors boucle locale), la liste blanche est IPv4.
if command -v ip6tables >/dev/null && ip6tables -L >/dev/null 2>&1; then
  ip6tables -F
  ip6tables -A INPUT -i lo -j ACCEPT
  ip6tables -A OUTPUT -o lo -j ACCEPT
  ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
  ip6tables -P INPUT DROP
  ip6tables -P FORWARD DROP
  ip6tables -P OUTPUT DROP
fi

# 7. Auto-vérification : un domaine hors liste doit être bloqué, GitHub accessible.
if curl -s --connect-timeout 5 https://example.com >/dev/null 2>&1; then
  echo "ERREUR : example.com est joignable, le pare-feu ne bloque pas" >&2
  exit 1
fi
if ! curl -s --connect-timeout 5 https://api.github.com/zen >/dev/null 2>&1; then
  echo "ERREUR : api.github.com n'est pas joignable" >&2
  exit 1
fi
echo "Pare-feu actif : example.com bloqué, GitHub et liste blanche autorisés."
