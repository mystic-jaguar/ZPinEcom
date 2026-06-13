from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = Workbook()

navy = PatternFill('solid', fgColor='1B2A4A')
alt_fill = PatternFill('solid', fgColor='F2F6FC')
white_fill = PatternFill('solid', fgColor='FFFFFF')
hdr_font = Font(name='Arial', size=11, bold=True, color='FFFFFF')
data_font = Font(name='Arial', size=10)
bold_font = Font(name='Arial', size=10, bold=True)
wrap = Alignment(wrap_text=True, vertical='top')
thin_border = Border(
    left=Side(style='thin', color='D0D0D0'),
    right=Side(style='thin', color='D0D0D0'),
    top=Side(style='thin', color='D0D0D0'),
    bottom=Side(style='thin', color='D0D0D0')
)

def style_header(ws, cols):
    for c in range(1, cols + 1):
        cell = ws.cell(row=1, column=c)
        cell.fill = navy
        cell.font = hdr_font
        cell.alignment = Alignment(wrap_text=True, vertical='center', horizontal='center')
        cell.border = thin_border
    ws.freeze_panes = 'A2'

def add_data_row(ws, row_idx, data, bold=False):
    fill = alt_fill if row_idx % 2 == 0 else white_fill
    f = bold_font if bold else data_font
    for c, val in enumerate(data, 1):
        cell = ws.cell(row=row_idx, column=c, value=val)
        cell.font = f
        cell.fill = fill
        cell.alignment = wrap
        cell.border = thin_border
    ws.row_dimensions[row_idx].height = 80

# ── SHEET 1: Test Cases ──
ws1 = wb.active
ws1.title = "Test Cases"
headers = ["Test Case ID","Test Suite","Use Case Ref","User Story Ref","Test Case Title","Description","Pre-conditions","Test Steps","Test Data","Expected Result","Post-conditions","Priority","Type","Status","Assigned To","Execution Date","Comments"]
for i, h in enumerate(headers, 1):
    ws1.cell(row=1, column=i, value=h)
widths = [15,18,15,15,30,40,35,50,35,40,30,10,12,10,15,15,25]
for i, w in enumerate(widths, 1):
    ws1.column_dimensions[get_column_letter(i)].width = w
style_header(ws1, len(headers))

