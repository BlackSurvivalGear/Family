/**
 * Lawal.org Mock Database & Persistence Engine
 * Uses localStorage to persist data for a complete serverless demonstration.
 * Seeding a realistic, premium, three-generational Yoruba-Nigerian family.
 */

const SEED_MEMBERS = [
  {
    id: "kolawole-lawal",
    firstName: "Kolawole",
    lastName: "Lawal",
    nickname: "Alhaji",
    gender: "Male",
    birthDate: "1940-04-12",
    birthPlace: "Abeokuta, Ogun State, Nigeria",
    deathDate: "2018-09-05",
    deathPlace: "Lagos, Nigeria",
    status: "Deceased", // Living / Deceased
    nationality: "Nigerian",
    biography: "Alhaji Kolawole Lawal was the esteemed patriarch of the Lawal dynasty. Born in Abeokuta in 1940, he excelled in academic pursuits, studying Civil Engineering at the University of Ibadan before obtaining his master's degree from Imperial College London in 1965. As a pioneer civil engineer, he oversaw major infrastructural developments across Western Nigeria in the 70s and 80s. A dedicated community leader and philanthropist, his values of education, honor, and unity continue to guide generations of the Lawal family.",
    fatherId: null,
    motherId: null,
    spouseId: "fatima-lawal",
    generation: 1,
    role: "Family Patriarch / Founder",
    education: {
      schools: "Abeokuta Grammar School",
      university: "University of Ibadan (B.Sc Civil Eng.), Imperial College London (M.Sc Structural Eng.)"
    },
    military: {
      service: "None",
      history: ""
    },
    career: {
      occupation: "Chief Civil Engineer & Philanthropist",
      history: "Director of Works at Western Nigeria Ministry of Infrastructure (1972-1988), Founder of Lawal & Partners Construction Ltd (1989-2012)."
    },
    achievements: "National Productivity Order of Merit (NPOM) recipient (2001), Traditional Chief of Abeokuta (Otunba).",
    languages: "Yoruba, English, Arabic",
    hobbies: "Playing Ayo Olopon, Classical Music, Tennis, Historical Philately",
    sports: "Lawn Tennis",
    books: "Things Fall Apart by Chinua Achebe, The Odyssey",
    music: "Classical Piano, Chief Commander Ebenezer Obey",
    travel: "United Kingdom, Saudi Arabia, United States, Ghana",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    timeline: [
      { year: 1940, title: "Born in Abeokuta", description: "First son of the Lawal merchant household." },
      { year: 1958, title: "University Admission", description: "Enrolled in University of Ibadan on a Western Nigeria Merit Scholarship." },
      { year: 1963, title: "Marriage to Fatima", description: "Married Alhaja Fatima in a beautiful traditional ceremony in Lagos." },
      { year: 1965, title: "Imperial College", description: "Completed Master's degree in Structural Engineering in London." },
      { year: 1989, title: "Launched Lawal & Partners Ltd", description: "Founded his own consulting and civil engineering enterprise." },
      { year: 2018, title: "Passed Away", description: "Eulogized nationally; laid to rest peacefully in Lagos." }
    ]
  },
  {
    id: "fatima-lawal",
    firstName: "Fatima",
    lastName: "Lawal",
    nickname: "Mama Lagos",
    gender: "Female",
    birthDate: "1946-11-20",
    birthPlace: "Lagos Island, Nigeria",
    deathDate: null,
    status: "Living",
    nationality: "Nigerian",
    biography: "Alhaja Fatima Lawal (née Balogun) is the beloved matriarch of our family. Born in Lagos Island to an aristocratic trading family, she studied business administration in Dublin. She established the Lawal Textile Trading House in Balogun Market, building it into one of Nigeria's premier textile businesses. Known for her extraordinary wisdom, culinary skills, and dedication to charity, Mama Lagos remains the spiritual and physical anchor of the family, providing guidance and warmth from her residence in Ikoyi, Lagos.",
    fatherId: null,
    motherId: null,
    spouseId: "kolawole-lawal",
    generation: 1,
    role: "Family Matriarch",
    education: {
      schools: "Queen's College Lagos",
      university: "Dublin Institute of Technology (Business Administration)"
    },
    military: {
      service: "None",
      history: ""
    },
    career: {
      occupation: "Textile Entrepreneur & Matriarch",
      history: "Founder of Fatima Fabrics and Textiles (Balogun Market, Lagos), Philanthropist for Girl-Child Education."
    },
    achievements: "Lifetime Achievement Award, Lagos Market Association (2015), Sponsor of 50+ university scholarships.",
    languages: "Yoruba, English, Creole",
    hobbies: "Lace Design, Gardening, Traditional Culinary Arts, Mentoring Young Entrepreneurs",
    sports: "Brisk Walking",
    books: "The Joys of Motherhood by Buchi Emecheta",
    music: "King Sunny Ade, Gospel Choir",
    travel: "Ireland, United Kingdom, France, UAE, Saudi Arabia",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
    timeline: [
      { year: 1946, title: "Born in Lagos Island", description: "Born into the Balogun merchant family." },
      { year: 1963, title: "Marriage to Kolawole", description: "Began a lifetime union spanning 55 years of devotion." },
      { year: 1969, title: "Established Fatima Fabrics", description: "Pioneered premium lace imports from Switzerland." },
      { year: 2015, title: "Golden Jubilee Recognition", description: "Honored in Lagos for community leadership and commerce." }
    ]
  },
  {
    id: "tunde-lawal",
    firstName: "Tunde",
    lastName: "Lawal",
    nickname: "Doc",
    gender: "Male",
    birthDate: "1968-08-15",
    birthPlace: "Lagos, Nigeria",
    deathDate: null,
    status: "Living",
    nationality: "British/Nigerian",
    biography: "Dr. Tunde Lawal is the first-born son of Kolawole and Fatima. An internationally renowned neurosurgeon, Tunde studied Medicine at the University of Oxford. He currently serves as a Senior Consultant Neurosurgeon at Great Ormond Street Hospital, London, and is a visiting professor at the College of Medicine, University of Ibadan. His research into pediatric neurovascular disorders has saved countless lives.",
    fatherId: "kolawole-lawal",
    motherId: "fatima-lawal",
    spouseId: "sade-lawal",
    generation: 2,
    role: "Eldest Son / UK Branch Lead",
    education: {
      schools: "King's College Lagos",
      university: "University of Oxford (MBChB, Neurosurgery Residency), Harvard Medical Fellowship"
    },
    military: {
      service: "None",
      history: ""
    },
    career: {
      occupation: "Senior Consultant Neurosurgeon",
      history: "Resident at John Radcliffe Hospital Oxford (1994-2001), Consultant at GOSH London (2002-Present)."
    },
    achievements: "Fellow of the Royal College of Surgeons (FRCS), Pioneer of African Pediatric Neurosurgery Initiative.",
    languages: "English, Yoruba, German",
    hobbies: "Playing Violin, Scuba Diving, Collecting Nigerian Contemporary Art",
    sports: "Scuba Diving, Squash",
    books: "When Breath Becomes Air by Paul Kalanithi",
    music: "Bach, Fela Kuti",
    travel: "United Kingdom, United States, South Africa, Germany, Kenya",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
    timeline: [
      { year: 1968, title: "Born in Lagos", description: "The first grandchild of the Balogun and Lawal families." },
      { year: 1986, title: "Oxford Admission", description: "Enrolled at Oxford University with exceptional high school credentials." },
      { year: 1994, title: "Marriage to Sade", description: "Married Folasade Coker in London; high-society medical union." },
      { year: 2005, title: "Department Chair", description: "Appointed to lead Clinical Neurosciences at London Hospital." }
    ]
  },
  {
    id: "sade-lawal",
    firstName: "Folasade",
    lastName: "Lawal",
    nickname: "Sade",
    gender: "Female",
    birthDate: "1972-03-10",
    birthPlace: "Ibadan, Nigeria",
    deathDate: null,
    status: "Living",
    nationality: "British/Nigerian",
    biography: "Folasade Lawal (née Coker) is an accomplished orthodontist and researcher. Born in Ibadan, she trained at the University of London. She co-runs a luxury private dental practice in Harley Street, London, and runs a free dental health clinic for children in Makoko, Lagos, during her annual family visits. Folasade is a passionate champion of Afro-centric culinary fusion and interior design.",
    fatherId: null,
    motherId: null,
    spouseId: "tunde-lawal",
    generation: 2,
    role: "Spouse (London Branch)",
    education: {
      schools: "International School Ibadan",
      university: "King's College London (BDS Dental Surgery, Orthodontics)"
    },
    military: {
      service: "None",
      history: ""
    },
    career: {
      occupation: "Principal Orthodontist",
      history: "Associate Dentist in London (1996-2003), Founder and Co-owner of Harley Orthodontics, London (2004-Present)."
    },
    achievements: "British Dental Association Excellence Award (2018), Co-founder of Smile Makoko Charity.",
    languages: "English, Yoruba, French",
    hobbies: "Interior Design, Baking, Travel Blogging, African Art Curating",
    sports: "Yoga, Swimming",
    books: "Americanah by Chimamanda Ngozi Adichie",
    music: "Sade Adu, Asa, Jazz Standards",
    travel: "United Kingdom, Nigeria, France, Italy, Seychelles, Maldives",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    timeline: [
      { year: 1972, title: "Born in Ibadan", description: "Born to Prof. and Dr. (Mrs) Coker of the University of Ibadan." },
      { year: 1994, title: "Married Tunde", description: "Moved to London to establish their family." },
      { year: 2004, title: "Opened Private Practice", description: "Launched Harley Orthodontics in London." }
    ]
  },
  {
    id: "funmi-alabi",
    firstName: "Funmilayo",
    lastName: "Alabi",
    nickname: "Funmi",
    gender: "Female",
    birthDate: "1971-06-25",
    birthPlace: "Lagos, Nigeria",
    deathDate: null,
    status: "Living",
    nationality: "Nigerian",
    biography: "Funmilayo Alabi (née Lawal) is the second child of Kolawole and Fatima. A brilliant Senior Advocate of Nigeria (SAN), Funmi holds a Master of Laws (LL.M.) from the London School of Economics. She is the Managing Partner of Alabi & Partners Law Firm, specializing in corporate finance, oil and gas, and intellectual property. She is a prominent advocate for women in law and serves on the board of several multinational corporations.",
    fatherId: "kolawole-lawal",
    motherId: "fatima-lawal",
    spouseId: "adebayo-alabi",
    generation: 2,
    role: "Eldest Daughter / Lagos Lead",
    education: {
      schools: "Queen's College Lagos",
      university: "Obafemi Awolowo University (LL.B.), London School of Economics (LL.M.)"
    },
    military: {
      service: "None",
      history: ""
    },
    career: {
      occupation: "Senior Advocate of Nigeria (SAN)",
      history: "State Counsel at Lagos Ministry of Justice (1994-1998), Founder of Alabi & Partners Law Firm (2002-Present)."
    },
    achievements: "Conferred Senior Advocate of Nigeria (SAN) status in 2012; Top 50 African Corporate Lawyers list.",
    languages: "Yoruba, English, French",
    hobbies: "African Literature, Golf, Opera, Traditional Yoruba Textile Weaving",
    sports: "Golf",
    books: "Death and the King's Horseman by Wole Soyinka",
    music: "Yanni, Sunny Ade, Afro-jazz",
    travel: "Nigeria, United Kingdom, USA, Switzerland, South Africa",
    avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=300&q=80",
    timeline: [
      { year: 1971, title: "Born in Lagos", description: "Second child of Kolawole and Fatima." },
      { year: 1992, title: "Law School graduate", description: "Called to the Nigerian Bar with first-class honors." },
      { year: 1995, title: "Marriage to Adebayo", description: "Married Adebayo Alabi, a prominent investment architect." },
      { year: 2012, title: "SAN Elevation", description: "Elevated to Senior Advocate of Nigeria (SAN), the highest legal distinction." }
    ]
  },
  {
    id: "adebayo-alabi",
    firstName: "Adebayo",
    lastName: "Alabi",
    nickname: "Bayo",
    gender: "Male",
    birthDate: "1968-12-05",
    birthPlace: "Ogbomoso, Oyo State, Nigeria",
    deathDate: null,
    status: "Living",
    nationality: "Nigerian",
    biography: "Adebayo Alabi is a visionary investment banker and venture capitalist. Educated at the Wharton School, University of Pennsylvania, Bayo worked on Wall Street for a decade before returning to Nigeria to co-found Silk Road Capital, one of West Africa's leading private equity firms. Under his leadership, the firm has funded major renewable energy, agritech, and fintech startups across the continent.",
    fatherId: null,
    motherId: null,
    spouseId: "funmi-alabi",
    generation: 2,
    role: "Spouse (Lagos Branch)",
    education: {
      schools: "Loyola College Ibadan",
      university: "University of Lagos (Finance), Wharton School of the University of Pennsylvania (MBA)"
    },
    military: {
      service: "None",
      history: ""
    },
    career: {
      occupation: "Managing Director, Private Equity",
      history: "Mergers & Acquisitions Associate at Goldman Sachs NY (1994-2000), Co-founder & CEO of Silk Road Capital (2003-Present)."
    },
    achievements: "African Fintech Investor of the Year (2020), Board member of Lagos State Innovation Fund.",
    languages: "Yoruba, English",
    hobbies: "Sailing, Vintage Cars, Chess, Mentoring Startup Founders",
    sports: "Sailing, Squash",
    books: "The Intelligent Investor by Benjamin Graham",
    music: "Miles Davis, Fela Kuti, Bob Marley",
    travel: "United States, United Kingdom, Nigeria, Singapore, China, Kenya",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80",
    timeline: [
      { year: 1968, title: "Born in Ogbomoso", description: "Born into the Alabi educationist family." },
      { year: 1995, title: "Marriage to Funmilayo", description: "Began a stellar entrepreneurial partnership." },
      { year: 2003, title: "Silk Road Capital Launch", description: "Co-founded Silk Road Capital in Lagos." }
    ]
  },
  {
    id: "kunle-lawal",
    firstName: "Kunle",
    lastName: "Lawal",
    nickname: "Major",
    gender: "Male",
    birthDate: "1975-02-18",
    birthPlace: "Lagos, Nigeria",
    deathDate: null,
    status: "Living",
    nationality: "Nigerian",
    biography: "Major Kunle Lawal is the youngest son of Kolawole and Fatima. A graduate of the Nigerian Defence Academy (NDA) and Sandhurst Royal Military Academy in the UK, Kunle is an elite tactical officer and intelligence specialist in the Nigerian Army. He has served with distinction in multiple international peacekeeping operations under the UN and ECOWAS. Currently, he is stationed in Abuja in a defense intelligence advisory capacity.",
    fatherId: "kolawole-lawal",
    motherId: "fatima-lawal",
    spouseId: "chioma-lawal",
    generation: 2,
    role: "Youngest Son / Abuja Lead",
    education: {
      schools: "Command Secondary School Jos",
      university: "Nigerian Defence Academy (B.Sc Military Science), Royal Military Academy Sandhurst (Officer Commission)"
    },
    military: {
      service: "Nigerian Army",
      history: "Commissioned as Lieutenant (1998), Promoted to Captain (2003), Promoted to Major (2010). Served in UN Peacekeeping in Darfur, Sierra Leone ECOMOG."
    },
    career: {
      occupation: "Major, Nigerian Army (Defense Intelligence)",
      history: "Platoon Commander (1999-2004), Battalion Commander (2005-2012), Intelligence Directorate HQ, Abuja (2013-Present)."
    },
    achievements: "Forces Service Star (FSS), UN Peacekeeping Service Medal, Best Allied Cadet at Sandhurst (1998).",
    languages: "Yoruba, Hausa, English, French",
    hobbies: "Equestrian Sports, Physical Fitness, Military Strategy, Shooting, Wildlife Photography",
    sports: "Polo, Shooting",
    books: "The Art of War by Sun Tzu, On War by Carl von Clausewitz",
    music: "Femi Kuti, Hans Zimmer, Traditional Yoruba Drummers",
    travel: "United Kingdom, Sierra Leone, Sudan, Liberia, South Africa",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80",
    timeline: [
      { year: 1975, title: "Born in Lagos", description: "Born as the energetic third child of the Lawal house." },
      { year: 1994, title: "Entered NDA", description: "Admitted into the prestigious Nigerian Defence Academy." },
      { year: 1998, title: "Sandhurst Commission", description: "Graduated with honors from Sandhurst, UK, and commissioned as Lieutenant." },
      { year: 2002, title: "Marriage to Chioma", description: "Married Chioma Nwachukwu, combining major Yoruba and Igbo lineages." }
    ]
  },
  {
    id: "chioma-lawal",
    firstName: "Chioma",
    lastName: "Lawal",
    nickname: "Chio",
    gender: "Female",
    birthDate: "1978-05-14",
    birthPlace: "Enugu, Nigeria",
    deathDate: null,
    status: "Living",
    nationality: "Nigerian",
    biography: "Chioma Lawal (née Nwachukwu) is a leading public health professional and clinical research coordinator. Educated at the University of Nigeria, Nsukka, and the London School of Hygiene & Tropical Medicine (LSHTM), she works closely with the World Health Organization and the Nigerian Centre for Disease Control (NCDC) on infectious disease surveillance and maternal health initiatives.",
    fatherId: null,
    motherId: null,
    spouseId: "kunle-lawal",
    generation: 2,
    role: "Spouse (Abuja Branch)",
    education: {
      schools: "Federal Government Girls College Enugu",
      university: "University of Nigeria, Nsukka (Pharmacy), London School of Hygiene & Tropical Medicine (M.Sc Public Health)"
    },
    military: {
      service: "None",
      history: ""
    },
    career: {
      occupation: "Public Health Director",
      history: "Clinical Pharmacist at National Hospital Abuja (2001-2005), Senior Epidemiologist at NCDC (2007-Present)."
    },
    achievements: "Pioneer of the National Maternal Vaccination Drive, Recipient of the Gates Foundation African Health Award (2019).",
    languages: "Igbo, Yoruba, English, French",
    hobbies: "Healthy Cooking, Hiking, Singing in Choral Ensembles, Organizing Health Fairs",
    sports: "Hiking, Tennis",
    books: "Half of a Yellow Sun by Chimamanda Ngozi Adichie",
    music: "Sinya, Onyeka Onwenu, Sinach",
    travel: "Nigeria, United Kingdom, Switzerland, Kenya, Brazil",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
    timeline: [
      { year: 1978, title: "Born in Enugu", description: "Born to the Nwachukwu educationist family." },
      { year: 2002, title: "Married Kunle", description: "Fused two historic cultures in an iconic multi-ethnic wedding." },
      { year: 2007, title: "NCDC Appointment", description: "Joined NCDC to manage epidemic surveillance programs." }
    ]
  },
  {
    id: "amina-lawal",
    firstName: "Amina",
    lastName: "Lawal",
    nickname: "Ami",
    gender: "Female",
    birthDate: "1996-09-12",
    birthPlace: "London, United Kingdom",
    deathDate: null,
    status: "Living",
    nationality: "British/Nigerian",
    biography: "Amina Lawal is the eldest daughter of Dr. Tunde and Dr. Folasade Lawal. She is a brilliant software engineer, currently based in London. Amina studied Computer Science at the University of Oxford, graduating with First Class Honors. She worked at Google UK as an AI engineer before launching her own educational technology startup, 'Edutech Lawal', aiming to provide free digital coding curriculum to millions of kids across West Africa.",
    fatherId: "tunde-lawal",
    motherId: "sade-lawal",
    spouseId: null,
    generation: 3,
    role: "Grandchild (UK)",
    education: {
      schools: "Cheltenham Ladies' College",
      university: "University of Oxford (B.Sc Computer Science, M.Sc Artificial Intelligence)"
    },
    military: {
      service: "None",
      history: ""
    },
    career: {
      occupation: "Tech Founder & AI Engineer",
      history: "AI Research Engineer at Google DeepMind (2018-2021), Founder & CTO of EduTech Lawal (2022-Present)."
    },
    achievements: "Forbes 30 Under 30 Europe (Tech) - 2023, Oxford Computer Science Graduate of the Year (2018).",
    languages: "English, Yoruba, Python, JavaScript",
    hobbies: "Acoustic Guitar, UI/UX Design, Creative Writing, Digital Painting",
    sports: "Rock Climbing, Fencing",
    books: "Zero to One by Peter Thiel, Snow Crash by Neal Stephenson",
    music: "Lorde, Wizkid, Jacob Collier",
    travel: "UK, Nigeria, United States, Japan, Iceland, South Africa",
    avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=300&q=80",
    timeline: [
      { year: 1996, title: "Born in London", description: "First grandchild of Kolawole and Fatima Lawal." },
      { year: 2014, title: "Entered Oxford University", description: "Admitted into Lady Margaret Hall, Oxford." },
      { year: 2018, title: "Joined Google DeepMind", description: "Researched advanced healthcare deep learning models." },
      { year: 2022, title: "Founded EduTech Lawal", description: "Secured venture capital to seed tech hubs in Nigeria." }
    ]
  },
  {
    id: "yusuf-lawal",
    firstName: "Yusuf",
    lastName: "Lawal",
    nickname: "Yuffie",
    gender: "Male",
    birthDate: "1999-07-04",
    birthPlace: "London, United Kingdom",
    deathDate: null,
    status: "Living",
    nationality: "British/Nigerian",
    biography: "Yusuf Lawal is the second child of Tunde and Folasade. He is a rising architect who completed his architecture degrees at the University College London (The Bartlett School). Yusuf is deeply committed to sustainable and green urban architectures, blending traditional Yoruba mud and bamboo building methods with contemporary glass steel construction styles. He currently works at Foster + Partners in London.",
    fatherId: "tunde-lawal",
    motherId: "sade-lawal",
    spouseId: null,
    generation: 3,
    role: "Grandchild (UK)",
    education: {
      schools: "Eton College",
      university: "University College London (B.Sc Architecture), Architectural Association School of Architecture (M.Arch)"
    },
    military: {
      service: "None",
      history: ""
    },
    career: {
      occupation: "Architect & Eco-Designer",
      history: "Junior Architect at Foster + Partners, London (2021-Present), Consultant for Lagos Climate-Resilient Buildings Initiative."
    },
    achievements: "RIBA Bronze Medal Nominee (2021), Winner of the African Sustainable Design Prize (2022).",
    languages: "English, Yoruba, Italian",
    hobbies: "Sketching, Clay Sculpting, Cycling, Street Photography",
    sports: "Football, Rowing",
    books: "The Death and Life of Great American Cities by Jane Jacobs",
    music: "Burna Boy, Kendrick Lamar, Pink Floyd",
    travel: "UK, Nigeria, Italy, Brazil, Morocco",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80",
    timeline: [
      { year: 1999, title: "Born in London", description: "Born at Chelsea and Westminster Hospital." },
      { year: 2017, title: "Eton College Graduation", description: "Finished top of his class in Design & Tech." },
      { year: 2021, title: "Joined Foster + Partners", description: "Assigned to the prestigious Red Sea Eco-Resort project." }
    ]
  },
  {
    id: "tolani-alabi",
    firstName: "Tolani",
    lastName: "Alabi",
    nickname: "Tola",
    gender: "Female",
    birthDate: "1998-10-18",
    birthPlace: "Lagos, Nigeria",
    deathDate: null,
    status: "Living",
    nationality: "Nigerian/American",
    biography: "Tolani Alabi is the daughter of Funmilayo and Adebayo Alabi. She is an exceptionally talented financial analyst and corporate strategist. Tolani studied Economics at Yale University before obtaining an MBA from Harvard Business School. She works in New York City as an Investment Director for a leading global Impact Fund, specializing in funding scalable healthcare and fintech platforms in emerging markets.",
    fatherId: "adebayo-alabi",
    motherId: "funmi-alabi",
    spouseId: null,
    generation: 3,
    role: "Grandchild (US/Lagos)",
    education: {
      schools: "Atlantic Hall School Lagos",
      university: "Yale University (B.A. Economics), Harvard Business School (MBA)"
    },
    military: {
      service: "None",
      history: ""
    },
    career: {
      occupation: "Impact Investment Director",
      history: "Investment Analyst at Morgan Stanley NY (2019-2021), Investment Director at LeapFrog Investments NYC (2023-Present)."
    },
    achievements: "Summa Cum Laude at Yale; Harvard Business School Leadership Fellow (2023).",
    languages: "English, Yoruba, Spanish",
    hobbies: "Violoncello, Sailing, Haute Couture, Collecting West African Sculptures",
    sports: "Sailing, Squash",
    books: "The Alchemist by Paulo Coelho",
    music: "Yanni, Asa, Beyonce, Tems",
    travel: "Nigeria, USA, UK, Kenya, Ghana, Spain, France",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80",
    timeline: [
      { year: 1998, title: "Born in Lagos", description: "Daughter of the SAN Funmilayo Lawal and Private Equity Chief Adebayo Alabi." },
      { year: 2015, title: "Admitted to Yale", description: "Earned full academic Ivy League placement." },
      { year: 2021, title: "Entered Harvard Business School", description: "Selected as one of the youngest MBA candidates in her cohort." }
    ]
  },
  {
    id: "femi-lawal",
    firstName: "Femi",
    lastName: "Lawal",
    nickname: "Fem-Fem",
    gender: "Male",
    birthDate: "2004-11-30",
    birthPlace: "Abuja, Nigeria",
    deathDate: null,
    status: "Living",
    nationality: "Nigerian",
    biography: "Femi Lawal is the teenage son of Kunle and Chioma Lawal. Currently a senior undergraduate studying Fine Arts and New Media at the University of Lagos, Femi is an avid visual illustrator and multi-disciplinary conceptual artist. His digital art collections, themed around modern Yoruba mythologies and hyper-futurism, have been featured in underground galleries in Lagos and Abuja.",
    fatherId: "kunle-lawal",
    motherId: "chioma-lawal",
    spouseId: null,
    generation: 3,
    role: "Grandchild (Lagos/Abuja)",
    education: {
      schools: "Loyola Jesuit College Abuja",
      university: "University of Lagos (B.A. Fine Arts & Digital Media - in progress)"
    },
    military: {
      service: "None",
      history: ""
    },
    career: {
      occupation: "Visual Illustrator & Student",
      history: "Freelance conceptual artist and digital modeler, curator of Lagos Neo-Yoruba digital art show (2023)."
    },
    achievements: "Winner of the National Young Artist Prize (2022), Featured in Lagos Photo Festival (2023).",
    languages: "English, Yoruba, Hausa, Pidgin",
    hobbies: "Digital Painting, Virtual Reality Modelling, Skateboarding, High-top Sneakers Customization",
    sports: "Skateboarding, Basketball",
    books: "Akata Witch by Nnedi Okorafor",
    music: "Rema, Odunsi the Engine, Travis Scott",
    travel: "Nigeria, UK, Benin Republic, South Africa",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80",
    timeline: [
      { year: 2004, title: "Born in Abuja", description: "Youngest grandson of the Lawal dynasty." },
      { year: 2021, title: "Entered UNILAG", description: "Admitted into the Department of Creative Arts." },
      { year: 2023, title: "Lagos Photo Festival", description: "Gained national acclaim for his Afro-cyberpunk art pieces." }
    ]
  }
];

