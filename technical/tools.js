const fillMALine = (ma, length) => {
  const len = ma.length;
  const nullLength = length - len;
  if(nullLength > 0) {
    const fullMa = Array(nullLength).fill(null).concat(ma);
    return fullMa;
  } else {
    return ma.slice(-length);
  }
};

module.exports = {
  fillMALine
}