tc = [
["TC-PC-001","Product Listing","UC-2.3.1.2","US-202","Browse products by category","Verify that tapping a category navigates to Product Listing and shows products from that category","User is logged in; products exist in Fashion > Men category","1. Navigate to Categories tab\n2. Tap \"Men\" category\n3. Observe Product Listing screen","Category: Men","Products from Men category displayed in a grid; pagination info shows currentPage, totalPages, totalItems","User is on Product Listing screen filtered by Men category","High","Functional","Not Executed","","",""],
["TC-PC-002","Product Listing","UC-2.3.1.2","US-202","Category browse pagination","Verify pagination works with configurable limit and page params","User is logged in; >100 products exist in a category","1. Call GET /api/v1/products/category/Men?page=1&limit=50\n2. Verify response pagination object\n3. Call page=2\n4. Verify different products returned","categoryName=Men, page=1, limit=50","Response includes pagination: {currentPage:1, totalPages, totalItems, itemsPerPage:50, hasNextPage:true, hasPrevPage:false}; page 2 has hasPrevPage:true","Products are paginated correctly","High","Functional","Not Executed","","",""],
["TC-PC-003","Product Listing","UC-2.3.1.2","US-202","Category browse default limit 100 max 500","Verify default limit is 100 and max is capped at 500","User is logged in","1. Call GET /api/v1/products/category/Men (no limit param)\n2. Check itemsPerPage in response\n3. Call with limit=999\n4. Check itemsPerPage is capped at 500","No limit param; limit=999","Default returns itemsPerPage=100; limit=999 is capped to itemsPerPage=500","Pagination enforces limits","Medium","Functional","Not Executed","","",""],
["TC-PC-004","Product Listing","UC-2.3.1.2","US-202","Category browse case-insensitive matching","Verify category name matching is case-insensitive","User is logged in; products exist in Men category","1. Call GET /products/category/men\n2. Call GET /products/category/MEN\n3. Call GET /products/category/Men\n4. Compare results","categoryName: men, MEN, Men","All three calls return the same products","Category matching is case-insensitive","Medium","Functional","Not Executed","","",""],
["TC-PC-005","Product Listing","UC-2.3.1.2","US-202","Category browse category_path JSON matching","Verify products matched via category_path JSON array elements","User is logged in; product has category_path containing \"Shirts\"","1. Call GET /products/category/Shirts\n2. Verify product with category_path containing Shirts element is returned","categoryName=Shirts","Products where LOWER(elem->>'name') = LOWER('Shirts') in category_path are returned; prevents substring false-positives","JSON element match works correctly","Medium","Functional","Not Executed","","",""],
["TC-PC-006","Product Listing","UC-2.3.2.3","US-202","Empty category shows empty state","Verify empty category displays illustration and message","User is logged in; category \"Luxury\" has zero products","1. Navigate to Categories tab\n2. Tap \"Luxury\" category\n3. Observe Product Listing screen","Category with 0 products","Empty state illustration displayed with message \"No products in this category yet\"","User sees empty state, no errors","Medium","UI","Not Executed","","",""],
["TC-PC-007","Product Listing","UC-2.3.1.2","US-202","Client-side filtering by price range","Verify price range filter works client-side without new API call","User is on Product Listing screen with products loaded","1. Open filter modal\n2. Set price range min=500, max=2000\n3. Apply filter\n4. Verify product grid updates immediately","priceMin=500, priceMax=2000","Only products with price between 500-2000 shown; no new API call made","Filtered view displayed","High","Functional","Not Executed","","",""],
["TC-PC-008","Product Listing","UC-2.3.1.2","US-202","Client-side filtering by brand","Verify brand filter works client-side","User is on Product Listing screen with products loaded","1. Open filter modal\n2. Select brand \"Nike\"\n3. Apply filter\n4. Verify product grid updates","brand=Nike","Only Nike products shown; no new API call","Filtered view displayed","High","Functional","Not Executed","","",""],
["TC-PC-009","Product Listing","UC-2.3.1.2","US-202","Client-side filtering by rating","Verify rating filter works client-side","User is on Product Listing screen with products loaded","1. Open filter modal\n2. Set minimum rating 4\n3. Apply filter\n4. Verify product grid shows only 4+ rated","minRating=4","Only products with average rating >= 4 are shown","Filtered view displayed","Medium","Functional","Not Executed","","",""],
["TC-PC-010","Product Listing","UC-2.3.1.2","US-202","Client-side filtering by discount percentage","Verify discount filter works client-side","User is on Product Listing screen","1. Open filter modal\n2. Set minimum discount 20%\n3. Apply filter","minDiscount=20","Only products with 20%+ discount shown; no new API call","Filtered view displayed","Medium","Functional","Not Executed","","",""],
["TC-PC-011","Product Listing","UC-2.3.1.2","US-202","Sort by price low to high","Verify sort order by price ascending","User is on Product Listing screen with products loaded","1. Open filter/sort modal\n2. Select \"Price: Low to High\"\n3. Verify product grid reorders","sort=price_asc","Products displayed in ascending price order","Sorted view displayed","High","Functional","Not Executed","","",""],
["TC-PC-012","Product Listing","UC-2.3.1.2","US-202","Sort by price high to low","Verify sort order by price descending","User is on Product Listing screen","1. Open filter/sort modal\n2. Select \"Price: High to Low\"\n3. Verify grid order","sort=price_desc","Products displayed in descending price order","Sorted view displayed","High","Functional","Not Executed","","",""],
["TC-PC-013","Product Listing","UC-2.3.1.2","US-202","Sort by newest first","Verify sort by creation date descending","User is on Product Listing screen","1. Select \"New\" sort option\n2. Verify order","sort=newest","Products sorted by created_at DESC","Sorted view","Medium","Functional","Not Executed","","",""],
["TC-PC-014","Product Listing","UC-2.3.1.2","US-202","Sort by rating","Verify sort by average rating descending","User is on Product Listing screen","1. Select \"Rating\" sort\n2. Verify order","sort=rating","Products sorted by average rating DESC","Sorted view","Medium","Functional","Not Executed","","",""],
["TC-PC-015","Product Listing","UC-2.3.1.2","US-202","Sort by discount","Verify sort by discount percentage descending","User is on Product Listing screen","1. Select \"Discount\" sort\n2. Verify order","sort=discount","Products sorted by discount percentage DESC","Sorted view","Medium","Functional","Not Executed","","",""],
["TC-PC-016","Product Listing","UC-2.3.1.2","US-202","Sub-category filter tabs","Verify sub-category tabs filter within parent category","User is on Product Listing screen for Fashion","1. Observe sub-category tabs (Men, Women, Kids)\n2. Tap \"Women\" tab\n3. Verify grid filters to Women sub-category","parentCategory=Fashion, subCategory=Women","Only Women products within Fashion shown","Sub-category filter applied","High","Functional","Not Executed","","",""],
["TC-PC-017","Product Listing","UC-2.3.1.2","US-202","Wishlist toggle on listing","Verify wishlist heart icon toggles on product cards","User is logged in, on Product Listing screen","1. Tap heart icon on a product card\n2. Verify heart fills/unfills\n3. Verify wishlist API called","productId of target product","Heart icon toggles; wishlist add/remove API call made","Product added/removed from wishlist","Medium","Functional","Not Executed","","",""],
["TC-PC-018","Product Listing","UC-2.4","US-202","Pull-to-refresh on listing","Verify pull-to-refresh reloads product list","User is on Product Listing screen","1. Pull down on product list\n2. Release\n3. Verify data refreshes","None","Loading indicator shown; fresh product data fetched from API; list updates","Refreshed data displayed","Medium","Functional","Not Executed","","",""],
["TC-PC-019","Product Listing","UC-2.4","US-202","Rate limiter productListLimiter 60/min","Verify rate limiting on product listing endpoint","User is logged in","1. Send 60 GET requests to /api/v1/products/category/Men within 1 minute\n2. Send 61st request","61 rapid requests","First 60 succeed; 61st returns 429 Too Many Requests","Rate limit enforced","High","Security","Not Executed","","",""],
["TC-PC-020","Product Listing","UC-2.3.1.2","US-202","Redis caching for category browse","Verify category results are cached in Redis","Admin access to Redis","1. Call GET /products/category/Men\n2. Check Redis for key products:category:men:p1:l100\n3. Call again\n4. Verify response served from cache","categoryName=Men","First call writes to cache with TTL 3600s; subsequent calls served from cache","Cached response matches original","Medium","Performance","Not Executed","","",""],
["TC-PC-021","Product Search","UC-2.3.1.3","US-203","Basic product search","Verify search returns matching products by name","User is logged in","1. Type \"shirt\" in search bar\n2. Wait for debounce (400ms)\n3. Observe search results","q=shirt","Products with \"shirt\" in name are displayed; API call to /products/search?q=shirt made","Search results displayed","High","Functional","Not Executed","","",""],
["TC-PC-022","Product Search","UC-2.3.1.3","US-203","Search with normalized text matching","Verify \"keychain\" matches \"key chain\" and vice versa","User is logged in; product named \"key chain\" exists","1. Search for \"keychain\" (no space)\n2. Verify \"key chain\" product appears\n3. Search for \"key chain\"\n4. Verify \"keychain\" product appears","q=keychain, q=key chain","Both queries return products regardless of spacing; normalized matching via LOWER(REPLACE(product_name,' ','')) LIKE pattern","Normalized matching works","High","Functional","Not Executed","","",""],
["TC-PC-023","Product Search","UC-2.3.1.3","US-203","Search debounce 400ms","Verify search input is debounced to avoid excessive API calls","User is on search screen","1. Type \"s\" rapidly then \"h\" then \"i\" then \"r\" then \"t\"\n2. Monitor API calls\n3. Verify only one call after 400ms pause","Rapid typing: s-h-i-r-t","Only one API call made after 400ms pause, not one per keystroke","Debounce prevents excessive calls","High","Performance","Not Executed","","",""],
["TC-PC-024","Product Search","UC-2.3.2.4","US-203","Empty search results state","Verify empty state when no products match search","User is logged in","1. Search for \"xyznonexistent123\"\n2. Observe results area","q=xyznonexistent123","Empty state message \"No products found\" with suggestion to try different keywords","Empty state displayed","Medium","UI","Not Executed","","",""],
["TC-PC-025","Product Search","UC-2.3.1.3","US-203","Search returns related products","Verify related products from same category returned alongside matches","User is logged in; products in same category exist","1. Search for a product name\n2. Observe both \"products\" and \"related\" sections","q=existing product name","Response contains products array and related array; related from same deepest_category_name but not in main results","Related products shown","Medium","Functional","Not Executed","","",""],
["TC-PC-026","Product Search","UC-2.3.1.3","US-203","Search with empty query","Verify empty query returns empty arrays","User is logged in","1. Call GET /products/search?q=\n2. Call GET /products/search (no q param)","q=\"\" or no q","Response: {success:true, products:[], related:[]}","Empty result, no error","Low","Boundary","Not Executed","","",""],
["TC-PC-027","Product Search","UC-2.3.1.3","US-203","Search default limit 50 max 200","Verify search limit defaults to 50, capped at 200","User is logged in","1. Call /products/search?q=shirt (no limit)\n2. Call /products/search?q=shirt&limit=999","No limit; limit=999","Default returns max 50 results; limit=999 caps at 200","Limits enforced","Medium","Boundary","Not Executed","","",""],
["TC-PC-028","Product Search","UC-2.3.1.3","US-203","Clear search returns to default state","Verify clearing search bar resets the UI","User has search results displayed","1. Clear the search bar text\n2. Observe UI","Empty search input","Results list cleared; return to default search state","Default search state","Low","UI","Not Executed","","",""],
["TC-PC-029","Product Search","UC-2.3.1.3","US-203","Tap search result navigates to detail","Verify tapping a search result opens Product Detail screen","User has search results","1. Tap a product in search results","Product from results","Navigation to Product Detail screen for that product","Product Detail screen displayed","High","Functional","Not Executed","","",""],
["TC-PC-030","Product Search","UC-2.4","US-203","Rate limiter on search endpoint","Verify productListLimiter applies to search","User is logged in","1. Send 60 search requests in 1 minute\n2. Send 61st","61 rapid search requests","First 60 succeed; 61st returns 429","Rate limit enforced","High","Security","Not Executed","","",""],
["TC-PC-031","Product Detail","UC-2.3.1.4","US-204","View product detail page","Verify product detail displays all required fields","User is logged in; product exists","1. Navigate to product detail page for a valid product\n2. Verify all sections render","Valid product ID (UUID format)","Image gallery, product name, price, average rating, stock status, size/color selector, description all displayed","Product detail fully rendered","High","Functional","Not Executed","","",""],
["TC-PC-032","Product Detail","UC-2.3.1.4","US-204","Product ID validation - valid UUID","Verify UUID format product IDs are accepted","User is logged in","1. Call GET /api/v1/products/550e8400-e29b-41d4-a716-446655440000","id=550e8400-e29b-41d4-a716-446655440000","Product data returned if exists; 404 if not found","Valid response","Medium","Validation","Not Executed","","",""],
["TC-PC-033","Product Detail","UC-2.3.1.4","US-204","Product ID validation - valid 7-char short ID","Verify 7-character alphanumeric short IDs accepted","User is logged in","1. Call GET /api/v1/products/ABC1234","id=ABC1234 (matches /^[A-Z0-9]{7}$/)","Product data returned if exists; 404 if not found","Valid response","Medium","Validation","Not Executed","","",""],
["TC-PC-034","Product Detail","UC-2.3.1.4","US-204","Product ID validation - invalid format rejected","Verify invalid product ID formats return 404","User is logged in","1. Call GET /products/invalid-id\n2. Call with id=AB\n3. Call with id=abc1234 (lowercase)","Various invalid IDs","All return 404 with {success:false, message:'Product not found'}; regex: /^[0-9a-f]{8}-...$/i or /^[A-Z0-9]{7}$/","Invalid IDs rejected","High","Security","Not Executed","","",""],
["TC-PC-035","Product Detail","UC-2.3.1.4","US-204","Product detail Redis caching","Verify individual product cached with 2h TTL","Admin access to Redis","1. Call GET /products/:id\n2. Check Redis key product:{id}\n3. Verify TTL is 7200s\n4. Call again, verify cache hit","Valid product ID","First call caches with TTL_PRODUCT=7200; subsequent served from cache","Cache reduces DB load","Medium","Performance","Not Executed","","",""],
["TC-PC-036","Product Detail","UC-2.3.1.4","US-204","Product with size variants","Verify size selector shows available sizes from size_quantities","User is logged in; product has size_quantities {S:10, M:15, L:0}","1. Navigate to product detail\n2. Observe size selector","Product with size_quantities","Sizes S and M shown as available; L shown as disabled/greyed out (quantity 0)","Size selector reflects stock","High","Functional","Not Executed","","",""],
["TC-PC-037","Product Detail","UC-2.3.1.4","US-204","Product with color variants","Verify color selector shows colors from extracted_attributes","User is logged in; product has extracted_attributes.colors:[\"Red\",\"Blue\"]","1. Navigate to product detail\n2. Observe color selector","Product with colors","Red and Blue color options displayed and selectable","Color selector works","High","Functional","Not Executed","","",""],
["TC-PC-038","Product Detail","UC-2.3.2.6","US-204","Add to cart without size selection","Verify inline prompt when size not selected","User is logged in; product requires size selection","1. Navigate to product detail with sizes\n2. Tap \"Add to Cart\" without selecting a size","No size selected","Inline prompt displayed asking user to select a size before proceeding","Cart not updated; prompt shown","High","Validation","Not Executed","","",""],
["TC-PC-039","Product Detail","UC-2.3.2.5","US-204","Out of stock product display","Verify out-of-stock product shows indicator instead of Add to Cart","User is logged in; product has in_stock=false","1. Navigate to out-of-stock product detail","Product with in_stock=false","\"Out of Stock\" indicator replaces Add to Cart button; button cannot be tapped","User cannot add to cart","High","Functional","Not Executed","","",""],
["TC-PC-040","Product Detail","UC-2.3.1.4","US-204","Image carousel/gallery","Verify scrollable image gallery on product detail","User is logged in; product has multiple images","1. Navigate to product detail\n2. Swipe through images\n3. Verify all images load","Product with 4 images","Image gallery shows all images; swipe navigation works; images load correctly","All images viewable","Medium","UI","Not Executed","","",""],
["TC-PC-041","Product Detail","UC-2.3.1.4","US-204","Delivery option toggle","Verify delivery option toggle between instant and standard","User is on product detail page","1. Observe delivery options\n2. Toggle between \"Instant\" and \"Standard\" delivery","None","Delivery option toggle works; instant delivery shows different info than standard","Toggle switches correctly","Medium","Functional","Not Executed","","",""],
["TC-PC-042","Product Detail","UC-2.3.1.4","US-204","Add to cart with valid variant","Verify successful add to cart with size/color selected","User is logged in; product has variants","1. Select size \"M\"\n2. Select color \"Blue\"\n3. Tap \"Add to Cart\"","size=M, color=Blue","Cart API called; success response; cart badge increments","Item added to cart with variant","High","Functional","Not Executed","","",""],
["TC-PC-043","Product Detail","UC-2.3.1.4","US-204","Wishlist toggle on detail page","Verify wishlist heart icon works on product detail","User is logged in","1. Tap wishlist heart icon\n2. Verify toggle state\n3. Tap again to remove","productId","Heart icon fills on add, unfills on remove; API calls made","Wishlist state toggled","Medium","Functional","Not Executed","","",""],
["TC-PC-044","Recommendations","UC-2.3.1.5","US-205","Personalized recommendations with purchase history","Verify purchase history contributes +3 weight","User logged in with purchase history in Fashion category","1. Call GET /api/v1/products/recommended\n2. Verify response source is \"personalized\"\n3. Check products are from purchased categories","Authenticated user with orders","Products from purchased categories weighted +3; source:\"personalized\" in response","Relevant recommendations shown","High","Functional","Not Executed","","",""],
["TC-PC-045","Recommendations","UC-2.3.1.5","US-205","Recommendations with wishlist signal","Verify wishlist contributes +2 weight","User logged in with wishlist items","1. Add items to wishlist in Beauty category\n2. Call /products/recommended\n3. Verify Beauty products appear","User with wishlist items","Wishlisted categories weighted +2; Beauty products appear in recommendations","Wishlist signal works","Medium","Functional","Not Executed","","",""],
["TC-PC-046","Recommendations","UC-2.3.1.5","US-205","Recommendations with search term signal","Verify search terms contribute +1 weight","User is logged in","1. Call GET /products/recommended?terms=shoes,dress\n2. Verify products from matching categories","terms=shoes,dress","Categories matching search terms weighted +1; max 5 terms accepted","Search signal works","Medium","Functional","Not Executed","","",""],
["TC-PC-047","Recommendations","UC-2.3.2.2","US-205","New user fallback to latest products","Verify new user with no history gets latest products","Newly registered user with no orders/wishlist/searches","1. Log in as new user\n2. Call /products/recommended\n3. Verify response","No history user","Response: source:\"fallback\"; products ordered by created_at DESC; limit respected","Fallback works for new users","High","Functional","Not Executed","","",""],
["TC-PC-048","Recommendations","UC-2.3.1.5","US-205","Purchased products excluded from recommendations","Verify already-purchased products are deprioritized","User has purchased productA","1. Call /products/recommended\n2. Check if productA appears","User who purchased productA","productA excluded from results (id != ALL purchasedProductIds)","No duplicate recommendations","Medium","Functional","Not Executed","","",""],
["TC-PC-049","Recommendations","UC-2.3.1.5","US-205","Recommendations limit capped at 30","Verify recommendations limit defaults to 10, max 30","User is logged in","1. Call /products/recommended (no limit)\n2. Call /products/recommended?limit=100","No limit; limit=100","Default returns max 10; limit=100 capped to 30","Limit enforced","Medium","Boundary","Not Executed","","",""],
["TC-PC-050","Recommendations","UC-2.3.1.5","US-205","Recommendations require authentication","Verify /products/recommended requires JWT","No auth token","1. Call GET /api/v1/products/recommended without Authorization header","No token","401 Unauthorized response","Unauthenticated request rejected","High","Security","Not Executed","","",""],
["TC-PC-051","Recommendations","UC-2.3.1.5","US-205","Top 5 categories used for recommendations","Verify only top 5 weighted categories used","User with activity across 8+ categories","1. Build user with purchases in 8 categories\n2. Call /products/recommended\n3. Verify products from top 5 scoring categories","User with diverse history","Only top 5 categories by score used; categories beyond top 5 ignored","Algorithm efficiency","Low","Functional","Not Executed","","",""],
["TC-PC-052","Home Screen","UC-2.3.1.1","US-201","Home screen parallel data loading","Verify home screen fires 3 requests in parallel","User is logged in","1. Open Home screen\n2. Monitor network requests\n3. Verify /products/recommended, /products/fresh-categories, /products/nearby all fire","None","All 3 API calls made in parallel; all sections render with data","Home screen loads efficiently","High","Performance","Not Executed","","",""],
["TC-PC-053","Home Screen","UC-2.3.1.1","US-201","Fresh categories section","Verify top 5 categories with most recent products shown","User is logged in","1. Call GET /api/v1/products/fresh-categories\n2. Verify response","None","Returns top 5 categories sorted by latest_at DESC with name, categoryPath, imageUrl, latestAt","Fresh categories displayed","High","Functional","Not Executed","","",""],
["TC-PC-054","Home Screen","UC-2.3.1.1","US-201","Fresh categories Redis cache","Verify fresh categories cached with 2h TTL","Admin Redis access","1. Call /products/fresh-categories\n2. Check Redis key products:fresh-categories\n3. Verify TTL=7200","None","Cached with TTL_FRESH_CAT=7200s","Cache reduces load","Medium","Performance","Not Executed","","",""],
["TC-PC-055","Home Screen","UC-2.3.1.1","US-201","Nearby categories section","Verify nearby categories with product counts","User is logged in with location","1. Call GET /api/v1/products/nearby\n2. Verify 4 categories returned","lat/lng params (optional)","Returns Men, Women, Kids, Makeup with count, rootCategory, subCategory, imageUrl","Nearby section rendered","High","Functional","Not Executed","","",""],
["TC-PC-056","Home Screen","UC-2.3.1.1","US-201","Nearby categories Redis cache","Verify nearby results cached with 1h TTL","Admin Redis access","1. Call /products/nearby\n2. Check Redis key products:nearby\n3. Verify TTL=3600","None","Cached with TTL_NEARBY=3600s","Cache works","Medium","Performance","Not Executed","","",""],
["TC-PC-057","Home Screen","UC-2.3.2.1","US-201","Backend unreachable fallback","Verify static fallback data shown when backend unreachable","Backend server is down","1. Stop backend server\n2. Open Home screen\n3. Verify fallback data renders","Backend unreachable","Static fallback data from constants/products.ts displayed; subtle offline indicator shown","App doesn't crash; fallback shown","High","Reliability","Not Executed","","",""],
["TC-PC-058","Home Screen","UC-2.3.1.1","US-201","Tap product card navigates to detail","Verify tapping product card opens Product Detail screen","User is on Home screen with products","1. Tap a product card\n2. Verify navigation","Product card tap","Navigated to Product Detail screen for selected product","Detail screen shown","High","Functional","Not Executed","","",""],
["TC-PC-059","Home Screen","UC-2.3.1.1","US-201","Category carousel navigation","Verify horizontal category carousel","User is on Home screen","1. Observe category carousel\n2. Swipe horizontally\n3. Tap a category","None","Carousel shows Fashion, Footwear, Accessories, Beauty, Home & Living; tapping navigates to Product Listing","Category carousel works","Medium","UI","Not Executed","","",""],
["TC-PC-060","Home Screen","UC-2.4","US-201","Location permission prompt for Nearby","Verify location permission request flow","User has not granted location permission","1. Open Home screen\n2. Observe Nearby section\n3. Check for explanation modal before OS dialog","Location not granted","Pre-prompt explanation modal shown before native OS location dialog; denied state handled gracefully","Permission flow correct","Medium","Functional","Not Executed","","",""],
["TC-PC-061","All Products","UC-2.3.1.2","US-202","Get all products paginated","Verify GET /api/v1/products returns paginated list","User is logged in","1. Call GET /api/v1/products?page=1\n2. Verify pagination response","page=1","Products returned with pagination: default limit 50, max 200","Paginated results","High","Functional","Not Executed","","",""],
["TC-PC-062","All Products","UC-2.3.1.2","US-202","All products only shows in_stock","Verify only in_stock=true products returned","Products with in_stock=false exist in DB","1. Call GET /api/v1/products\n2. Verify all returned products have inStock=true","None","All products in response have inStock=true; out-of-stock excluded","Only available products shown","High","Functional","Not Executed","","",""],
["TC-PC-063","All Products","UC-2.3.1.2","US-202","All products Redis cache","Verify all-products response cached","Admin Redis access","1. Call GET /api/v1/products?page=1&limit=50\n2. Check Redis key products:all:p1:l50\n3. Verify TTL=3600","None","Cached with TTL_PRODUCT_LIST=3600s","Cache works","Medium","Performance","Not Executed","","",""],
["TC-PC-064","Reviews","UC-2.3.1.4","US-801","View paginated reviews","Verify reviews endpoint returns paginated reviews","Product with 15+ reviews","1. Call GET /products/:id/reviews?page=1&limit=10\n2. Verify pagination\n3. Call page=2","page=1, limit=10","Returns 10 reviews with pagination info; page 2 returns remaining","Reviews paginated","High","Functional","Not Executed","","",""],
["TC-PC-065","Reviews","UC-2.3.1.4","US-801","View reviews limit constraints","Verify review limit min=1, max=100, default=10","Product with reviews","1. Call /reviews (no limit)\n2. Call /reviews?limit=0\n3. Call /reviews?limit=999","No limit; limit=0; limit=999","Default=10; limit=0 coerced to 1; limit=999 capped to 100","Limits enforced","Medium","Boundary","Not Executed","","",""],
["TC-PC-066","Reviews","UC-2.3.1.4","US-801","View own reviews with mine=true","Verify mine=true filter returns only user's reviews","User has posted reviews","1. Call GET /products/:id/reviews?mine=true with auth token","mine=true, auth token","Only reviews by authenticated user returned","Own reviews filtered","Medium","Functional","Not Executed","","",""],
["TC-PC-067","Reviews","UC-2.3.1.4","US-801","View mine=true without token returns empty","Verify mine=true with no token returns empty array","No auth token","1. Call GET /products/:id/reviews?mine=true without token","mine=true, no token","Returns {success:true, data:[], pagination with 0 items}","No error, empty result","Low","Boundary","Not Executed","","",""],
["TC-PC-068","Reviews","UC-2.3.1.4","US-801","Reviews include verified purchase badge","Verify is_verified_purchase flag in review data","Reviews with verified purchases exist","1. Call GET /products/:id/reviews\n2. Check isVerifiedPurchase field","None","Reviews include isVerifiedPurchase boolean; verified purchases show badge in UI","Badge displayed correctly","Medium","Functional","Not Executed","","",""],
["TC-PC-069","Reviews","UC-2.3.1.4","US-801","Reviews cached in Redis","Verify public reviews cached with 30min TTL","Admin Redis access","1. Call /products/:id/reviews\n2. Check Redis key product:{uuid}:reviews:p1:l10\n3. Verify TTL=1800","None","Public reviews cached with TTL_REVIEWS=1800; mine=true NOT cached","Cache works for public only","Medium","Performance","Not Executed","","",""],
["TC-PC-070","Reviews","UC-2.3.1.4","US-802","Create review - valid submission","Verify authenticated user can create a review","User is logged in; has not reviewed this product","1. POST /api/v1/products/:id/reviews with {rating:5, comment:\"Great product!\", images:[\"url1\"]}","rating=5, comment=\"Great product!\", images=[\"url1\"]","201 Created; {success:true, message:'Review added'}; cache invalidated","Review saved to DB","High","Functional","Not Executed","","",""],
["TC-PC-071","Reviews","UC-2.3.1.4","US-802","Create review - rating validation 1-5","Verify rating must be integer between 1 and 5","User is logged in","1. POST review with rating=0\n2. POST with rating=6\n3. POST with rating=3.5\n4. POST with rating=\"abc\"","Various invalid ratings","All return 400: \"Rating must be between 1 and 5\"","Invalid ratings rejected","High","Validation","Not Executed","","",""],
["TC-PC-072","Reviews","UC-2.3.1.4","US-802","Create review - comment required","Verify comment is required and cannot be empty","User is logged in","1. POST review without comment field\n2. POST with comment=\"\"\n3. POST with comment=\"   \" (whitespace only)","No comment; empty; whitespace","All return 400: \"Rating and comment are required\" (after trim)","Empty comments rejected","High","Validation","Not Executed","","",""],
["TC-PC-073","Reviews","UC-2.3.1.4","US-802","Create review - comment max 2000 chars","Verify comment limited to 2000 characters","User is logged in","1. POST review with 2001-character comment","comment=2001 chars","400: \"Comment must be 2000 characters or fewer\"","Overlength rejected","Medium","Validation","Not Executed","","",""],
["TC-PC-074","Reviews","UC-2.3.1.4","US-802","Create review - images validation","Verify images must be array of strings","User is logged in","1. POST with images=\"not-array\"\n2. POST with images=[123, 456]\n3. POST with images=[\"valid-url\"]","Various image formats","Non-array returns 400: \"Images must be an array of strings\"; non-string elements also 400","Image validation works","Medium","Validation","Not Executed","","",""],
["TC-PC-075","Reviews","UC-2.3.1.4","US-802","Create review - duplicate prevention","Verify user cannot review same product twice","User has already reviewed this product","1. POST review for already-reviewed product","Duplicate review attempt","409: \"You have already reviewed this product\"","Duplicate prevented","High","Business Rule","Not Executed","","",""],
["TC-PC-076","Reviews","UC-2.3.1.4","US-802","Create review - authentication required","Verify POST review requires JWT","No auth token","1. POST /products/:id/reviews without Authorization header","No token","401 Unauthorized","Unauthenticated rejected","High","Security","Not Executed","","",""],
["TC-PC-077","Reviews","UC-2.3.1.4","US-802","Create review - rate limiter 5/hour","Verify reviewLimiter allows max 5 reviews per hour","User is logged in","1. POST 5 reviews to different products within 1 hour\n2. POST 6th review","6 review attempts","First 5 succeed; 6th returns 429 Too Many Requests","Rate limit enforced","High","Security","Not Executed","","",""],
["TC-PC-078","Reviews","UC-2.3.1.4","US-802","Create review - product not found","Verify review creation fails for non-existent product","User is logged in","1. POST review to /products/nonexistent-id/reviews","Invalid product ID","404: \"Product not found\"","Review not created","Medium","Validation","Not Executed","","",""],
["TC-PC-079","Reviews","UC-2.3.1.4","US-802","Create review - cache invalidation","Verify review creation invalidates product and review caches","Admin Redis access","1. Create review for product X\n2. Check Redis: product:{uuid} deleted\n3. Check product:{uuid}:reviews:* pattern deleted","Valid review creation","Both product cache and all review page caches invalidated","Cache consistency maintained","Medium","Performance","Not Executed","","",""],
["TC-PC-080","Reviews","UC-2.3.1.4","US-803","Edit review - valid update","Verify review owner can update rating/comment/images","User owns the review","1. PUT /api/v1/products/:id/reviews/:reviewId with {rating:4, comment:\"Updated review\"}","Updated fields","200: {success:true, message:'Review updated'}; cache invalidated","Review updated","High","Functional","Not Executed","","",""],
["TC-PC-081","Reviews","UC-2.3.1.4","US-803","Edit review - partial update","Verify only provided fields updated, others preserved","User owns the review with rating=5, comment=\"Original\"","1. PUT with only {rating:3}\n2. Verify comment unchanged\n3. PUT with only {comment:\"New\"}\n4. Verify rating unchanged","Partial field updates","Only specified fields updated; omitted fields retain original values","Partial update works","Medium","Functional","Not Executed","","",""],
["TC-PC-082","Reviews","UC-2.3.1.4","US-803","Edit review - no fields provided","Verify error when no review fields sent","User owns the review","1. PUT with empty body {}","Empty body","400: \"No review fields provided\"","Empty update rejected","Medium","Validation","Not Executed","","",""],
["TC-PC-083","Reviews","UC-2.3.1.4","US-803","Edit review - ownership enforcement","Verify user cannot edit another user's review","User A tries to edit User B's review","1. Log in as User A\n2. PUT to update User B's reviewId","User A token, User B's reviewId","403: \"You can only edit your own review\"","Ownership enforced","High","Security","Not Executed","","",""],
["TC-PC-084","Reviews","UC-2.3.1.4","US-803","Edit review - review not found","Verify 404 for non-existent reviewId","User is logged in","1. PUT /products/:id/reviews/nonexistent-id","Invalid reviewId","404: \"Review not found\"","Non-existent review handled","Medium","Validation","Not Executed","","",""],
["TC-PC-085","Reviews","UC-2.3.1.4","US-803","Delete review - valid deletion","Verify review owner can delete their review","User owns the review","1. DELETE /api/v1/products/:id/reviews/:reviewId","Valid review owned by user","200: {success:true, message:'Review deleted'}; cache invalidated","Review removed from DB","High","Functional","Not Executed","","",""],
["TC-PC-086","Reviews","UC-2.3.1.4","US-803","Delete review - ownership enforcement","Verify user cannot delete another user's review","User A tries to delete User B's review","1. Log in as User A\n2. DELETE User B's review","User A token, User B's reviewId","403: \"You can only delete your own review\"","Ownership enforced","High","Security","Not Executed","","",""],
["TC-PC-087","Reviews","UC-2.3.1.4","US-803","Delete review - not found","Verify 404 for non-existent review deletion","User is logged in","1. DELETE /products/:id/reviews/nonexistent","Invalid reviewId","404: \"Review not found\"","Not found handled","Medium","Validation","Not Executed","","",""],
["TC-PC-088","Reviews","UC-2.3.1.4","US-803","Delete review - authentication required","Verify DELETE requires JWT","No auth token","1. DELETE /products/:id/reviews/:reviewId without auth","No token","401 Unauthorized","Unauthenticated rejected","High","Security","Not Executed","","",""],
["TC-PC-089","Reviews","UC-2.3.1.4","US-803","Delete review - cache invalidation","Verify deletion invalidates caches","Admin Redis access","1. Delete review\n2. Check product cache and review caches cleared","Valid deletion","product:{uuid} and product:{uuid}:reviews:* caches deleted","Cache consistency","Medium","Performance","Not Executed","","",""],
["TC-PC-090","Product Detail","UC-2.3.1.4","US-204","Product normalizeProduct function mapping","Verify all product fields correctly mapped","Product with all fields populated","1. Fetch product with sizes, colors, attributes\n2. Verify response field mapping","Product with size_quantities, extracted_attributes","Fields mapped: productId, userId, productName, description, categoryId, deepestCategoryName, categoryPath, price, quantity, inStock, images, timeStamp, rating, sizes, colors, sizeQuantities, attributes","All fields present and correct","Medium","Functional","Not Executed","","",""],
["TC-PC-091","Product Detail","UC-2.3.1.4","US-204","Product sizes extracted from size_quantities","Verify sizes array derived from size_quantities with stock>0","Product with size_quantities={S:10, M:0, L:5}","1. Fetch product\n2. Check sizes array","size_quantities={S:10, M:0, L:5}","sizes=[\"S\",\"L\"] (M excluded because quantity=0); sizeQuantities includes all keys","Correct size extraction","Medium","Functional","Not Executed","","",""],
["TC-PC-092","Product Detail","UC-2.3.1.4","US-204","Product with no sizes returns undefined","Verify sizes field is undefined when no size_quantities","Product with empty size_quantities","1. Fetch product without sizes\n2. Check sizes field","size_quantities={}","sizes field is undefined (not empty array)","Correct undefined handling","Low","Boundary","Not Executed","","",""],
["TC-PC-093","Product Listing","UC-2.4","US-202","Only in-stock products in category results","Verify category browse excludes out-of-stock","Category with mix of in-stock and out-of-stock","1. Call /products/category/Men\n2. Verify all returned have inStock=true","Category with mixed stock","All returned products have in_stock=true; out-of-stock excluded from query","Only available shown","High","Functional","Not Executed","","",""],
["TC-PC-094","Product Search","UC-2.4","US-203","Search only returns in-stock products","Verify search excludes out-of-stock products","Search term matching both in-stock and out-of-stock","1. Search for term matching out-of-stock product\n2. Verify exclusion","q=term matching out-of-stock","Only in_stock=true products returned in search results","Out-of-stock excluded","High","Functional","Not Executed","","",""],
["TC-PC-095","Product Detail","UC-2.3.1.4","US-204","Non-existent product returns 404","Verify 404 for product that doesn't exist in DB","Valid UUID format but non-existent","1. Call GET /api/v1/products/00000000-0000-0000-0000-000000000000","Valid UUID, not in DB","404: {success:false, message:'Product not found'}","404 returned","Medium","Boundary","Not Executed","","",""],
]

