// 默认港口种子数据（母港优先配置）
// type: home=母港, visit=访问港
// 坐标为 WGS-84 经纬度（展示/导出时前端会转换为 GCJ-02 以对齐高德底图）

export const seedPorts = [
  // ============ 母港（国内） ============
  { name: '上海', enName: 'Shanghai', type: 'home', country: '中国', lat: 31.4044, lng: 121.5061, alias: ['吴淞口', 'Shanghai Wusongkou'], remark: '吴淞口国际邮轮港，日韩航线母港' },
  { name: '天津', enName: 'Tianjin', type: 'home', country: '中国', lat: 38.987, lng: 117.824, alias: ['Tianjin', '东疆'], remark: '天津国际邮轮母港（东疆），日韩航线母港' },
  { name: '深圳', enName: 'Shenzhen', type: 'home', country: '中国', lat: 22.4855, lng: 113.914, alias: ['蛇口', 'Shenzhen Shekou'], remark: '蛇口邮轮母港，东南亚航线母港' },
  { name: '香港', enName: 'Hong Kong', type: 'home', country: '中国香港', lat: 22.304, lng: 114.212, alias: ['Hong Kong', '启德', 'HK'], remark: '启德邮轮码头' },
  { name: '厦门', enName: 'Xiamen', type: 'home', country: '中国', lat: 24.4649, lng: 118.0756, alias: ['Xiamen', 'Amoy'], remark: '厦门国际邮轮中心' },
  { name: '三亚', enName: 'Sanya', type: 'home', country: '中国', lat: 18.2435, lng: 109.4975, alias: ['Sanya'], remark: '凤凰岛国际邮轮港' },
  { name: '广州', enName: 'Guangzhou', type: 'home', country: '中国', lat: 22.7644, lng: 113.6142, alias: ['南沙', 'Guangzhou', 'Canton'], remark: '南沙国际邮轮母港' },
  { name: '大连', enName: 'Dalian', type: 'home', country: '中国', lat: 38.9281, lng: 121.6563, alias: ['Dalian'], remark: '大连港国际邮轮中心' },
  { name: '青岛', enName: 'Qingdao', type: 'home', country: '中国', lat: 36.084, lng: 120.33, alias: ['Qingdao', 'Tsingtao'], remark: '青岛邮轮母港' },
  // ============ 母港（海外） ============
  { name: '新加坡', enName: 'Singapore', type: 'home', country: '新加坡', lat: 1.264, lng: 103.849, alias: ['Singapore'], remark: '滨海湾邮轮中心，东南亚航线母港' },
  { name: '东京', enName: 'Tokyo', type: 'home', country: '日本', lat: 35.6169, lng: 139.7703, alias: ['Tokyo', '青海'], remark: '东京国际邮轮码头（青海）' },
  { name: '横滨', enName: 'Yokohama', type: 'home', country: '日本', lat: 35.4515, lng: 139.6505, alias: ['Yokohama', '横滨大栈桥'], remark: '大栈桥国际客船码头' },
  { name: '神户', enName: 'Kobe', type: 'home', country: '日本', lat: 34.6803, lng: 135.1955, alias: ['Kobe'], remark: '神户港中突堤' },
  { name: '釜山', enName: 'Busan', type: 'home', country: '韩国', lat: 35.1055, lng: 129.0405, alias: ['Busan', 'Pusan'], remark: '釜山国际客运码头' },
  { name: '基隆', enName: 'Keelung', type: 'home', country: '中国台湾', lat: 25.1433, lng: 121.7391, alias: ['Keelung'], remark: '基隆港' },
  { name: '高雄', enName: 'Kaohsiung', type: 'home', country: '中国台湾', lat: 22.6148, lng: 120.2971, alias: ['Kaohsiung', 'KHH'], remark: '高雄港' },
  // ============ 访问港（日本） ============
  { name: '福冈', enName: 'Fukuoka', type: 'visit', country: '日本', lat: 33.6081, lng: 130.4004, alias: ['博多', 'Fukuoka', 'Hakata'], remark: '博多港' },
  { name: '长崎', enName: 'Nagasaki', type: 'visit', country: '日本', lat: 32.7441, lng: 129.873, alias: ['Nagasaki'], remark: '长崎港' },
  { name: '那霸', enName: 'Naha', type: 'visit', country: '日本', lat: 26.2122, lng: 127.6794, alias: ['冲绳那霸', '冲绳', 'Naha', 'Okinawa'], remark: '那霸港（冲绳）' },
  { name: '济州', enName: 'Jeju', type: 'visit', country: '韩国', lat: 33.5189, lng: 126.5344, alias: ['济州岛', 'Jeju', 'Cheju'], remark: '济州港' },
  { name: '下关', enName: 'Shimonoseki', type: 'visit', country: '日本', lat: 33.948, lng: 130.94, alias: ['Shimonoseki'], remark: '下关港' },
  { name: '佐世保', enName: 'Sasebo', type: 'visit', country: '日本', lat: 33.1627, lng: 129.7159, alias: ['Sasebo'], remark: '佐世保港' },
  { name: '鹿儿岛', enName: 'Kagoshima', type: 'visit', country: '日本', lat: 31.5964, lng: 130.5622, alias: ['Kagoshima'], remark: '鹿儿岛港' },
  { name: '宫古岛', enName: 'Miyakojima', type: 'visit', country: '日本', lat: 24.8005, lng: 125.2803, alias: ['宫古', 'Miyako', 'Miyakojima'], remark: '平良港' },
  { name: '石垣岛', enName: 'Ishigaki', type: 'visit', country: '日本', lat: 24.3366, lng: 124.154, alias: ['石垣', 'Ishigaki'], remark: '石垣港' },
  { name: '大阪', enName: 'Osaka', type: 'visit', country: '日本', lat: 34.6518, lng: 135.4304, alias: ['Osaka'], remark: '天保山码头' },
  { name: '名古屋', enName: 'Nagoya', type: 'visit', country: '日本', lat: 35.0899, lng: 136.8804, alias: ['Nagoya'], remark: '名古屋港' },
  { name: '广岛', enName: 'Hiroshima', type: 'visit', country: '日本', lat: 34.352, lng: 132.455, alias: ['Hiroshima'], remark: '广岛港' },
  { name: '别府', enName: 'Beppu', type: 'visit', country: '日本', lat: 33.279, lng: 131.505, alias: ['Beppu'], remark: '别府港' },
  // ============ 访问港（韩国 / 远东） ============
  { name: '仁川', enName: 'Incheon', type: 'visit', country: '韩国', lat: 37.4562, lng: 126.6153, alias: ['首尔', 'Incheon', 'Seoul', 'Inchon'], remark: '仁川港（首尔）' },
  { name: '木浦', enName: 'Mokpo', type: 'visit', country: '韩国', lat: 34.785, lng: 126.38, alias: ['Mokpo'], remark: '木浦港' },
  { name: '海参崴', enName: 'Vladivostok', type: 'visit', country: '俄罗斯', lat: 43.11, lng: 131.885, alias: ['符拉迪沃斯托克', 'Vladivostok'], remark: '海参崴港' },
  // ============ 访问港（东南亚） ============
  { name: '马尼拉', enName: 'Manila', type: 'visit', country: '菲律宾', lat: 14.59, lng: 120.977, alias: ['Manila'], remark: '马尼拉港' },
  { name: '苏比克湾', enName: 'Subic Bay', type: 'visit', country: '菲律宾', lat: 14.7991, lng: 120.2651, alias: ['苏比克', 'Subic'], remark: '苏比克湾港' },
  { name: '长滩岛', enName: 'Boracay', type: 'visit', country: '菲律宾', lat: 11.9669, lng: 121.9251, alias: ['长滩', 'Boracay'], remark: '长滩岛' },
  { name: '下龙湾', enName: 'Ha Long', type: 'visit', country: '越南', lat: 20.96, lng: 107.06, alias: ['下龙', 'Halong', 'Ha Long'], remark: '下龙湾' },
  { name: '岘港', enName: 'Da Nang', type: 'visit', country: '越南', lat: 16.0769, lng: 108.2205, alias: ['Danang', 'Da Nang'], remark: '岘港' },
  { name: '芽庄', enName: 'Nha Trang', type: 'visit', country: '越南', lat: 12.238, lng: 109.1966, alias: ['Nha Trang'], remark: '芽庄港' },
  { name: '胡志明市', enName: 'Ho Chi Minh City', type: 'visit', country: '越南', lat: 10.6379, lng: 106.7592, alias: ['胡志明', '西贡', 'Saigon', 'Ho Chi Minh'], remark: '胡志明市港' },
  { name: '普吉岛', enName: 'Phuket', type: 'visit', country: '泰国', lat: 7.881, lng: 98.398, alias: ['普吉', 'Phuket'], remark: '普吉岛' },
  { name: '巴生港', enName: 'Port Klang', type: 'visit', country: '马来西亚', lat: 3.0003, lng: 101.4001, alias: ['吉隆坡', '巴生', 'Port Klang'], remark: '巴生港（吉隆坡）' },
  { name: '林查班', enName: 'Laem Chabang', type: 'visit', country: '泰国', lat: 13.0712, lng: 100.8854, alias: ['曼谷', 'Laem Chabang', 'Bangkok'], remark: '林查班港（曼谷）' },
  { name: '巴厘岛', enName: 'Bali', type: 'visit', country: '印度尼西亚', lat: -8.7421, lng: 115.2122, alias: ['贝诺瓦', 'Benoa', 'Bali'], remark: '贝诺瓦港' },
  // ============ 访问港（台海 / 其他） ============
  { name: '花莲', enName: 'Hualien', type: 'visit', country: '中国台湾', lat: 23.972, lng: 121.611, alias: ['Hualien'], remark: '花莲港' },
  { name: '海口', enName: 'Haikou', type: 'visit', country: '中国', lat: 20.033, lng: 110.28, alias: ['海口港', 'Haikou'], remark: '海口秀英港' },
  // ============ 访问港（远洋航线） ============
  { name: '科伦坡', enName: 'Colombo', type: 'visit', country: '斯里兰卡', lat: 6.933, lng: 79.844, alias: ['Colombo'], remark: '科伦坡港' },
  { name: '马累', enName: 'Malé', type: 'visit', country: '马尔代夫', lat: 4.175, lng: 73.509, alias: ['马尔代夫', 'Male', 'Maldives'], remark: '马累港' },
  { name: '迪拜', enName: 'Dubai', type: 'visit', country: '阿联酋', lat: 25.269, lng: 55.29, alias: ['Dubai'], remark: '拉希德港' },
  { name: '维多利亚', enName: 'Victoria', type: 'visit', country: '塞舌尔', lat: -4.62, lng: 55.45, alias: ['塞舌尔', 'Victoria', 'Seychelles'], remark: '维多利亚港（塞舌尔）' },
  { name: '路易港', enName: 'Port Louis', type: 'visit', country: '毛里求斯', lat: -20.16, lng: 57.498, alias: ['毛里求斯', 'Port Louis', 'Mauritius'], remark: '路易港（毛里求斯）' },
];

// 默认示例航线（母港航线优先）
export const seedItineraries = [
  { name: '上海—海上巡游—上海（3天）', code: '上海-海上巡游-上海' },
  { name: '上海—福冈—长崎—上海（4天）', code: '上海-福冈-长崎-上海' },
  { name: '上海—福冈—长崎—济州—上海（5天）', code: '上海-福冈-长崎-济州-上海' },
  { name: '上海—冲绳那霸—上海（3天）', code: '上海-冲绳那霸-上海' },
  { name: '天津—福冈—长崎—天津（5天）', code: '天津-福冈-长崎-天津' },
  { name: '深圳—香港—马尼拉—深圳（4天）', code: '深圳-香港-马尼拉-深圳' },
  { name: '香港—基隆—高雄—香港（4天）', code: '香港-基隆-高雄-香港' },
  { name: '新加坡—普吉岛—巴生港—新加坡（4天）', code: '新加坡-普吉岛-巴生港-新加坡' },
  { name: '三亚—岘港—三亚（3天）', code: '三亚-岘港-三亚' },
];