const SEED_NEWS = [
  {
    id: "news-1",
    title: "Amina Lawal featured on Forbes 30 Under 30 Europe List!",
    date: "2023-11-15",
    category: "Achievements",
    excerpt: "Our very own Amina Lawal (Generation 3, UK branch) has been named on the prestigious Forbes 30 Under 30 Europe Technology list for her innovations in educational tech...",
    content: "Amina Lawal, software engineer and founder of 'EduTech Lawal', was honored by Forbes on their annual 30 Under 30 Europe Technology listing. Her revolutionary work in bringing digital programming and machine learning modules to under-served school children in Western Nigeria was heavily praised. The Lawal family is exceptionally proud of her dedication to education and social advancement.",
    author: "Matriarch Fatima Lawal",
    avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "news-2",
    title: "The Legacy of Patriarch Kolawole Lawal: 5 Years Remembrance Ceremony",
    date: "2023-09-05",
    category: "Events",
    excerpt: "The extended family and guests gathered in Lagos to celebrate the life and enduring impact of our founding patriarch, Alhaji Kolawole Lawal...",
    content: "Five years since his peaceful passing, the family of late Chief Alhaji Kolawole Lawal held a gorgeous remembrance service in Victoria Island, Lagos. Spanning all three generations and with guests arriving from London, New York, and Abuja, the event celebrated the infrastructure pioneer's lasting legacy. A new endowment fund, the Kolawole Lawal Civil Engineering Scholarship at the University of Ibadan, was officially announced by Alhaja Fatima Lawal.",
    author: "Dr. Tunde Lawal",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "news-3",
    title: "Tolani Alabi Graduates with High Honors from Harvard Business School",
    date: "2023-06-12",
    category: "Graduations",
    excerpt: "Tolani Alabi (daughter of Funmilayo Lawal-Alabi and Adebayo Alabi) completed her MBA with elite honors in leadership...",
    content: "In a stunning commencement ceremony in Cambridge, Massachusetts, Tolani Alabi was conferred with her Master of Business Administration (MBA) degree from Harvard Business School. Attending the ceremony were her proud parents, Funmilayo SAN and Adebayo Alabi, and grandmother Alhaja Fatima. Tolani will be moving to New York to lead impactful emerging markets investing.",
    author: "Funmi Lawal Alabi SAN",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "news-4",
    title: "Welcoming baby Femi Jnr - The Next Generation Arrives",
    date: "2024-01-10",
    category: "Births",
    excerpt: "The Lawal family celebrates the safe birth of baby Kolawole Femi Lawal Jnr, born to Major Kunle and Chioma Lawal...",
    content: "We are overjoyed to announce the arrival of baby Kolawole Femi Lawal Jnr, born on January 10, 2024, at the National Hospital Abuja. Mother and baby are in excellent health. He is the latest addition to the third generation of the Lawal lineage, carrying forward the names of our respected elders.",
    author: "Major Kunle Lawal",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80"
  }
];