for i, row in enumerate(tc):
    add_data_row(ws1, i + 2, row)

# ── SHEET 2: Execution Summary ──
ws2 = wb.create_sheet("Execution Summary")
es_headers = ["Test Suite","Total Test Cases","Passed","Failed","Blocked","Not Executed","Pass Rate (%)"]
for i, h in enumerate(es_headers, 1):
    ws2.cell(row=1, column=i, value=h)
es_widths = [25, 18, 10, 10, 10, 15, 15]
for i, w in enumerate(es_widths, 1):
    ws2.column_dimensions[get_column_letter(i)].width = w
style_header(ws2, len(es_headers))

es_data = [
    ["Product Listing", 20, 0, 0, 0, 20, "0%"],
    ["Product Search", 10, 0, 0, 0, 10, "0%"],
    ["Product Detail", 14, 0, 0, 0, 14, "0%"],
    ["Recommendations", 8, 0, 0, 0, 8, "0%"],
    ["Home Screen", 9, 0, 0, 0, 9, "0%"],
    ["All Products", 3, 0, 0, 0, 3, "0%"],
    ["Reviews", 26, 0, 0, 0, 26, "0%"],
    ["TOTAL", 90, 0, 0, 0, 90, "0%"],
]
for i, row in enumerate(es_data):
    is_total = row[0] == "TOTAL"
    r = i + 2
    fill = alt_fill if r % 2 == 0 else white_fill
    f = bold_font if is_total else data_font
    for c, val in enumerate(row, 1):
        cell = ws2.cell(row=r, column=c, value=val)
        cell.font = f
        cell.fill = fill
        cell.alignment = wrap
        cell.border = thin_border
    ws2.row_dimensions[r].height = 30

