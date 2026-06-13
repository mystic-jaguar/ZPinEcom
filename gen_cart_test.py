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
# ── Add to Cart ──
["TC-SC-001","Add to Cart","UC-3.3.1.1","US-301","Add product to cart - valid request","Verify adding a valid in-stock product to cart","User is logged in; product is in stock","1. POST /api/v1/cart with {productId: valid_id, quantity: 1}\n2. Verify response","productId=valid UUID, quantity=1","201: {success:true, message:'Added to cart'}; price_at_add captured at current price","Item in cart with correct price_at_add","High","Functional","Not Executed","","",""],
["TC-SC-002","Add to Cart","UC-3.3.1.1","US-301","Add to cart - productId required","Verify productId is required in request body","User is logged in","1. POST /api/v1/cart with {} (no productId)\n2. POST with {productId: null}","No productId","400: {success:false, message:'productId is required'}","Cart not updated","High","Validation","Not Executed","","",""],
["TC-SC-003","Add to Cart","UC-3.3.1.1","US-301","Add to cart - invalid productId format","Verify isValidShortId validation rejects invalid IDs","User is logged in","1. POST /cart with productId='invalid'\n2. POST with productId=12345\n3. POST with productId=''","Various invalid productIds","400: {success:false, message:'Invalid productId'}","Cart not updated","High","Validation","Not Executed","","",""],
["TC-SC-004","Add to Cart","UC-3.3.1.1","US-301","Add to cart - productId must be string","Verify productId type validation","User is logged in","1. POST /cart with productId=12345 (number)\n2. POST with productId=true (boolean)","Non-string productId","400: {success:false, message:'Invalid productId'} (typeof check fails)","Cart not updated","Medium","Validation","Not Executed","","",""],
["TC-SC-005","Add to Cart","UC-3.3.1.1","US-301","Add to cart - product not found","Verify 404 when product doesn't exist in DB","User is logged in","1. POST /cart with productId that passes isValidShortId but doesn't exist","Valid format but non-existent productId","404: {success:false, message:'Product not found'}","Cart not updated","High","Validation","Not Executed","","",""],
["TC-SC-006","Add to Cart","UC-3.3.2.2","US-301","Add to cart - product out of stock","Verify error when product is out of stock","User is logged in; product has in_stock=false","1. POST /cart with out-of-stock productId","productId of out-of-stock product","400: {success:false, message:'Product is out of stock'}","Cart not updated","High","Business Rule","Not Executed","","",""],
["TC-SC-007","Add to Cart","UC-3.3.1.1","US-301","Add to cart - default quantity 1","Verify quantity defaults to 1 when not provided","User is logged in; product in stock","1. POST /cart with {productId: valid_id} (no quantity field)","No quantity field","201: Product added with quantity=1","1 item in cart","Medium","Functional","Not Executed","","",""],
["TC-SC-008","Add to Cart","UC-3.3.1.1","US-301","Add to cart - quantity validation range 1-100","Verify quantity must be integer between 1 and 100","User is logged in","1. POST with quantity=0\n2. POST with quantity=-1\n3. POST with quantity=101\n4. POST with quantity=3.5\n5. POST with quantity='abc'","Various invalid quantities","All return 400: {success:false, message:'Quantity must be between 1 and 100'}","Cart not updated","High","Validation","Not Executed","","",""],
["TC-SC-009","Add to Cart","UC-3.3.1.1","US-301","Add to cart - quantity=100 boundary","Verify maximum quantity of 100 is accepted","User is logged in; product in stock","1. POST /cart with quantity=100","quantity=100","201: Product added with quantity=100","Item added at max quantity","Medium","Boundary","Not Executed","","",""],
["TC-SC-010","Add to Cart","UC-3.3.1.1","US-301","Add to cart - quantity=1 boundary","Verify minimum quantity of 1 is accepted","User is logged in; product in stock","1. POST /cart with quantity=1","quantity=1","201: Product added with quantity=1","Item added at min quantity","Low","Boundary","Not Executed","","",""],
["TC-SC-011","Add to Cart","UC-3.3.1.1","US-301","Add to cart - duplicate auto-increment","Verify adding existing product increments quantity","User is logged in; product already in cart with quantity=2","1. POST /cart with same productId, quantity=3\n2. Verify cart item quantity","productId already in cart, quantity=3","201: quantity incremented to 5 (2+3); no duplicate entry created","Quantity updated, single entry","High","Functional","Not Executed","","",""],
["TC-SC-012","Add to Cart","UC-3.3.1.1","US-301","Add to cart - price_at_add captured","Verify price snapshot taken at time of adding","User is logged in; product price is 999","1. POST /cart with valid productId\n2. GET /cart\n3. Check priceAtAdd field","Product with price=999","priceAtAdd=999 in cart item; matches product price at time of add","Price snapshot stored","High","Functional","Not Executed","","",""],
["TC-SC-013","Add to Cart","UC-3.3.1.1","US-301","Add to cart - authentication required","Verify POST /cart requires JWT","No auth token","1. POST /api/v1/cart without Authorization header","No token","401 Unauthorized","Unauthenticated rejected","High","Security","Not Executed","","",""],
["TC-SC-014","Add to Cart","UC-3.4","US-301","Add to cart - rate limiter 60/5min","Verify cartWriteLimiter allows max 60 writes per 5 min","User is logged in","1. Send 60 POST /cart requests within 5 minutes\n2. Send 61st request","61 rapid cart write requests","First 60 succeed; 61st returns 429 Too Many Requests","Rate limit enforced","High","Security","Not Executed","","",""],
# ── View Cart ──
["TC-SC-015","View Cart","UC-3.3.1.2","US-302","View cart - all items displayed","Verify GET /cart returns all cart items with details","User is logged in; has 3 items in cart","1. GET /api/v1/cart\n2. Verify all items returned with fields","3 items in cart","Response includes cart array with cartItemId, productId, quantity, priceAtAdd, isAvailable, product (name, price, images, inStock), timeStamp","All items displayed","High","Functional","Not Executed","","",""],
["TC-SC-016","View Cart","UC-3.3.1.2","US-302","View cart - totalAmount calculation","Verify totalAmount sums priceAtAdd * quantity for all items","User has items: item1(price=500,qty=2), item2(price=200,qty=1)","1. GET /cart\n2. Check totalAmount","2 items with known prices and quantities","totalAmount = (500*2) + (200*1) = 1200","Total calculated correctly","High","Functional","Not Executed","","",""],
["TC-SC-017","View Cart","UC-3.3.1.2","US-302","View cart - totalItems count","Verify totalItems returns count of distinct cart items","User has 3 items in cart","1. GET /cart\n2. Check totalItems field","3 cart items","totalItems=3 (count of distinct items, not sum of quantities)","Item count correct","Medium","Functional","Not Executed","","",""],
["TC-SC-018","View Cart","UC-3.3.2.3","US-302","View cart - hasPriceChanges flag","Verify hasPriceChanges detects price differences","User has item with priceAtAdd=500; product price now 600","1. GET /cart\n2. Check hasPriceChanges flag","Item where priceAtAdd != current_price","hasPriceChanges=true; item shows price discrepancy","Price change detected","High","Functional","Not Executed","","",""],
["TC-SC-019","View Cart","UC-3.3.2.3","US-302","View cart - no price changes","Verify hasPriceChanges is false when prices match","User has items where all priceAtAdd match current prices","1. GET /cart\n2. Check hasPriceChanges flag","All prices match","hasPriceChanges=false","No false positives","Medium","Functional","Not Executed","","",""],
["TC-SC-020","View Cart","UC-3.3.2.4","US-302","View cart - hasUnavailableItems flag","Verify hasUnavailableItems detects out-of-stock or insufficient stock","User has item where product is now out of stock","1. GET /cart\n2. Check hasUnavailableItems flag","Item with in_stock=false","hasUnavailableItems=true; item.isAvailable=false","Unavailable items flagged","High","Functional","Not Executed","","",""],
["TC-SC-021","View Cart","UC-3.3.2.4","US-302","View cart - isAvailable checks stock quantity","Verify isAvailable=false when quantity > stock_qty","User has item qty=5 but product stock_qty=3","1. GET /cart\n2. Check isAvailable for that item","quantity=5, stock_qty=3","isAvailable=false (stock_qty < quantity); hasUnavailableItems=true","Insufficient stock detected","High","Functional","Not Executed","","",""],
["TC-SC-022","View Cart","UC-3.3.1.2","US-302","View cart - empty cart","Verify empty cart returns empty array and zero totals","User is logged in; cart is empty","1. GET /cart\n2. Verify response","Empty cart","cart=[], totalItems=0, totalAmount=0, hasUnavailableItems=false, hasPriceChanges=false","Empty state data correct","Medium","Boundary","Not Executed","","",""],
["TC-SC-023","View Cart","UC-3.3.1.2","US-302","View cart - product images included","Verify cart items include product images","User has items in cart with product images","1. GET /cart\n2. Check product.images array","Items with product images","Each cart item includes product.images array with image URLs","Images displayed","Medium","Functional","Not Executed","","",""],
["TC-SC-024","View Cart","UC-3.3.1.2","US-302","View cart - authentication required","Verify GET /cart requires JWT","No auth token","1. GET /api/v1/cart without Authorization header","No token","401 Unauthorized","Unauthenticated rejected","High","Security","Not Executed","","",""],
# ── Cart Count ──
["TC-SC-025","Cart Count","UC-3.3.1.2","US-302","Get cart count","Verify GET /cart/count returns item count","User is logged in; has 5 items in cart","1. GET /api/v1/cart/count","5 items in cart","{success:true, data:{count:5}}","Count matches","Medium","Functional","Not Executed","","",""],
["TC-SC-026","Cart Count","UC-3.3.1.2","US-302","Cart count - empty cart","Verify count is 0 for empty cart","User is logged in; empty cart","1. GET /cart/count","Empty cart","{success:true, data:{count:0}}","Zero count","Low","Boundary","Not Executed","","",""],
["TC-SC-027","Cart Count","UC-3.3.1.2","US-302","Cart count - authentication required","Verify GET /cart/count requires JWT","No auth token","1. GET /cart/count without auth","No token","401 Unauthorized","Unauthenticated rejected","High","Security","Not Executed","","",""],
# ── Update Cart ──
["TC-SC-028","Update Cart","UC-3.3.1.2","US-302","Update cart item quantity - valid","Verify PUT /cart/:productId updates quantity","User is logged in; item in cart","1. PUT /api/v1/cart/:productId with {quantity: 5}","productId in cart, quantity=5","200: {success:true, message:'Cart updated'}; quantity now 5","Quantity updated","High","Functional","Not Executed","","",""],
["TC-SC-029","Update Cart","UC-3.3.1.2","US-302","Update cart - quantity validation 1-100","Verify quantity validation on update","User is logged in; item in cart","1. PUT with quantity=0\n2. PUT with quantity=101\n3. PUT with quantity=-5\n4. PUT with quantity=2.5","Invalid quantities","All return 400: {success:false, message:'Quantity must be between 1 and 100'}","Quantity not updated","High","Validation","Not Executed","","",""],
["TC-SC-030","Update Cart","UC-3.3.1.2","US-302","Update cart - quantity=100 boundary","Verify maximum quantity accepted on update","User is logged in; item in cart","1. PUT with quantity=100","quantity=100","200: Cart updated with quantity=100","Max quantity accepted","Medium","Boundary","Not Executed","","",""],
["TC-SC-031","Update Cart","UC-3.3.1.2","US-302","Update cart - invalid productId format","Verify isValidShortId check on update","User is logged in","1. PUT /cart/invalid-id with {quantity:5}","Invalid productId format","400: {success:false, message:'Invalid productId'}","Update rejected","Medium","Validation","Not Executed","","",""],
["TC-SC-032","Update Cart","UC-3.3.1.2","US-302","Update cart - item not found","Verify 404 when cart item doesn't exist","User is logged in; productId not in cart","1. PUT /cart/:validProductId with {quantity:5}","productId not in user's cart","404: {success:false, message:'Cart item not found'}","No update","Medium","Validation","Not Executed","","",""],
["TC-SC-033","Update Cart","UC-3.3.1.2","US-302","Update cart - user isolation","Verify user can only update their own cart items","User A logged in; productId in User B's cart","1. Log in as User A\n2. PUT /cart/:productId (belongs to User B)","User A token, User B's cart item","404: Cart item not found (WHERE user_id = $1 prevents cross-user access)","Isolation enforced","High","Security","Not Executed","","",""],
["TC-SC-034","Update Cart","UC-3.3.1.2","US-302","Update cart - authentication required","Verify PUT /cart/:productId requires JWT","No auth token","1. PUT /cart/:productId without auth","No token","401 Unauthorized","Unauthenticated rejected","High","Security","Not Executed","","",""],
# ── Remove Cart Item ──
["TC-SC-035","Remove Item","UC-3.3.1.2","US-302","Remove cart item - valid deletion","Verify DELETE /cart/:productId removes item","User is logged in; item in cart","1. DELETE /api/v1/cart/:productId\n2. GET /cart to verify removal","productId in cart","200: {success:true, message:'Item removed from cart'}; item no longer in cart","Item removed","High","Functional","Not Executed","","",""],
["TC-SC-036","Remove Item","UC-3.3.1.2","US-302","Remove cart item - invalid productId","Verify isValidShortId check on delete","User is logged in","1. DELETE /cart/invalid-id","Invalid productId format","400: {success:false, message:'Invalid productId'}","No deletion","Medium","Validation","Not Executed","","",""],
["TC-SC-037","Remove Item","UC-3.3.1.2","US-302","Remove cart item - non-existent product","Verify delete of non-existent item doesn't error","User is logged in; productId not in cart","1. DELETE /cart/:validProductId","Valid format, not in cart","200: {success:true, message:'Item removed from cart'} (DELETE doesn't check existence)","No error, idempotent","Low","Boundary","Not Executed","","",""],
["TC-SC-038","Remove Item","UC-3.3.1.2","US-302","Remove cart item - user isolation","Verify user cannot delete another user's cart items","User A logged in; item in User B's cart","1. DELETE /cart/:productId (User B's item)","User A token, User B's item","Item not deleted (WHERE user_id = $1 scopes to current user)","Isolation enforced","High","Security","Not Executed","","",""],
["TC-SC-039","Remove Item","UC-3.3.1.2","US-302","Remove cart item - authentication required","Verify DELETE /cart/:productId requires JWT","No auth token","1. DELETE /cart/:productId without auth","No token","401 Unauthorized","Unauthenticated rejected","High","Security","Not Executed","","",""],
# ── Clear Cart ──
["TC-SC-040","Clear Cart","UC-3.3.1.3","US-303","Clear entire cart - valid","Verify DELETE /cart clears all items","User is logged in; has 5 items in cart","1. DELETE /api/v1/cart\n2. GET /cart to verify empty","5 items in cart","200: {success:true, message:'Cart cleared'}; subsequent GET /cart returns empty cart","Cart is empty","High","Functional","Not Executed","","",""],
["TC-SC-041","Clear Cart","UC-3.3.1.3","US-303","Clear cart - already empty","Verify clearing empty cart doesn't error","User is logged in; cart already empty","1. DELETE /cart","Empty cart","200: {success:true, message:'Cart cleared'} (idempotent)","No error","Low","Boundary","Not Executed","","",""],
["TC-SC-042","Clear Cart","UC-3.3.2.6","US-303","Clear cart - confirmation dialog (frontend)","Verify confirmation dialog before clearing","User is on Cart screen with items","1. Tap \"Clear Cart\" button\n2. Verify confirmation dialog appears\n3. Tap Cancel\n4. Verify cart unchanged","Items in cart","Confirmation dialog appears; cancelling preserves all items","Cart unchanged on cancel","Medium","UI","Not Executed","","",""],
["TC-SC-043","Clear Cart","UC-3.3.2.6","US-303","Clear cart - confirm then clear","Verify confirming dialog clears cart","User is on Cart screen with items","1. Tap \"Clear Cart\"\n2. Confirm in dialog\n3. Verify cart emptied","Items in cart","After confirmation, DELETE /cart called; cart shows empty state","Cart cleared","Medium","UI","Not Executed","","",""],
["TC-SC-044","Clear Cart","UC-3.3.1.3","US-303","Clear cart - authentication required","Verify DELETE /cart requires JWT","No auth token","1. DELETE /cart without auth","No token","401 Unauthorized","Unauthenticated rejected","High","Security","Not Executed","","",""],
["TC-SC-045","Clear Cart","UC-3.3.1.3","US-303","Clear cart - user isolation","Verify clearing only affects current user's cart","User A logged in; User B also has items","1. DELETE /cart as User A\n2. Verify User B's cart unchanged","User A and B both have items","Only User A's cart cleared; User B's items unaffected","Isolation enforced","High","Security","Not Executed","","",""],
# ── Cart UI Frontend ──
["TC-SC-046","Cart UI","UC-3.3.1.2","US-302","Cart screen - animated items display","Verify cart items render with animations","User has items in cart","1. Open Cart screen\n2. Observe item rendering","Items in cart","Cart items display with smooth animations; each shows name, image, quantity, price","Animated items shown","Medium","UI","Not Executed","","",""],
["TC-SC-047","Cart UI","UC-3.3.1.2","US-302","Cart screen - quantity controls","Verify +/- quantity buttons work","User has item in cart with quantity=3","1. Tap + button\n2. Verify quantity becomes 4\n3. Tap - button\n4. Verify quantity becomes 3","Item with quantity=3","Quantity increments/decrements correctly; PUT /cart/:productId called","Quantity updated via UI","High","Functional","Not Executed","","",""],
["TC-SC-048","Cart UI","UC-3.3.2.5","US-302","Cart screen - quantity capped at stock","Verify UI caps quantity at available stock","User has item; product stock_qty=5, current qty=4","1. Tap + button to increase to 5\n2. Tap + again\n3. Verify warning shown","stock_qty=5, quantity=4","Quantity increases to 5; further increase shows warning; capped at stock level","Stock cap enforced in UI","High","Functional","Not Executed","","",""],
["TC-SC-049","Cart UI","UC-3.3.1.2","US-302","Cart screen - remove item","Verify remove icon removes item from cart","User has items in cart","1. Tap remove icon on item\n2. Verify item removed\n3. Verify price breakdown updates","Item to remove","Item removed; DELETE /cart/:productId called; price updates immediately","Item removed from UI and API","High","Functional","Not Executed","","",""],
["TC-SC-050","Cart UI","UC-3.3.1.2","US-302","Cart screen - empty state","Verify empty cart shows illustration","User is logged in; cart is empty","1. Open Cart screen\n2. Observe empty state","Empty cart","Empty state illustration with message displayed; no items shown","Empty state rendered","Medium","UI","Not Executed","","",""],
["TC-SC-051","Cart UI","UC-3.3.1.2","US-302","Cart screen - proceed to checkout button","Verify proceed button navigates to checkout","User has valid items in cart (all available)","1. Verify \"Proceed to Checkout\" button visible\n2. Tap button\n3. Verify navigation","Valid cart items","Navigation to checkout flow (address selection screen)","Checkout flow started","High","Functional","Not Executed","","",""],
["TC-SC-052","Cart UI","UC-3.3.2.4","US-302","Cart screen - checkout disabled with unavailable items","Verify checkout button disabled when cart has unavailable items","User has item that went out of stock","1. Open Cart screen\n2. Observe checkout button","Cart with out-of-stock item","\"Proceed to Checkout\" button is disabled; out-of-stock item flagged","Cannot proceed with unavailable items","High","Functional","Not Executed","","",""],
["TC-SC-053","Cart UI","UC-3.3.2.3","US-302","Cart screen - price change notice","Verify price change flagged on cart items","User has item where priceAtAdd differs from current price","1. Open Cart screen\n2. Observe flagged item","Item with price change","Item shows \"Price updated\" notice with new price","Price change visible to user","High","UI","Not Executed","","",""],
["TC-SC-054","Cart UI","UC-3.3.2.4","US-302","Cart screen - out of stock warning","Verify out-of-stock items show warning badge","User has item where product is now out of stock","1. Open Cart screen\n2. Observe flagged item","Item with in_stock=false","\"Out of Stock\" warning badge displayed on item","Warning visible","High","UI","Not Executed","","",""],
["TC-SC-055","Cart UI","UC-3.3.1.2","US-302","Cart screen - price breakdown display","Verify price breakdown shows subtotal","User has items in cart","1. Open Cart screen\n2. Check price breakdown section","Multiple items","Subtotal displayed correctly; calculated from quantity * price for each item","Price breakdown visible","Medium","Functional","Not Executed","","",""],
# ── Wishlist ──
["TC-SC-056","Wishlist","UC-3.3.1.4","US-304","Add to wishlist - toggle on","Verify adding product to wishlist via heart icon","User is logged in; product not in wishlist","1. Tap heart icon on product card/detail\n2. Verify icon fills\n3. Verify API call","productId not in wishlist","Heart icon changes to filled/active state; POST wishlist API called","Product in wishlist","High","Functional","Not Executed","","",""],
["TC-SC-057","Wishlist","UC-3.3.1.4","US-304","Remove from wishlist - toggle off","Verify removing product from wishlist via heart icon","User is logged in; product in wishlist","1. Tap filled heart icon\n2. Verify icon unfills\n3. Verify API call","productId in wishlist","Heart icon changes to unfilled state; DELETE wishlist API called","Product removed from wishlist","High","Functional","Not Executed","","",""],
["TC-SC-058","Wishlist","UC-3.3.2.7","US-304","Wishlist duplicate add - 409 handled","Verify 409 conflict on duplicate add handled gracefully","User has product in wishlist","1. Call POST wishlist API for same product\n2. Observe frontend behavior","Already wishlisted productId","Backend returns 409 conflict; frontend handles gracefully without error to user","No visible error","Medium","Functional","Not Executed","","",""],
["TC-SC-059","Wishlist","UC-3.3.1.4","US-304","Wishlist screen - all items displayed","Verify Wishlist screen shows saved products","User has 3 items in wishlist","1. Open Wishlist screen\n2. Verify all items shown","3 wishlisted products","All products shown with current price, image, and \"Add to Cart\" option","Wishlist items displayed","High","Functional","Not Executed","","",""],
["TC-SC-060","Wishlist","UC-3.3.2.9","US-304","Wishlist - out of stock badge","Verify out-of-stock product flagged on Wishlist screen","Wishlisted product went out of stock","1. Open Wishlist screen\n2. Check flagged item","Product with in_stock=false","\"Out of Stock\" badge shown; \"Add to Cart\" button disabled","Out of stock visible","Medium","Functional","Not Executed","","",""],
["TC-SC-061","Wishlist","UC-3.3.1.5","US-305","Move wishlist item to cart - success","Verify adding wishlist item to cart","User has item in wishlist; product in stock","1. Tap \"Add to Cart\" on wishlist item\n2. Verify success toast\n3. Verify item in cart","Wishlisted in-stock product","Product added to cart; success toast shown; POST /cart called","Item in cart","High","Functional","Not Executed","","",""],
["TC-SC-062","Wishlist","UC-3.3.2.8","US-305","Move wishlist to cart - size required","Verify redirect to detail page when size needed","Wishlist item requires size; no size stored","1. Tap \"Add to Cart\" on wishlist item requiring size\n2. Observe navigation","Product requiring size selection","User navigated to Product Detail screen to select size before adding","Size selection enforced","Medium","Functional","Not Executed","","",""],
["TC-SC-063","Wishlist","UC-3.3.2.9","US-305","Move wishlist to cart - out of stock disabled","Verify Add to Cart disabled for out-of-stock wishlist items","Wishlisted product is out of stock","1. Open Wishlist\n2. Check \"Add to Cart\" button state","Out of stock product","\"Add to Cart\" button disabled; shows \"Out of Stock\"","Cannot add out-of-stock to cart","Medium","Functional","Not Executed","","",""],
# ── Frontend Services ──
["TC-SC-064","Cart Service","UC-3.3.1.1","US-301","Frontend getCart service","Verify frontend cart service getCart function","User is logged in","1. Call getCart()\n2. Verify response mapping","None","Returns cart data from GET /api/v1/cart; response mapped correctly","Cart data available in frontend","Medium","Integration","Not Executed","","",""],
["TC-SC-065","Cart Service","UC-3.3.1.1","US-301","Frontend addToCart service","Verify frontend addToCart function","User is logged in","1. Call addToCart(productId, quantity)\n2. Verify POST call made","productId, quantity","POST /api/v1/cart called with correct body","API called correctly","Medium","Integration","Not Executed","","",""],
["TC-SC-066","Cart Service","UC-3.3.1.2","US-302","Frontend updateCartItem service","Verify frontend updateCartItem function","User is logged in","1. Call updateCartItem(productId, quantity)\n2. Verify PUT call","productId, quantity","PUT /api/v1/cart/:productId called","API called correctly","Medium","Integration","Not Executed","","",""],
["TC-SC-067","Cart Service","UC-3.3.1.2","US-302","Frontend removeFromCart service","Verify frontend removeFromCart function","User is logged in","1. Call removeFromCart(productId)\n2. Verify DELETE call","productId","DELETE /api/v1/cart/:productId called","API called correctly","Medium","Integration","Not Executed","","",""],
["TC-SC-068","Cart Service","UC-3.3.1.3","US-303","Frontend clearCart service","Verify frontend clearCart function","User is logged in","1. Call clearCart()\n2. Verify DELETE call","None","DELETE /api/v1/cart called","API called correctly","Medium","Integration","Not Executed","","",""],
["TC-SC-069","Cart Service","UC-3.3.1.2","US-302","Frontend getCartCount service","Verify frontend getCartCount function","User is logged in","1. Call getCartCount()\n2. Verify response","None","GET /api/v1/cart/count called; count returned","Count available","Low","Integration","Not Executed","","",""],
# ── Server Error Handling ──
["TC-SC-070","Error Handling","UC-3.4","US-301","Server error on add to cart","Verify 500 error handled on POST /cart","Database connection fails","1. Simulate DB failure\n2. POST /cart","DB failure","500: {success:false, message:'Server error'}","Error logged, user sees error","Medium","Error Handling","Not Executed","","",""],
["TC-SC-071","Error Handling","UC-3.4","US-302","Server error on get cart","Verify 500 error handled on GET /cart","Database connection fails","1. Simulate DB failure\n2. GET /cart","DB failure","500: {success:false, message:'Server error'}","Error logged","Medium","Error Handling","Not Executed","","",""],
["TC-SC-072","Error Handling","UC-3.4","US-302","Server error on update cart","Verify 500 error handled on PUT /cart/:id","Database connection fails","1. Simulate DB failure\n2. PUT /cart/:productId","DB failure","500: {success:false, message:'Server error'}","Error logged","Medium","Error Handling","Not Executed","","",""],
["TC-SC-073","Error Handling","UC-3.4","US-302","Server error on delete cart item","Verify 500 error handled on DELETE /cart/:id","Database connection fails","1. Simulate DB failure\n2. DELETE /cart/:productId","DB failure","500: {success:false, message:'Server error'}","Error logged","Medium","Error Handling","Not Executed","","",""],
["TC-SC-074","Error Handling","UC-3.4","US-303","Server error on clear cart","Verify 500 error handled on DELETE /cart","Database connection fails","1. Simulate DB failure\n2. DELETE /cart","DB failure","500: {success:false, message:'Server error'}","Error logged","Medium","Error Handling","Not Executed","","",""],
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
    ["Add to Cart", 14, 0, 0, 0, 14, "0%"],
    ["View Cart", 10, 0, 0, 0, 10, "0%"],
    ["Cart Count", 3, 0, 0, 0, 3, "0%"],
    ["Update Cart", 7, 0, 0, 0, 7, "0%"],
    ["Remove Item", 5, 0, 0, 0, 5, "0%"],
    ["Clear Cart", 6, 0, 0, 0, 6, "0%"],
    ["Cart UI", 10, 0, 0, 0, 10, "0%"],
    ["Wishlist", 8, 0, 0, 0, 8, "0%"],
    ["Cart Service", 6, 0, 0, 0, 6, "0%"],
    ["Error Handling", 5, 0, 0, 0, 5, "0%"],
    ["TOTAL", 74, 0, 0, 0, 74, "0%"],
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
    ["UC-3.3.1.1","Add to Cart","TC-SC-001 to TC-SC-014","Covered"],
    ["UC-3.3.1.2","View and Manage Cart","TC-SC-015 to TC-SC-024, TC-SC-025 to TC-SC-027, TC-SC-028 to TC-SC-039, TC-SC-046 to TC-SC-055","Covered"],
    ["UC-3.3.1.3","Clear Cart","TC-SC-040 to TC-SC-045","Covered"],
    ["UC-3.3.1.4","Add to Wishlist","TC-SC-056 to TC-SC-060","Covered"],
    ["UC-3.3.1.5","Move Wishlist Item to Cart","TC-SC-061 to TC-SC-063","Covered"],
    ["UC-3.3.2.1","Quantity Exceeds Stock on Add","TC-SC-008 (boundary), TC-SC-006","Covered"],
    ["UC-3.3.2.2","Product Out of Stock During Add","TC-SC-006","Covered"],
    ["UC-3.3.2.3","Price Change Detected on Cart Load","TC-SC-018, TC-SC-019, TC-SC-053","Covered"],
    ["UC-3.3.2.4","Out-of-Stock Item in Cart","TC-SC-020, TC-SC-021, TC-SC-052, TC-SC-054","Covered"],
    ["UC-3.3.2.5","Quantity Increase Beyond Stock","TC-SC-048","Covered"],
    ["UC-3.3.2.6","Clear Cart Cancelled","TC-SC-042","Covered"],
    ["UC-3.3.2.7","Duplicate Wishlist Add","TC-SC-058","Covered"],
    ["UC-3.3.2.8","Wishlist Item Requires Size","TC-SC-062","Covered"],
    ["UC-3.3.2.9","Wishlisted Item Out of Stock","TC-SC-060, TC-SC-063","Covered"],
    ["US-301","Add Item to Cart","TC-SC-001 to TC-SC-014, TC-SC-064, TC-SC-065, TC-SC-070","Covered"],
    ["US-302","View & Manage Cart","TC-SC-015 to TC-SC-024, TC-SC-025 to TC-SC-039, TC-SC-046 to TC-SC-055, TC-SC-066 to TC-SC-069, TC-SC-071 to TC-SC-073","Covered"],
    ["US-303","Clear Cart","TC-SC-040 to TC-SC-045, TC-SC-068, TC-SC-074","Covered"],
    ["US-304","Add to Wishlist","TC-SC-056 to TC-SC-060","Covered"],
    ["US-305","Move Wishlist Item to Cart","TC-SC-061 to TC-SC-063","Covered"],
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

wb.save(r'C:\Zpin\ZPinEcom\SHOPPING_CART_TEST_CASES.xlsx')
print("DONE: SHOPPING_CART_TEST_CASES.xlsx created with 74 test cases")