const SEED_DOCUMENTS = [
  {
    id: "doc-1",
    title: "Birth Certificate - Kolawole Lawal (1940)",
    category: "Birth Certificates",
    dateAdded: "2021-02-14",
    size: "2.4 MB",
    type: "PDF",
    description: "Original certified birth record of late Patriarch Alhaji Kolawole Lawal, registered under the Colonial Office of Abeokuta in April 1940.",
    fileUrl: "#placeholder-pdf"
  },
  {
    id: "doc-2",
    title: "Marriage Registry - Kolawole & Fatima (1963)",
    category: "Marriage Certificates",
    dateAdded: "2021-04-10",
    size: "4.1 MB",
    type: "PDF",
    description: "Official civil registry of marriage between Kolawole Lawal and Fatima Balogun at the Federal Marriage Registry, Ikoyi, Lagos, December 1963.",
    fileUrl: "#placeholder-pdf"
  },
  {
    id: "doc-3",
    title: "Commissioning Scroll - Major Kunle Lawal (1998)",
    category: "Military Records",
    dateAdded: "2021-08-01",
    size: "1.8 MB",
    type: "PDF",
    description: "Official scroll commissioned by Her Majesty Queen Elizabeth II upon Kunle Lawal's officer graduation from Royal Military Academy Sandhurst.",
    fileUrl: "#placeholder-pdf"
  },
  {
    id: "doc-4",
    title: "Historical Land Deed - Abeokuta Family House",
    category: "Family Documents",
    dateAdded: "2022-11-20",
    size: "5.7 MB",
    type: "PDF",
    description: "The ancient ancestral registry and ownership deeds of the Lawal homestead in Abeokuta, dating back to early land surveys of the 1920s.",
    fileUrl: "#placeholder-pdf"
  }
];

