import { z } from "zod";

const forbiddenSecretKeyPattern = /(password|passwort|secret|otp|totp|token|recovery|privatekey|private_key)/i;
const allowedSecretReferenceFields = new Set(["passwordLocationHint"]);

export type ProviderCategory =
  | "identity"
  | "finance"
  | "commerce"
  | "communication"
  | "cloud"
  | "mobility"
  | "media"
  | "insurance"
  | "public"
  | "health"
  | "utilities"
  | "education"
  | "travel"
  | "productivity"
  | "social";

export type ProviderCatalogItem = {
  id: string;
  name: string;
  category: ProviderCategory;
  loginUrl: string;
  countryHint?: "DE" | "AT" | "CH" | "DACH" | "EU" | "GLOBAL";
};

type ProviderSeed = readonly [
  id: string,
  name: string,
  category: ProviderCategory,
  loginUrl: string,
  countryHint: NonNullable<ProviderCatalogItem["countryHint"]>,
];

const providerSeeds = [
  ["google", "Google Konto", "cloud", "https://accounts.google.com", "GLOBAL"],
  ["apple", "Apple Account", "cloud", "https://account.apple.com", "GLOBAL"],
  ["microsoft", "Microsoft Konto", "cloud", "https://login.microsoftonline.com", "GLOBAL"],
  ["amazon", "Amazon", "commerce", "https://www.amazon.de/ap/signin", "DE"],
  ["paypal", "PayPal", "finance", "https://www.paypal.com/signin", "GLOBAL"],
  ["ebay-de", "eBay Deutschland", "commerce", "https://signin.ebay.de", "DE"],
  ["netflix", "Netflix", "media", "https://www.netflix.com/login", "GLOBAL"],
  ["spotify", "Spotify", "media", "https://accounts.spotify.com", "GLOBAL"],
  ["youtube", "YouTube", "media", "https://www.youtube.com", "GLOBAL"],
  ["facebook", "Facebook", "social", "https://www.facebook.com/login", "GLOBAL"],
  ["instagram", "Instagram", "social", "https://www.instagram.com/accounts/login", "GLOBAL"],
  ["whatsapp-web", "WhatsApp Web", "communication", "https://web.whatsapp.com", "GLOBAL"],
  ["linkedin", "LinkedIn", "social", "https://www.linkedin.com/login", "GLOBAL"],
  ["x", "X", "social", "https://x.com/i/flow/login", "GLOBAL"],
  ["reddit", "Reddit", "social", "https://www.reddit.com/login", "GLOBAL"],
  ["tiktok", "TikTok", "social", "https://www.tiktok.com/login", "GLOBAL"],
  ["discord", "Discord", "communication", "https://discord.com/login", "GLOBAL"],
  ["zoom", "Zoom", "communication", "https://zoom.us/signin", "GLOBAL"],
  ["dropbox", "Dropbox", "cloud", "https://www.dropbox.com/login", "GLOBAL"],
  ["adobe", "Adobe Account", "productivity", "https://auth.services.adobe.com", "GLOBAL"],
  ["bund-id", "BundID", "identity", "https://id.bund.de", "DE"],
  ["elster", "ELSTER", "finance", "https://www.elster.de/eportal/login", "DE"],
  ["ausweisapp", "AusweisApp", "identity", "https://www.ausweisapp.bund.de", "DE"],
  ["arbeitsagentur", "Bundesagentur für Arbeit", "public", "https://www.arbeitsagentur.de/eservices", "DE"],
  ["deutsche-rentenversicherung", "Deutsche Rentenversicherung", "insurance", "https://www.eservice-drv.de", "DE"],
  ["zoll-portal", "Zoll-Portal", "public", "https://www.zoll-portal.de", "DE"],
  ["servicekonto-nrw", "Servicekonto.NRW", "identity", "https://servicekonto.nrw", "DE"],
  ["bayernportal", "BayernPortal", "public", "https://www.bayernportal.de", "DE"],
  ["hamburg-service", "Hamburg Serviceportal", "public", "https://serviceportal.hamburg.de", "DE"],
  ["serviceportal-bw", "Serviceportal Baden-Württemberg", "public", "https://www.service-bw.de", "DE"],
  ["berlin-service", "Service-Portal Berlin", "public", "https://service.berlin.de", "DE"],
  ["mein-justizpostfach", "Mein Justizpostfach", "public", "https://mein-justizpostfach.bund.de", "DE"],
  ["jobboerse", "Jobsuche der Arbeitsagentur", "public", "https://www.arbeitsagentur.de/jobsuche", "DE"],
  ["bafoeg-digital", "BAFOEG Digital", "education", "https://www.bafoeg-digital.de", "DE"],
  ["meineschufa", "MeineSCHUFA", "finance", "https://www.meineschufa.de/de/login", "DE"],
  ["deutsche-post", "Deutsche Post", "communication", "https://shop.deutschepost.de/login", "DE"],
  ["dhl", "DHL Kundenkonto", "commerce", "https://www.dhl.de/de/privatkunden/login.html", "DE"],
  ["deutsche-bahn", "Deutsche Bahn", "mobility", "https://int.bahn.de/login", "DE"],
  ["bahn-bonus", "BahnBonus", "mobility", "https://www.bahn.de/buchung/kundenkonto/login", "DE"],
  ["deutschlandticket", "Deutschlandticket", "mobility", "https://www.deutschlandticket.de/login", "DE"],
  ["adac", "ADAC", "mobility", "https://www.adac.de/mein-adac", "DE"],
  ["payback", "PAYBACK", "commerce", "https://www.payback.de/login", "DE"],
  ["dm", "dm Kundenkonto", "commerce", "https://www.dm.de/login", "DE"],
  ["rossmann", "ROSSMANN Kundenkonto", "commerce", "https://www.rossmann.de/de/login", "DE"],
  ["ikea-de", "IKEA Deutschland", "commerce", "https://www.ikea.com/de/de/profile/login", "DE"],
  ["oesterreich-gv", "oesterreich.gv.at", "public", "https://www.oesterreich.gv.at", "AT"],
  ["id-austria", "ID Austria", "identity", "https://www.oesterreich.gv.at/id-austria.html", "AT"],
  ["finanzonline", "FinanzOnline", "finance", "https://finanzonline.bmf.gv.at", "AT"],
  ["gesundheit-gv-at", "gesundheit.gv.at", "health", "https://www.gesundheit.gv.at", "AT"],
  ["ams", "AMS eServices", "public", "https://www.ams.at", "AT"],
  ["sozialversicherung-at", "Sozialversicherung.at", "insurance", "https://www.sozialversicherung.at", "AT"],
  ["usp", "Unternehmensserviceportal", "public", "https://www.usp.gv.at", "AT"],
  ["wien-gv", "Stadt Wien", "public", "https://www.wien.gv.at", "AT"],
  ["post-at", "Post.at", "communication", "https://www.post.at/privat-konto", "AT"],
  ["oebb", "OEBB Tickets", "mobility", "https://shop.oebbtickets.at/de/ticket", "AT"],
  ["westbahn", "WESTbahn", "mobility", "https://westbahn.at/login", "AT"],
  ["orf", "ORF Login", "media", "https://login.orf.at", "AT"],
  ["derstandard", "DER STANDARD", "media", "https://www.derstandard.at/login", "AT"],
  ["willhaben", "willhaben", "commerce", "https://www.willhaben.at/iad/myprofile/login", "AT"],
  ["a1-at", "Mein A1", "communication", "https://www.a1.net/mein-a1", "AT"],
  ["magenta-at", "Magenta Austria", "communication", "https://www.magenta.at/login", "AT"],
  ["drei-at", "Drei Kundenkonto", "communication", "https://www.drei.at/de/login", "AT"],
  ["raiffeisen-at", "Raiffeisen ELBA", "finance", "https://login.raiffeisen.at", "AT"],
  ["george-erste", "George Erste Bank", "finance", "https://login.sparkasse.at", "AT"],
  ["bank-austria", "Bank Austria", "finance", "https://www.bankaustria.at/login.jsp", "AT"],
  ["swissid", "SwissID", "identity", "https://login.swissid.ch", "CH"],
  ["ch-login", "CH-LOGIN", "identity", "https://www.ch-login.ch", "CH"],
  ["eportal-admin-ch", "ePortal Bund Schweiz", "public", "https://www.eportal.admin.ch", "CH"],
  ["zefix", "Zefix", "public", "https://www.zefix.admin.ch", "CH"],
  ["easygov", "EasyGov.swiss", "public", "https://www.easygov.swiss", "CH"],
  ["postfinance", "PostFinance", "finance", "https://login.postfinance.ch", "CH"],
  ["ubs", "UBS Digital Banking", "finance", "https://www.ubs.com/ch/en/private/digital-banking/login.html", "CH"],
  ["credit-suisse", "Credit Suisse", "finance", "https://www.credit-suisse.com/ch/en/private-clients/account-cards/client-login.html", "CH"],
  ["zkb", "Zuercher Kantonalbank", "finance", "https://www.zkb.ch/de/private/konto-karten/online-mobile-banking.html", "CH"],
  ["raiffeisen-ch", "Raiffeisen Schweiz", "finance", "https://www.raiffeisen.ch/rch/de/privatkunden/e-banking/login.html", "CH"],
  ["swisscom", "Swisscom Kundencenter", "communication", "https://www.swisscom.ch/myswisscom", "CH"],
  ["sunrise", "Sunrise Kundenkonto", "communication", "https://www.sunrise.ch/de/login", "CH"],
  ["salt", "Salt Mobile", "communication", "https://www.salt.ch/en/my-account", "CH"],
  ["post-ch", "Die Post Schweiz", "communication", "https://www.post.ch/de/login", "CH"],
  ["sbb", "SBB Kundenkonto", "mobility", "https://www.sbb.ch/de/kaufen/pages/login/login.xhtml", "CH"],
  ["coop", "Coop Schweiz", "commerce", "https://www.coop.ch/de/login", "CH"],
  ["migros", "Migros Login", "commerce", "https://login.migros.ch", "CH"],
  ["galaxus", "Galaxus", "commerce", "https://www.galaxus.ch/de/account/login", "CH"],
  ["ricardo", "Ricardo", "commerce", "https://www.ricardo.ch/de/login", "CH"],
  ["tutti", "Tutti.ch", "commerce", "https://www.tutti.ch/de/login", "CH"],
  ["sparkasse", "Sparkasse Online-Banking", "finance", "https://banking.sparkasse.de", "DE"],
  ["deutsche-bank", "Deutsche Bank", "finance", "https://meine.deutsche-bank.de/trxm/db", "DE"],
  ["commerzbank", "Commerzbank", "finance", "https://kunden.commerzbank.de/login", "DE"],
  ["ing-de", "ING Deutschland", "finance", "https://www.ing.de/login", "DE"],
  ["dkb", "DKB Banking", "finance", "https://www.dkb.de/banking", "DE"],
  ["comdirect", "comdirect", "finance", "https://kunde.comdirect.de/lp/wt/login", "DE"],
  ["consorsbank", "Consorsbank", "finance", "https://www.consorsbank.de/ev/Login", "DE"],
  ["n26", "N26", "finance", "https://app.n26.com/login", "DACH"],
  ["trade-republic", "Trade Republic", "finance", "https://app.traderepublic.com/login", "DACH"],
  ["scalable-capital", "Scalable Capital", "finance", "https://de.scalable.capital/login", "DE"],
  ["finanzen-zero", "finanzen.net zero", "finance", "https://mein.finanzen-zero.net/login", "DE"],
  ["postbank", "Postbank", "finance", "https://meine.postbank.de", "DE"],
  ["volksbanken-raiffeisenbanken", "Volksbanken Raiffeisenbanken", "finance", "https://www.vr.de/privatkunden/online-banking.html", "DE"],
  ["hypovereinsbank", "HypoVereinsbank", "finance", "https://my.hypovereinsbank.de/login", "DE"],
  ["santander-de", "Santander Deutschland", "finance", "https://meine.santander.de/login", "DE"],
  ["targobank", "TARGOBANK", "finance", "https://www.targobank.de/de/service/login.html", "DE"],
  ["norisbank", "norisbank", "finance", "https://www.norisbank.de/login", "DE"],
  ["sparda-bank", "Sparda-Bank", "finance", "https://www.sparda.de/online-banking.html", "DE"],
  ["apo-bank", "apoBank", "finance", "https://www.apobank.de/login", "DE"],
  ["gls-bank", "GLS Bank", "finance", "https://www.gls.de/privatkunden/onlinebanking", "DE"],
  ["bunq", "bunq", "finance", "https://app.bunq.com/login", "EU"],
  ["veltkonto", "Veltkonto", "finance", "https://app.veltkonto.de/login", "DACH"],
  ["wise", "Wise", "finance", "https://wise.com/login", "GLOBAL"],
  ["revolut", "Revolut", "finance", "https://app.revolut.com/start", "GLOBAL"],
  ["klarna", "Klarna", "finance", "https://app.klarna.com/login", "GLOBAL"],
  ["paysafecard", "paysafecard", "finance", "https://my.paysafecard.com", "GLOBAL"],
  ["techniker-krankenkasse", "Techniker Krankenkasse", "insurance", "https://www.tk.de/techniker/login", "DE"],
  ["barmer", "BARMER", "insurance", "https://www.barmer.de/login", "DE"],
  ["aok", "AOK", "insurance", "https://www.aok.de/pk/login", "DE"],
  ["dak", "DAK-Gesundheit", "insurance", "https://www.dak.de/dak/meine-dak-2092206.html", "DE"],
  ["ikk-classic", "IKK classic", "insurance", "https://www.ikk-classic.de/login", "DE"],
  ["hkk", "hkk Krankenkasse", "insurance", "https://www.hkk.de/login", "DE"],
  ["pronova-bkk", "pronova BKK", "insurance", "https://www.pronovabkk.de/login", "DE"],
  ["sbk", "SBK", "insurance", "https://www.sbk.org/meine-sbk/login/", "DE"],
  ["allianz", "Allianz Deutschland", "insurance", "https://www.allianz.de/login", "DE"],
  ["huk-coburg", "HUK-COBURG", "insurance", "https://www.huk.de/login", "DE"],
  ["axa-de", "AXA Deutschland", "insurance", "https://www.axa.de/meine-axa", "DE"],
  ["ergo", "ERGO", "insurance", "https://www.ergo.de/de/Login", "DE"],
  ["signal-iduna", "SIGNAL IDUNA", "insurance", "https://www.signal-iduna.de/kundenportal", "DE"],
  ["ruv", "R+V Versicherung", "insurance", "https://www.ruv.de/login", "DE"],
  ["debeka", "Debeka", "insurance", "https://www.debeka.de/service/login", "DE"],
  ["swiss-life-de", "Swiss Life Deutschland", "insurance", "https://www.swisslife.de/login", "DE"],
  ["css", "CSS Versicherung", "insurance", "https://my.css.ch", "CH"],
  ["helsana", "Helsana", "insurance", "https://www.helsana.ch/de/private-kunden/login.html", "CH"],
  ["swica", "SWICA", "insurance", "https://www.swica.ch/de/private/kontakt/my-swica.html", "CH"],
  ["sanitas", "Sanitas", "insurance", "https://www.sanitas.com/de/privatkunden/services/login.html", "CH"],
  ["groupe-mutuel", "Groupe Mutuel", "insurance", "https://www.groupemutuel.ch/de/Kunden/Login.html", "CH"],
  ["oegk", "Oesterreichische Gesundheitskasse", "health", "https://www.gesundheitskasse.at/cdscontent/?contentid=10007.837818", "AT"],
  ["svs-at", "SVS", "insurance", "https://www.svs.at/cdscontent/?contentid=10007.816626", "AT"],
  ["allianz-at", "Allianz Austria", "insurance", "https://www.allianz.at/de_AT/privatkunden/service/login.html", "AT"],
  ["wiener-staedtische", "Wiener Staedtische", "insurance", "https://www.wienerstaedtische.at/login", "AT"],
  ["telekom", "Telekom Kundencenter", "communication", "https://www.telekom.de/kundencenter", "DE"],
  ["vodafone-de", "Vodafone Deutschland", "communication", "https://www.vodafone.de/meinvodafone/account/login", "DE"],
  ["o2-de", "o2 Deutschland", "communication", "https://login.o2online.de", "DE"],
  ["eins-und-eins", "1&1 Control-Center", "communication", "https://login.1und1.de", "DE"],
  ["freenet", "freenet", "communication", "https://www.freenet.de/login", "DE"],
  ["congstar", "congstar", "communication", "https://www.congstar.de/meincongstar", "DE"],
  ["ewe", "EWE", "utilities", "https://www.ewe.de/login", "DE"],
  ["enbw", "EnBW", "utilities", "https://www.enbw.com/service/mein-enbw", "DE"],
  ["vattenfall", "Vattenfall", "utilities", "https://www.vattenfall.de/login", "DE"],
  ["eon", "E.ON", "utilities", "https://www.eon.de/de/pk/service/login.html", "DE"],
  ["yello", "Yello", "utilities", "https://www.yello.de/login", "DE"],
  ["verivox", "Verivox", "utilities", "https://www.verivox.de/login", "DE"],
  ["check24", "CHECK24", "commerce", "https://kundenbereich.check24.de", "DE"],
  ["m-net", "M-net Kundenportal", "communication", "https://www.m-net.de/login", "DE"],
  ["ionos", "IONOS", "cloud", "https://login.ionos.de", "DE"],
  ["strato", "STRATO", "cloud", "https://www.strato.de/apps/CustomerService", "DE"],
  ["hetzner", "Hetzner Accounts", "cloud", "https://accounts.hetzner.com/login", "DE"],
  ["all-inkl", "ALL-INKL KAS", "cloud", "https://kas.all-inkl.com", "DE"],
  ["hosteurope", "Host Europe KIS", "cloud", "https://kis.hosteurope.de", "DE"],
  ["dogado", "dogado Kundenlogin", "cloud", "https://admin.dogado.de", "DE"],
  ["otto", "OTTO", "commerce", "https://www.otto.de/user/login", "DE"],
  ["zalando", "Zalando", "commerce", "https://www.zalando.de/login", "DE"],
  ["mediamarkt", "MediaMarkt", "commerce", "https://www.mediamarkt.de/de/myaccount/login", "DE"],
  ["saturn", "Saturn", "commerce", "https://www.saturn.de/de/myaccount/login", "DE"],
  ["idealo", "idealo", "commerce", "https://www.idealo.de/preisvergleich/Login.html", "DE"],
  ["kleinanzeigen", "Kleinanzeigen", "commerce", "https://www.kleinanzeigen.de/m-einloggen.html", "DE"],
  ["kaufland", "Kaufland", "commerce", "https://www.kaufland.de/account/login", "DE"],
  ["rewe", "REWE", "commerce", "https://shop.rewe.de/login", "DE"],
  ["edeka", "EDEKA", "commerce", "https://www.edeka.de/registrierung-login.jsp", "DE"],
  ["lidl", "Lidl", "commerce", "https://www.lidl.de/account/login", "DE"],
  ["aldi", "ALDI Onlineshop", "commerce", "https://www.aldi-onlineshop.de/account/login", "DE"],
  ["tchibo", "Tchibo", "commerce", "https://www.tchibo.de/login", "DE"],
  ["douglas", "Douglas", "commerce", "https://www.douglas.de/de/login", "DE"],
  ["thalia", "Thalia", "commerce", "https://www.thalia.de/login", "DE"],
  ["booking", "Booking.com", "travel", "https://account.booking.com/sign-in", "GLOBAL"],
  ["airbnb", "Airbnb", "travel", "https://www.airbnb.de/login", "GLOBAL"],
  ["lieferando", "Lieferando", "commerce", "https://www.lieferando.de/login", "DE"],
  ["flixbus", "FlixBus", "mobility", "https://global.flixbus.com/login", "DACH"],
  ["mydays", "mydays", "commerce", "https://www.mydays.de/login", "DE"],
  ["eventim", "Eventim", "commerce", "https://www.eventim.de/login", "DE"],
  ["about-you", "ABOUT YOU", "commerce", "https://www.aboutyou.de/login", "DE"],
  ["notebooksbilliger", "notebooksbilliger.de", "commerce", "https://www.notebooksbilliger.de/kundenkonto", "DE"],
  ["cyberport", "Cyberport", "commerce", "https://www.cyberport.de/login", "DE"],
  ["alternate", "ALTERNATE", "commerce", "https://www.alternate.de/login", "DE"],
  ["shop-apotheke", "Shop Apotheke", "health", "https://www.shop-apotheke.com/nx/login", "DE"],
  ["ard", "ARD Login", "media", "https://login.ard.de", "DE"],
  ["zdf", "ZDF Konto", "media", "https://www.zdf.de/mein-zdf", "DE"],
  ["waipu", "waipu.tv", "media", "https://www.waipu.tv/login", "DE"],
  ["joyn", "Joyn", "media", "https://www.joyn.de/login", "DE"],
  ["rtlplus", "RTL+", "media", "https://plus.rtl.de/login", "DE"],
  ["sky-de", "Sky Deutschland", "media", "https://www.sky.de/login", "DE"],
  ["wowtv", "WOW", "media", "https://www.wowtv.de/login", "DE"],
  ["disney-plus", "Disney+", "media", "https://www.disneyplus.com/login", "GLOBAL"],
  ["prime-video", "Prime Video", "media", "https://www.primevideo.com/auth/sign-in", "GLOBAL"],
  ["audible", "Audible", "media", "https://www.audible.de/sign-in", "DE"],
  ["kindle", "Kindle Cloud Reader", "media", "https://read.amazon.de", "DE"],
  ["faz", "FAZ", "media", "https://zeitung.faz.net/login", "DE"],
  ["sueddeutsche", "Sueddeutsche Zeitung", "media", "https://www.sueddeutsche.de/login", "DE"],
  ["zeit", "DIE ZEIT", "media", "https://meine.zeit.de/anmelden", "DE"],
  ["spiegel", "DER SPIEGEL", "media", "https://konto.spiegel.de/anmelden", "DE"],
  ["nzz", "NZZ", "media", "https://login.nzz.ch", "CH"],
  ["blick", "Blick", "media", "https://login.blick.ch", "CH"],
  ["diepresse", "Die Presse", "media", "https://www.diepresse.com/user/login", "AT"],
  ["kurier", "Kurier", "media", "https://kurier.at/user/login", "AT"],
  ["heise", "heise online", "media", "https://www.heise.de/sso/login", "DE"],
  ["gmail", "Gmail", "communication", "https://mail.google.com", "GLOBAL"],
  ["microsoft-365", "Microsoft 365 Mail M365 Outlook", "communication", "https://outlook.office.com/mail", "GLOBAL"],
  ["outlook-mail", "Outlook.com", "communication", "https://outlook.live.com/mail", "GLOBAL"],
  ["web-de-mail", "WEB.DE Mail", "communication", "https://web.de/fm", "DE"],
  ["gmx-mail", "GMX Mail", "communication", "https://www.gmx.net/mail", "DACH"],
  ["gmx-at-mail", "GMX.at Mail", "communication", "https://www.gmx.at/mail", "AT"],
  ["gmx-ch-mail", "GMX.ch Mail", "communication", "https://www.gmx.ch/mail", "CH"],
  ["t-online-mail", "Telekom E-Mail T-Online", "communication", "https://email.t-online.de", "DE"],
  ["freenet-mail", "freenet Mail", "communication", "https://email.freenet.de", "DE"],
  ["icloud-mail", "iCloud Mail", "communication", "https://www.icloud.com/mail", "GLOBAL"],
  ["yahoo-mail", "Yahoo Mail", "communication", "https://mail.yahoo.com", "GLOBAL"],
  ["aol-mail", "AOL Mail", "communication", "https://mail.aol.com", "GLOBAL"],
  ["proton-mail", "Proton Mail", "communication", "https://mail.proton.me", "GLOBAL"],
  ["mailbox-org", "mailbox.org", "communication", "https://login.mailbox.org", "DE"],
  ["posteo", "Posteo", "communication", "https://posteo.de/login", "DE"],
  ["mail-de", "mail.de", "communication", "https://mail.de", "DE"],
  ["fastmail", "Fastmail", "communication", "https://app.fastmail.com/login", "GLOBAL"],
  ["tuta-mail", "Tuta Mail", "communication", "https://app.tuta.com", "GLOBAL"],
  ["zoho-mail", "Zoho Mail", "communication", "https://accounts.zoho.com/signin", "GLOBAL"],
  ["ionos-webmail", "IONOS Webmail", "communication", "https://mail.ionos.de", "DE"],
  ["strato-webmail", "STRATO Webmail", "communication", "https://webmail.strato.de", "DE"],
  ["one-and-one-webmail", "1&1 Webmail", "communication", "https://webmailer.1und1.de", "DE"],
  ["bluewin-mail", "Bluewin Mail", "communication", "https://www.swisscom.ch/login", "CH"],
  ["hostpoint-webmail", "Hostpoint Webmail", "communication", "https://login.hostpoint.ch", "CH"],
  ["world4you-webmail", "World4You Webmail", "communication", "https://webmail.world4you.com", "AT"],
  ["aws-console", "AWS Console", "cloud", "https://console.aws.amazon.com/console/home", "GLOBAL"],
  ["azure-portal", "Azure Console Portal", "cloud", "https://portal.azure.com", "GLOBAL"],
  ["microsoft-365-admin", "Microsoft 365 Admin Center", "productivity", "https://admin.microsoft.com", "GLOBAL"],
  ["entra-admin", "Microsoft Entra Admin Center", "identity", "https://entra.microsoft.com", "GLOBAL"],
  ["google-cloud-console", "Google Cloud Console", "cloud", "https://console.cloud.google.com", "GLOBAL"],
  ["google-admin-console", "Google Admin Console Workspace", "productivity", "https://admin.google.com", "GLOBAL"],
  ["cloudflare", "Cloudflare Dashboard", "cloud", "https://dash.cloudflare.com/login", "GLOBAL"],
  ["github", "GitHub", "productivity", "https://github.com/login", "GLOBAL"],
  ["gitlab", "GitLab", "productivity", "https://gitlab.com/users/sign_in", "GLOBAL"],
  ["bitbucket", "Bitbucket", "productivity", "https://bitbucket.org/account/signin", "GLOBAL"],
  ["atlassian", "Atlassian Jira Confluence", "productivity", "https://id.atlassian.com/login", "GLOBAL"],
  ["slack", "Slack", "communication", "https://slack.com/signin", "GLOBAL"],
  ["microsoft-teams", "Microsoft Teams", "communication", "https://teams.microsoft.com", "GLOBAL"],
  ["notion", "Notion", "productivity", "https://www.notion.so/login", "GLOBAL"],
  ["linear", "Linear", "productivity", "https://linear.app/login", "GLOBAL"],
  ["asana", "Asana", "productivity", "https://app.asana.com/-/login", "GLOBAL"],
  ["trello", "Trello", "productivity", "https://trello.com/login", "GLOBAL"],
  ["monday", "monday.com", "productivity", "https://auth.monday.com/auth/login", "GLOBAL"],
  ["sevdesk", "sevdesk", "finance", "https://my.sevdesk.de", "DE"],
  ["datev", "DATEV", "finance", "https://login.datev.de", "DE"],
  ["datev-unternehmen-online", "DATEV Unternehmen online", "finance", "https://duo.datev.de", "DE"],
  ["lexoffice", "lexoffice", "finance", "https://app.lexoffice.de", "DE"],
  ["fastbill", "FastBill", "finance", "https://my.fastbill.com", "DE"],
  ["personio", "Personio", "productivity", "https://login.personio.de", "EU"],
  ["salesforce", "Salesforce", "productivity", "https://login.salesforce.com", "GLOBAL"],
  ["hubspot", "HubSpot", "productivity", "https://app.hubspot.com/login", "GLOBAL"],
  ["pipedrive", "Pipedrive", "productivity", "https://app.pipedrive.com/auth/login", "GLOBAL"],
  ["shopify", "Shopify", "commerce", "https://accounts.shopify.com", "GLOBAL"],
  ["stripe", "Stripe Dashboard", "finance", "https://dashboard.stripe.com/login", "GLOBAL"],
  ["mollie", "Mollie Dashboard", "finance", "https://my.mollie.com/dashboard/login", "EU"],
  ["paypal-business", "PayPal Business", "finance", "https://www.paypal.com/signin", "GLOBAL"],
  ["figma", "Figma", "productivity", "https://www.figma.com/login", "GLOBAL"],
  ["canva", "Canva", "productivity", "https://www.canva.com/login", "GLOBAL"],
  ["miro", "Miro", "productivity", "https://miro.com/login", "GLOBAL"],
  ["sentry", "Sentry", "productivity", "https://sentry.io/auth/login/", "GLOBAL"],
  ["datadog", "Datadog", "cloud", "https://app.datadoghq.eu/account/login", "EU"],
  ["grafana-cloud", "Grafana Cloud", "cloud", "https://grafana.com/auth/sign-in", "GLOBAL"],
  ["digitalocean", "DigitalOcean", "cloud", "https://cloud.digitalocean.com/login", "GLOBAL"],
  ["vercel", "Vercel", "cloud", "https://vercel.com/login", "GLOBAL"],
  ["netlify", "Netlify", "cloud", "https://app.netlify.com/login", "GLOBAL"],
  ["heroku", "Heroku", "cloud", "https://id.heroku.com/login", "GLOBAL"],
  ["supabase", "Supabase", "cloud", "https://supabase.com/dashboard/sign-in", "GLOBAL"],
  ["twilio", "Twilio", "communication", "https://www.twilio.com/login", "GLOBAL"],
  ["sendgrid", "SendGrid", "communication", "https://login.sendgrid.com", "GLOBAL"],
  ["mailchimp", "Mailchimp", "communication", "https://login.mailchimp.com", "GLOBAL"],
  ["brevo", "Brevo", "communication", "https://app.brevo.com/account/login", "EU"],
  ["rapidmail", "rapidmail", "communication", "https://my.rapidmail.de", "DE"],
] as const satisfies readonly ProviderSeed[];

