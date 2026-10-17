// Central place for wedding details and copy. Edit here, not in the pages.

export const couple = {
  names: "Young Re & Lauren",
  contactEmail: "hello@example.com",
};

export const weddingDate = new Date("2027-07-24T17:00:00-07:00");

export const weddingDateLabel = "Saturday, July 24, 2027";
// Shown on the Home page above the date. "Young Re and Lauren are making a new start in life together."
export const koreanMessage = "영래와 로렌이 함께 인생의 새로운 출발을 하려 합니다";
export const location = "Portland, Oregon";
export const rsvpDeadline = "March 1, 2027";

// `ko` is shown when a tab is hovered, focused, or pressed (see components/Nav.tsx).
export const navLinks = [
  { href: "/", label: "Home", ko: "홈" },
  { href: "/rsvp", label: "RSVP", ko: "참석 여부" },
  { href: "/schedule", label: "Schedule", ko: "일정" },
  { href: "/things-to-do", label: "Things to Do", ko: "즐길 거리" },
  { href: "/travel", label: "Travel & Lodging", ko: "교통 · 숙소" },
  { href: "/faq", label: "FAQs", ko: "자주 묻는 질문" },
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
        time: "7:30 PM",
        title: "Dinner & Dancing",
        place: "Ecotrust Building",
        description: "Dinner, toasts, and dancing until late.",
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

export const faqs = [
  {
    q: "What should I wear?",
    a: "Cocktail attire. July in Portland is usually warm and dry, but evenings can cool off, so bring a light layer.",
  },
  {
    q: "Are kids welcome?",
    a: "We love your little ones! Details coming soon. Your invitation will list everyone we've reserved a seat for.",
  },
  {
    q: "Can I bring a plus-one?",
    a: "If your invitation includes a guest, you'll see a spot for them when you RSVP.",
  },
  {
    q: "When is the RSVP deadline?",
    a: `Please RSVP by ${rsvpDeadline} so we can finalize numbers with our caterer.`,
  },
  {
    q: "Is there parking at the venue?",
    a: "Details coming soon. Portland is very walkable and transit-friendly, and rideshares are easy to find.",
  },
];

export const charities = [
  {
    name: "The ALS Association",
    blurb:
      "Funding research, care services, and advocacy for people living with ALS and their families.",
    url: "https://www.als.org/donate",
  },
  {
    name: "Brooklyn Bridge Park Conservancy",
    blurb:
      "Supporting free programs, public art, and stewardship of the waterfront park that we run in every single morning.",
    url: "https://brooklynbridgepark.org/support/",
  },
];
