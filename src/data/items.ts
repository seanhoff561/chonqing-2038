// Every item in the game (DESIGN section 8). Sizes are backpack cells (w x h); weights in kg.
export type ItemCat = 'food' | 'drink' | 'tool' | 'weapon' | 'ammo' | 'med' | 'part' | 'key' | 'wear' | 'throw' | 'device' | 'misc';

export interface FoodInfo { satiety: number; hydration: number; energy?: number; shelfDays: number; raw?: number; dirty?: number }

export interface ItemDef {
  id: string; zh: string; en: string; w: number; h: number; kg: number; cat: ItemCat;
  stack?: number; desc: string; uses?: string[]; food?: FoodInfo;
}

const I = (id: string, zh: string, en: string, w: number, h: number, kg: number, cat: ItemCat, desc: string, extra: Partial<ItemDef> = {}): ItemDef =>
  ({ id, zh, en, w, h, kg, cat, desc, ...extra });
const F = (id: string, zh: string, en: string, w: number, h: number, kg: number, food: FoodInfo, desc: string) =>
  I(id, zh, en, w, h, kg, food.hydration > food.satiety ? 'drink' : 'food', desc, { food });

export const items: ItemDef[] = [
  // Food and drink: satiety/hydration points (100 = a full day), shelf life in days.
  F('noodles', '方便面', 'Instant noodles', 1, 1, 0.12, { satiety: 18, hydration: -2, shelfDays: 180 }, 'Spicy beef flavour. Edible dry.'),
  F('luncheon', '午餐肉罐头', 'Luncheon meat', 1, 1, 0.34, { satiety: 40, hydration: -4, shelfDays: 1000 }, 'Tinned pork. Keeps for years.'),
  F('zhacai', '涪陵榨菜', 'Zhacai pickles', 1, 1, 0.08, { satiety: 3, hydration: -3, shelfDays: 365 }, 'Fuling pickled mustard root. Salty.'),
  F('chocolate', '巧克力', 'Chocolate bar', 1, 1, 0.1, { satiety: 22, hydration: 0, energy: 4, shelfDays: 300 }, 'Dense calories.'),
  F('crackers', '米饼', 'Rice crackers', 2, 1, 0.15, { satiety: 24, hydration: -2, shelfDays: 120 }, 'Light and dry.'),
  F('sausage', '腊肠', 'Cured sausage', 1, 2, 0.25, { satiety: 35, hydration: -5, shelfDays: 60 }, 'Smoked, salted Sichuan sausage.'),
  F('energy', '红牛', 'Energy drink', 1, 1, 0.27, { satiety: 4, hydration: 10, energy: 10, shelfDays: 365 }, 'Sugar and caffeine.'),
  F('bread', '面包', 'Bread loaf', 1, 2, 0.4, { satiety: 30, hydration: -2, shelfDays: 3 }, 'Goes stale, then mouldy.'),
  F('zongzi', '粽子', 'Zongzi', 1, 1, 0.2, { satiety: 16, hydration: 0, shelfDays: 3 }, 'Sticky rice in leaves.'),
  F('buns', '馒头', 'Steamed buns', 1, 1, 0.2, { satiety: 12, hydration: 0, shelfDays: 2 }, 'Plain wheat buns.'),
  F('teaeggs', '茶叶蛋', 'Tea eggs', 1, 1, 0.12, { satiety: 7, hydration: 0, shelfDays: 2 }, 'Marbled eggs in soy and tea.'),
  F('peaches', '桃子', 'Peaches', 1, 1, 0.3, { satiety: 5, hydration: 8, shelfDays: 2 }, 'Ripe. They bruise fast.'),
  F('pork', '生猪肉', 'Raw pork', 2, 1, 0.5, { satiety: 30, hydration: 0, shelfDays: 1, raw: 0.7 }, 'Raw. Risky without a stove.'),
  F('water', '矿泉水', 'Water bottle', 1, 2, 0.5, { satiety: 0, hydration: 20, shelfDays: 1000 }, '500 ml. Refillable.'),
  F('riverwater', '江水', 'River water', 1, 2, 0.5, { satiety: 0, hydration: 20, shelfDays: 1000, dirty: 0.5 }, 'Unsafe until purified.'),
  I('bottle', '空瓶', 'Empty bottle', 1, 2, 0.02, 'misc', 'Fill it at a tap or the river.', { uses: ['fill', 'throw-noise'] }),
  I('tablets', '净水片', 'Purification tablets', 1, 1, 0.02, 'med', 'One tablet treats a bottle of river water.', { stack: 10, uses: ['purify'] }),

  // Medical.
  I('bandage', '绷带', 'Bandage', 1, 1, 0.05, 'med', 'Stops light bleeding.', { stack: 4, uses: ['stop-light-bleed'] }),
  I('tourniquet', '止血带', 'Tourniquet', 1, 1, 0.1, 'med', 'Stops heavy bleeding from a limb.', { uses: ['stop-heavy-bleed'] }),
  I('splint', '夹板', 'Splint', 1, 3, 0.4, 'med', 'Immobilises a broken limb.', { uses: ['splint'] }),
  I('painkillers', '止痛药', 'Painkillers', 1, 1, 0.05, 'med', 'Hides a sprain for four hours.', { stack: 6, uses: ['painkill'] }),
  I('firstaid', '急救包', 'First-aid kit', 2, 2, 0.8, 'med', 'Stops all bleeding and restores 30 health.', { uses: ['first-aid'] }),
  I('mylar', '急救毯', 'Mylar blanket', 1, 1, 0.1, 'wear', 'Hides body heat from thermal sensors.', { uses: ['beat-thermal', 'warm-up'] }),

  // Tools.
  I('grapple', '抓钩', 'Grappling hook', 2, 2, 1.5, 'tool', 'Hook and 20 m of rope.', { uses: ['climb-grapple', 'rappel', 'pull-down'] }),
  I('ladder', '伸缩梯', 'Telescoping ladder', 1, 4, 7, 'tool', 'Extends to 4 m.', { uses: ['ladder-wall', 'ladder-bridge', 'drop-noise'] }),
  I('crowbar', '撬棍', 'Crowbar', 1, 3, 1.8, 'tool', 'Prise doors, shutters, vents and crates.', { uses: ['pry', 'melee', 'scooter-battery'] }),
  I('lockpick', '开锁工具', 'Lockpick set', 1, 1, 0.1, 'tool', 'Opens bad locks only.', { uses: ['pick-lock', 'pick-padlock'] }),
  I('picks', '发夹撬锁', 'Improvised lockpick', 1, 1, 0.02, 'tool', 'Bent hairpins. Three uses.', { stack: 3, uses: ['pick-lock', 'pick-padlock'] }),
  I('boltcutters', '断线钳', 'Bolt cutters', 1, 3, 2.5, 'tool', 'Cut chains, padlocks, fences, grates and cables.', { uses: ['cut-chain', 'cut-fence', 'cut-cable'] }),
  I('rope', '绳索', 'Rope and carabiners', 2, 2, 2, 'tool', '20 m static rope.', { uses: ['rappel', 'fixed-line', 'trolley-part'] }),
  I('gloves', '攀爬手套', 'Climbing gloves', 1, 1, 0.2, 'wear', 'Better grip: hanging and pipes cost half.', { uses: ['grip', 'protect-hands'] }),
  I('insgloves', '绝缘手套', 'Insulated gloves', 1, 1, 0.4, 'wear', 'Rated for live electrical work.', { uses: ['insulate', 'grip'] }),
  I('headlamp', '头灯', 'Headlamp', 1, 1, 0.1, 'wear', 'White or dim red light.', { uses: ['light', 'read-dark'] }),
  I('binoculars', '望远镜', 'Binoculars', 2, 1, 0.6, 'tool', '10x. Anna logs what you watch.', { uses: ['zoom', 'patrol-log'] }),
  I('sdr', 'SDR 接收器', 'SDR dongle', 1, 1, 0.05, 'device', 'Software radio receiver.', { uses: ['drone-routes', 'find-tag', 'jammer-part'] }),
  I('cameratap', '摄像头分接器', 'Camera tap', 1, 1, 0.1, 'device', 'Clips into a camera junction box.', { uses: ['camera-feed', 'camera-loop'] }),
  I('dronectl', '无人机遥控', 'Drone controller', 2, 2, 0.8, 'device', 'Flies a salvaged drone.', { uses: ['fly-drone', 'aerial-map'] }),
  I('drone', '缴获无人机', 'Salvaged drone', 2, 2, 1.6, 'device', 'A patrol drone with a new radio.', { uses: ['fly-drone', 'aerial-map'] }),
  I('jammer', '信号干扰器', 'Signal jammer', 2, 2, 1.2, 'device', 'Cuts the machines\' link within 25 m.', { uses: ['jam', 'blind-sensors'] }),
  I('emp', '电磁脉冲装置', 'EMP device', 2, 2, 1.8, 'device', 'Three charges. Short range.', { uses: ['emp-blast', 'emp-trap'] }),
  I('cloner', '门卡复制器', 'Keycard cloner', 1, 1, 0.2, 'device', 'Copies RFID cards.', { uses: ['clone-card', 'read-badge'] }),
  I('canif', 'CAN 接口', 'CAN interface', 1, 1, 0.1, 'device', 'Talks to vehicle and boat controllers.', { uses: ['hotwire', 'read-ecu'] }),
  I('grinder', '角磨机', 'Angle grinder', 2, 2, 2.5, 'tool', 'Cuts steel. Very loud. Needs a battery pack.', { uses: ['cut-bolt', 'cut-bars'] }),
  I('extinguisher', '灭火器', 'Fire extinguisher', 1, 2, 4, 'throw', 'Powder cloud that blocks sight and heat.', { uses: ['smoke', 'put-out-fire'] }),
  I('trolley', '滑索滑车', 'Haul-rope trolley', 2, 2, 2.2, 'tool', 'Pulley, carabiners and harness.', { uses: ['ride-haul-rope', 'zipline'] }),
  I('oxygen', '氧气瓶', 'Oxygen kit', 2, 3, 5, 'tool', '90 s of air underwater.', { uses: ['breathe-underwater', 'breathe-gas'] }),
  I('jerrycan', '柴油桶', 'Diesel jerrycan', 2, 3, 18, 'misc', '20 litres of diesel.', { uses: ['boat-fuel', 'generator-fuel'] }),
  I('carbattery', '汽车电瓶', 'Car battery', 2, 2, 15, 'part', '12 V lead-acid.', { uses: ['shelter-power', 'boat-battery'] }),
  I('inverter', '逆变器', 'Inverter', 2, 1, 1.5, 'part', '12 V to 220 V.', { uses: ['shelter-power'] }),
  I('solar', '太阳能充电器', 'Solar charger', 2, 2, 2, 'part', 'Trickle-charges a battery.', { uses: ['shelter-power'] }),
  I('nailgun', '射钉枪', 'Nail gun', 2, 2, 2.5, 'weapon', 'Quiet, short range.', { uses: ['shoot-quiet', 'pin-door'] }),

  // Weapons and throwables.
  I('knife', '小刀', 'Knife', 1, 2, 0.2, 'weapon', 'Melee and takedowns.', { uses: ['melee', 'takedown', 'cut-rope'] }),
  I('pistol', 'QSZ-92 手枪', 'QSZ-92 pistol', 2, 2, 0.8, 'weapon', 'Police sidearm. Loud.', { uses: ['shoot', 'shoot-sensor'] }),
  I('mag9', '9mm 弹匣', '9mm magazine', 1, 1, 0.3, 'ammo', '15 rounds.', { stack: 3 }),
  I('shotgun', '霰弹枪', 'Pump shotgun', 1, 4, 3.2, 'weapon', 'Close range. Very loud.', { uses: ['shoot', 'breach-lock'] }),
  I('shells', '霰弹', 'Shotgun shells', 1, 1, 0.25, 'ammo', 'Five shells.', { stack: 4 }),
  I('nails', '钉排', 'Nail strip', 1, 1, 0.2, 'ammo', '30 nails.', { stack: 4 }),
  I('grenade', '手榴弹', 'Grenade', 1, 1, 0.4, 'throw', 'Breaches weak doors. Very loud.', { uses: ['breach', 'damage-robots', 'decoy'] }),
  I('firecrackers', '鞭炮', 'Firecrackers', 1, 2, 0.3, 'throw', 'A long string. Loud for a while.', { uses: ['decoy', 'scare-delivery'] }),
  I('breach', '破拆炸药', 'Breaching charge', 1, 1, 1, 'throw', 'Construction blasting charge.', { uses: ['breach', 'blast-door'] }),

  // Parts.
  I('battpack', '电池组', 'Battery pack', 2, 1, 2, 'part', 'Lithium cells from a scooter.', { uses: ['power-device'] }),
  I('scootercells', '电动车电芯', 'Scooter cells', 2, 1, 1.8, 'part', 'Loose 18650 cells.'),
  I('board', '电路板', 'Circuit board', 1, 1, 0.1, 'part', 'A general-purpose controller board.'),
  I('rfamp', '射频功放', 'RF amplifier', 1, 1, 0.3, 'part', 'Broadband power amplifier.'),
  I('capbank', '电容组', 'Capacitor bank', 2, 1, 0.8, 'part', 'From a defibrillator.'),
  I('coil', '铜线圈', 'Copper coil', 1, 1, 0.6, 'part', 'Heavy-gauge winding.'),
  I('trigger', '触发开关', 'Trigger switch', 1, 1, 0.05, 'part', 'A heavy-duty momentary switch.'),
  I('cable', '数据线', 'Data cable', 1, 1, 0.05, 'part', 'Patch cable.'),
  I('clips', '鳄鱼夹', 'Clip leads', 1, 1, 0.05, 'part', 'Test leads.'),
  I('radiomod', '无人机电台', 'Drone radio module', 1, 1, 0.1, 'part', 'Salvaged from a drone.'),
  I('cammod', '摄像模组', 'Camera module', 1, 1, 0.1, 'part', 'Salvaged from a drone or camera.'),
  I('thermalmod', '热成像模组', 'Thermal camera module', 1, 1, 0.2, 'part', 'Sees heat.'),
  I('rotor', '旋翼', 'Rotor', 1, 1, 0.05, 'part', 'Drone propeller and motor.'),
  I('rfid', 'RFID 读卡器', 'RFID reader', 1, 1, 0.05, 'part', 'Card reader module.'),
  I('servo', '伺服电机', 'Servo', 1, 1, 0.5, 'part', 'From a robot joint.'),
  I('powercell', '动力电池', 'Robot power cell', 2, 1, 3, 'part', 'High-capacity cell from a robot.', { uses: ['power-device'] }),
  I('sensorhead', '传感头', 'Sensor head', 2, 2, 1.2, 'part', 'A robot\'s eyes.'),
  I('armour', '装甲板', 'Armour plate', 2, 2, 4, 'part', 'Composite plate.'),
  I('hook', '钢钩', 'Steel hook', 1, 1, 0.8, 'part', 'A forged hook.'),
  I('pulley', '滑轮组', 'Pulley block', 1, 1, 0.9, 'part', 'From the crane.'),
  I('harness', '安全带', 'Harness', 2, 1, 1.0, 'wear', 'Fall-arrest harness.'),
  I('carabiner', '登山扣', 'Carabiner', 1, 1, 0.06, 'part', 'Steel, locking.', { stack: 4 }),
  I('rods', '钢条', 'Steel rods', 1, 3, 0.6, 'part', 'Two short rods.'),
  I('tape', '胶带', 'Duct tape', 1, 1, 0.15, 'part', 'Fixes most things.', { stack: 3 }),
  I('cloth', '干净布', 'Clean cloth', 1, 1, 0.05, 'part', 'Cotton.', { stack: 4 }),
  I('alcohol', '酒精', 'Rubbing alcohol', 1, 1, 0.2, 'part', 'Disinfectant.'),
  I('hairpins', '发夹', 'Hairpins', 1, 1, 0.01, 'part', 'A few bobby pins.', { stack: 6 }),
  I('solarpanel', '小太阳能板', 'Small solar panel', 2, 2, 1.5, 'part', 'From a rooftop sensor.'),
  I('chargectl', '充电控制器', 'Charge controller', 1, 1, 0.1, 'part', 'Solar charge regulator.'),
  I('hvfuse', '高压熔断器', 'HV fuse cartridge', 1, 2, 1.2, 'part', 'A spare 10 kV fuse.'),
  I('fibretap', '光纤分接器', 'Fibre tap', 1, 1, 0.1, 'part', 'Taps an optical line.'),

  // Keys, cards and documents.
  I('badge', '李国荣的工作证', 'Father\'s work badge', 1, 1, 0.02, 'key', 'Xinhua Road substation. Li Guorong, electrician.'),
  I('boatkey', '水警艇钥匙', 'Patrol boat key', 1, 1, 0.02, 'key', 'River police, boat 3.'),
  I('opkey', '索道操作钥匙', 'Cableway operator key', 1, 1, 0.03, 'key', 'Starts the cabin drive.'),
  I('metrokey', '地铁检修钥匙', 'Metro maintenance key', 1, 1, 0.03, 'key', 'Track doors and service rooms.'),
  I('blastcard', '防护门门卡', 'Blast-door keycard', 1, 1, 0.01, 'key', 'Line 1 protective door.'),
  I('sitecard', '工地门禁卡', 'Site access card', 1, 1, 0.01, 'key', 'Construction site gate.'),
  I('policecard', '警局门禁卡', 'Police access card', 1, 1, 0.01, 'key', 'Police station doors.'),
  I('hospcard', '医院门禁卡', 'Hospital access card', 1, 1, 0.01, 'key', 'Hospital staff doors.'),
  I('netcreds', '网络凭证', 'Network credentials', 1, 1, 0.01, 'key', 'Admin tokens for the exchange.'),
  I('schedule', '检修时刻表', 'Rail-deck schedule', 1, 1, 0.01, 'key', 'Maintenance drone timings on the Line 6 deck.'),
  I('phone', '破手机', 'Cracked phone', 1, 1, 0.15, 'misc', 'His father\'s. One voicemail.'),
  I('hikingpack', '登山包', 'Hiking pack', 3, 3, 1.8, 'wear', 'A bigger backpack (10 x 7).'),
];

export const itemById = new Map(items.map(i => [i.id, i]));
export const item = (id: string): ItemDef => {
  const d = itemById.get(id);
  if (!d) throw new Error(`unknown item ${id}`);
  return d;
};
