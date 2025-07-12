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

### 1. Added USD-Converted Price Field

- **Migration**: `20250103150000_add_available_price_usd_cents_to_products_index.rb`
- **Field**: `available_price_usd_cents` in Elasticsearch index
- **Type**: `long` (stores USD cents)

### 2. Updated Elasticsearch Index Definition

**File**: `app/modules/product/searchable.rb`
- Added `available_price_usd_cents` field to the index mapping
- Updated `SEARCH_FIELDS` to include the new field
- Updated `ATTRIBUTE_TO_SEARCH_FIELDS_MAP` to trigger reindexing when prices change

### 3. Modified Sorting Logic

**File**: `app/modules/product/searchable.rb`
- Changed price sorting to use `available_price_usd_cents` instead of `available_price_cents`
- This ensures all prices are compared in USD equivalents

### 4. Added Currency Conversion Method

**File**: `app/modules/product/prices.rb`
- Added `available_price_usd_cents` method
- Uses existing `get_usd_cents` helper from `CurrencyHelper`
- Converts all available prices to USD cents for consistent comparison

### 5. Added Tests

**File**: `spec/modules/product/prices_spec.rb`
- Added tests for `available_price_usd_cents` method
- Tests USD products (no conversion needed)
- Tests non-USD products (conversion required)
- Tests products with multiple prices

**File**: `spec/modules/product/searchable/search_spec.rb`
- Added integration test for currency-aware sorting
- Verifies that products are sorted by their USD equivalent values

## Implementation Details

### Currency Conversion

The fix uses the existing `get_usd_cents` method from `CurrencyHelper`:

```ruby
def available_price_usd_cents
  available_price_cents.map do |price_cents|
    get_usd_cents(price_currency_type, price_cents)
  end
end
```

### Elasticsearch Sorting

The sorting now uses the USD-converted field:

```ruby
when ProductSortKey::AVAILABLE_PRICE_DESCENDING, ProductSortKey::PRICE_DESCENDING
  by :available_price_usd_cents, order: "desc", mode: "min"
when ProductSortKey::AVAILABLE_PRICE_ASCENDING, ProductSortKey::PRICE_ASCENDING
  by :available_price_usd_cents, order: "asc", mode: "min"
```

## Benefits

1. **Correct Sorting**: Products are now sorted by their actual USD equivalent values
2. **Consistent Experience**: Users see products in the expected price order regardless of currency
3. **Maintains Performance**: Uses existing currency conversion infrastructure
4. **Backward Compatible**: Doesn't break existing functionality

## Deployment Notes

1. Run the migration to add the new Elasticsearch field
2. Reindex all products to populate the new `available_price_usd_cents` field
3. The fix will take effect immediately after reindexing

## Testing

The fix includes comprehensive tests that verify:
- Currency conversion works correctly for different currencies
- Products with multiple prices are handled properly
- Sorting returns products in the correct USD-equivalent order
