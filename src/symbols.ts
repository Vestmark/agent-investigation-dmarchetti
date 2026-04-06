import { getUniqueSymbols, addSymbolToDb, removeSymbolHoldings } from "./db.js";

export async function loadSymbols(): Promise<string[]> {
  return getUniqueSymbols();
}

export async function addSymbol(symbol: string): Promise<string[]> {
  const upper = symbol.toUpperCase();
  await addSymbolToDb(upper);
  return loadSymbols();
}

export async function removeSymbol(symbol: string): Promise<string[]> {
  const upper = symbol.toUpperCase();
  await removeSymbolHoldings(upper);
  return loadSymbols();
}
