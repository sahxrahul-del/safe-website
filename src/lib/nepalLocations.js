export const provinces = [
  "Koshi Province",
  "Madhesh Province",
  "Bagmati Province",
  "Gandaki Province",
  "Lumbini Province",
  "Karnali Province",
  "Sudurpaschim Province"
];

// Structure: { Province: { District: [City Zones] } }
export const nepalLocations = {
  "Koshi Province": {
    "Morang": ["Biratnagar", "Belbari", "Pathari", "Urlabari", "Rangeli", "Sundar Haraicha"],
    "Sunsari": ["Itahari", "Dharan", "Inaruwa", "Duhabi", "Ramdhuni"],
    "Jhapa": ["Birtamod", "Damak", "Mechinagar", "Bhadrapur", "Arjundhara"],
    "Ilam": ["Ilam Bazar", "Suryodaya", "Deumai"],
    "Dhankuta": ["Dhankuta Bazar", "Pakhribas"],
    "Tehrathum": ["Myanglung"],
    "Sankhuwasabha": ["Khandbari"],
    "Bhojpur": ["Bhojpur Bazar"],
    "Solukhumbu": ["Salleri", "Namche Bazaar"],
    "Okhaldhunga": ["Siddhicharan"],
    "Khotang": ["Diktel"],
    "Udayapur": ["Gaighat", "Katari", "Beltar"],
    "Taplejung": ["Phungling"],
    "Panchthar": ["Phidim"]
  },
  "Madhesh Province": {
    "Dhanusha": ["Janakpurdham", "Janaki Mandir Area", "Bhanu Chowk", "Zero Mile", "Mujeliya", "Dhalkebar"],
    "Parsa": ["Birgunj", "Adarshanagar", "Ghantaghar", "Powerhouse", "Simara"],
    "Bara": ["Kalaiya", "Jitpur Simara", "Nijgadh"],
    "Rautahat": ["Gaur", "Chandrapur", "Garuda"],
    "Sarlahi": ["Malangwa", "Lalbandi", "Hariwon", "Barahathwa"],
    "Mahottari": ["Jaleshwor", "Bardibas", "Gaushala"],
    "Siraha": ["Siraha Bazar", "Lahan", "Golbazar", "Mirchaiya"],
    "Saptari": ["Rajbiraj", "Kanamadini", "Shambhunath"]
  },
  "Bagmati Province": {
    "Kathmandu": [
      "New Baneshwor", "Old Baneshwor", "Koteshwor", "Tinkune", "Sinamangal",
      "Maitidevi", "Putalisadak", "Bagbazar", "Thamel", "Lazimpat", "Maharajgunj",
      "Baluwatar", "Naxal", "Kalanki", "Kalimati", "Tripureshwor", "Sundhara",
      "Boudha", "Jorpati", "Chabahil", "Gaushala", "Kapan", "Budhanilkantha"
    ],
    "Lalitpur": [
      "Pulchowk", "Jawalakhel", "Lagankhel", "Kumaripati", "Gwarko", "Satdobato",
      "Bhaisepati", "Sanepa", "Jhamsikhel", "Patan Durbar Sq", "Imadol", "Lubhu"
    ],
    "Bhaktapur": [
      "Suryabinayak", "Kamalbinayak", "Durbar Square Area", "Thimi", "Lokanthali",
      "Kaushaltar", "Gatthaghar", "Sallaghari", "Byasi"
    ],
    "Chitwan": ["Bharatpur", "Narayangadh", "Tandi", "Ratnanagar", "Sauraha"],
    "Makwanpur": ["Hetauda", "Bhimfedi", "Thaha"],
    "Kavrepalanchok": ["Dhulikhel", "Banepa", "Panauti"],
    "Dhading": ["Dhading Besi", "Malekhu", "Gajuri"],
    "Nuwakot": ["Bidur", "Trishuli"],
    "Sindhupalchok": ["Chautara", "Melamchi"],
    "Dolakha": ["Charikot", "Jiri"],
    "Ramechhap": ["Manthali"],
    "Sindhuli": ["Sindhuli Madhi", "Kamalamai"],
    "Rasuwa": ["Dhunche"]
  },
  "Gandaki Province": {
    "Kaski": ["Pokhara - Lakeside", "Pokhara - Mahendrapul", "Pokhara - Chipledhunga", "Lekhnath", "Hemja"],
    "Tanahu": ["Damauli", "Bandipur", "Shuklagandaki"],
    "Syangja": ["Putalibazar", "Waling"],
    "Gorkha": ["Gorkha Bazar", "Palungtar"],
    "Lamjung": ["Besisahar"],
    "Baglung": ["Baglung Bazar"],
    "Myagdi": ["Beni"],
    "Parbat": ["Kushma"],
    "Nawalparasi East": ["Kawasoti", "Gaindakot", "Devchuli"],
    "Manang": ["Chame"],
    "Mustang": ["Jomsom"]
  },
  "Lumbini Province": {
    "Rupandehi": ["Butwal", "Bhairahawa", "Manigram", "Tilottama"],
    "Dang": ["Ghorahi", "Tulsipur", "Lamahi"],
    "Banke": ["Nepalgunj", "Kohalpur"],
    "Palpa": ["Tansen", "Rampur"],
    "Kapilvastu": ["Taulihawa", "Gorusinge"],
    "Bardiya": ["Gulariya", "Bansgadhi"],
    "Nawalparasi West": ["Parasi", "Sunwal"],
    "Arghakhanchi": ["Sandhikharka"],
    "Gulmi": ["Tamghas"],
    "Pyuthan": ["Pyuthan Khalanga"],
    "Rolpa": ["Liwang"],
    "Rukum East": ["Rukumkot"]
  },
  "Karnali Province": {
    "Surkhet": ["Birendranagar", "Chhinchu"],
    "Dailekh": ["Dailekh Bazar"],
    "Jajarkot": ["Khalanga"],
    "Jumla": ["Chandannath"],
    "Kalikot": ["Manma"],
    "Mugu": ["Gamgadhi"],
    "Dolpa": ["Dunai"],
    "Humla": ["Simikot"],
    "Salyan": ["Salyan Khalanga"],
    "Rukum West": ["Musikot"]
  },
  "Sudurpaschim Province": {
    "Kailali": ["Dhangadhi", "Attariya", "Tikapur", "Lamki"],
    "Kanchanpur": ["Mahendranagar", "Daiji", "Jhalari"],
    "Dadeldhura": ["Amargadhi"],
    "Doti": ["Silgadhi"],
    "Achham": ["Mangalsen", "Sanphebagar"],
    "Baitadi": ["Dasharathchand"],
    "Bajhang": ["Chainpur"],
    "Bajura": ["Martadi"],
    "Darchula": ["Khalanga"]
  }
};