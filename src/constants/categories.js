// 20 Standard Menu Categories with Original Real Dish Photos for Arunachala Bhavan Admin App

export const MENU_CATEGORIES = [
  {
    no: 1,
    id: 'arunachala-special',
    name: 'Arunachala Special',
    badge: 'Signature',
    tagline: 'House Chef Special Creations',
    image_url: '/categories/arunachala-special.jpg'
  },
  {
    no: 2,
    id: 'starters',
    name: 'Starters',
    badge: 'Crispy',
    tagline: 'Appetizers & Chaat Specials',
    image_url: '/categories/starters.jpg'
  },
  {
    no: 3,
    id: 'soup',
    name: 'Soup',
    badge: 'Comforting',
    tagline: 'Fresh & Warm Broths',
    image_url: '/categories/soup.jpg'
  },
  {
    no: 4,
    id: 'sweets',
    name: 'Sweets',
    badge: 'Desserts',
    tagline: 'Traditional Indian Sweets',
    image_url: '/categories/sweets.jpg'
  },
  {
    no: 5,
    id: 'biryani',
    name: 'Biryani',
    badge: 'Bestseller',
    tagline: 'Dum Cooked Fragrant Rice',
    image_url: '/categories/biryani.jpg'
  },
  {
    no: 6,
    id: 'meals',
    name: 'Meals',
    badge: 'Royal Thali',
    tagline: 'Wholesome Thali Combos',
    image_url: '/categories/meals.jpg'
  },
  {
    no: 7,
    id: 'pulav',
    name: 'Pulav',
    badge: 'Aromatic',
    tagline: 'Spiced Basmati Pulavs',
    image_url: '/categories/pulav.jpg'
  },
  {
    no: 8,
    id: 'indo-chinese',
    name: 'Indo Chinese',
    badge: 'Wok Tossed',
    tagline: 'Fried Rice, Noodles & Manchurian',
    image_url: '/categories/indo-chinese.jpg'
  },
  {
    no: 9,
    id: 'tandoori',
    name: 'Tandoori',
    badge: 'Clay Oven',
    tagline: 'Hot Naans, Rotis & Tikkas',
    image_url: '/categories/tandoori.jpg'
  },
  {
    no: 10,
    id: 'north-indian',
    name: 'North Indian',
    badge: 'Rich Gravy',
    tagline: 'Paneer, Dal & Vegetable Curries',
    image_url: '/categories/north-indian.jpg'
  },
  {
    no: 11,
    id: 'south-indian',
    name: 'South Indian',
    badge: 'Authentic',
    tagline: 'Sambar, Rasam & Variety Rice',
    image_url: '/categories/south-indian.jpg'
  },
  {
    no: 12,
    id: 'prata',
    name: 'Prata',
    badge: 'Flaky',
    tagline: 'Layered Pratas & Kothu',
    image_url: '/categories/prata.jpg'
  },
  {
    no: 13,
    id: 'dosai',
    name: 'Dosai',
    badge: 'Golden Crisp',
    tagline: 'Classic & Stuffed Dosais',
    image_url: '/categories/dosai.jpg'
  },
  {
    no: 14,
    id: 'uthappam',
    name: 'Uthappam',
    badge: 'Thick & Soft',
    tagline: 'Fluffy Vegetable Uthappams',
    image_url: '/categories/uthappam.jpg'
  },
  {
    no: 15,
    id: 'rava-dosai',
    name: 'Rava Dosai',
    badge: 'Net Roasted',
    tagline: 'Crispy Semolina Rava Dosas',
    image_url: '/categories/rava-dosai.jpg'
  },
  {
    no: 16,
    id: 'local-delights',
    name: 'Local Delights',
    badge: 'Signature',
    tagline: 'Mee, Kway Teow & Bee Hoon',
    image_url: '/categories/local-delights.jpg'
  },
  {
    no: 17,
    id: 'tiffin',
    name: 'Tiffin',
    badge: 'All Day',
    tagline: 'Idly, Vada, Poori & Chappathi',
    image_url: '/categories/tiffin.jpg'
  },
  {
    no: 18,
    id: 'hot-drinks',
    name: 'Hot Drinks',
    badge: 'Freshly Brewed',
    tagline: 'Filter Coffee, Tea & Horlicks',
    image_url: '/categories/hot-drinks.jpg'
  },
  {
    no: 20,
    id: 'cool-drinks',
    name: 'Cool Drinks',
    badge: 'Chilled',
    tagline: 'Fresh Lime, Lassi & Milkshakes',
    image_url: '/categories/cool-drinks.jpg'
  },
  {
    no: 21,
    id: 'catering-menu',
    name: 'Catering Menu',
    badge: 'Party Orders',
    tagline: 'Bulk Feasts & Event Packages',
    image_url: '/categories/catering-menu.jpg'
  }
];

