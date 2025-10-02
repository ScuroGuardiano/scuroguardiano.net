---
title: Tworzenie nowej tablicy GPT na systemach opartych o jądro Linux
slug: tworzenie-nowej-tablicy-gpt-linux
lang: pl
date: 2025-10-02
description: Jak w łatwy i prosty sposób stworzyć nową tablicę partycji GPT?
---
Załóżmy taki problem: próbujesz zainstalować nowiutką wersję systemu operacyjnego Linux Mint,
ale w trakcie instalacji zostaje wyrzucony jakiś błąd przy partycjonowaniu. To nie jest
odosobniony przypadek, zdarzyć się może każdemu! Dlatego oto prezentuję tutaj prosty fix.

## LiveCD
Najpierw musisz zbootować jakąś dystrybucję Linuxa LiveCD, masz już LiveCD Minta, ale to
nie jest wystarczająco potężne LiveCD. Pobierz zatem [Arch Linux-a!](https://archlinux.org/download/)
Następnie wrzuć go na bootowalnego pendrive'a i zbootuj go. Ukaże Ci się konsola, ale się nie bój!
To jest kompleksowy poradnik krok po kroku.

Na początku potrzebujesz narzędzi, zwiększ ilość dostępnego miejsca dla archiso:
```sh
mount -o remount,size=2G /run/archiso/cowspace 
```
Następnie zainstaluj potrzebne nam pakiety:
```sh
sudo pacman -Syu neovim gcc
```

## Identyfikacja dysku
Wpierw musisz zidentyfikować swój dysk. Użyj do tego komendy `lsblk`, wyświetli Ci coś takiego:
```
root@archiso ~ # lsblk          
NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS
loop0    7:0    0 946.7M  1 loop /run/archiso/airootfs
sr0     11:0    1   1.4G  0 rom  /run/archiso/bootmnt
vda    254:0    0    40G  0 disk 
├─vda1 254:1    0    12G  0 part 
├─vda2 254:2    0    18G  0 part 
└─vda3 254:3    0    10G  0 part 
```

W moim przypadku jest to `/dev/vda`. Musisz się troszeczkę domyślić, który dysk to poprawny dysk, zazwyczaj
patrząc na jego rozmiar. Pamiętaj, żeby wziąć dysk, a nie partycję!
Przy okazji zauważ te 3 partycję - ich właśnie będę chciał się pozbyć.

## Struktura GPT
Tablica GPT zajmuje pierwsze 34 sektory na dysku i ostatnie 33 sektory, które są backupem tej tablicy.
A zatem, żeby wpierw wyczyścić tablicę partycji, musimy wyzerować te sektory. Napiszemy do tego program!

Otwórz edytor neovim i utwórz nowy plik: `neovim gpt.c`. Na samym początku dodaj potrzebne nam biblioteki oraz utwórz pustą funkcję main:
> [NOTE!] Jeżeli nie potrafisz używać neovima, [pod tym linkiem znajduje się szybki poradnik](https://neovim.io/doc/user/starting.html)
```c
#include <stdio.h>
#include <sys/ioctl.h>
#include <sys/stat.h>
#include <linux/fs.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdint.h>
#include <string.h>
#include <stdlib.h>
#include <time.h>
#include <errno.h>

int main()
{

    return 0;
}
```

## Pobranie rozmiaru dysku i rozmiaru sektora
Aby wyczyścić tablicę GPT musimy wpierw pobrać rozmiar dysku i sektora, za pomocą których obliczymy odpowiednie pozycje.

Użyjemy do tego celu ***IOKTLA*** (`ioctl`). Użyjemy następujących operacji:
- **`BLKGETSIZE64`** - pobranie rozmiaru dysku
- **`BLKSSZGET`** - pobranie rozmiaru sektora.

Ale najpierw musimy otworzyć deksryptor pliku do naszego dysku, robimy to za pomocą przerwania systemowego `open`,
dostępnego w bibliotece `fcntl.h`. Sprawdzimy też czy nie dostaniemy błędu, np. w wyniku braku uprawnień!
Umieść ten kod w funkcji main, przed `return 0`:

```c
  // Zamień `/dev/vda` na ścieżkę do swojego dysku.
	int driveFd = open("/dev/vda", O_RDWR | O_SYNC);

	if (driveFd == -1)
	{
		printf("Error opening /dev/vda: %d -> %s", errno, strerror(errno));
	}
```

Otwieramy dysk z flagami:
- **`O_RDWR`** - read-write, pozwala zarówno na odczyt, jak i zapisywanie
- **`O_SYNC`** - zapisy będą synchronizowane od razu na dysk, nie będziemy musieli wpisywać `fsync` po operacjach.

Teraz możemy pobrać rozmiar dysku i sektora używając `ioctl`. W ten sposób pobiera się te dwie dane:
```c
	uint64_t driveSize;
	int sectorSize;

	int rc = ioctl(driveFd, BLKGETSIZE64, &driveSize);
	if (rc == -1)
	{
		printf("Error ioctling /dev/vda: %d -> %s", errno, strerror(errno));
	}

	rc = ioctl(driveFd, BLKSSZGET, &sectorSize);
	if (rc == -1)
	{
		printf("Error ioctling /dev/vda: %d -> %s", errno, strerror(errno));
	}

	printf("Rozmiar dysku: %llu, rozmiar sektora: %d\n", driveSize, sectorSize);

```

Wypiszemy też póki co te rozmiary, zanim przejdziemy dalej, sprawdzimy poprawność dzięki temu.

Skompiluj aplikację za pomocą `gcc gpt.c -o gpt` i uruchom poprzez `./gpt`. W moim przypadku dostaję taki wynik:
```
root@archiso ~ # ./gpt
Rozmiar dysku: 42949672960, rozmiar sektora: 512
```

## Czyszczenie tablicy GPT
Teraz możemy przejść do czyszczenie tablicy GPT. Musimy obliczyć parę rzeczy:
- ilość danych do usunięcia z początku dysku: `rozmiar_sektora * 34`
- ilość danych do usunięcia z końca dysku: `rozmiar_sektora * 33`
- offset, na którym znajduje się końcowa tabela: `rozmiar_dysku - ilosc_do_usuniecia_z_konca`

Obliczmy sobie te wartości w kodzie:
```c
	int gptSizeInBytes = sectorSize * 34;
	int gptBackupSizeInBytes = sectorSize * 33;
	uint64_t gptBackupOffset = driveSize - gptBackupSizeInBytes;
```

utwórzmy sobie też bufor z samymi zerami, z którego zapiszemy dane na dysk:
```c
	uint8_t* buff = malloc(gptSizeInBytes);
	memset(buff, 0, gptSizeInBytes);
```

Teraz możemy użyć funkcji `write` oraz `lseek` z biblioteki `unistd.h` aby wyzerować obie tablice partycji:
```c
	write(driveFd, buff, gptSizeInBytes); // Czyścimy początkową tablicę GPT
	lseek(driveFd, gptBackupOffset, SEEK_SET); // Przechodzimy do zapasowej tablicy GPT
	write(driveFd, buff, gptBackupSizeInBytes); // Czyścimy zapasową tablicę GPT
```

W ten sposób wyczyściliśmy tablicę partycji GPT!

## Tworzenie nowej tablicy GPT
Teraz musimy stworzyć nową tablicę GPT. Używając [dokumentacji z uefi.org](https://uefi.org/specs/UEFI/2.10/05_GUID_Partition_Table_Format.html)
wypełnimy poszczególne sekcje tablicy GPT. Utwórz na górze następującą strukturę:
```c
struct gpt_header
{
	uint64_t signature;
	uint32_t revision;
	uint32_t headerSize;
	uint32_t headerCrc32;
	uint32_t reserved;
	uint64_t myLba;
	uint64_t alternateLba;
	uint64_t firstUsableLga;
	uint8_t diskGuid[16];
	uint64_t paritionEntryLba;
	uint32_t numberOfParitionEntries;
	uint32_t sizeOfPartitionEntry;
	uint32_t partitionEntryArrayCrc32;
};
```

Potrzebujemy także funkcji do obliczenia CRC32, skopiuj ją po prostu [stąd](https://gist.github.com/xobs/91a84d29152161e973d717b9be84c4d0) i wklej chamsko do kodu:
```c
/* crc32.c -- compute the CRC-32 of a data stream
 * Copyright (C) 1995-1998 Mark Adler
 * For conditions of distribution and use, see copyright notice in zlib.h
 */

unsigned int crc32(const unsigned char *message, unsigned int len) {
   int i, j;
   unsigned int byte, crc, mask;

   i = 0;
   crc = 0xFFFFFFFF;
   while (i < len) {
      byte = message[i];            // Get next byte.
      crc = crc ^ byte;
      for (j = 7; j >= 0; j--) {    // Do eight times.
         mask = -(crc & 1);
         crc = (crc >> 1) ^ (0xEDB88320 & mask);
      }
      i = i + 1;
   }
   return ~crc;
}
```
Wypełnij teraz część tablicy GPT odpowiednimi danymi:
```c
	// Tworzymy nową partycję GPT
	struct gpt_header header;
	header.signature = 0x5452415020494645; // Sygnatura, która w ASCII wygląda tak: "EFI PART"
	header.revision = 0x00010000;	       // Wersja headera - to wartość dla 1.0
	header.headerSize = 92;			// Rozmiar nagłówka, u nas damy 92 bajty, to minimum
	header.headerCrc32 = 0;			// CRC domyślnie ustawione na 0
	header.reserved = 0;			// musi być na zero
	header.myLba = 1;			// LBA, tutaj będzie 1
	header.alternateLba = (driveSize / sectorSize) - 1; // LBA backupu, jest to ostatni sektor dysku
	header.firstUsableLba = 2048;		// Taka konwencja czy coś, że dysk ma 1MB przerwy od tablicy do danych. OS może sobie cosik tutaj zapisywać
	header.lastUsableLba = header.alternateLba - 33; // Ostatni użyteczny LBA, ten przed backupowym headerem. Jest to LBA -34, a że header to -1 to odejmujemy 33
	header.partitionEntryLba = 2;		// zaraz za headerem
	header.numberOfPartitionEntries = 128;  // domyślne
	header.sizeOfPartitionEntry = 128;	// domyślne
```

Do tego musimy obliczyć CRC dla naszej pustej tablicy partycji, skorzystamy z `buff` i arytmetyki wskaźników:
```c
	// Obliczenie CRC dla tablicy partycji
	header.partitionEntryArrayCrc32 = crc32(buff + sectorSize * 2, 32 * sectorSize);
```

Następnie generujemy GUID dysku, wersja 4, wariant 10, po prostu kleimy losowe bajty:
```c
	// Generowanie GUID
	srand((unsigned int) time(NULL));

	for (int i = 0; i < 16; i++)
	{
		header.diskGuid[i] = rand();
	}

	header.diskGuid[6] = (header.diskGuid[6] & 0x0F) | 0x40; // Wersja 4
	header.diskGuid[8] = (header.diskGuid[8] & 0x3F) | 0x80; // Wariant 10
```

Mając wszystkie dane możemy obliczyć CRC headera.
Należy pamiętać, żeby jako długość CRC przekazać wielkość naszego nagłówka, w naszym przypadku `92` bajty:
```c
	// Obliczenie CRC32 headera
	header.headerCrc32 = crc32((uint8_t*)&header, 92);

	// Skopiowanie headera z obliczonym crc do bufora
	memcpy(buff + sectorSize, &header, 92);
```

## Protective MBR
EFI ma też coś takiego jak protective MBR i bez tego niektóre programy się srają, więc dodajmy:
```c
	// Musimy też stworzyć odpowiednie MBR
	
	uint8_t* mbr = buff + 0x1BE;

	mbr[0] = 0x00; // Niebootowalne
	mbr[1] = 0x00;
	mbr[2] = 0x02;
	mbr[3] = 0x00; // 3 bajty CHS start, whatever
	mbr[4] = 0xEE; // type partycji - EFI Protective
	mbr[5] = 0xFF;
	mbr[6] = 0xFF;
	mbr[7] = 0xFF; // 3 bajty CHS end, whatever
	*((uint32_t*)mbr + 8) = 1; // starting LBA
	
	if (((driveSize / sectorSize) - 1) > 0xFFFFFFFF)
	{
		*((uint32_t*)mbr + 0x0C) = (driveSize / sectorSize) - 1; // rozmiar w sektorach
	}
	else
	{
		*((uint32_t*)mbr + 0x0C) = 0xFFFFFFFF;
	}

	buff[510] = 0x55; 
	buff[511] = 0xAA; // Sygnatura MBR

```

Używam tutaj wściekłego rzutowania wskaźników, wraz z okrutną arytmetyką wkaźników.
Ułatwia to zapisywanie odpowiednich danych do MBR-a.

## Zapisanie nowej tablicy GPT wraz z protective MBR
Możemy teraz zapisać dane na dysk:
```c
	lseek(driveFd, 0, SEEK_SET);
	write(driveFd, buff, gptSizeInBytes);
	lseek(driveFd, gptBackupOffset + 32 * sectorSize, SEEK_SET);
	write(driveFd, buff + sectorSize, sectorSize);
```

Pamiętaj aby wyczyścić zaalokowane zasoby i zamknąć plik!
```c
	close(driveFd);
	free(buff);
```

Finito. Teraz skompiluj program, używając `-O3` i `-march=native`, chcemy żeby było szybkie!
Następnie uruchom program!
```sh
gcc gpt.c -o gpt -O3 -march=native
./gpt
```

Możesz zweryfikować poprawność tablicy GPT za pomocą `gdisk`:
```
root@archiso ~ # gcc gpt.c -o gpt -O3 -march=native
root@archiso ~ # ./gpt
Rozmiar dysku: 42949672960, rozmiar sektora: 512
root@archiso ~ # gdisk /dev/vda
GPT fdisk (gdisk) version 1.0.10

Partition table scan:
  MBR: protective
  BSD: not present
  APM: not present
  GPT: present

Found valid GPT with protective MBR; using GPT.
```

Valid GPT, protective MBR. Wszystko działa, tak oto tworzymy nową tablicę partycji GPT w Linuxie!

Cały kod dostępny jest [tutaj](https://gist.github.com/ScuroGuardiano/7b76a50ab754f63bfe47a6bb0ee7f6a9).
