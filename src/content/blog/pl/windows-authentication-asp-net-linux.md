---
title: Windows Authentication w ASP.NET hostowanym na Linuxie
slug: windows-authentication-asp-net-linux
lang: pl
date: 2025-04-23
description: Uwierzytelnienie za pomocą Windowsa brzmi cudownie, jeżeli chodzi o aplikacje intranetowe. Chyba, że chcemy to osiągnąć na Linuxie...
---

Windows Authentication to z pozoru bardzo fajna sprawa, użytkownik jest od razu autoryzowany do aplikacji webowej, to po
prostu działa. Sytuacja się zmienia, jeżeli chcemy hostować appkę na Linuxie. Ale dlaczego mielibyśmy hostować aplikację
na Linuxie? Noo na przykład, żeby nie płacić $1000 za licencję na Windows Server albo po po prostu to lepsze środowisko
do hostowania aplikacji. Zaczynamy!

# Rozważ czy to dobre rozwiązanie
Windows Authentication nie jest idealnym rozwiązaniem. Kilka problemów z tym:
- Na Firefox nie działa OOTB i sposób włączania tego, czyli konieczność grzebania w `about:config` praktycznie wyklucza
  korzystanie z tego na Firefox.
- Na Microsoft Edge i Google Chrome OOTB będzie wymagało wpisywania loginu i hasła do systemu za każdym otwarciem
  przeglądarki. Rozwiązać to można dodając daną witrynę do witryn intranetu, więc jak mamy całkowitą kontrolę nad domeną
  to nie będzie aż takim problemem.
- Do poprawnego działania wymaga ustawienia SPN-ów w domenie. Bez nich na Linuxie nie zadziała.
- Zadziała w zasadzie tylko z klientami działającymi pod Windowsem, odpadają urządzenia mobilne, urządzenia Apple i
  Linuxy.
- Jest problematyczne w użyciu z reverse proxy.
- Maszyna, na której będzie hostowana aplikacja, musi być podpięta do domeny.

Bardzo dobrą alternatywną opcją jest Microsoft Entra ID, która rozwiązuje praktycznie wszystkie te problemy. Aczkolwiek
będzie wymagane przez użytkowników logowanie się do witryny tym, więc nie jest aż tak płynnym rozwiązaniem.

Dużą zaletą Windows Authentication jest to, że przy idealnej konfiguracji doświadczenie dla użytkowników będzie bardzo
przyjemne. Ale ta idealna konfiguracja wymaga dużych uprawnień w domenie, nie zawsze jest możliwość uzyskania takich
uprawnień w Active Directory, chociażby z powodu polityki firmy.

Jeżeli powyższe minusy Cię nie zniechęciły albo Microsoft Entra ID nie jest możliwym rozwiązaniem w Twoim przypadku to
zapnij pasy ;)

# Co musisz potrafić
- Tworzenie, konfiguracja i obsługa maszyn wirtualnych
- Podstawowa znajomość sieci komputerowych
- Instalacja systemu operacyjnego Windows, podstawowa konfiguracja, zmiana nazwy, dołączenie do domeny, konfiguracja
  sieci i DNS
- Instalacja systemu operacyjnego Windows Server, podstawowa konfiguracja i obsługa, konfiguracja sieci i DNS
- Dobra znajomość systemu operacyjnego opartego o jądro Linuxa
- Znajomość C# oraz Visual Studio lub innego IDE obsługującego .NET

# Stworzenie środowiska deweloperskiego
Do środowiska deweloperskiego będziemy potrzebować kilka maszyn wirtualnych połączonych w jedną sieć:
- Windows Server - będzie on kontrolerem domeny,
- Windows 10/11 Pro - tutaj będzie testowane uwierzytelnienie, zainstalujemy tutaj także Visual Studio i zaczniemy tworzenie
  aplikacji właśnie na Windowsie aby lepiej zrozumieć różnice w hostowaniu aplikacji między Windowsem, a Linuxem.
- Jakiś Linux - tutaj będziemy ostatecznie hostować aplikację.

Moja konfiguracja to:
- Domena - `TEMPLE.LOCAL`
- Windows Server 2019 Standard Evaluation - `VM1401.TEMPLE.LOCAL`, `10.69.3.101`
- Windows 10 Pro - `VM1402.TEMPLE.LOCAL`, `10.69.3.102`
- EndeavourOS - `VM1405.TEMPLE.LOCAL`, `10.69.3.105`

Poradnik będzie napisany w oparciu o moją konfigurację.

## Konfiguracja Windows Server i kontrolera domeny
> [!WARNING]
> UWAGA! To nie jest poradnik dla Windows Server, całość tutaj jest konfiguracją **wyłącznie** pod środowisko **deweloperskie**.
> Konfiguracja ta może nie być odpowiednio zabezpieczona ani przestrzegać dobrych praktyk dot. Windows Server!

