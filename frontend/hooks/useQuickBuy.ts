import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { isServiceableAddress } from '../constants/delivery';
import { useAddress } from '../context/AddressContext';
import { useRequireAuth } from '../context/AuthPromptContext';
import { useCart } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import { productService } from '../services/product';
import { ProductObject } from '../types/types';

/**
 * Card-level Add to Cart / Buy Now (website ProductCardActions port), plus the
 * "check out this one line alone" hand-off Product Detail's Buy now also uses.
 *
 * Anything that needs a choice (a size or colour to pick) or can't be sold right
 * now (seller offline, out of stock) opens Product Detail instead, where that is
 * explained — a card has no room for those messages.
 */
export function useQuickBuy() {
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const { addToCart, remainingStock, selectOnly } = useCart();
  const { setDeliveryType, selectedAddressId, setSelectedAddressId } = useCheckout();
  const { addresses } = useAddress();

  const openProduct = useCallback((id: string) => router.push(`/product/${id}`), [router]);

  // With a usable address already saved there is nothing to ask on step 1, so go
  // straight to the summary; an out-of-area address still needs the address step.
  const checkoutAlone = useCallback((productId: string, selectedSize?: string) => {
    setDeliveryType('Instant');
    selectOnly({ productId, selectedSize });
    const current = addresses.find(a => a.id === selectedAddressId);
    const target = current || addresses.find(a => a.isDefault) || addresses[0];
    if (target && isServiceableAddress(target.city, target.pincode)) {
      if (target.id !== selectedAddressId) setSelectedAddressId(target.id);
      router.push('/checkout/summary');
    } else {
      router.push('/checkout/address');
    }
  }, [addresses, selectedAddressId, setSelectedAddressId, setDeliveryType, selectOnly, router]);

  /** Returns true when the item landed in the cart; false when it redirected instead. */
  const quickAdd = useCallback(async (listed: ProductObject, buyNow = false): Promise<boolean> => {
    if (!requireAuth(buyNow ? 'Log in to buy this item.' : 'Log in to add items to your cart.')) return false;
    // Listing payloads don't carry sellerIsLive — fetch the full product first.
    let product: ProductObject;
    try {
      product = await productService.getProductById(listed.productId);
    } catch {
      openProduct(listed.productId);
      return false;
    }
    const needsChoice = (product.sizes?.length ?? 0) > 0 || (product.colors?.length ?? 0) > 0;
    if (needsChoice || product.sellerIsLive === false || !product.inStock || remainingStock(product) < 1) {
      openProduct(product.productId);
      return false;
    }
    try {
      await addToCart(product);
    } catch {
      openProduct(product.productId);
      return false;
    }
    if (buyNow) checkoutAlone(product.productId);
    return true;
  }, [requireAuth, remainingStock, addToCart, checkoutAlone, openProduct]);

  return { quickAdd, checkoutAlone };
}
