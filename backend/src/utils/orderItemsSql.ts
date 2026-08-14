import { safeIdentifier } from './sql';

const RETURN_REQUESTS = safeIdentifier('return_requests');

// How many units of an `oi` (order_items) row are already committed to a return.
// Every state except 'rejected' still holds its units; a rejection releases them.
//
// The schema is frozen — there is no `order_items.returned_quantity` — so this
// reads the counts back out of `return_requests.order_item_ids`, whose elements
// are either a bare id string (the WHOLE line) or `{id, quantity}` (that many
// units). See utils/returnLines.ts, which is the TypeScript twin of this SQL.
// An empty/absent array still means "the whole order".
export const RETURNED_QTY = `(
  SELECT COALESCE(SUM(
    CASE
      WHEN jsonb_typeof(rr.order_item_ids) <> 'array' OR jsonb_array_length(rr.order_item_ids) = 0
        THEN oi.quantity
      ELSE COALESCE((
        SELECT SUM(
          CASE WHEN jsonb_typeof(e) = 'object'
               THEN LEAST(COALESCE(NULLIF(e ->> 'quantity', '')::int, oi.quantity), oi.quantity)
               ELSE oi.quantity END
        )
        FROM jsonb_array_elements(rr.order_item_ids) e
        WHERE COALESCE(e ->> 'id', trim(both '"' from e::text)) = oi.id::text
      ), 0)
    END
  ), 0)
  FROM ${RETURN_REQUESTS} rr
  WHERE rr.order_id = oi.order_id AND rr.status <> 'rejected'
)`;

// The customer-facing line-item payload. ONE definition, used by every endpoint
// that lists a customer's orders: GET /orders, GET /orders/:id and
// GET /users/orders (which is the one the app actually calls). They were three
// hand-written copies and drifted — /users/orders shipped without `orderItemId`,
// so the returns screen had no per-item key to tick and every fix aimed at
// /orders missed the endpoint in use. Never inline this again.
export const ORDER_ITEMS_JSON = `json_build_object(
  'orderItemId', oi.id,
  'productId', oi.product_id,
  'productName', oi.product_name,
  'quantity', oi.quantity,
  'price', oi.price,
  'image', oi.image,
  'variant', oi.variant,
  'isReturned', oi.is_returned,
  'returnedQuantity', ${RETURNED_QTY}
)`;