export const DEFAULT_CATEGORY_IMAGE = '/categories/arunachala-special.jpg';

const CATEGORY_IMAGE_BY_KEY = new Map();
MENU_CATEGORIES.forEach((cat) => {
  CATEGORY_IMAGE_BY_KEY.set(cat.id.toLowerCase(), cat.image_url);
  CATEGORY_IMAGE_BY_KEY.set(cat.name.toLowerCase(), cat.image_url);
});

export function getCategoryImage(cat) {
  if (!cat) return DEFAULT_CATEGORY_IMAGE;
  const rawUrl = typeof cat === 'string' ? '' : String(cat.image_url || '').trim();
  const idKey = (typeof cat === 'string' ? cat : (cat.id || '')).trim().toLowerCase();
  const nameKey = (typeof cat === 'string' ? cat : (cat.name || '')).trim().toLowerCase();
  const curated = CATEGORY_IMAGE_BY_KEY.get(idKey) || CATEGORY_IMAGE_BY_KEY.get(nameKey);

  // Respect explicit admin-uploaded images (local data URIs or non-stock URLs)
  if (rawUrl && !rawUrl.startsWith('https://images.unsplash.com/photo-')) {
    return rawUrl;
  }
  return curated || DEFAULT_CATEGORY_IMAGE;
}

