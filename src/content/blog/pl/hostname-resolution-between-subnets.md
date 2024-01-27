---
title: Rozpoznawanie po nazwie hosta pomiędzy podsieciami
slug: rozpoznawanie-po-nazwie-hosta-pomiedzy-podsieciami
lang: pl
date: 2022-05-03
description: Jak forwardować mDNS-a?
---
# Hostname resolution between subnets
Or mDNS reflection with Avahi

## The problem
Let's assume we have 2 networks
- 192.168.0.0/24
- 192.168.1.0/24

And let's assume we have some hosts:
- wordpress 192.168.0.2
- nginx 192.168.0.3
- gateway 192.168.0.1 192.168.1.1
- gaming_pc 192.168.1.34

We try to ping *wordpress* from *gaming_pc*
```sh
[scuroguardiano@gaming_pc]$ ping wordpress
ping: wordpress: Name or service not known
```

We can't ping it, because it's not in the same network. But we  can make it work by using **Avahi** and **mdns**.

# The Solution

> Note: I did it on Arch Linux with resolution made by systemd-resolved. You must find how to install Avahi on your distribution. And if you have different DNS than systemd-resoved you must search how to enable mdns on it aswell.

## Install and configure Avahi on `gateway`
We have to install avahi on machine that has access to both subnets. In our case it is gateway.

```sh
# On gateway
sudo pacman -S avahi
sudo nano /etc/avahi/avahi-daemon.conf
```
Find section in avahi-daemon.conf:
```conf
[reflector]
enable-reflector=no
#reflect-ipv=no
#reflect-filters=_airplay._tcp.local,_raop._tcp.local
```
and change `enable-refletor` to yes
```conf
enable-refletor=yes
```
Save the file, quit nano and start avahi-daemon.service:
```sh
# On gateway
sudo systemctl enable --now avahi-daemon
```

## Enable mdns on hosts
It won't work yet. You must enable mdns on hosts. In our example we will log into our *wordpress* and enable mdns. You must know which interface you want to change. Use `ip addr` to list them:
```sh
# on wordpress
ip addr
```
And enable mdns for correct one:
```sh
# on wordpress
sudo systemd-resolve --set-mdns=yes --interface <interface>
```
For example:
```sh
# on wordpress
sudo systemd-resolve --set-mdns=yes --interface ens18
```
You can verify changes with
```sh
resolvectl status
```

## Without systemd-resolved
If you don't have systemd-resolved just install and enable Avahi on hosts:
```sh
# on wordpress
sudo pacman -S avahi
sudo systemctl enable --now avahi
```

## It's working!
Now we can ping it from gaming_pc on Linux with
```sh
# on gaming_pc
ping wordpress.local
```
or from gaming_pc on Windows
```sh
# on gaming_pc
ping wordpress
```

