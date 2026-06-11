// TIN
export const TIN_LABELS = [
  'VAT REG TIN',
  'VATREGTIN',
  'VAT Reg TIN',
  'VAT Reg. TIN',
  'VAT REG. TIN',
  'TIN',
];

// Receipt # / Invoice Number
export const RECEIPT_NUMBER_LABELS = [
  // Official Receipt variants
  'OFFICIAL RECEIPT NO',
  'OFFICIAL RECEIPT NUMBER',
  'OFFICIAL RECEIPT #',
  'OR NO',
  'OR #',
  // Invoice variants
  'INVOICE NO',
  'INVOICE NO.',
  'INVOICE #',
  'INVOICE NUMBER',
  // Sales Invoice variants
  'SALES INVOICE NO',
  'SALES INVOICE NO.',
  'SALES INVOICE #',
  'SALES INVOICE NUMBER',
  'SI NO',
  'SI NO.',
  'SI #',
  'SI No',
  'SI No.',
  'SI No :',
  'SI No. :',
  // Generic
  'RECEIPT NO',
  'RECEIPT NUMBER',
  'RECEIPT #',
  'TRANSACTION NO',
];

// VATable Sales
export const VATABLE_LABELS = [
  'VATABLE SALES',
  'VATABLE SALE',
  'VATABLES',
  'VATABLE',
  'VATable Sales',
  'VATable SALES',
  // OCR misreads
  'UATABLE SALES',
  'VATABLE SAIES',
  'VATABLE SALE5',
  'VATABLES SALES',
];

// VAT Amount
export const VAT_AMOUNT_LABELS = [
  'VAT AMOUNT',
  'VAT Amount',
  'VAT AMT',
  'VAT Amt',
  'OUTPUT TAX',
  '12% VAT',
  // Underscore / space variants (OCR sometimes renders spaces as underscores)
  'VAT_AMOUNT',
  'VAT_Amount',
  'VAT _AMOUNT',
  'VAT _Amount',
  'VAT_AMT',
  'VAT_Amt',
  'VAT _AMT',
  'VAT _Amt',
  // OCR misreads
  'UAT AMOUNT',
  'VAT ANOUNT',
  'UAT ANOUNT',
  'VAT AM0UNT',
  'VAT_ANT',
  'VAT_Ant',
  'VAT _ANT',
  'VAT _Ant',
  '12% UAT',
];

// Zero-Rated Sales
export const ZERO_RATED_LABELS = [
  'ZERO RATED SALES',
  'Zero Rated Sales',
  'ZERO-RATED SALES',
  'Zero-Rated Sales',
  'ZERO_RATED SALES',
  'Zero_Rated Sales',
  // OCR misreads ("HATED" is a common Tesseract misread of "RATED")
  'ZERO HATED SALES',
  'Zero Hated Sales',
  'ZERO HATED',
  'Zero Hated',
  'ZER0 RATED SALES',
  'ZERO RATEO SALES',
  'ZERO RATFD SALES',
];

// VAT-Exempt Sales
export const VAT_EXEMPT_LABELS = [
  'VAT EXEMPT SALES',
  'VAT Exempt Sales',
  'VAT-EXEMPT SALES',
  'VAT EXEMPT SALE',
  'EXEMPT SALES',
  // OCR misreads
  'UAT EXEMPT SALES',
  'VAT EXENPT SALES',
  'VAT EXEMPI SALES',
];

// Actual / Total Amount
export const TOTAL_AMOUNT_LABELS = [
  'TOTAL AMOUNT',
  'TOTAL',
  'Total',
  'AMOUNT DUE',
  'Amount Due',
  'GRAND TOTAL',
  'Grand Total',
  'SALES',
  'Sales',
  'NET AMOUNT',
  'Net Amount',
];

// Philippines city / municipality keywords
// Used to extract the city component from an address line.
// Add any city/municipality you need coverage for.
export const PH_CITY_KEYWORDS = [
  'Caloocan','Las Piñas','Las Pinas','Makati','Malabon','Mandaluyong','Manila','Marikina','Muntinlupa','Navotas',
  'Parañaque','Paranaque','Pasay','Pasig','Quezon City','San Juan','Taguig','Valenzuela','Tabuk','Baguio','Batac',
  'Laoag','Candon','Vigan','San Fernando','Alaminos','Dagupan','San Carlos','Urdaneta','Tuguegarao','Cauayan','Ilagan',
  'Santiago','Balanga','Baliwag','Malolos','Meycauayan','San Jose Del Monte','Cabanatuan','Gapan','Science City of Muñoz','Science City of Munoz',
  'Palayan','San Jose','Mabalacat','San Fernando','Tarlac','Angeles','Olongapo','Batangas','Calaca','Lipa','Sto. Tomas',
  'Tanauan','Bacoor','Carmona','Cavite','Dasmariñas','Dasmarinas','General Trias','Imus','Tagaytay','Trece Martires','Biñan','Binan','Cabuyao',
  'Calamba','San Pablo','San Pedro','Santa Rosa','Tayabas','Antipolo','Lucena','Calapan','Puerto Princesa','Legazpi','Ligao',
  'Tabaco','Iriga','Naga','Masbate','Sorsogon','Roxas','Passi','Iloilo','Bago','Cadiz','Escalante','Himamaylan','Kabankalan',
  'La Carlota','Sagay','San Carlos','Silay','Sipalay','Talisay','Victorias','Bais','Bayawan','Canlaon','Dumaguete','Guihulngan',
  'Tanjay','Bacolod','Tagbilaran','Bogo','Carcar','Danao','Naga','Talisay','Toledo','Cebu','Lapu-Lapu','Mandaue','Borongan',
  'Baybay','Ormoc','Calbayog','Catbalogan','Maasin','Tacloban','Dapitan','Dipolog','Pagadian','Zamboanga','Isabela','Malaybalay',
  'Valencia','Oroquieta','Ozamiz','Tangub','El Salvador','Gingoog','Cagayan De Oro','Iligan','Panabo','Island Garden City of Samal',
  'Tagum','Digos','Mati','Davao','Kidapawan','Koronadal','Tacurong','General Santos','Cabadbaran','Bayugan','Surigao','Bislig',
  'Tandag','Butuan','Lamitan','Marawi','Cotabato'
];

// Address structural signals
// A line matches as an address if it contains at least one of these patterns.
export const ADDRESS_SIGNALS = [
  /\b(st|ave|blvd|road|rd|cor|corner|brgy|barangay|city|street|bldg|floor|unit|bgy|district|national\s+capital)\b/i,
  /\bph\b|\bphilippines\b/i,
];