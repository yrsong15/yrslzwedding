// Central place for wedding details and copy. Edit here, not in the pages.

export const couple = {
  names: "Lauren & Young Re",
  contactEmail: "wedding@laurenyoungre.com",
};

// Whose guest an invite is. Admin only: guests never see which side they're on.
// `short` is for the compact toggle in the /admin guest table.
export const sides = [
  { value: "lauren", label: "Lauren", short: "LZ" },
  { value: "young_re", label: "Young Re", short: "YRS" },
] as const;

export const weddingDate = new Date("2027-07-24T17:00:00-07:00");

export const weddingDateLabel = "Saturday, July 24, 2027";
// Shown at the top of the Home page, above the names. "Lauren and Young Re are making a new start in life together."
export const koreanMessage = "로렌과 영래가 함께 인생의 새로운 출발을 하려 합니다";
export const location = "Portland, Oregon";

// Korean for the /password page, which pairs every English line with Korean
// for guests who read only one of the two. The date stays English only.
export const passwordPageKo = {
  title: "로렌과 영래",
  invite: "귀하를 로렌과 영래의 결혼식에 초대합니다", // "We invite you to Lauren and Young Re's wedding."
  prompt: "초대장에 적힌 비밀번호를 입력해 주세요.",
  form: {
    placeholder: "비밀번호",
    enter: "입장",
    checking: "확인 중…",
    wrongPassword: "비밀번호가 맞지 않습니다. 다시 입력해 주세요.",
    error: "문제가 발생했습니다. 다시 시도해 주세요.",
  },
};
export const rsvpDeadline = "March 1, 2027";

// `ko` is shown when a tab is hovered, focused, or pressed (see components/Nav.tsx).
export const navLinks = [
  { href: "/", label: "Home", ko: "홈" },
  { href: "/rsvp", label: "RSVP", ko: "참석" },
  { href: "/schedule", label: "Schedule", ko: "일정" },
  { href: "/things-to-do", label: "Things to Do", ko: "즐길 거리" },
  { href: "/travel", label: "Travel & Lodging", ko: "교통 · 숙소" },
  { href: "/faq", label: "FAQs", ko: "궁금한 점" },
  { href: "/registry", label: "Registry", ko: "축하의 마음" },
];

// Keep in sync with the CHECK constraint on guests.meal in supabase/schema.sql.
export const mealOptions = [
  { value: "beef", label: "Braised short rib" },
  { value: "fish", label: "Pan-seared salmon" },
  { value: "vegetarian", label: "Wild mushroom risotto (vegetarian)" },
] as const;

export type Meal = (typeof mealOptions)[number]["value"];

export const schedule = [
  {
    day: "Friday, July 23",
    events: [
      {
        time: "6:00 – 9:00 PM",
        title: "Welcome Drinks",
        place: "Wayfinder Beer",
        address: "304 SE 2nd Ave, Portland, OR 97214",
        mapUrl: "https://maps.google.com/?q=Wayfinder+Beer+304+SE+2nd+Ave+Portland+OR",
        description:
          "Kick off the weekend with us over local beer and bites. Come as you are. Casual attire.",
      },
    ],
  },
  {
    day: "Saturday, July 24",
    events: [
      {
        time: "5:00 PM",
        title: "Ceremony",
        place: "Ecotrust Building",
        address: "721 NW 9th Ave, Portland, OR 97209",
        mapUrl: "https://maps.google.com/?q=Ecotrust+Building+721+NW+9th+Ave+Portland+OR+97209",
        description: "Please arrive 15–20 minutes early to find your seat.",
      },
      {
        time: "6:00 PM",
        title: "Cocktail Hour",
        place: "Ecotrust Building",
        description: "Drinks and hors d'oeuvres.",
      },
      {
        time: "7:00 PM",
        title: "Reception Dinner",
        place: "Ecotrust Building",
        description: "Dinner, toasts, and dancing.",
      },
      {
        time: "10:00 PM",
        title: "Afterparty",
        place: "Backwoods Brewing Company",
        address: "231 NW 11th Ave, Portland, OR 97209",
        mapUrl: "https://maps.google.com/?q=Backwoods+Brewing+Company+231+NW+11th+Ave+Portland+OR+97209",
        description: "Keep the celebration going! It's a short walk from the venue.",
      },
    ],
  },
];

