function convertarray(a) {
  return (Array.isArray(a) ? a : [a]).filter(Boolean);
}

module.exports = { convertarray };
