export const displayQuantity = (q: number | null | undefined): string => {
  if (q === null || q === undefined) return "0";
  // If the number is extremely close to zero (e.g. 0.0000001 or -0.0000001), treat it as 0.
  if (Math.abs(q) < 0.001) return "0";
  
  // Format to a maximum of 3 decimal places without trailing zeros
  return parseFloat(q.toFixed(3)).toString();
};