const SEED_EVENTS = [
  { id: "evt-1", title: "Matriarch Fatima Lawal's 78th Birthday", date: "2024-11-20", category: "Birthdays", description: "Mama Lagos' annual family thanksgiving banquet at Ikoyi, Lagos.", time: "14:00" },
  { id: "evt-2", title: "Lawal Grand Reunion 2024", date: "2024-12-26", category: "Reunions", description: "Boxing Day global gathering of all branches (London, New York, Lagos, Abuja). To be hosted at the Lagos Civic Centre.", time: "11:00" },
  { id: "evt-3", title: "Kunle & Chioma's 22nd Wedding Anniversary", date: "2024-05-18", category: "Anniversaries", description: "Anniversary lunch in Abuja and online Zoom greetings with global branches.", time: "16:00" },
  { id: "evt-4", title: "Amina Lawal's 28th Birthday Celebration", date: "2024-09-12", category: "Birthdays", description: "Informal evening get-together for UK family at West London.", time: "19:00" },
  { id: "evt-5", title: "Kolawole Lawal Memorial Golf Tournament", date: "2024-10-15", category: "Meetings", description: "Inaugural corporate and friendly charity golf open at the Ikoyi Club.", time: "08:00" }
];

const SEED_TIMELINE_HISTORY = [
  { year: "1890s", title: "Egba Origins", description: "The Lawal ancestors establish themselves as prominent cotton traders and scholars in Abeokuta, within the historic Egba Kingdom." },
  { year: "1940", title: "Birth of Kolawole", description: "Founding father Alhaji Kolawole Lawal is born, establishing the modern branch of our lineage." },
  { year: "1960s", title: "Educational Migrations", description: "Kolawole travels to the UK to study advanced engineering; Fatima Balogun travels to Dublin, paving the path of transatlantic connections." },
  { year: "1980s", title: "Lagos Consolidation", description: "The family solidifies its base in Lagos, establishing major commercial ventures in trading, construction, and legal services." },
  { year: "1990s", title: "The Third Generation Emerges", description: "Grandchildren Amina, Tolani, and Yusuf are born in London and Lagos, establishing a fully global, dual-citizen generation." },
  { year: "Present", title: "Digital Integration", description: "Lawal.org is established as a private, high-security generational digital repository to connect, preserve, and secure our values." }
];

