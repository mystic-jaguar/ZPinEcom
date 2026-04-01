export interface CategoryNode {
    id: string;
    name: string;
    icon?: string;
    image?: any;
    children?: CategoryNode[];
}

// Helper to build a leaf node
const leaf = (id: string, name: string): CategoryNode => ({ id, name });
// Helper to build a node with children
const node = (id: string, name: string, children: CategoryNode[], image?: any): CategoryNode =>
    ({ id, name, children, ...(image ? { image } : {}) });

// ── FASHION ──────────────────────────────────────────────────────────────────

const menCasual = node('men-casual', 'Casual', [
    node('sweatshirts', 'Sweatshirts', ['zip up','hooded','oversized','round neck','printed','shirt collar','sleeveless','typography','embroidered'].map(n=>leaf('sw-'+n.replace(/\s/g,'-'),n))),
    node('t-shirts', 'T-Shirts', ['round neck','cotton','regular','solid','printed','striped','full sleeves','polar collar','oversized','brand logo','sleeveless','floral','slim fit','varsity'].map(n=>leaf('ts-'+n.replace(/\s/g,'-'),n))),
    node('shirts', 'Shirts', ['check','denim','linen','half sleeve','textured','solid','utility','cotton','oversized','striped','long sleeve','cuban collar','schiffli'].map(n=>leaf('sh-'+n.replace(/\s/g,'-'),n))),
    node('jackets', 'Jackets', ['solid','printed','embroidered','denim','bomber','oversized','lightweight','varsity jacket','sports','graphic jacket','typography','tailored','abstract'].map(n=>leaf('jk-'+n.replace(/\s/g,'-'),n))),
    node('sweaters', 'Sweaters', ['mock neck','v-neck','high neck','solid','cardigan','pullover','vest','shirt collar','striped','printed','sleeveless','turtle neck'].map(n=>leaf('sw2-'+n.replace(/\s/g,'-'),n))),
    node('co-ords', 'Co-Ords', ['casual','partywear','comfortable','formal','traditional','travel','cotton','night out'].map(n=>leaf('co-'+n.replace(/\s/g,'-'),n))),
    node('shorts', 'Shorts', ['cargo','baggy','denim','linen','chino','beach','sports','basics','jorts','distressed','bermuda','drawstring','inner elastic','cotton','slip on','printed','checked'].map(n=>leaf('sho-'+n.replace(/\s/g,'-'),n))),
    node('jeans', 'Jeans', ['baggy','straight fit','cargo','slim fit','bootcut','wide leg','distressed','low rise','high rise','printed'].map(n=>leaf('jn-'+n.replace(/\s/g,'-'),n))),
    node('trousers', 'Trousers', ['cargo','chinos','linen','korean','loose fit','parachute','slim fit','regular fit','cotton','striped','printed','high rise','low rise'].map(n=>leaf('tr-'+n.replace(/\s/g,'-'),n))),
]);

const menEthnic = node('men-ethnic', 'Ethnic', [
    node('kurtas', 'Kurtas', ['puja special','chikankari','floral','sequinned','mirror work','pastel','solid','printed','cotton','daily wear','fusion','festive','embellished','embroidered','yoke design','haldi','sangeet'].map(n=>leaf('ku-'+n.replace(/\s/g,'-'),n))),
    node('fusion-shirts', 'Fusion Shirts', ['tunic shirt','cape style shirt','high-low shirt','wrap style shirt','embroidered shirt','printed shirt','denim fusion shirt','drape attached shirt'].map(n=>leaf('fs-'+n.replace(/\s/g,'-'),n))),
    node('sherwani', 'Sherwani', ['achkan sherwani','indo-western sherwani','jodhpuri sherwani','angrakha sherwani','anarkali sherwani','jacket style sherwani','printed sherwani','embroidered sherwani','velvet sherwani','designer sherwani'].map(n=>leaf('sher-'+n.replace(/\s/g,'-'),n))),
    node('short-kurtas', 'Short Kurtas', ['casual','pathani','nehru collar','angrakha','printed','embroidered','denim/fusion','festive','linen/cotton','office wear'].map(n=>leaf('sk-'+n.replace(/\s/g,'-'),n))),
    leaf('kurta-set', 'Kurta Set'),
    node('blazers', 'Blazers', ['nehru jacket','bandhgala','achkan','angrakha','indo-western','printed','festive','partywear','longline'].map(n=>leaf('bl-'+n.replace(/\s/g,'-'),n))),
    node('nehru-jackets', 'Nehru Jackets', ['partywear','festive','printed','embroidered','cotton','velvet','silk','indo western','longline','designer'].map(n=>leaf('nj-'+n.replace(/\s/g,'-'),n))),
    node('dhoti', 'Dhoti', ['cotton','silk','festive','partywear','printed','patterned','designer','dhoti with kurta set','ready to wear','handloom'].map(n=>leaf('dh-'+n.replace(/\s/g,'-'),n))),
    node('3-piece-set', '3 Piece Set', ['partywear','formal','indo western','printed','embroidered','cotton','designer'].map(n=>leaf('3p-'+n.replace(/\s/g,'-'),n))),
]);

