---
title: Rozpoznawanie po nazwie hosta pomiędzy podsieciami
slug: rozpoznawanie-po-nazwie-hosta-pomiedzy-podsieciami
lang: pl
date: 2022-05-03
description: Jak forwardować mDNS-a?
---
Lub reflekcja mDNS z użyciem Avahi

## Problem
Załóżmy, że mamy dwie sieci:
- 192.168.0.0/24
- 192.168.1.0/24

Oraz kilka hostów:
- wordpress 192.168.0.2
- nginx 192.168.0.3
- gateway 192.168.0.1 192.168.1.1
- gaming_pc 192.168.1.34

Próbujemy pingować hosta *wordpress* z *gaming_pc*
```sh
[scuroguardiano@gaming_pc]$ ping wordpress
ping: wordpress: Name or service not known
```

Dostajemy błąd, ponieważ te hosty nie są w tej samej sieci. Można to naprawić używając **Avahi** oraz **mdns**.

## Rozwiązanie

> Notka: Zrobiłem to na Arch Linuxie używając systemd-resolved do rozpoznawania po nazwach. Musisz poszukać jak zainstalować Avahi na swojej dystrybucji. Jeżeli używasz innego klienta DNS niż systemd-resolved to musisz poszukać ja włączyć na nim mDNS.

## Instalacja i konfiguracja Avahi na hoście `gateway`
Instalujemy Avahi na hoście, który ma dostęp do obu sieci, w moim przypadku jest to `gateway`

```sh
# Na hoście gateway
sudo pacman -S avahi
sudo nano /etc/avahi/avahi-daemon.conf
```
Znajdź tę sekcję w pliku avahi-daemon.conf:
```conf
[reflector]
enable-reflector=no
#reflect-ipv=no
#reflect-filters=_airplay._tcp.local,_raop._tcp.local
```
i zmień `enable-reflector` na `yes`
```conf
enable-reflector=yes
```
Zapisz plik, wyjdź z nano i uruchom serwis avahi-daemon.service:
```sh
# Na hoście gateway
sudo systemctl enable --now avahi-daemon
```

## Włączenie mDNS na hostach
Trzeba jeszcze włączyć mDNS na hostach, żeby to zadziałało. W moim przypadku muszę włączyć mDNS na hoście *wordpress*. Aby to zrobić najpierw muszę wiedzieć na którym interfejsie chcę to włączyć. `ip addr` da nam listę interfejsów:
```sh
# wordpress
ip addr
```
I włączamy mDNS na poprawnym interfejsie:
```sh
# wordpress
sudo systemd-resolve --set-mdns=yes --interface <interface>
```
Na przykład:
```sh
# wordpress
sudo systemd-resolve --set-mdns=yes --interface ens18
```
Zby zweryfikować zmiany należy użyć
```sh
resolvectl status
```

## Bez systemd-resolved
Jeżeli nie używasz systemd-resolved to możesz po prostu zainstalować Avahi na hostach i użyć avahi:
```sh
# wordpress
sudo pacman -S avahi
sudo systemctl enable --now avahi
```

## I działa!
Teraz mogę zpingować wordpressa po jego nazwie z hosta `gaming_pc`:
```sh
# gaming_pc
ping wordpress.local
```
Jest to kompatybilne także z Windowsem:
```sh
# gaming_pc, System operacyjny: Windows
ping wordpress
```