// Memory fallback for Node.js environments
const mockStorage = {};

export class DB {
  static getStorageItem(key, defaultValue) {
    try {
      if (typeof localStorage === "undefined") {
        return mockStorage[key] ? JSON.parse(mockStorage[key]) : defaultValue;
      }
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error("Error reading localStorage:", e);
      return defaultValue;
    }
  }

  static setStorageItem(key, value) {
    try {
      if (typeof localStorage === "undefined") {
        mockStorage[key] = JSON.stringify(value);
        return;
      }
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Error writing to localStorage:", e);
    }
  }

  static init() {
    const checkKey = (key) => {
      if (typeof localStorage === "undefined") {
        return !!mockStorage[key];
      }
      return !!localStorage.getItem(key);
    };

    if (!checkKey("lawal_members")) {
      this.setStorageItem("lawal_members", SEED_MEMBERS);
    }
    if (!checkKey("lawal_news")) {
      this.setStorageItem("lawal_news", SEED_NEWS);
    }
    if (!checkKey("lawal_documents")) {
      this.setStorageItem("lawal_documents", SEED_DOCUMENTS);
    }
    if (!checkKey("lawal_events")) {
      this.setStorageItem("lawal_events", SEED_EVENTS);
    }
    if (!checkKey("lawal_timeline")) {
      this.setStorageItem("lawal_timeline", SEED_TIMELINE_HISTORY);
    }
  }