const menSportswear = node('men-sportswear', 'Sportswear', [
    'T-Shirts','Track Pants','Shorts','Jackets','Sweatshirts','Tracksuits','Trunk','Trousers','Innerwear Vests','Swim Bottoms','Shirts','Tights','Briefs','Co-Ords','Rain Jacket','Sports Jacket','Sweaters','Thermal Tops','Lounge T-Shirts','Boxers'
].map(n=>leaf('msp-'+n.toLowerCase().replace(/\s/g,'-'),n)));

const menWorkwear = node('men-workwear', 'Workwear', [
    'Shirts','Blazers','T-Shirts','Trousers','Jeans','Sweatshirts','Sweaters','Jackets','Kurtas','Clothing Fabric','Formal Shoes'
].map(n=>leaf('mww-'+n.toLowerCase().replace(/\s/g,'-'),n)));

const menEssentials = node('men-essentials', 'Essentials', [
    node('boxers', 'Boxers', ['pure cotton','machine wash','inner elastic','outer elastic','printed','checked','solid','woven','knitted'].map(n=>leaf('bx-'+n.replace(/\s/g,'-'),n))),
    node('innerwear-vests', 'Innerwear Vests', ['cotton','sleeveless','ribbed','thermal','moisture-wicking','seamless vest','stretch vests','designer vest'].map(n=>leaf('iv-'+n.replace(/\s/g,'-'),n))),
    node('loungewear', 'Loungewear', ['lounge pants','lounge t-shirts','lounge shorts','night suits','robe'].map(n=>leaf('lw-'+n.replace(/\s/g,'-'),n))),
    node('trunks', 'Trunks', ['outer elastic','inner elastic','knitted','woven','knitted and woven','printed','solid','checked','cotton','elastane'].map(n=>leaf('tk-'+n.replace(/\s/g,'-'),n))),
    node('briefs', 'Briefs', ['innerwear vests','trunk','boxers','thermal tops','thermal bottoms','thermal set','shapewear'].map(n=>leaf('br-'+n.replace(/\s/g,'-'),n))),
]);

const womenWestern = node('w-western', 'Western', [
    node('dresses', 'Dresses', ['bodycon','a-line','sheath','wrap dress','maxi','midi','mini','shirt dress','skater','asymmetrical','off-shoulder','halter neck','tunic','pinafore','camisole'].map(n=>leaf('dr-'+n.replace(/\s/g,'-'),n))),
    node('tops', 'Tops', ['t-shirt','crop top','tank top','camisole top','tube top','shirt top','blouse','peplum top','wrap top','off shoulder top','one shoulder top','smocked top','asymmetrical top','v neck top','tankini top','halter neck top','high neck/turtle neck','corset top','blazers'].map(n=>leaf('tp-'+n.replace(/\s/g,'-'),n))),
    node('jumpsuits', 'Jumpsuits', ['casual','formal/workwear','wide-leg','bodycon','strapless','halter neck','off-shoulder','one shoulder','cape jumpsuit','wrap jumpsuit','denim jumpsuit','party jumpsuit'].map(n=>leaf('js-'+n.replace(/\s/g,'-'),n))),
    node('w-shirts', 'Shirts', ['basic button','casual','denim','linen','checkered','tunic','oversized','dress shirt','crop shirt','sheer/transparent','printed shirt','shrug','jackets','blazers'].map(n=>leaf('ws-'+n.replace(/\s/g,'-'),n))),
    node('w-jeans', 'Jeans', ['skinny jeans','slim-fit jeans','straight leg jeans','bootcut jeans','flared jeans','wide leg jeans','high waist jeans','mid rise jeans','cargo','ripped','trousers','leggings','shorts','skirts','capris','trackpants','tights','jeggings','tracksuits'].map(n=>leaf('wj-'+n.replace(/\s/g,'-'),n))),
    node('tees', 'Tees', ['v neck','sleeveless','round neck','boat neck','polo tee','henley tee','graphics','striped','crop','oversized','longline','cold shoulder','cap sleeve'].map(n=>leaf('wt-'+n.replace(/\s/g,'-'),n))),
    node('l-and-l', 'L&L', ['bra','briefs','night suits','leggings','nightdress','baby dolls','lingerie set','shorts','t shirts','shapewear','lounge pants','swimwear','camisoles','capris','tights','socks','palazzos','stockings'].map(n=>leaf('ll-'+n.replace(/\s/g,'-'),n))),
]);

