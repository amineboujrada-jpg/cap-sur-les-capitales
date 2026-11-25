"use strict";

// Format : code ISO|pays|capitale|ville-piège (grande ville du même pays).
// Noms de capitales en orthographe française : https://fr.wikipedia.org/wiki/Liste_des_capitales_du_monde
// Sélection : les pays dont la capitale est disputée ou partagée entre plusieurs villes
// (Bolivie, Afrique du Sud, Sri Lanka, Eswatini, Yémen, Nauru…) et les territoires à
// reconnaissance limitée sont volontairement omis.
const countryGroups = {
  eu: `FR|France|Paris|Lyon
ES|Espagne|Madrid|Barcelone
IT|Italie|Rome|Milan
DE|Allemagne|Berlin|Munich
PT|Portugal|Lisbonne|Porto
GB|Royaume-Uni|Londres|Manchester
IE|Irlande|Dublin|Cork
BE|Belgique|Bruxelles|Anvers
NL|Pays-Bas|Amsterdam|Rotterdam
LU|Luxembourg|Luxembourg|Esch-sur-Alzette
CH|Suisse|Berne|Zurich
AT|Autriche|Vienne|Salzbourg
LI|Liechtenstein|Vaduz|Schaan
AD|Andorre|Andorre-la-Vieille|Escaldes-Engordany
SM|Saint-Marin|Saint-Marin|Serravalle
GR|Grèce|Athènes|Thessalonique
CY|Chypre|Nicosie|Limassol
PL|Pologne|Varsovie|Cracovie
CZ|Tchéquie|Prague|Brno
SK|Slovaquie|Bratislava|Košice
HU|Hongrie|Budapest|Debrecen
HR|Croatie|Zagreb|Split
SI|Slovénie|Ljubljana|Maribor
RS|Serbie|Belgrade|Novi Sad
ME|Monténégro|Podgorica|Kotor
BA|Bosnie-Herzégovine|Sarajevo|Mostar
AL|Albanie|Tirana|Durrës
MK|Macédoine du Nord|Skopje|Ohrid
RO|Roumanie|Bucarest|Cluj-Napoca
BG|Bulgarie|Sofia|Plovdiv
NO|Norvège|Oslo|Bergen
SE|Suède|Stockholm|Göteborg
DK|Danemark|Copenhague|Aarhus
FI|Finlande|Helsinki|Turku
IS|Islande|Reykjavik|Akureyri
EE|Estonie|Tallinn|Tartu
LV|Lettonie|Riga|Jūrmala
LT|Lituanie|Vilnius|Kaunas
MT|Malte|La Valette|Mdina
MD|Moldavie|Chișinău|Bălți
UA|Ukraine|Kyiv|Lviv
BY|Biélorussie|Minsk|Brest
RU|Russie|Moscou|Saint-Pétersbourg`,
  af: `MA|Maroc|Rabat|Casablanca
DZ|Algérie|Alger|Oran
TN|Tunisie|Tunis|Sfax
LY|Libye|Tripoli|Benghazi
EG|Égypte|Le Caire|Alexandrie
SD|Soudan|Khartoum|Omdourman
SS|Soudan du Sud|Djouba|Wau
TD|Tchad|N'Djaména|Moundou
SN|Sénégal|Dakar|Saint-Louis
GM|Gambie|Banjul|Serekunda
GW|Guinée-Bissau|Bissau|Bafatá
CV|Cap-Vert|Praia|Mindelo
MR|Mauritanie|Nouakchott|Nouadhibou
ML|Mali|Bamako|Tombouctou
NE|Niger|Niamey|Agadez
BF|Burkina Faso|Ouagadougou|Bobo-Dioulasso
GN|Guinée|Conakry|Kankan
SL|Sierra Leone|Freetown|Bo
LR|Liberia|Monrovia|Buchanan
CI|Côte d'Ivoire|Yamoussoukro|Abidjan
GH|Ghana|Accra|Kumasi
TG|Togo|Lomé|Sokodé
BJ|Bénin|Porto-Novo|Cotonou
NG|Nigeria|Abuja|Lagos
CM|Cameroun|Yaoundé|Douala
CF|République centrafricaine|Bangui|Berbérati
GQ|Guinée équatoriale|Malabo|Bata
ST|Sao Tomé-et-Principe|São Tomé|Santo António
GA|Gabon|Libreville|Port-Gentil
CG|République du Congo|Brazzaville|Pointe-Noire
CD|République démocratique du Congo|Kinshasa|Lubumbashi
AO|Angola|Luanda|Benguela
ET|Éthiopie|Addis-Abeba|Gondar
ER|Érythrée|Asmara|Massaoua
DJ|Djibouti|Djibouti|Ali Sabieh
SO|Somalie|Mogadiscio|Hargeisa
KE|Kenya|Nairobi|Mombasa
UG|Ouganda|Kampala|Entebbe
RW|Rwanda|Kigali|Butare
BI|Burundi|Gitega|Bujumbura
TZ|Tanzanie|Dodoma|Dar es Salaam
MW|Malawi|Lilongwe|Blantyre
ZM|Zambie|Lusaka|Livingstone
ZW|Zimbabwe|Harare|Bulawayo
MZ|Mozambique|Maputo|Beira
NA|Namibie|Windhoek|Walvis Bay
BW|Botswana|Gaborone|Francistown
LS|Lesotho|Maseru|Teyateyaneng
MG|Madagascar|Antananarivo|Toamasina
MU|Maurice|Port-Louis|Curepipe
SC|Seychelles|Victoria|Anse Royale
KM|Comores|Moroni|Mutsamudu`,
  as: `JP|Japon|Tokyo|Osaka
CN|Chine|Pékin|Shanghai
KR|Corée du Sud|Séoul|Busan
KP|Corée du Nord|Pyongyang|Hamhung
MN|Mongolie|Oulan-Bator|Erdenet
IN|Inde|New Delhi|Mumbai
PK|Pakistan|Islamabad|Karachi
BD|Bangladesh|Dacca|Chittagong
NP|Népal|Katmandou|Pokhara
BT|Bhoutan|Thimphou|Paro
MV|Maldives|Malé|Addu
AF|Afghanistan|Kaboul|Kandahar
MM|Birmanie|Naypyidaw|Rangoun
TH|Thaïlande|Bangkok|Chiang Mai
VN|Vietnam|Hanoï|Hô Chi Minh-Ville
KH|Cambodge|Phnom Penh|Siem Reap
LA|Laos|Vientiane|Luang Prabang
MY|Malaisie|Kuala Lumpur|George Town
BN|Brunei|Bandar Seri Begawan|Kuala Belait
ID|Indonésie|Jakarta|Surabaya
TL|Timor oriental|Dili|Baucau
PH|Philippines|Manille|Cebu
KZ|Kazakhstan|Astana|Almaty
UZ|Ouzbékistan|Tachkent|Samarcande
KG|Kirghizistan|Bichkek|Och
TJ|Tadjikistan|Douchanbé|Khodjent
TM|Turkménistan|Achgabat|Turkmenabat
GE|Géorgie|Tbilissi|Batoumi
AM|Arménie|Erevan|Gyumri
AZ|Azerbaïdjan|Bakou|Gandja
TR|Turquie|Ankara|Istanbul
SY|Syrie|Damas|Alep
LB|Liban|Beyrouth|Byblos
JO|Jordanie|Amman|Aqaba
IQ|Irak|Bagdad|Bassorah
IR|Iran|Téhéran|Ispahan
SA|Arabie saoudite|Riyad|Djeddah
KW|Koweït|Koweït|Al Ahmadi
BH|Bahreïn|Manama|Riffa
QA|Qatar|Doha|Al-Wakrah
AE|Émirats arabes unis|Abou Dabi|Dubaï
OM|Oman|Mascate|Salalah`,
  am: `CA|Canada|Ottawa|Toronto
US|États-Unis|Washington (D.C.)|New York
MX|Mexique|Mexico|Guadalajara
GT|Guatemala|Guatemala|Antigua Guatemala
BZ|Belize|Belmopan|Belize City
HN|Honduras|Tegucigalpa|San Pedro Sula
SV|Salvador|San Salvador|Santa Ana
NI|Nicaragua|Managua|León
CR|Costa Rica|San José|Cartago
PA|Panama|Panama|Colón
CU|Cuba|La Havane|Santiago de Cuba
JM|Jamaïque|Kingston|Montego Bay
HT|Haïti|Port-au-Prince|Cap-Haïtien
DO|République dominicaine|Saint-Domingue|Santiago de los Caballeros
BS|Bahamas|Nassau|Freeport
BB|Barbade|Bridgetown|Speightstown
TT|Trinité-et-Tobago|Port-d'Espagne|San Fernando
GD|Grenade|Saint-Georges|Gouyave
LC|Sainte-Lucie|Castries|Vieux Fort
VC|Saint-Vincent-et-les-Grenadines|Kingstown|Barrouallie
DM|Dominique|Roseau|Portsmouth
AG|Antigua-et-Barbuda|Saint John's|All Saints
KN|Saint-Christophe-et-Niévès|Basseterre|Charlestown
AR|Argentine|Buenos Aires|Córdoba
BR|Brésil|Brasília|Rio de Janeiro
CL|Chili|Santiago|Valparaíso
UY|Uruguay|Montevideo|Punta del Este
PY|Paraguay|Asuncion|Ciudad del Este
PE|Pérou|Lima|Cusco
EC|Équateur|Quito|Guayaquil
CO|Colombie|Bogotá|Medellín
VE|Venezuela|Caracas|Maracaibo
GY|Guyana|Georgetown|Linden
SR|Suriname|Paramaribo|Nieuw Nickerie`,
  oc: `AU|Australie|Canberra|Sydney
NZ|Nouvelle-Zélande|Wellington|Auckland
FJ|Fidji|Suva|Nadi
PG|Papouasie-Nouvelle-Guinée|Port Moresby|Lae
WS|Samoa|Apia|Salelologa
TO|Tonga|Nukuʻalofa|Neiafu
VU|Vanuatu|Port-Vila|Luganville
SB|Îles Salomon|Honiara|Gizo
MH|Îles Marshall|Majuro|Ebeye
FM|Micronésie|Palikir|Kolonia
PW|Palaos|Ngerulmud|Koror
TV|Tuvalu|Funafuti|Nanumea
KI|Kiribati|Tarawa-Sud|Kiritimati`,
};