export const hotel = {
  name: "Canopy by Hilton Portland Pearl District",
  shortName: "Canopy by Hilton",
  neighborhood: "Pearl District",
  address: "425 NW 9th Ave, Portland, OR 97209",
  url: "https://www.hilton.com/en/hotels/pdxpepy-canopy-portland-pearl-district/",
  // Per Hilton's listing (Oct 2026); recheck before the wedding.
  parking: "valet only (about $60 per night), no self-parking",
  // Fill in if you reserve a room block; the Travel page shows it when set.
  block: null as null | { bookingUrl: string; code: string; cutoff: string },
};

export const thingsToDo = [
  {
    title: "Powell's City of Books",
    area: "Pearl District",
    blurb:
      "The world's largest independent bookstore fills an entire city block, a short walk from the hotel. Grab a color-coded map and get lost.",
    url: "https://www.powells.com/",
  },
  {
    title: "Washington Park",
    area: "West Hills",
    blurb:
      "Home to the International Rose Test Garden (10,000+ bushes, peak bloom in summer) and the serene Portland Japanese Garden.",
    url: "https://explorewashingtonpark.org/",
  },
  {
    title: "Pittock Mansion",
    area: "West Hills",
    blurb:
      "A 1914 French Renaissance-style chateau with sweeping views of the city and, on clear days, Mount Hood.",
    url: "https://pittockmansion.org/",
  },
  {
    title: "Food carts & breweries",
    area: "Citywide",
    blurb:
      "Portland's food cart pods and craft breweries are legendary. Try the Central Eastside, which is also where Friday's welcome drinks are.",
    url: "https://www.travelportland.com/",
  },
  {
    title: "Multnomah Falls & the Columbia River Gorge",
    area: "~30 min east",
    blurb:
      "Oregon's tallest waterfall (620 ft) and a stunning scenic drive. Check whether a timed-use permit is required before you go.",
    url: "https://www.fs.usda.gov/crgnsa",
  },
];

// Food & drink recommendations on the Things to Do page. Give single-location
// places a `map` query (name + address); places with several locations get
// `multiple: true` instead and no map link.
type Place = { name: string; tag: string; blurb: string } & ({ map: string } | { multiple: true });

export const foodAndDrink: { title: string; places: Place[]; footnote?: string }[] = [
  {
    title: "Restaurants",
    places: [
      {
        name: "Langbaan",
        tag: "Thai",
        blurb:
          "Named the best restaurant in the entire country (James Beard Outstanding Restaurant, 2024). An upscale, intimate tasting menu.",
        map: "Langbaan, 1818 NW 23rd Pl, Portland, OR",
      },
      {
        name: "Kann",
        tag: "Haitian",
        blurb:
          "Won the James Beard Award for Best New Restaurant (2023). Incredible food and drinks. You can even do a tasting of clairin, which is Haitian rum.",
        map: "Kann, 548 SE Ash St, Portland, OR",
      },
      {
        name: "Javelina",
        tag: "Indigenous",
        blurb:
          "Cuisine made with 100% Native American ingredients and recipes. They have a ton of amazing tea, too.",
        map: "Javelina restaurant, Portland, OR",
      },
      {
        name: "Noble Rot",
        tag: "American, farm-to-table",
        blurb: "Their farm is literally a garden on their rooftop patio, and you can see it growing.",
        map: "Noble Rot, 1111 E Burnside St, Portland, OR",
      },
      {
        name: "The Paper Bridge",
        tag: "Vietnamese",
        blurb: "Authentic Northern Vietnamese cooking.",
        map: "The Paper Bridge, 828 SE Ash St, Portland, OR",
      },
      {
        name: "Pho Van",
        tag: "Vietnamese",
        blurb:
          "A little out of the way, but well worth the trip. Portland has a huge Southeast Asian community.",
        // Has several locations; we specifically recommend the original on 82nd.
        map: "Pho Van, 1919 SE 82nd Ave, Portland, OR 97216",
      },
    ],
  },
  {
    title: "Donuts, Cafés & Dessert",
    places: [
      { name: "Voodoo Doughnut", tag: "Doughnuts", blurb: "Portland's famously offbeat doughnut shop.", multiple: true },
      { name: "Blue Star Donuts", tag: "Doughnuts", blurb: "Brioche doughnuts in creative flavors.", multiple: true },
      { name: "Pip's Original Doughnuts & Chai", tag: "Doughnuts & chai", blurb: "Tiny made-to-order doughnuts and house-made chai.", multiple: true },
      { name: "Salt & Straw", tag: "Ice cream", blurb: "Inventive ice cream flavors. They started here in Portland. Fun fact: we got engaged at one of their NYC shops!", multiple: true },
      { name: "Stumptown Coffee", tag: "Coffee", blurb: "The coffee roaster that also got its start in Portland.", multiple: true },
    ],
  },
  {
    title: "Bars",
    places: [
      { name: "Scotch Lodge", tag: "Whiskey & cocktails", blurb: "A cozy, whiskey-focused cocktail bar, and the 2026 James Beard Award winner for Outstanding Bar.", map: "Scotch Lodge, 215 SE 9th Ave, Portland, OR" },
      { name: "Wayfinder Beer", tag: "Brewery", blurb: "Where we're hosting Friday's welcome drinks!", map: "Wayfinder Beer, 304 SE 2nd Ave, Portland, OR" },
      { name: "Hey Love", tag: "Cocktails", blurb: "A cocktail lounge in the Jupiter NEXT hotel with a ton of fun, quirky cocktails.", map: "Hey Love, 920 E Burnside St, Portland, OR" },
      {
        name: "Deschutes Brewery",
        tag: "Brewery",
        blurb: "Near Powell's City of Books, and right across the street from the afterparty.",
        map: "Deschutes Brewery Portland Public House, 210 NW 11th Ave, Portland, OR",
      },
    ],
    footnote: "In general, breweries are everywhere in Portland, and we have yet to find a bad one.",
  },
];