const womenEthnic = node('w-ethnic', 'Ethnic', [
    node('kurta-sets', 'Kurta Sets', ['straight','anarkali','a-line','angrakha','sharara-gharara','palazzo','chikankari','cape style','jacket style','peplum','floor length','layered','printed','embroidered','floral','dupatta','tunics','shawls','dress material'].map(n=>leaf('wku-'+n.replace(/\s/g,'-'),n))),
    node('sarees', 'Sarees', ['pujo special','silk','tissue','bandhani','leheriya','ready to wear','banarasi','organza','embellished','satin','cotton','sequin','embroidered','zari','lehenga saree','handloom','pastel','kasavu','floral','color blocked'].map(n=>leaf('sar-'+n.replace(/\s/g,'-'),n))),
    node('lehengas', 'Lehengas', ['a-line','flared','panelled','mermaid/fishtail','straight cut','sharara cut','jacket style','cape style','ruffle','layered','printed','embroidered','zari','banarasi','velvet','indo western','shawl','dupatta','dress material'].map(n=>leaf('leh-'+n.replace(/\s/g,'-'),n))),
    node('w-co-ords', 'Co-Ords', ['kurta and pant','kurta and palazzo','crop top and skirt','peplum top and sharara','shirt and pant','cape/kaftan and pant','jacket style co-ords','layered','printed daily','embroidered/festive','indo-western'].map(n=>leaf('wco-'+n.replace(/\s/g,'-'),n))),
    node('indie-work', 'Indie Work', ['block print','handloom cotton','indigo work','kalamkari','ajrakh prints','ikat weaves','chikankari','bagru print','khadi cotton','ethnic tunics and tops','fusion indie dresses','minimal embroidered workwear'].map(n=>leaf('iw-'+n.replace(/\s/g,'-'),n))),
    node('designer-wear', 'Designer Wear', ['designer saree','designer lehengas','designer kurta sets','designer anarkali','designer gowns','cape style','bridal couture','fusion designer wear','jacket style','ruffle & layered','pre-draped','high-slit designer kurtas','handcrafted designer pieces'].map(n=>leaf('dw-'+n.replace(/\s/g,'-'),n))),
    node('indie-fusion', 'Indie Fusion', ['kurta with jeans/joggers','crop top & dhoti pants','saree with belt/jacket','indie skirt with crop top/shirt','kaftan fusion dress','shirt style kurta/dress','indie jumpsuit','fusion co-ord set','cape/shrug layered outfit','peplum top with sharara/gharara','asymmetrical/high-low dress','indo-western gown','boho fusion wear'].map(n=>leaf('if-'+n.replace(/\s/g,'-'),n))),
    node('gowns', 'Gowns', ['anarkali gown','a-line gown','flared gown','straight cut gown','indo-western gown','layered gown','ruffle gown','cape style gown','jacket style gown','high-low gown','asymmetrical gown','embroidered/zari gown','printed gown','bridal gown','evening/party gown'].map(n=>leaf('gw-'+n.replace(/\s/g,'-'),n))),
]);

