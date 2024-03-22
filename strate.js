// 输入参数
const n = 5;
const r = 0.005;
const MULTIPLIER = 100;
const ASSET = 100000;

// 模拟数据
const data = [
  { h: 10, l: 9, c: 9.5 },
  { h: 11, l: 10, c: 10.5 },
  // ...
];

// 初始化变量
let h1, l1, h2, l2, aa, bb, kz, dz, lc1, lc2, hands1, hands2;
let holding = 0;

// 遍历数据
for (let i = 1; i < data.length; i++) {
  const prev = data[i - 1];
  const curr = data[i];

  // 确定突破和回撤的价格点
  h1 = curr.l < prev.l ? Math.max(curr.h, prev.h) : 0;
  l1 = curr.h > prev.h ? Math.min(curr.l, prev.l) : 0;

  // 记录突破和回撤价格点
  h2 = h1 > 0 ? h1 : h2;
  l2 = l1 > 0 ? l1 : l2;

  // 记录上一周期的突破和回撤价格点
  aa = h2;
  bb = l2;

  // 确定本周期的突破和回撤价格点
  kz = curr.h > aa ? aa : h2;
  dz = curr.l < bb ? bb : l2;

  // 计算手数
  lc1 = (curr.c - dz) * MULTIPLIER;
  lc2 = (kz - curr.c) * MULTIPLIER;
  hands1 = (ASSET * r) / lc1;
  hands2 = (ASSET * r) / lc2;

  // 判断交易条件
  const openLong = isEvery(data.slice(i - n + 1, i + 1), (d) => d.c > kz && d.c > dz);
  const openShort = isEvery(data.slice(i - n + 1, i + 1), (d) => d.c < kz && d.c < dz);
  const closeLong = curr.c < dz;
  const closeShort = curr.c > kz;

  // 执行交易
  if (closeLong && holding > 0) {
    holding = 0;
  }
  if (closeShort && holding < 0) {
    holding = 0;
  }
  if (openLong && holding === 0) {
    holding = hands1;
  }
  if (openShort && holding === 0) {
    holding = -hands2;
  }
}

// 辅助函数：判断数组中的每个元素是否满足条件
function isEvery(arr, condition) {
  return arr.every(condition);
}