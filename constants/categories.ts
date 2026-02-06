
export interface CategoryNode {
    id: string;
    name: string;
    icon?: string;
    image?: any;
    children?: CategoryNode[];
}

export const CATEGORY_DATA: CategoryNode[] = [
    {
        id: 'fashion',
        name: 'Fashion',
        icon: 'shopping-bag', // Feather
        children: [
            {
                id: 'men',
                name: 'Men',
                children: [
                    {
                        id: 'men-casual',
                        name: 'Casual Essentials',
                        children: [
                            {
                                id: 'men-casual-tshirts',
                                name: 'T-Shirts',
                                image: { uri: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
                                children: [
                                    { id: 'rn', name: 'Round Neck', image: { uri: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200' } },
                                    { id: 'polo', name: 'Polo', image: { uri: 'https://images.unsplash.com/photo-1626557981101-aae6f84aa6ff?w=200' } },
                                    { id: 'over', name: 'Oversized', image: { uri: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200' } },
                                    { id: 'slim', name: 'Slim Fit', image: { uri: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=200' } },
                                    { id: 'var', name: 'Varsity', image: { uri: 'https://images.unsplash.com/photo-1551488852-d814c8c6ecc7?w=200' } },
                                    { id: 'print', name: 'Printed', image: { uri: 'https://images.unsplash.com/photo-1503342217505-b0815a0de799?w=200' } },
                                    { id: 'solid', name: 'Solid', image: { uri: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=200' } },
                                    { id: 'stripe', name: 'Striped', image: { uri: 'https://images.unsplash.com/photo-1618354691438-25bc04584c23?w=200' } }
                                ]
                            },
                            {
                                id: 'men-casual-shirts',
                                name: 'Shirts',
                                image: { uri: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400' },
                                children: [
                                    { id: 'cas-shirt', name: 'Casual' },
                                    { id: 'den-shirt', name: 'Denim' },
                                    { id: 'lin-shirt', name: 'Linen' },
                                    { id: 'cot-shirt', name: 'Cotton' },
                                    { id: 'chk-shirt', name: 'Checkered' },
                                    { id: 'str-shirt', name: 'Striped' },
                                    { id: 'ovr-shirt', name: 'Oversized' },
                                    { id: 'cub-shirt', name: 'Cuban Collar' }
                                ]
                            },
                            {
                                id: 'men-casual-sweatshirts',
                                name: 'Sweatshirts',
                                image: { uri: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400' },
                                children: [
                                    { id: 'hood', name: 'Hooded' },
                                    { id: 'zip', name: 'Zip-Up' },
                                    { id: 'ovr-sweat', name: 'Oversized' },
                                    { id: 'prt-sweat', name: 'Printed' },
                                    { id: 'typ-sweat', name: 'Typography' }
                                ]
                            },
                            {
                                id: 'men-casual-jackets',
                                name: 'Jackets',
                                image: { uri: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400' },
                                children: [
                                    { id: 'bomb', name: 'Bomber' },
                                    { id: 'den-jack', name: 'Denim' },
                                    { id: 'var-jack', name: 'Varsity' },
                                    { id: 'spt-jack', name: 'Sports' },
                                    { id: 'grp-jack', name: 'Graphic' }
                                ]
                            },
                            {
                                id: 'men-casual-sweaters',
                                name: 'Sweaters',
                                image: { uri: 'https://images.unsplash.com/photo-1620799140408-ed5341cdb4f3?w=400' },
                                children: [
                                    { id: 'pull', name: 'Pullover' },
                                    { id: 'card', name: 'Cardigan' },
                                    { id: 'vest', name: 'Vest' },
                                    { id: 'vnk', name: 'V-Neck' },
                                    { id: 'tnk', name: 'Turtle Neck' }
                                ]
                            },
                            {
                                id: 'men-casual-coords',
                                name: 'Co-Ords',
                                image: { uri: 'https://images.unsplash.com/photo-1617137968427-85924c809a10?w=400' },
                                children: [
                                    { id: 'cas-coord', name: 'Casual' },
                                    { id: 'pty-coord', name: 'Partywear' },
                                    { id: 'for-coord', name: 'Formal' },
                                    { id: 'tvl-coord', name: 'Travel' }
                                ]
                            },
                            {
                                id: 'jeans',
                                name: 'Jeans',
                                image: { uri: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=400' },
                                children: [
                                    { id: 'slim-jn', name: 'Slim Fit' },
                                    { id: 'str-jn', name: 'Straight Fit' },
                                    { id: 'bag-jn', name: 'Baggy' },
                                    { id: 'boot-jn', name: 'Bootcut' }
                                ]
                            },
                            {
                                id: 'trousers',
                                name: 'Trousers',
                                image: { uri: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400' },
                                children: [
                                    { id: 'cargo-tr', name: 'Cargo' },
                                    { id: 'chino', name: 'Chinos' },
                                    { id: 'para', name: 'Parachute' },
                                    { id: 'lin-tr', name: 'Linen' }
                                ]
                            },
                            {
                                id: 'shorts',
                                name: 'Shorts',
                                image: { uri: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400' },
                                children: [
                                    { id: 'cargo-sh', name: 'Cargo' },
                                    { id: 'denim-sh', name: 'Denim' },
                                    { id: 'berm', name: 'Bermuda' },
                                    { id: 'spt-sh', name: 'Sports' }
                                ]
                            }
                        ]
                    },
                    {
                        id: 'men-ethnic',
                        name: 'Ethnic',
                        children: [
                            {
                                id: 'kurtas',
                                name: 'Kurtas',
                                image: { uri: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400' },
                                children: [
                                    { id: 'cot-kur', name: 'Cotton' },
                                    { id: 'prt-kur', name: 'Printed' },
                                    { id: 'chk-kur', name: 'Chikankari' },
                                    { id: 'fst-kur', name: 'Festive' }
                                ]
                            },
                            {
                                id: 'short-kurtas',
                                name: 'Short Kurtas',
                                image: { uri: 'https://images.unsplash.com/photo-1609357912429-1a856333c5e8?w=400' },
                                children: [
                                    { id: 'path', name: 'Pathani' },
                                    { id: 'nehru', name: 'Nehru Collar' },
                                    { id: 'cas-sk', name: 'Casual' }
                                ]
                            },
                            { id: 'kurta-sets', name: 'Kurta Sets', image: { uri: 'https://images.unsplash.com/photo-1610189012906-4c0aa9b29c59?w=400' } },
                            {
                                id: 'sherwani',
                                name: 'Sherwani',
                                image: { uri: 'https://media.istockphoto.com/id/1158623408/photo/indian-groom.jpg?s=612x612&w=0&k=20&c=N5iKk5tQ5B1_0pDk4q6rF4J8yT4uJ6v0-6_0b3-0_0=' },
                                children: [
                                    { id: 'ach', name: 'Achkan' },
                                    { id: 'indo', name: 'Indo-Western' },
                                    { id: 'vel', name: 'Velvet' },
                                    { id: 'des-sh', name: 'Designer' }
                                ]
                            },
                            {
                                id: 'eth-jackets',
                                name: 'Jackets & Blazers',
                                image: { uri: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400' },
                                children: [
                                    { id: 'nehru-j', name: 'Nehru Jacket' },
                                    { id: 'bandh', name: 'Bandhgala' },
                                    { id: 'fst-j', name: 'Festive' }
                                ]
                            },
                            {
                                id: 'dhoti',
                                name: 'Dhoti',
                                image: { uri: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=400' },
                                children: [
                                    { id: 'cot-dho', name: 'Cotton' },
                                    { id: 'slk-dho', name: 'Silk' },
                                    { id: 'rtw-dho', name: 'Ready-to-Wear' }
                                ]
                            },
                            { id: '3-pcs', name: '3-Piece Sets', image: { uri: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400' } }
                        ]
                    },
                    {
                        id: 'men-sportswear',
                        name: 'Sportswear',
                        children: [
                            { id: 'sp-ts', name: 'T-Shirts', image: { uri: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' } },
                            { id: 'sp-sh', name: 'Shorts', image: { uri: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400' } },
                            { id: 'sp-tp', name: 'Track Pants', image: { uri: 'https://images.unsplash.com/photo-1552160753-117159d28e72?w=400' } },
                            { id: 'sp-tr', name: 'Tracksuits', image: { uri: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400' } },
                            { id: 'sp-swim', name: 'Swimwear', image: { uri: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400' } }
                        ]
                    },
                    {
                        id: 'men-workwear',
                        name: 'Workwear',
                        children: [
                            { id: 'wk-sh', name: 'Shirts', image: { uri: 'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?w=400' } },
                            { id: 'wk-tr', name: 'Trousers', image: { uri: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400' } },
                            { id: 'wk-bl', name: 'Blazers', image: { uri: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400' } },
                            { id: 'wk-fs', name: 'Formal Shoes', image: { uri: 'https://images.unsplash.com/photo-1478146896981-b80fe4634330?w=400' } }
                        ]
                    },
                    {
                        id: 'men-essentials',
                        name: 'Essentials',
                        children: [
                            {
                                id: 'ess-in',
                                name: 'Innerwear',
                                image: { uri: 'https://images.unsplash.com/photo-1560243563-062bfc001d68?w=400' },
                                children: [
                                    { id: 'box', name: 'Boxers' },
                                    { id: 'brief', name: 'Briefs' },
                                    { id: 'trunk', name: 'Trunks' }
                                ]
                            },
                            { id: 'ess-vest', name: 'Vests', image: { uri: 'https://images.unsplash.com/photo-1616150240974-bc5dc4f71a39?w=400' } },
                            { id: 'ess-lng', name: 'Loungewear', image: { uri: 'https://images.unsplash.com/photo-1582234032279-8d6974751762?w=400' } }
                        ]
                    }
                ]
            },
            {
                id: 'women',
                name: 'Women',
                children: [
                    {
                        id: 'w-western',
                        name: 'Western',
                        children: [
                            { id: 'drs', name: 'Dresses', image: { uri: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400' } },
                            { id: 'tops', name: 'Tops', image: { uri: 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400' } },
                            { id: 'jns-bot', name: 'Jeans & Bottoms', image: { uri: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400' } },
                            { id: 'tees', name: 'Tees', image: { uri: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=400' } },
                            { id: 'jump', name: 'Jumpsuits', image: { uri: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400' } }
                        ]
                    },
                    {
                        id: 'w-ethnic',
                        name: 'Ethnic',
                        children: [
                            { id: 'ks', name: 'Kurta Sets', image: { uri: 'https://images.unsplash.com/photo-1610189012906-4c0aa9b29c59?w=400' } },
                            { id: 'sar', name: 'Sarees', image: { uri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400' } },
                            { id: 'lah', name: 'Lehengas', image: { uri: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=400' } },
                            { id: 'coo', name: 'Co-Ords', image: { uri: 'https://images.unsplash.com/photo-1617137968427-85924c809a7a?w=400' } },
                            { id: 'ind', name: 'Indie Wear', image: { uri: 'https://images.unsplash.com/photo-1606166325683-e6deb697d301?w=400' } },
                            { id: 'des', name: 'Designer Wear', image: { uri: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400' } },
                            { id: 'gwn', name: 'Gowns', image: { uri: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400' } }
                        ]
                    },
                    {
                        id: 'w-fusion',
                        name: 'Fusion',
                        children: [
                            { id: 'fus-ind', name: 'Indie Fusion', image: { uri: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400' } },
                            { id: 'fus-boho', name: 'Boho Fusion', image: { uri: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400' } },
                            { id: 'fus-str', name: 'Street Fusion', image: { uri: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400' } },
                            { id: 'fus-fest', name: 'Festive Fusion', image: { uri: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=400' } },
                            { id: 'fus-cont', name: 'Contemporary', image: { uri: 'https://images.unsplash.com/photo-1596783439305-d8b5c46d2a83?w=400' } },
                            { id: 'fus-lux', name: 'Luxury Fusion', image: { uri: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400' } }
                        ]
                    },
                    {
                        id: 'w-sport',
                        name: 'Sportswear',
                        children: [
                            { id: 'act', name: 'Activewear', image: { uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400' } },
                            { id: 'gym', name: 'Gym Wear', image: { uri: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400' } },
                            { id: 'run', name: 'Running Wear', image: { uri: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=400' } },
                            { id: 'yoga', name: 'Yoga & Athleisure', image: { uri: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=400' } }
                        ]
                    },
                    {
                        id: 'w-ess',
                        name: 'Essentials',
                        children: [
                            { id: 'bra', name: 'Bras', image: { uri: 'https://images.unsplash.com/photo-1620331317312-74b88bf40907?w=400' } },
                            { id: 'pnty', name: 'Panties', image: { uri: 'https://images.unsplash.com/photo-1596561289126-17b186b5c32c?w=400' } },
                            { id: 'shpw', name: 'Shapewear', image: { uri: 'https://images.unsplash.com/photo-1563178406-4f4693259543?w=400' } },
                            { id: 'night', name: 'Nightwear', image: { uri: 'https://images.unsplash.com/photo-1620799139652-715e4d56d34e?w=400' } },
                            { id: 'mat', name: 'Maternity Wear', image: { uri: 'https://images.unsplash.com/photo-1553531384-cc64ac80f9dd?w=400' } }
                        ]
                    }
                ]
            },
            {
                id: 'footwear',
                name: 'Footwear',
                children: [
                    {
                        id: 'ft-men',
                        name: 'Men',
                        children: [
                            { id: 'ft-m-cas', name: 'Casual Shoes', image: { uri: 'https://images.unsplash.com/photo-1560769629-975e127161e2?w=400' } },
                            { id: 'ft-m-spt', name: 'Sports Shoes', image: { uri: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' } },
                            { id: 'ft-m-form', name: 'Formal Shoes', image: { uri: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400' } },
                            { id: 'ft-m-sand', name: 'Sandals & Flip-Flops', image: { uri: 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=400' } }
                        ]
                    },
                    {
                        id: 'ft-women',
                        name: 'Women',
                        children: [
                            { id: 'ft-w-heel', name: 'Heels', image: { uri: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400' } },
                            { id: 'ft-w-flat', name: 'Flats', image: { uri: 'https://images.unsplash.com/photo-1537832816519-689ad163238b?w=400' } },
                            { id: 'ft-w-sand', name: 'Sandals', image: { uri: 'https://images.unsplash.com/photo-1562273138-f46be4ebdf6e?w=400' } },
                            { id: 'ft-w-spt', name: 'Sports Shoes', image: { uri: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' } }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'accessories',
        name: 'Accessories',
        icon: 'briefcase',
        children: [
            { id: 'acc-bags', name: 'Bags & Backpacks', image: require('../assets/images/backpacks.jpg') },
            { id: 'acc-wallets', name: 'Wallets & Belts', image: require('../assets/images/wallets.jpg') },
            { id: 'acc-watches', name: 'Watches', image: require('../assets/images/analog.jpg') },
            { id: 'acc-sun', name: 'Sunglasses & Eyewear', image: require('../assets/images/sunglasses.jpg') },
            { id: 'acc-jewel', name: 'Jewellery', image: require('../assets/images/earrings.jpg') },
            { id: 'acc-hair', name: 'Hair Accessories', image: { uri: 'https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?w=400' } },
            { id: 'acc-caps', name: 'Caps & Hats', image: { uri: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400' } },
            { id: 'acc-scarf', name: 'Scarves & Stoles', image: { uri: 'https://images.unsplash.com/photo-1601342630311-665e77b63713?w=400' } }
        ]
    },
    {
        id: 'beauty',
        name: 'Beauty',
        icon: 'smile',
        children: [
            { id: 'bt-skin', name: 'Skincare', image: require('../assets/images/facewash.jpg') },
            { id: 'bt-hair', name: 'Haircare', image: require('../assets/images/shampoo.jpg') },
            { id: 'bt-mkup', name: 'Makeup', image: require('../assets/images/facemakeup.jpg') },
            { id: 'bt-frag', name: 'Fragrances', image: require('../assets/images/perfumes.jpg') },
            { id: 'bt-pc', name: 'Personal Care', image: { uri: 'https://images.unsplash.com/photo-1573875196207-6bcfac3f9b0e?w=400' } },
            { id: 'bt-groom', name: 'Grooming', image: { uri: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=400' } },
            { id: 'bt-tools', name: 'Beauty Tools', image: { uri: 'https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?w=400' } }
        ]
    },
    {
        id: 'home',
        name: 'Home & Living',
        icon: 'home',
        children: [
            { id: 'hm-kitch', name: 'Kitchenware', image: { uri: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=400' } },
            { id: 'hm-dine', name: 'Dining Essentials', image: { uri: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400' } },
            { id: 'hm-stor', name: 'Storage & Organizers', image: { uri: 'https://images.unsplash.com/photo-1595246140590-5c487c9bb984?w=400' } },
            { id: 'hm-clean', name: 'Cleaning & Utility', image: { uri: 'https://images.unsplash.com/photo-1528740561666-dc24705f08a7?w=400' } },
            { id: 'hm-bed', name: 'Bedding & Linen', image: { uri: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?w=400' } },
            { id: 'hm-bath', name: 'Bathroom Accessories', image: { uri: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400' } },
            { id: 'hm-imp', name: 'Home Improvement', image: { uri: 'https://images.unsplash.com/photo-1505798577917-a651a5d40320?w=400' } }
        ]
    },
    {
        id: 'gadgets',
        name: 'Gadgets',
        icon: 'smartphone',
        children: [
            { id: 'gd-mob', name: 'Mobile Accessories', image: { uri: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400' } },
            { id: 'gd-aud', name: 'Audio Devices', image: { uri: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' } },
            { id: 'gd-smt', name: 'Smart Devices', image: { uri: 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=400' } },
            { id: 'gd-comp', name: 'Computer Accessories', image: { uri: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400' } },
            { id: 'gd-game', name: 'Gaming Accessories', image: { uri: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400' } },
            { id: 'gd-chrg', name: 'Chargers & Power Banks', image: { uri: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400' } }
        ]
    },
    {
        id: 'appliances',
        name: 'Electrical Appliances',
        icon: 'zap',
        children: [
            { id: 'ap-large', name: 'Large Appliances', image: { uri: 'https://images.unsplash.com/photo-1581622558668-b2d9cf047520?w=400' } },
            { id: 'ap-small', name: 'Small Appliances', image: { uri: 'https://images.unsplash.com/photo-1585659722983-3a675bad5c05?w=400' } },
            { id: 'ap-kit', name: 'Kitchen Appliances', image: { uri: 'https://images.unsplash.com/photo-1593586058097-606f09372d61?w=400' } },
            { id: 'ap-heat', name: 'Heating & Cooling', image: { uri: 'https://images.unsplash.com/photo-1613274554329-70f997f5789f?w=400' } },
            { id: 'ap-pers', name: 'Personal Appliances', image: { uri: 'https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=400' } }
        ]
    }
];