const womenFusion = node('w-fusion', 'Fusion', [
    node('indie-fusion-w', 'Indie Fusion', ['indo western dresses','kurta with jeans','saree with shirt/crop top','palazzo–crop top','ethnic jacket dress','dhoti pants–kurti','fusion gown','anarkali with belt','lehenga–shirt style','skirt–dupatta wrap','tunic with trouser','sharara–top fusion','cape over saree'].map(n=>leaf('wif-'+n.replace(/\s/g,'-'),n))),
    node('boho-fusion', 'Boho Fusion', ['tie-dye maxi','crochet top','fringe jacket','tassel shrug','layered skirt','kaftan dress','printed jumpsuit','embroidered co-ord','boho tunic','wrap dress','gypsy skirt','mirror work shrug'].map(n=>leaf('bf-'+n.replace(/\s/g,'-'),n))),
    node('street-fusion', 'Street Fusion', ['tee–lehenga','hoodie–palazzo','denim kurta','saree–sneakers','crop hoodie–dhoti','cargo–kurti','graphic tunic','street shrug','baggy pants kurta','funky jacket saree','varsity kurti','skater dress fusion'].map(n=>leaf('sf-'+n.replace(/\s/g,'-'),n))),
    node('festive-fusion', 'Festive Fusion', ['gown–dupatta','peplum–lehenga','saree–cape','jacket anarkali','crop–sharara','drape skirt–top','lehenga–blazer','trail gown fusion','belted saree','heavy kurta set','festive co-ord','dupatta shrug style'].map(n=>leaf('ff-'+n.replace(/\s/g,'-'),n))),
    node('contemporary-fusion', 'Contemporary Fusion', ['draped gown saree','one-shoulder kurta','fusion jumpsuit','slit tunic skirt','cape lehenga','asym kurta','wrap fusion dress','cowl pant kurta','peplum saree','drape skirt top','overlay anarkali','jacket gown'].map(n=>leaf('cf-'+n.replace(/\s/g,'-'),n))),
    node('luxury-fusion', 'Luxury Fusion', ['sequin saree–blazer','corset–lehenga','embro jacket dress','ruffle gown','crystal kurta set','metallic saree','designer sharara','luxury co-ord','cape gown','velvet fusion wear','glam tunic set','heavy drape saree'].map(n=>leaf('lf-'+n.replace(/\s/g,'-'),n))),
]);

const womenEssentials = node('w-essentials', 'Essentials', [
    'Shapewear','Bras','Panties','Night Suits','Stockings','Thermals','Maternity Wear','Swimwear','Babydolls','Lingerie Accessories','Saree Shapewear','Night Dress'
].map(n=>leaf('we-'+n.toLowerCase().replace(/\s/g,'-'),n)));

const womenSportswear = node('w-sportswear', 'Sportswear', [
    node('activewear', 'Activewear', ['sports bras','leggings','joggers','shorts','tank tops','crop tops','tracksuits','sports jackets','hoodies','co-ord sets'].map(n=>leaf('act-'+n.replace(/\s/g,'-'),n))),
    node('training-gym', 'Training & Gym', ['gym t-shirts','compression wear','workout leggings','training shorts','sweatproof tops','gym vests','track pants','stretch joggers','base layers','training shoes'].map(n=>leaf('tg-'+n.replace(/\s/g,'-'),n))),
    node('running-wear', 'Running Wear', ['running tees','running shorts','track leggings','windcheaters','lightweight jackets','running sports bra','reflective gear','arm bands','headbands & caps'].map(n=>leaf('rw-'+n.replace(/\s/g,'-'),n))),
]);

// ── FOOTWEAR ─────────────────────────────────────────────────────────────────

const footwearWomen = node('ft-women', 'Women', [
    'Heels','Flats','Casual Shoes','Flip Flops','Sports Shoes','Boots','Sandals','Formal Shoes','Partywear','Crocs'
].map(n=>leaf('ftw-'+n.toLowerCase().replace(/\s/g,'-'),n)));

const footwearMen = node('ft-men', 'Men', [
    'Casual Shoes','Sports Shoes','Flip Flops','Sandals','Formal Shoes','Boots','Flats','Crocs'
].map(n=>leaf('ftm-'+n.toLowerCase().replace(/\s/g,'-'),n)));

// ── ACCESSORIES ───────────────────────────────────────────────────────────────

