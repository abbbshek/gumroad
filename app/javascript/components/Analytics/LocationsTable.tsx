import * as React from "react";

import { AnalyticsDataByState, LocationDataValue } from "$app/data/analytics";
import { formatPriceCentsWithCurrencySymbol } from "$app/utils/currency";



type TableEntry = {
  name: string;
  totals: number;
  sales: number;
  views: number;
};

type TableData = {
  locationData: AnalyticsDataByState;
  selectedProducts: string[];
  locations: Record<string, string>;
  caption: React.ReactNode;
};

const CountryFlag = ({ countryCode }: { countryCode: string }) => {
  const unicodeRegionChars = countryCode.split("").map((char) => 127397 + char.charCodeAt(0));
  const flag = String.fromCodePoint(...unicodeRegionChars);

  return <span>{flag || " "} </span>;
};

const prepareValue = (input: LocationDataValue | undefined) =>
  Array.isArray(input) ? input.reduce((acc, curr) => acc + curr, 0) : (input ?? 0);

const updateTableRow = (
  tableData: Map<string, TableEntry>,
  title: string,
  totals: number,
  sales: number,
  views: number,
) => {
  if (!totals && !sales && !views) return;

  const prev = tableData.get(title) || { name: "", totals: 0, sales: 0, views: 0 };
  const curr = {
    name: title || "Other",
    totals: prev.totals + totals,
    sales: prev.sales + sales,
    views: prev.views + views,
  };

  tableData.set(title, curr);
};

