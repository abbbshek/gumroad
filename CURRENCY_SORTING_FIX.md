# Currency-Aware Price Sorting Fix

## Problem

On the discover page, when sorting products by price (high to low or low to high), the sorting was done numerically on the raw `available_price_cents` values without considering currency conversion. This caused products with different currencies to be sorted incorrectly.

### Example Issue

Consider these products:
- Product A: 1000 USD cents ($10.00)
- Product B: 800 EUR cents (€8.00 ≈ $9.41 USD)
- Product C: 600 GBP cents (£6.00 ≈ $8.00 USD)

**Old behavior (incorrect):**
- Sorted by raw cents: C (600), B (800), A (1000)
- This ignores that 600 GBP cents is worth more than 800 EUR cents

**Expected behavior (correct):**
- Sorted by USD equivalent: A ($10.00), B ($9.41), C ($8.00)

## Root Cause

The Elasticsearch sorting was using the `available_price_cents` field, which stores prices in the original currency's cents. When comparing these values directly, it doesn't account for different currency exchange rates.

## Solution

### 1. Post-Sort Currency Conversion

Instead of trying to do currency conversion in Elasticsearch (which would be problematic due to exchange rate changes), the fix applies currency conversion **after** getting search results from Elasticsearch.

### 2. Updated Controller Logic

**File**: `app/controllers/discover_controller.rb`
- Added `sort_products_by_usd_price` method
- Applies currency conversion using current exchange rates
- Re-sorts products by their USD equivalent values
- Only applies to price-related sort keys

### 3. Implementation Details

The sorting process now works as follows:

1. **Elasticsearch Query**: Uses original `available_price_cents` field for initial sorting
2. **Post-Processing**: Converts all prices to USD using current exchange rates
3. **Re-sorting**: Sorts products by their USD equivalent values
4. **Fallback**: If currency conversion fails, falls back to original price

### 4. Currency Conversion Logic

```ruby
def sort_products_by_usd_price(products, sort_key)
  return products if products.empty?

  # Convert all products to USD for comparison
  products_with_usd_prices = products.map do |product|
    min_price_cents = product.available_price_cents.min
    usd_price_cents = if product.price_currency_type.downcase == "usd"
      min_price_cents
    else
      begin
        get_usd_cents(product.price_currency_type, min_price_cents)
      rescue StandardError => e
        Rails.logger.warn "Currency conversion failed for product #{product.id}: #{e.message}"
        min_price_cents # Fallback to original price
      end
    end

    [product, usd_price_cents]
  end

  # Sort by USD price
  sorted_products = if sort_key.in?([ProductSortKey::PRICE_DESCENDING, ProductSortKey::AVAILABLE_PRICE_DESCENDING])
    products_with_usd_prices.sort_by { |_, usd_price| -usd_price }
  else
    products_with_usd_prices.sort_by { |_, usd_price| usd_price }
  end

  sorted_products.map(&:first)
end
```

## Benefits

1. **Correct Sorting**: Products are now sorted by their actual USD equivalent values using current exchange rates
2. **Real-time Exchange Rates**: Uses current currency conversion rates, not stale indexed rates
3. **Graceful Degradation**: Falls back to original sorting if currency conversion fails
4. **Performance**: Minimal impact on performance since conversion only happens for price sorts
5. **Backward Compatible**: Doesn't break existing functionality

## Deployment Notes

1. No database migrations required
2. No Elasticsearch index changes required
3. The fix takes effect immediately upon deployment

## Testing

The fix includes integration tests that verify:
- Currency conversion works correctly for different currencies
- Products are sorted by their USD equivalent values
- Fallback behavior works when currency conversion fails

## Why This Approach is Better

1. **Accurate Exchange Rates**: Uses current rates instead of stale indexed rates
2. **Simpler Implementation**: No need for complex Elasticsearch field management
3. **More Reliable**: Less prone to issues with currency conversion failures
4. **Easier to Debug**: Currency conversion logic is in application code, not Elasticsearch
