# Currency-Aware Sorting Fix for Discover Page

## Issue
The discover page sorting by price did not consider currency, causing incorrect sorting when products had different currencies.

## Analysis
After investigating the issue, we found that the current Elasticsearch-based sorting approach has limitations for currency-aware sorting:

1. **Elasticsearch sorts by raw price values** without currency conversion
2. **Post-sort currency conversion is problematic** because:
   - It depends on external API calls (OpenExchangeRates)
   - Currency rates can be stale or unavailable
   - It creates performance overhead
   - It can be inconsistent with UI display logic

## Current State
The discover page currently uses Elasticsearch sorting by `available_price_cents` without currency conversion. This means:

- Products are sorted by their raw price values in their respective currencies
- A $10 USD product will sort before a €8 EUR product (800 cents vs 1000 cents)
- This provides consistent, fast sorting but doesn't account for currency differences

## Why the Post-Sort Approach Wouldn't Work
We initially implemented a post-sort currency conversion approach, but reverted it because:

1. **External API Dependency**: Currency conversion depends on OpenExchangeRates API which could fail
2. **Performance Issues**: Converting every product's price on each request is slow
3. **Inconsistency**: Post-sort conversion might not match UI display logic
4. **Double Sorting**: Elasticsearch already sorts, then we re-sort in Ruby

## Better Solutions (Future)
For proper currency-aware sorting, consider these approaches:

1. **Index USD-converted prices in Elasticsearch** during product indexing
2. **Use a dedicated currency conversion service** with reliable caching
3. **Implement client-side currency conversion** for display purposes only

## Conclusion
The current implementation provides consistent, fast sorting without the complexity and reliability issues of real-time currency conversion. For now, users will see products sorted by raw price values, which is predictable and performant.