export function getItemCategory(item) {
  if (!item) return 'South Indian';

  // If the item already has an explicit category assigned, respect it!
  const explicitCat = (item.category_name || item.category_id || '').trim();
  if (explicitCat && explicitCat !== 'General' && explicitCat !== 'undefined' && explicitCat !== 'null') {
    return explicitCat;
  }

  const name = (item.name || '').trim();
  const n = name.toLowerCase();

  // 1. Arunachala Special (All dishes starting with AB)
  if (name.startsWith('AB ') || name.startsWith('AB-') || n.includes('arunachala special')) {
    return 'Arunachala Special';
  }

  // 15. Rava Dosai (must precede Dosai)
  if (n.includes('rava')) {
    return 'Rava Dosai';
  }

  // 14. Uthappam
  if (n.includes('uthappam') || n.includes('uttapam')) {
    return 'Uthappam';
  }

  // 13. Dosai
  if (n.includes('dosa') || n.includes('dosai')) {
    return 'Dosai';
  }

  // 12. Prata
  if (n.includes('prata') || n.includes('parotta') || (n.includes('paratha') && !n.includes('aloo paratha')) || n.includes('murruthappa')) {
    return 'Prata';
  }

  // 3. Soup
  if (n.includes('soup') || n.includes('shorba')) {
    return 'Soup';
  }

  // 4. Sweets
  if (n.includes('kesari') || n.includes('jamun') || n.includes('payasam') || n.includes('halwa') || n.includes('rasgulla') || n.includes('sweet') || n.includes('dessert') || n.includes('kulfi') || n.includes('ice cream')) {
    return 'Sweets';
  }

  // 5. Biryani
  if (n.includes('biryani') || n.includes('biriyani')) {
    return 'Biryani';
  }

  // 7. Pulav
  if (n.includes('pulao') || n.includes('pulav')) {
    return 'Pulav';
  }

  // 6. Meals
  if (n.includes('meal') || n.includes('thali')) {
    return 'Meals';
  }

  // 16. Local Delights
  if (n.includes('goreng') || n.includes('mee ') || n.includes('kway teow') || n.includes('bee hoon') || n.includes('nasi') || n.includes('maggi')) {
    return 'Local Delights';
  }

  // 17. Tiffin
  if (n.includes('idly') || n.includes('idli') || n.includes('vadai') || n.includes('vada') || n.includes('poori') || n.includes('puri') || n.includes('chappathi') || n.includes('chapathi') || n.includes('chapati') || n.includes('bhatura') || n.includes('pongal') || n.includes('upma') || n.includes('kichadi')) {
    return 'Tiffin';
  }

  // Hot & Cool Drinks (without confusing 'rice' and 'ice')
  if (n.includes('coffee') || n.includes('tea') || n.includes('bru') || n.includes('milo') || n.includes('horlicks') || n.includes('sukku') || n.includes('badam milk') || n.includes('milk') || n.includes('juice') || n.includes('shake') || n.includes('soda') || n.includes('lassi') || n.includes('lime') || n.includes('cooler') || n.includes('mojito') || n.includes('beverage') || n.includes('water') || n.includes('drink')) {
    if (n.includes('hot ') || n.includes('filter coffee') || n.includes('bru coffee') || (n.includes('tea') && !n.includes('ice')) || n.includes('sukku') || (n.includes('horlicks') && !n.includes('ice')) || n.includes('hot milo')) {
      return 'Hot Drinks';
    }
    return 'Cool Drinks';
  }

  // 8. Indo Chinese
  if (n.includes('manchurian') || n.includes('fried rice') || n.includes('noodles') || n.includes('schezwan') || n.includes('chilli ') || n.includes('chili ') || n.includes('hakka') || n.includes('spring roll') || n.includes('dragon') || n.includes('pasta')) {
    return 'Indo Chinese';
  }

  // 9. Tandoori
  if (n.includes('tandoori') || n.includes('naan') || n.includes('kulcha') || n.includes('tandoor') || n.includes('tikka') || n.includes('kebab') || n.includes('roti') || n.includes('aloo paratha')) {
    return 'Tandoori';
  }

  // 2. Starters
  if (n.includes('65') || n.includes('pakoda') || n.includes('fry') || n.includes('crispy') || n.includes('samosa') || n.includes('chaat') || n.includes('cutlet') || n.includes('finger') || n.includes('tikki') || n.includes('roll') || n.includes('sandwich') || n.includes('snacks')) {
    return 'Starters';
  }

  // 11. South Indian
  if (n.includes('sambar rice') || n.includes('curd rice') || n.includes('rasam rice') || n.includes('lemon rice') || n.includes('tamarind rice') || n.includes('tomato rice') || n.includes('variety rice') || n.includes('chettinad') || n.includes('kootu') || n.includes('poriyal') || n.includes('avial') || n.includes('vatha kulambu') || n.includes('appalam')) {
    return 'South Indian';
  }

  // 10. North Indian
  if (n.includes('paneer') || n.includes('dal') || n.includes('dhal') || n.includes('chana') || n.includes('channa') || n.includes('kofta') || n.includes('curry') || n.includes('gravy') || n.includes('masala') || n.includes('makhani') || n.includes('kadhai') || n.includes('kadai') || n.includes('korma') || n.includes('mutter') || n.includes('aloo') || n.includes('baingan') || n.includes('bhindi') || n.includes('subzi') || n.includes('soya')) {
    return 'North Indian';
  }

  // 21. Catering Menu
  if (n.includes('catering') || n.includes('bulk') || n.includes('party pack')) {
    return 'Catering Menu';
  }

  // Fallback to category_id if provided
  if (item.category_id) {
    const matched = MENU_CATEGORIES.find(
      c => c.name.toLowerCase() === item.category_id.toLowerCase() || c.id === item.category_id
    );
    if (matched) return matched.name;
  }

  return 'South Indian';
}

export const LEGACY_STALE_CATEGORY_NAMES = new Set([
  'biryani & rice',
  'main course',
  'chinese & fast food',
  'beverages',
  'desserts',
  'desserts & ice cream',
  'drinks & desserts'
]);

export function sanitizeStoredCategories(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const hasLegacyName = list.some(c =>
    LEGACY_STALE_CATEGORY_NAMES.has(String(c?.name || '').trim().toLowerCase())
  );
  const hasArunachalaSpecial = list.some(c =>
    String(c?.name || '').trim().toLowerCase() === 'arunachala special'
  );
  if (hasLegacyName && !hasArunachalaSpecial) {
    return null;
  }
  const filtered = list.filter(c => {
    const norm = String(c?.name || '').trim().toLowerCase();
    const img = String(c?.image_url || '');
    if (!norm || LEGACY_STALE_CATEGORY_NAMES.has(norm)) return false;
    if (norm === 'starters' && img.includes('1541544741938')) return false;
    return true;
  });
  return filtered.length > 0 ? filtered : null;
}