  // --- MEMBER API ---
  static getMembers() {
    this.init();
    return this.getStorageItem("lawal_members", []);
  }

  static getMember(id) {
    const members = this.getMembers();
    return members.find(m => m.id === id) || null;
  }

  static saveMember(member) {
    const members = this.getMembers();
    const index = members.findIndex(m => m.id === member.id);
    if (index > -1) {
      members[index] = member;
    } else {
      members.push(member);
    }
    this.setStorageItem("lawal_members", members);
    this.logActivity("Updated Member profile", `Edited details for ${member.firstName} ${member.lastName}.`);
    return member;
  }

  static addMember(member) {
    if (!member.id) {
      member.id = `${member.firstName.toLowerCase()}-${member.lastName.toLowerCase()}-${Math.floor(Math.random() * 1000)}`;
    }
    const members = this.getMembers();
    members.push(member);
    this.setStorageItem("lawal_members", members);
    this.logActivity("Added Family Member", `Added ${member.firstName} ${member.lastName} to the tree.`);
    return member;
  }

  static deleteMember(id) {
    let members = this.getMembers();
    const deleted = members.find(m => m.id === id);
    if (deleted) {
      members = members.filter(m => m.id !== id);
      // Clean up references
      members.forEach(m => {
        if (m.fatherId === id) m.fatherId = null;
        if (m.motherId === id) m.motherId = null;
        if (m.spouseId === id) m.spouseId = null;
      });
      this.setStorageItem("lawal_members", members);
      this.logActivity("Deleted Family Member", `Removed ${deleted.firstName} ${deleted.lastName} from the tree.`);
      return true;
    }
    return false;
  }