// Pays « connus » : la base du niveau Facile. Le niveau Difficile pioche d'abord hors de cette liste.
const famous = new Set(`FR ES IT DE PT GB IE BE NL CH AT GR PL SE NO DK FI RU UA HU CZ
MA DZ TN EG SN NG KE ET GH CI CM CD MG LY ML
JP CN KR IN PK TH VN ID PH SA AE IR IQ TR LB QA SY
CA US MX CU AR BR CL PE CO VE JM
AU NZ FJ PG WS TO VU`.split(/\s+/));

const levels = {
  easy: { label: "Facile", hint: "Pays connus, choix faciles à départager" },
  medium: { label: "Moyen", hint: "Tous les pays, choix du même continent" },
  hard: { label: "Difficile", hint: "Pays rares, pièges et 15 s par question" },
};
const HARD_SECONDS = 15;

const regions = { world: "Monde", eu: "Europe", af: "Afrique", as: "Asie", am: "Amériques", oc: "Océanie" };

// Drapeau en emoji à partir du code ISO (deux « regional indicator symbols »).
const flagOf = code => String.fromCodePoint(...[...code].map(ch => 0x1f1a5 + ch.charCodeAt(0)));

const plain = text => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const countries = Object.entries(countryGroups).flatMap(([region, lines]) =>
  lines.split("\n").map(line => {
    const [code, country, capital, decoy] = line.split("|");
    // Pays dont la capitale porte (presque) le même nom : trop facile en mode inversé.
    const sameName = plain(capital).includes(plain(country)) || plain(country).includes(plain(capital));
    return { code, flag: flagOf(code), region, country, capital, decoy, sameName, famous: famous.has(code) };
  })
);