1. Zainstaluj Windows Server Standard Evalution z Desktop Experience.
2. (opcjonalne) Ustaw sobie stałe IP na serwerze, w moim przypadku IP servera to będzie `10.69.3.101`
3. Zmień nazwę serwera na coś prostego, ułatwi to konfigurację później. U mnie ustawiłem na `VM1401`
4. Zainstaluj Active Directory:
    1. W Server Managerze kliknij Manage -> Add Roles and Features
    2. W Server Roles wybierz **Active Directory Domain Services** oraz **DNS Server**
    3. Przeklikaj "next" aż do końca, wybierz automatyczny restart po instalacji. Chwilkę to zajmie.
5. Po pomyślnym zainstalowaniu AD DS kliknij flagę z żółtym wykrzyknikiem, a w niej **Promote this server to a domain controller**.
6. Wybierz "Add a new forest", jako nazwę domeny daj co chcesz, u mnie to będzie `TEMPLE.LOCAL`.
7. Kliknij next, ustaw sobie hasło, a następnie przeklikaj się do końca, kliknij **Install**, serwer powinien się
   automatycznie zrestartować po tej operacji. Serwer może mielić przez jakieś 10 do 15 minut.
8. Utwórz użytkownika z uprawnieniami admina z domenie, przyda się:
    1. Wpisz w menu start **Active Directory Users and Computers**
    2. Kliknij prawym na **TWOJA.DOMENA -> Users**, wybierz **New -> User**
    3. Kliknij prawym na utworzonego użytkownika, wybierz **Properties**, następnie **Member Of**. Kliknij Add, wpisz
       `Admin`, kliknij **Check Names**, a potem OK.

### Konto domenowe jako admin na komputerach

Żeby mieć admina na maszynach na których zalogujemy się tym użytkownikiem trzeba zrobić jeszcze jeden krok:
1. Otwórz **Group Policy Management**. Przejdź do **Group Policy Objects** w swojej domenie,
   Kliknij prawym na **Default Domain Policy** i wybierz "Edit"
2. Przejdź do `Computer Configuration -> Policies -> Security Settings -> Restricted Groups`, klinij prawym, wybierz
   **Add group**, następnie **Browse**, wpisz `Admin`, kliknij **Check Names** kliknij OK.
3. Wyskoczy okienko, dodaj tutaj do grupy swojego użytkownika.

Powyższe instrukcje pozwolą także zalogować się przez RDP domenowym userem.

Na razie to tyle jeżeli chodzi o konfigurację domeny, ale jeszcze tu wrócimy na późniejszym etapie.

## Konfiguracja Windows 10
1. Zainstaluj Windows 10/11 **PRO**
2. Ustaw serwer DNS na adres kontrolera domeny - u mnie to `10.69.3.101`
3. Ustaw nazwę na coś prostego, u mnie będzie to `VM1402`. Dodaj go też do domeny wpisując jej nazwę w polu poniżej - u
   mnie `TEMPLE.LOCAL`. Będzie to wymagało restartu - zrób go.
4. Zaloguj się na użytkownika domenowego. U mnie to `TEMPLE\scuroguardiano`.
5. Zainstaluj środowisko do .NET i ASP.NET, ja użyję Visual Studio.

