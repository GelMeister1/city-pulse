// The app's one security gate: only index.html itself (any query or hash) counts as our page.
// file: URLs have origin "null", so compare the URL with its query and hash cut off.
module.exports = index => url => { try { const u = new URL(url); return u.protocol === 'file:' && u.href.split(/[?#]/)[0] === index; } catch { return false; } };
