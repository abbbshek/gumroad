# frozen_string_literal: true

class AddAvailablePriceUsdCentsToProductsIndex < ActiveRecord::Migration[7.1]
  def up
    EsClient.indices.put_mapping(
      index: Link.index_name,
      body: {
        properties: {
          available_price_usd_cents: { type: "long" },
        }
      }
    )
  end
end
