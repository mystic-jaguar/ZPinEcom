/**
 * Category name -> home-screen artwork kind (components/home/HomeArt.tsx).
 * Pure so it runs under plain Node in utils/artFor.test.ts.
 */
export type ArtKind =
    | 'fashion' | 'ethnic' | 'western' | 'men' | 'women' | 'kids'
    | 'footwear' | 'accessories' | 'bags' | 'watch' | 'eyewear' | 'jewellery'
    | 'beauty' | 'makeup' | 'skincare' | 'home' | 'sports' | 'winter'
    | 'tryAtDoor' | 'delivery' | 'deal';

// Order matters: kids before women before men ("women" contains "men"), ethnic
// before the generic clothing words, eyewear before makeup ("eye").
const RULES: [RegExp, ArtKind][] = [
    [/kid|baby|infant|toddler|boy|girl/i, 'kids'],
    [/ethnic|kurta|kurti|saree|sari\b|lehenga|salwar|dupatta|sherwani/i, 'ethnic'],
    [/shoe|sneaker|footwear|sandal|slipper|boot|heel|loafer|flip.?flop/i, 'footwear'],
    [/watch/i, 'watch'],
    [/glass|eyewear|frame|spectacle/i, 'eyewear'],
    [/jewel|ring|earring|necklace|bangle|bracelet|pendant|anklet/i, 'jewellery'],
    [/bag|wallet|purse|clutch|luggage|pouch|card.?holder/i, 'bags'],
    [/makeup|make-up|lip|eye|nail|kajal|mascara|foundation/i, 'makeup'],
    [/skin|face|moistur|serum|cream|sunscreen|lotion|wellness/i, 'skincare'],
    [/beauty|cosmetic|hair|perfume|fragrance|deo|spray|groom|beard|personal care/i, 'beauty'],
    [/home|living|decor|kitchen|furnish|furniture|bed|bath|lamp|light|applian|improvement/i, 'home'],
    [/women|ladies|female/i, 'women'],
    [/\bmen|\bmale|gents/i, 'men'],
    [/sport|gym|active|fitness|track|yoga/i, 'sports'],
    [/jacket|winter|coat|sweater|hoodie|thermal|woollen|shawl/i, 'winter'],
    [/western|dress|jeans|skirt|top\b/i, 'western'],
    [/accessor/i, 'accessories'],
];

/** Best-fit artwork for a free-text category name from the DB. Unknown → fashion. */
export const artFor = (name?: string | null): ArtKind =>
    RULES.find(([re]) => re.test(name || ''))?.[1] ?? 'fashion';

