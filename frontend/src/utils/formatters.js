export const formatNumber = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const s = String(val);
    const cleaned = s.replace(/,/g, '');
    if (cleaned === '' || cleaned === '-') return cleaned;
    const parts = cleaned.split('.');
    parts[0] = parts[0].replace(/^0+(?=\d)/, '');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? parts[0] + '.' + parts[1] : parts[0];
};

export const sanitizeNumberInput = (v) => {
    let cleaned = String(v || '').replace(/,/g, '');
    // remove any non-digit except dot
    cleaned = cleaned.replace(/[^0-9.]/g, '');
    // keep only the first dot
    const firstDot = cleaned.indexOf('.');
    if (firstDot !== -1) {
        cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
    }
    // if starts with dot, prefix with 0
    if (cleaned.startsWith('.')) cleaned = '0' + cleaned;
    // limit to two decimals
    if (firstDot !== -1) {
        const parts = cleaned.split('.');
        parts[1] = (parts[1] || '').slice(0, 2);
        cleaned = parts[0] + '.' + parts[1];
    }
    return cleaned;
};

export const normalizeDate = (d) => {
    if (!d) return '';
    try {
        const dt = new Date(d);
        if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
    } catch (e) {
        // continue to try regex
    }
    const s = String(d);
    const m = s.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const m2 = s.match(/(\d{4}\/\d{2}\/\d{2})/);
    if (m2) return m2[1].replace(/\//g, '-');
    return '';
};

export const formatLongDate = (d) => {
    if (!d && d !== 0) return '';
    try {
        const dt = new Date(d);
        if (!isNaN(dt.getTime())) return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) { }
    const s = String(d || '');
    const m = s.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) return new Date(m[1]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return s;
};
export const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === '') return '₱0.00';
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
    if (isNaN(num)) return '₱0.00';
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2
    }).format(num);
};

export const formatAmount = (amount) => {
    if (amount === null || amount === undefined || amount === '') return '0.00';
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
    if (isNaN(num)) return '0.00';
    return new Intl.NumberFormat('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
};