const accessories = [
    node('bags', 'Bags & Backpacks', ['Handbags','Backpacks','Laptop Bags','School Bags','Travel/Gym Bags','Sling & Clutch Bags'].map(n=>leaf('bag-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('wallets', 'Wallets & Belts', ['Wallets','Belts','Card Holders','Coin Pouches'].map(n=>leaf('wal-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('watches', 'Watches', ['Analog','Digital','Smart Watches','Sports Watches'].map(n=>leaf('wat-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('sunglasses', 'Sunglasses & Eyewear', ['Sunglasses','Blue Light Glasses','Reading Glasses','Frames'].map(n=>leaf('sun-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('jewellery', 'Jewellery', ['Earrings','Necklaces','Bangles & Bracelets','Rings','Jewellery Sets'].map(n=>leaf('jew-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('hair-acc', 'Hair Accessories', ['Clips & Pins','Hair Bands & Scrunchies','Headbands','Bridal Accessories'].map(n=>leaf('ha-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('caps', 'Caps & Hats', ['Caps','Hats','Winter Caps'].map(n=>leaf('cap-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('scarves', 'Scarves & Stoles', ['Scarves','Stoles','Winter Wear'].map(n=>leaf('sca-'+n.toLowerCase().replace(/\s/g,'-'),n))),
];

// ── BEAUTY ────────────────────────────────────────────────────────────────────

const beauty = [
    node('skincare', 'Skincare', ['Face Wash & Cleanser','Moisturizers & Creams','Sunscreen','Serums & Masks'].map(n=>leaf('sk-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('haircare', 'Haircare', ['Shampoo & Conditioner','Hair Oil & Serum','Hair Color','Styling Products'].map(n=>leaf('hc-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('makeup', 'Makeup', ['Face Makeup','Eye Makeup','Lip Makeup','Makeup Kits'].map(n=>leaf('mu-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('personal-care', 'Personal Care', ['Soaps & Body Wash','Deodorants','Oral Care','Feminine Hygiene'].map(n=>leaf('pc-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('grooming', 'Grooming', ['Shaving & Trimming','Hair Removal','Grooming Kits','Beard & Styling Products'].map(n=>leaf('gr-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('fragrances', 'Fragrances & Deodorants', ['Perfumes','Body Sprays','Roll-Ons','Gift Sets'].map(n=>leaf('fr-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('beauty-tools', 'Beauty Tools & Appliances', ['Hair Dryers','Straighteners & Curlers','Trimmers & Shavers','Face & Skin Tools'].map(n=>leaf('bt-'+n.toLowerCase().replace(/\s/g,'-'),n))),
];

// ── HOME & LIVING ─────────────────────────────────────────────────────────────

const homeLiving = [
    node('kitchenware', 'Kitchenware', ['Cookware','Utensils','Storage Containers','Kitchen Tools'].map(n=>leaf('kw-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('dining', 'Dining Essentials', ['Dinner Sets','Plates & Bowls','Glasses & Mugs','Serving Items'].map(n=>leaf('din-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('storage', 'Storage & Organizers', ['Storage Boxes','Wardrobe Organizers','Kitchen Organizers','Multipurpose Racks'].map(n=>leaf('sto-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('cleaning', 'Cleaning & Utility', ['Cleaning Tools','Cleaning Supplies','Laundry Items','Utility Accessories'].map(n=>leaf('cln-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('bedding', 'Bedding & Linen', ['Bedsheets','Blankets & Quilts','Pillow Covers','Towels'].map(n=>leaf('bed-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('bathroom', 'Bathroom Accessories', ['Soap Dispensers & Holders','Bathroom Racks','Mirrors','Bath Essentials'].map(n=>leaf('bat-'+n.toLowerCase().replace(/\s/g,'-'),n))),
    node('home-improvement', 'Home Improvement', ['Tools & Hardware','Electrical Fittings','Plumbing Essentials','Repair & Maintenance'].map(n=>leaf('hi-'+n.toLowerCase().replace(/\s/g,'-'),n))),
];

// ── EXPORT ────────────────────────────────────────────────────────────────────

export const CATEGORY_DATA: CategoryNode[] = [
    {
        id: 'fashion',
        name: 'Fashion',
        icon: 'shopping-bag',
        children: [
            node('men', 'Men', [menCasual, menEthnic, menSportswear, menWorkwear, menEssentials]),
            node('women', 'Women', [womenWestern, womenEthnic, womenFusion, womenEssentials, womenSportswear]),
        ],
    },
    {
        id: 'footwear',
        name: 'Footwear',
        icon: 'package',
        children: [footwearWomen, footwearMen],
    },
    {
        id: 'accessories',
        name: 'Accessories',
        icon: 'briefcase',
        children: accessories,
    },
    {
        id: 'beauty',
        name: 'Beauty',
        icon: 'smile',
        children: beauty,
    },
    {
        id: 'home',
        name: 'Home & Living',
        icon: 'home',
        children: homeLiving,
    },
];