export const faqs = [
  {
    q: "What should I wear?",
    a: "Cocktail attire. Think summer garden: light colors and pastels, flowy florals, and mix-and-match suits. July in Portland is usually warm and dry, but evenings can cool off, so please consider packing a light layer.",
    note: "We kindly ask that you refrain from wearing jeans or overly casual attire. Thank you!",
    images: [
      {
        src: "/attire/dresses.jpg",
        width: 1080,
        height: 1810,
        alt: "Dresses: think garden! Floral, flowy, midi-gown in length. Pink, yellow, lilac, light blue, and sage floral gowns.",
      },
      {
        src: "/attire/suits.jpg",
        width: 1179,
        height: 2094,
        alt: "Suits: think summer! Light colors, pastels, mix and match. Tan, sage, and light gray suits, beige chinos, and a light blue linen vest.",
      },
    ],
  },
  {
    q: "Are kids welcome?",
    a: "If your kids are invited, you'll see their names listed with your party when you RSVP. Because space is limited, we kindly ask that only the children named on your RSVP attend. Thank you for understanding!",
  },
  {
    q: "Can I bring a plus-one?",
    a: "If your invitation includes a guest, you'll see a spot for them when you RSVP. Because space is limited, we're only able to accommodate the guests named on your invitation. Thank you so much for understanding!",
  },
  {
    q: "When is the RSVP deadline?",
    a: `Please RSVP by ${rsvpDeadline} so we can finalize numbers with our caterer.`,
  },
  {
    q: "Is there parking at the venue?",
    a: "Details coming soon. Portland is very walkable and transit-friendly, and rideshares are easy to find.",
  },
  {
    q: "The website looks amazing!",
    // `link` is rendered after `a` as " <a>text</a>."
    a: "I don't think there's a question here, but thank you! We built the whole thing ourselves from scratch, you can see the source code",
    link: { text: "here", href: "https://github.com/yrsong15/yrslzwedding" },
  },
];

export const charities = [
  {
    name: "Alzheimer's Association",
    blurb:
      "Providing care and support for people living with Alzheimer's and their families, and accelerating research toward a cure.",
    url: "https://donorservices.alz.org/page/FUNYAFYQDKA",
  },
  {
    name: "Brooklyn Bridge Park Conservancy",
    blurb:
      "Supporting free programs, public art, and stewardship of the waterfront park that we run in every single morning.",
    url: "https://brooklynbridgepark.org/support/donate/",
  },
];