## Linux
> [!NOTE]
> Note: U mnie wszystko jest robione na EndeavourOS, które jest dystrybucją **Arch Linuxa**.  
> Cała konfiguracja domenowa tutaj pochodzi z [Arch Linux Wiki](https://wiki.archlinux.org/title/Active_Directory_integration)  
> Na innej dystrybucji konfiguracja może wyglądać inaczej, zajrzyj do dokumentacji od swojej dystrybucji.

Zainstaluj Linuxa, nazwij go jakoś rozpoznawalnie. U mnie to będzie `vm1405`,
następnie musisz go dołączyć do domeny. Oto poradnik dla Arch Linux:

### 1. Serwer DNS

Ustaw adres serwera DNS na adres Windows Server (u mnie `10.69.3.101`), a domeny wyszukiwania na swoją domenę - u mnie `temple.local`.
Dokładnych instrukcji nie podam, bo to zależy od tego czego używasz do sieci, ja robię to na KDE z NetworkManager,
więc wszedłem w ustawienia sieci i tam to wpisałem. Może być koniecznie zrestartowanie Twojego network managera.

Zweryfikuj poprawnie ustawienie pingując serwer po jego nazwie domenowej oraz za pomocą `nslookup`:
```sh
nslookup -type=SRV _kerberos._tcp.temple.local
nslookup -type=SRV _ldap._tcp.temple.local
```
   Output powinien wyglądać mniej więcej tak:
```
[scuroguardiano@vm1405 ~]$ nslookup -type=SRV _kerberos._tcp.temple.local
Server:         10.69.3.101
Address:        10.69.3.101#53

_kerberos._tcp.temple.local     service = 0 100 88 vm1401.temple.local.

[scuroguardiano@vm1405 ~]$ nslookup -type=SRV _ldap._tcp.temple.local   
Server:         10.69.3.101
Address:        10.69.3.101#53

_ldap._tcp.temple.local service = 0 100 389 vm1401.temple.local.
```

### 2. Konfiguracja NTP

Konfiguracja NTP - na wiki Arch Linuxa jest podana konfiguracja pod NTP, ale domyślnie mamy raczej timedatectl, więc
nie trzeba zmieniać usługi czasu, wystarczy zmodyfikować plik `/etc/systemd/timesyncd.conf`:

```conf
[Time]
NTP=vm1401.temple.local # adres Windows Sever
#FallbackNTP=0.arch.pool.ntp.org 1.arch.pool.ntp.org 2.arch.pool.ntp.org 3.arch.pool.ntp.org
RootDistanceMaxSec=30 # warto zwiększyć
#PollIntervalMinSec=32
#PollIntervalMaxSec=2048
#ConnectionRetrySec=30
#SaveIntervalSec=60
```

Następnie wymagany będzie restart `systemd-timesyncd`: `systemctl restart systemd-timesyncd`.  
Można zweryfikować konfigurację za pomocą `systemctl status systemd-timesyncd`, output powinien być mniej więcej
taki:

```
[scuroguardiano@vm1405 ~]$ systemctl status systemd-timesyncd
● systemd-timesyncd.service - Network Time Synchronization
Loaded: loaded (/usr/lib/systemd/system/systemd-timesyncd.service; enabled; preset: enabled)
Active: active (running) since Mon 2025-04-28 16:26:31 CEST; 4s ago
Invocation: e9634ccd608d4486a681033bd11dbd19
Docs: man:systemd-timesyncd.service(8)
Main PID: 806 (systemd-timesyn)
Status: "Contacted time server 10.69.3.101:123 (vm1401.temple.local)."
Tasks: 2 (limit: 9492)
Memory: 1.5M (peak: 2.4M)
CPU: 27ms
CGroup: /system.slice/systemd-timesyncd.service
└─806 /usr/lib/systemd/systemd-timesyncd
```

Widzimy tutaj, w `Status`, że skontaktowała się usługa z naszym serwerem.

### 3. Konfiguracja Samby

Zainstaluj `samba` oraz `smbclient`:
```
# pacman -S samba smbclient
```

Utwórz plik `/etc/krb5.conf` z taką zawartością, podstawiając swoje adresy domenowe:
```conf
[libdefaults]
  default_realm = TEMPLE.LOCAL
  dns_lookup_realm = false
  dns_lookup_kdc = true

[realms]
  INTERNAL.DOMAIN.TLD = {
    kdc = VM1401.TEMPLE.LOCAL
    default_domain = TEMPLE.LOCAL
    admin_server = VM1401.TEMPLE.LOCAL
  }
  INTERNAL = {
    kdc = VM1401.TEMPLE.LOCAL
    default_domain = TEMPLE.LOCAL
    admin_server = VM1401.TEMPLE.LOCAL
  }

[domain_realm]
  .internal.domain.tld = TEMPLE.LOCAL

[appdefaults]
  pam = {
    ticket_lifetime = 1d
    renew_lifetime = 1d
    forwardable = true
    proxiable = false
    minimum_uid = 1
  }
```

Utwórz plik `/etc/samba/smb.conf` z taką zawartością, podstawiając swoje adresy domenowe:
```
[global]
   workgroup = TEMPLE
   security = ADS
   realm = TEMPLE.LOCAL

   winbind refresh tickets = Yes
   vfs objects = acl_xattr
   map acl inherit = Yes
   store dos attributes = Yes

   # Allow a single, unified keytab to store obtained Kerberos tickets
   dedicated keytab file = /etc/krb5.keytab
   kerberos method = secrets and keytab

   # Do not require that login usernames include the default domain
   winbind use default domain = yes

   # Nie będziemy używać drukarek:
   load printers = no
   printing = bsd
   printcap name = /dev/null
   disable spoolss = yes
```

### 4. Dołącz do domeny i włącz sambę:
```
# net ads join -U Administrator
# systemctl enable --now smb
# systemctl enable --now nmb
# systemctl enable --now winbind
```

# Windows Authentication w ASP.NET

> [!NOTE]
> Dla aplikacji demonstracynej użyję aplikacji Blazor.

Stwórz aplikację Blazor:
![Visual Studio - Tworzenie aplikacji Blazor](https://scuroguardiano.net/assets/winauth/1.png)

W opcjach wyłącz HTTPS, nie potrzebujemy go.  
Dodaj pakiet `Microsoft.AspNetCore.Authentication.Negotiate` z NuGet:
![Visual Studio - dodawania pakietu z Nuget](https://scuroguardiano.net/assets/winauth/2.png)

Zmodyfikuj `Program.cs` aby wyglądał tak:
```cs
using Microsoft.AspNetCore.Authentication.Negotiate;
using WinAuth.Components;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

// Dodaj Windows Authentication
builder.Services.AddAuthentication(NegotiateDefaults.AuthenticationScheme)
    .AddNegotiate();

// To jest wymagane aby uzyskać dostęp do autoryzacji w Blazor
builder.Services.AddCascadingAuthenticationState();

// Wymagaj zalogowania aby uzyskać dostęp do każdej strony
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = options.DefaultPolicy;
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
}

// Dodaj stosowne middleware
app.UseAuthentication();
app.UseAuthorization();

app.UseAntiforgery();

app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
```

Zmień również zawartość pliku `Components/Pages/Home.razor` na:
```html
@page "/"

@using System.Security.Claims
@using Microsoft.AspNetCore.Components.Authorization

<PageTitle>Home</PageTitle>

<h1>Jesteś zalogowany jako: @Username</h1>

<h2>Claims:</h2>
@if (Claims.Any())
{
	<ul>
		@foreach(var claim in Claims)
		{
			<li>@claim.Type : @claim.Value</li>
		}
	</ul>
}

@code {
	public IEnumerable<Claim> Claims { get; set; } = Array.Empty<Claim>(); // lub [] od .NET 9
	public string Username = "";

	[CascadingParameter]
	private Task<AuthenticationState>? authenticationState { get; set; }

	protected override async Task OnInitializedAsync()
	{
		if (authenticationState is null) return;

		var authState = await authenticationState;
		Username = authState?.User?.Identity?.Name ?? "";
		Claims = authState?.User?.Claims ?? Array.Empty<Claim>(); // lub [] od .NET 9
	}
}
```

Uruchom teraz aplikację, jeżeli zrobiłeś wszystko poprawnie to powinieneś zobaczyć coś mniej więcej takiego:
![Edge - odpalona aplikacja z zalogowanym użytkownikiem](https://scuroguardiano.net/assets/winauth/3.png)

# NTLM vs Kerberos
W tym momencie nasza aplikacja zapewne używa NTLM dla autoryzacji. Widać to chociażby po nazwie zalogowanego
użytkownika. W przypadku NTLM jest to `DOMENA\user`, a w przypadku Kerberos będzie to `user@DOMENA.TLD`. Dla mojego
przykładu: `TEMPLE\scuroguardiano` dla NTLM oraz `scuroguardiano@TEMPLE.LOCAL` dla Kerberos.

Ma to znaczenie, gdyż na Linuxie **NTLM dla ASP.NET nie jest wspierane**, kropka. Przynajmniej takie było moje
doświadczenie, jakkolwiek bym nie próbował NTLM po prostu nie działało. Musi być używany Kerberos. A Kerberos ma swoje
wymagania, o których opowiem poniżej.

Dla debugowania dodałem sobie taki kod przed `app.UseAuthentication()`:
```cs
if (app.Environment.IsDevelopment())
{
    app.Use((ctx, next) =>
    {
        var authHeader = ctx.Request.Headers.Authorization.FirstOrDefault();
        if (authHeader is not null)
        {
            if (authHeader.StartsWith("Negotiate Y"))
            {
                Console.WriteLine("Auth using Kerberos");
            }
            else if(authHeader.StartsWith("Negotiate"))
            {
                Console.WriteLine("Auth using NTLM");
            }
        }

        return next(ctx);
    });
}
```

Nie działa on perfekcyjnie, ale robi robotę.

# Przenosimy aplikację na Linuxa!
Teraz spakuj swoją całą aplikację w zipa i przenieś ją na Linuxa, możesz to zrobić za pomocą `scp`:
```
scp projekt.zip user@adres_linuxa:/home/user/projekt.zip
```
U mnie:
```
scp WinAuth.zip scuroguardiano@10.69.3.105:/home/scuroguardiano/WinAuth.zip
```

W projekcie otwórz plik `Properties/launchSettings.json` i zmień `applicationUrl` na `0.0.0.0:1337`.
> [!WARNING]
> Używam tutaj `0.0.0.0` dla uproszczenia, to wystawia aplikację publicznie na wszystkich interfejsach sieciowych i może
> być potencjalnie niebezpieczne przy nieodpowiedniej konfiguracji firewalla. W naszym przypadku to bez znaczenia, bo
> jesteśmy na środowisku deweloperskim.