  // --- NEWS FEED API ---
  static getNews() {
    this.init();
    return this.getStorageItem("lawal_news", []);
  }

  static addNews(item) {
    const news = this.getNews();
    if (!item.id) item.id = `news-${Date.now()}`;
    if (!item.date) item.date = new Date().toISOString().split('T')[0];
    news.unshift(item);
    this.setStorageItem("lawal_news", news);
    this.logActivity("Published Announcement", `Published news: "${item.title}".`);
    return item;
  }

  // --- DOCUMENTS API ---
  static getDocuments() {
    this.init();
    return this.getStorageItem("lawal_documents", []);
  }

  static addDocument(doc) {
    const docs = this.getDocuments();
    if (!doc.id) doc.id = `doc-${Date.now()}`;
    if (!doc.dateAdded) doc.dateAdded = new Date().toISOString().split('T')[0];
    docs.push(doc);
    this.setStorageItem("lawal_documents", docs);
    this.logActivity("Uploaded Document", `Uploaded document: "${doc.title}".`);
    return doc;
  }

  // --- EVENTS CALENDAR API ---
  static getEvents() {
    this.init();
    return this.getStorageItem("lawal_events", []);
  }

  static addEvent(event) {
    const evts = this.getEvents();
    if (!event.id) event.id = `evt-${Date.now()}`;
    evts.push(event);
    this.setStorageItem("lawal_events", evts);
    this.logActivity("Created Calendar Event", `Added event: "${event.title}".`);
    return event;
  }

  // --- ACTIVITY LOG API ---
  static getActivityLog() {
    return this.getStorageItem("lawal_activity", [
      { id: "act-1", action: "User Sign In", detail: "Secured private portal session initiated.", time: "Just Now" },
      { id: "act-2", action: "System Initialized", detail: "Lawal.org premium local mock database populated.", time: "1 hour ago" }
    ]);
  }

  static logActivity(action, detail) {
    const log = this.getStorageItem("lawal_activity", []);
    log.unshift({
      id: `act-${Date.now()}`,
      action,
      detail,
      time: "Just Now"
    });
    this.setStorageItem("lawal_activity", log.slice(0, 15)); // Keep last 15
  }
}