export const AnalyticsCountriesTable = ({
  locationData,
  selectedProducts,
  locations: countries,
  caption,
}: TableData) => {
  const countriesData = React.useMemo(() => {
    const { totals, sales, views } = locationData.by_state;
    const tableData = new Map<string, TableEntry>();

    for (const [productId, productTotals] of Object.entries(totals)) {
      if (!selectedProducts.includes(productId)) continue;

      for (const [country, total] of Object.entries(productTotals)) {
        const totalsVal = prepareValue(total);
        const salesVal = prepareValue(sales[productId]?.[country]);
        const viewsVal = prepareValue(views[productId]?.[country]);

        updateTableRow(tableData, country, totalsVal, salesVal, viewsVal);
      }
    }

    return [...tableData.values()];
  }, [locationData, selectedProducts]);
  const [sort, setSort] = React.useState<{ key: keyof TableEntry; direction: "asc" | "desc" }>({
    key: "totals",
    direction: "desc",
  });

  const getDefaultDirection = (columnKey: keyof TableEntry): "asc" | "desc" => {
    switch(columnKey) {
      case "name": return "asc";     // Country A-Z
      case "views": return "desc";   // Highest views first
      case "sales": return "desc";   // Highest sales first
      case "totals": return "desc";  // Highest revenue first
      default: return "asc";
    }
  };

  const customThProps = (key: keyof TableEntry) => ({
    "aria-sort": sort?.key === key ? (sort.direction === "asc" ? "ascending" : "descending") : "none",
    onClick: () => {
      const isCurrentColumn = sort?.key === key;
      const direction = isCurrentColumn
        ? (sort.direction === "asc" ? "desc" : "asc")  // Toggle if same column
        : getDefaultDirection(key);                     // Use custom default if new column
      setSort({ key, direction });
    }
  });

  const sortedItems = React.useMemo(() => {
    if (!sort) return countriesData;

    return [...countriesData].sort((a, b) => {
      const aValue = a[sort.key];
      const bValue = b[sort.key];

      let comparison = 0;
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      } else {
        comparison = (aValue as number) - (bValue as number);
      }

      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [countriesData, sort]);

  return (
    <>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th {...customThProps("name")}>Country</th>
            <th {...customThProps("views")}>Views</th>
            <th {...customThProps("sales")}>Sales</th>
            <th {...customThProps("totals")}>Total</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map(({ name, totals, sales, views }) => (
            <tr key={name}>
              <td data-label="Country">
                <CountryFlag countryCode={countries[name] || ""} />
                {name}
              </td>
              <td data-label="Views">{views}</td>
              <td data-label="Sales">{sales}</td>
              <td data-label="Total">
                {formatPriceCentsWithCurrencySymbol("usd", totals, { symbolFormat: "short", noCentsIfWhole: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!sortedItems.length ? <div className="input">Nothing yet </div> : null}
    </>
  );
};

export const AnalyticsStatesTable = ({ locationData, selectedProducts, locations: states, caption }: TableData) => {
  const statesData = React.useMemo(() => {
    const { totals, sales, views } = locationData.by_state;
    const tableStatesData = new Map<string, TableEntry>();

    for (const [productId, productTotals] of Object.entries(totals)) {
      if (!selectedProducts.includes(productId)) continue;

      for (const [country, totalsValue] of Object.entries(productTotals)) {
        const salesValue = sales[productId]?.[country],
          viewsValue = views[productId]?.[country];

        if (Array.isArray(totalsValue) && Array.isArray(salesValue) && Array.isArray(viewsValue)) {
          totalsValue.forEach((_val, state) => {
            const title = states[state];
            if (!title) return;
            updateTableRow(
              tableStatesData,
              title,
              totalsValue[state] ?? 0,
              salesValue[state] ?? 0,
              viewsValue[state] ?? 0,
            );
          });
        }
      }
    }
    return [...tableStatesData.values()];
  }, [locationData, selectedProducts]);
  const [stateSort, setStateSort] = React.useState<{ key: keyof TableEntry; direction: "asc" | "desc" }>({
    key: "totals",
    direction: "desc",
  });

  const getStateDefaultDirection = (columnKey: keyof TableEntry): "asc" | "desc" => {
    switch(columnKey) {
      case "name": return "asc";     // State A-Z
      case "views": return "desc";   // Highest views first
      case "sales": return "desc";   // Highest sales first
      case "totals": return "desc";  // Highest revenue first
      default: return "asc";
    }
  };

  const customStateThProps = (key: keyof TableEntry) => ({
    "aria-sort": stateSort?.key === key ? (stateSort.direction === "asc" ? "ascending" : "descending") : "none",
    onClick: () => {
      const isCurrentColumn = stateSort?.key === key;
      const direction = isCurrentColumn
        ? (stateSort.direction === "asc" ? "desc" : "asc")  // Toggle if same column
        : getStateDefaultDirection(key);                     // Use custom default if new column
      setStateSort({ key, direction });
    }
  });

  const sortedStateItems = React.useMemo(() => {
    if (!stateSort) return statesData;

    return [...statesData].sort((a, b) => {
      const aValue = a[stateSort.key];
      const bValue = b[stateSort.key];

      let comparison = 0;
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      } else {
        comparison = (aValue as number) - (bValue as number);
      }

      return stateSort.direction === "asc" ? comparison : -comparison;
    });
  }, [statesData, stateSort]);

  return (
    <>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th {...customStateThProps("name")}>State</th>
            <th {...customStateThProps("views")}>Views</th>
            <th {...customStateThProps("sales")}>Sales</th>
            <th {...customStateThProps("totals")}>Total</th>
          </tr>
        </thead>
        <tbody>
          {sortedStateItems.map(({ name, totals, sales, views }) => (
            <tr key={name}>
              <td data-label="State">{name}</td>
              <td data-label="Views">{views}</td>
              <td data-label="Sales">{sales}</td>
              <td data-label="Total">
                {formatPriceCentsWithCurrencySymbol("usd", totals, { symbolFormat: "short", noCentsIfWhole: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!sortedStateItems.length ? <div className="input">Nothing yet </div> : null}
    </>
  );
};

export const LocationsTable = ({
  data,
  selectedProducts,
  countryCodes,
  stateNames,
}: {
  data: AnalyticsDataByState;
  selectedProducts: string[];
  countryCodes: Record<string, string>;
  stateNames: Record<string, string>;
}) => {
  const [selected, setSelected] = React.useState("world");

  const caption = (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      Locations
      <select
        aria-label="Locations"
        style={{ width: "fit-content" }}
        value={selected}
        onChange={(ev) => setSelected(ev.target.value)}
      >
        <option value="world">World</option>
        <option value="us">United States</option>
      </select>
    </div>
  );

  return (
    <section>
      {selected === "world" ? (
        <AnalyticsCountriesTable
          locationData={data}
          selectedProducts={selectedProducts}
          locations={countryCodes}
          caption={caption}
        />
      ) : (
        <AnalyticsStatesTable
          locationData={data}
          selectedProducts={selectedProducts}
          locations={stateNames}
          caption={caption}
        />
      )}
    </section>
  );
};