# ── SHEET 3: Traceability Matrix ──
ws3 = wb.create_sheet("Traceability Matrix")
tm_headers = ["Requirement ID","Requirement Description","Test Case IDs","Coverage Status"]
for i, h in enumerate(tm_headers, 1):
    ws3.cell(row=1, column=i, value=h)
tm_widths = [18, 35, 70, 18]
for i, w in enumerate(tm_widths, 1):
    ws3.column_dimensions[get_column_letter(i)].width = w
style_header(ws3, len(tm_headers))

tm_data = [
    ["UC-2.3.1.1","Home Screen Feed","TC-PC-052, TC-PC-053, TC-PC-054, TC-PC-055, TC-PC-056, TC-PC-057, TC-PC-058, TC-PC-059, TC-PC-060","Covered"],
    ["UC-2.3.1.2","Category Browse","TC-PC-001 to TC-PC-020, TC-PC-061, TC-PC-062, TC-PC-063, TC-PC-093","Covered"],
    ["UC-2.3.1.3","Product Search","TC-PC-021 to TC-PC-030, TC-PC-094","Covered"],
    ["UC-2.3.1.4","Product Detail Page","TC-PC-031 to TC-PC-043, TC-PC-064 to TC-PC-092, TC-PC-095","Covered"],
    ["UC-2.3.1.5","Personalized Recommendations","TC-PC-044 to TC-PC-051","Covered"],
    ["UC-2.3.2.1","Backend Unreachable Fallback","TC-PC-057","Covered"],
    ["UC-2.3.2.2","New Customer No History","TC-PC-047","Covered"],
    ["UC-2.3.2.3","Category with No Products","TC-PC-006","Covered"],
    ["UC-2.3.2.4","No Search Results","TC-PC-024","Covered"],
    ["UC-2.3.2.5","Product Out of Stock","TC-PC-039","Covered"],
    ["UC-2.3.2.6","Add to Cart Without Size","TC-PC-038","Covered"],
    ["US-201","Home Screen Feed","TC-PC-052 to TC-PC-060","Covered"],
    ["US-202","Category Browse","TC-PC-001 to TC-PC-020, TC-PC-061 to TC-PC-063, TC-PC-093","Covered"],
    ["US-203","Product Search","TC-PC-021 to TC-PC-030, TC-PC-094","Covered"],
    ["US-204","Product Detail Page","TC-PC-031 to TC-PC-043, TC-PC-090 to TC-PC-092, TC-PC-095","Covered"],
    ["US-205","Personalized Recommendations","TC-PC-044 to TC-PC-051","Covered"],
    ["US-801","Submit & View Reviews","TC-PC-064 to TC-PC-070","Covered"],
    ["US-802","Create Review","TC-PC-070 to TC-PC-079","Covered"],
    ["US-803","Edit & Delete Review","TC-PC-080 to TC-PC-089","Covered"],
]
for i, row in enumerate(tm_data):
    r = i + 2
    fill = alt_fill if r % 2 == 0 else white_fill
    for c, val in enumerate(row, 1):
        cell = ws3.cell(row=r, column=c, value=val)
        cell.font = data_font
        cell.fill = fill
        cell.alignment = wrap
        cell.border = thin_border
    ws3.row_dimensions[r].height = 40

# ── SHEET 4: Sign-Off ──
ws4 = wb.create_sheet("Sign-Off")
so_headers = ["Role","Name","Signature","Date","Comments"]
for i, h in enumerate(so_headers, 1):
    ws4.cell(row=1, column=i, value=h)
so_widths = [22, 25, 25, 18, 35]
for i, w in enumerate(so_widths, 1):
    ws4.column_dimensions[get_column_letter(i)].width = w
style_header(ws4, len(so_headers))

roles = ["Project Manager","QA Lead","Dev Lead","Business Analyst","Product Owner"]
for i, role in enumerate(roles):
    r = i + 2
    fill = alt_fill if r % 2 == 0 else white_fill
    for c in range(1, 6):
        cell = ws4.cell(row=r, column=c, value=role if c == 1 else "")
        cell.font = data_font
        cell.fill = fill
        cell.alignment = wrap
        cell.border = thin_border
    ws4.row_dimensions[r].height = 40

wb.save(r'C:\Zpin\ZPinEcom\PRODUCT_CATALOG_SEARCH_TEST_CASES.xlsx')
print("DONE: PRODUCT_CATALOG_SEARCH_TEST_CASES.xlsx created with 95 test cases")