export const PROVIDER_CATALOG: ProviderCatalogItem[] = providerSeeds.map(
  ([id, name, category, loginUrl, countryHint]) => ({
    id,
    name,
    category,
    loginUrl,
    countryHint,
  }),
);

export type ProviderCatalogSearchItem = ProviderCatalogItem & {
  rank: number;
  searchText: string;
};

const providerById = new Map(PROVIDER_CATALOG.map((provider) => [provider.id, provider]));
const providerCatalogSearchIndex: ProviderCatalogSearchItem[] = PROVIDER_CATALOG.map((provider, rank) => ({
  ...provider,
  rank,
  searchText: normalizeSearchText(
    [provider.name, provider.id, provider.category, provider.countryHint, provider.loginUrl].filter(Boolean).join(" "),
  ),
}));

export function getProviderById(id: string): ProviderCatalogItem | undefined {
  return providerById.get(id);
}

export function getProviderCatalogSearchIndex(): readonly ProviderCatalogSearchItem[] {
  return providerCatalogSearchIndex;
}

export function searchProviderCatalog(query: string, limit = 16): ProviderCatalogItem[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return PROVIDER_CATALOG.slice(0, limit);
  }

  const terms = normalizedQuery.split(" ").filter(Boolean);
  return providerCatalogSearchIndex
    .map((provider) => ({
      provider,
      score: scoreProviderSearchHit(provider, terms, normalizedQuery),
    }))
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.provider.rank - right.provider.rank)
    .slice(0, limit)
    .map((result) => {
      const { searchText, rank, ...provider } = result.provider;
      void searchText;
      void rank;
      return provider;
    });
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " und ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function scoreProviderSearchHit(
  provider: ProviderCatalogSearchItem,
  terms: string[],
  normalizedQuery: string,
): number {
  if (provider.id === normalizedQuery) {
    return 1_000;
  }
  if (normalizeSearchText(provider.name) === normalizedQuery) {
    return 950;
  }
  if (normalizeSearchText(provider.name).startsWith(normalizedQuery)) {
    return 800;
  }
  if (provider.searchText.includes(normalizedQuery)) {
    return 550;
  }
  if (terms.every((term) => provider.searchText.includes(term))) {
    return 350 + terms.length * 20;
  }
  return 0;
}

export const vaultEntrySchema = z
  .object({
    providerId: z.string().min(1).max(120),
    displayName: z.string().min(1).max(160),
    loginUrl: z.url().refine((value) => value.startsWith("https://"), "Only HTTPS login URLs are allowed."),
    emailUsed: z.email().max(254).optional().or(z.literal("")),
    username: z.string().max(160).optional().or(z.literal("")),
    passwordLocationHint: z.string().max(240).optional().or(z.literal("")),
    notes: z.string().max(2_000).optional().or(z.literal("")),
    tags: z.array(z.string().min(1).max(40)).max(12).default([]),
    lifecycleStatus: z
      .enum(["aktiv", "stillgelegt", "anbieter-informiert", "geloescht"])
      .default("aktiv"),
    // Deprecated (SP7): the old 180-day review timestamp. Retained so pre-SP7
    // ciphertext still parses under .strict(); no longer read.
    lastReviewedAt: z.iso.date().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    try {
      assertNoSecretFields(value);
    } catch (error) {
      context.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : "Secret fields are not allowed.",
      });
    }
  });

export type VaultEntry = z.infer<typeof vaultEntrySchema>;
// Pre-validation shape: lifecycleStatus/tags may be omitted and are defaulted on parse.
export type VaultEntryInput = z.input<typeof vaultEntrySchema>;

// SP7 — account lifecycle status (replaces the old 180-day "Review" timer).
export const LIFECYCLE_STATUSES = ["aktiv", "stillgelegt", "anbieter-informiert", "geloescht"] as const;
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];
export const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  aktiv: "Aktiv",
  stillgelegt: "Stillgelegt",
  "anbieter-informiert": "Anbieter informiert",
  geloescht: "Gelöscht",
};

export function assertNoSecretFields(value: unknown, path: string[] = []): void {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecretFields(item, [...path, String(index)]));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const fullPath = [...path, key].join(".");
    if (!allowedSecretReferenceFields.has(key) && forbiddenSecretKeyPattern.test(key)) {
      throw new Error(`Vault entries must not contain secret field "${fullPath}".`);
    }
    assertNoSecretFields(child, [...path, key]);
  }
}
