// The Yuzhong peninsula as two ASCII layers of 20 m tiles (70 x 35): x east = column x 20 m, z south = row x 20 m.
// Authored by hand; the generator in src/world/city/ turns each tile into ground, streets, stairs and buildings.
//
// Tile types:
//   ~ river          b riverbank road / dock      . street or plaza      = main road
//   s stair street   # residential block          T tower block (CBD)   h traditional low-rise (Shibati)
//   X set piece      p hillside / park            W border wall
// Ground level: index in LEVELS x 2 m (0 = river, 3 = 6 m bank, m = 44 m ridge).

export const LEVELS = '0123456789abcdefghijklmnopqrstuvwxyz';
export const TILE = 20;
export const MAP_W = 70, MAP_H = 35;

export const TYPES = [
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  'bbbbbbbbbbbb~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  'ppW=========bbbbbbbbbbb~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  'ppW#####.###===========bbbbbbbbbbb~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  'ppW#####.###########.##===========bbbbbbbbbbb~~~~~~~~~~~~~~~~~~~~~~~~~',
  'ppW#####.###########.##########T.T=========XXbbbbbbbbbbb~~~~~~~~~~~~~~',
  'ppW#####.###########.##########T.TTTTTTTXXXXXXXX========bbbbbbbbbb~~~~',
  'ppW#####.###########.##########XXXTTTTTTXXXXXXXX######.#==========~~~~',
  'ppW#####.###########.##########XXXTTTTTTXXXT.XXX######.######.####~~~~',
  'ppW#####.###########.##########XXXTT....TTTT.T########.#####XXXXX#bb~~',
  'ppW#####.###########.##########T.TTT....TTTT.T########.#####XXXXX#bb~~',
  'ppW=================================....====================XXXXX#bb~~',
  'ppW#####.XXXXXX#####.#.....####T.TTT....TTTT.T########.#####XXXXX#bb~~',
  'ppW#####.XXXXXX###XXX#.....####T.TTTTTTTTTTT.T######XXX#####XXXXX#bb~~',
  'ppW#####.XXXXXX###XXX#.....#XXXT.TXXXTTTTTTT.T######XXX######.####bb~~',
  'ppW#####.XXXXXX#####.##s####XXXT.TXXXTTTTTTT.T######XXX######.####bb~~',
  'ppW#####.XXXXXX#####.hhshhhhXXXT.TXXXTTTTTTT.T########.######.####bb~~',
  'ppW#####.XXXXXX#####.hhshhhh####.###########.#########.######.####bb~~',
  'ppW#####.###########.hhshhhh####.###########.#########.######.####~~~~',
  'ppW#####.###########.hhshhhh####.###########.#########XXX####.####~~~~',
  'ppW#####.###########.hhshhhh####.###########.#XXX#####XXX#========~~~~',
  'ppW#####.###########.hhshhhh####.###########.#XXXXX=======bbbbbbbb~~~~',
  'ppW#####.###########.hhshhhh####.######=========bbbbbbbbbb~~~~~~~~~~~~',
  'ppW#####.###########.hhshhhh#==========bbbbbbbbb~~~~~~~~~~~~~~~~~~~~~~',
  'ppW#####.###########===s=====bbbbbbbbbb~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  'ppW#####.#==========bbbbbbbbb~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  'ppW=======bbbbbbbbbb~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  'bbbbbbbbbb~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
];

export const HEIGHTS = [
  '0000000000000000000000000000000000000000000000000000000000000000000000',
  '0000000000000000000000000000000000000000000000000000000000000000000000',
  '0000000000000000000000000000000000000000000000000000000000000000000000',
  '0000000000000000000000000000000000000000000000000000000000000000000000',
  '0000000000000000000000000000000000000000000000000000000000000000000000',
  '3333333333330000000000000000000000000000000000000000000000000000000000',
  '8888888888883333333333300000000000000000000000000000000000000000000000',
  'cccccccccccc8888888888833333333333000000000000000000000000000000000000',
  'hhhhhhhhhhhhccccccccccc88888888888333333333330000000000000000000000000',
  'llllllllllllhhhhhhhhhhhccccccccccc888888899993333333333300000000000000',
  'nnnnnnnnnnnnlllllllllllhhhhhhhhhhhccccccceeee9999888888833333333330000',
  'nnnnnnnnnnnnnnnnmmmmmmmlllllllllllhhhhhhhkkkkeeeeccccccc88888888880000',
  'nnnnnnnnnnnnnnnnmmmmmmmmmmmmmmmmmmlllllllmmmmkkkkhhhhhhhcccccccccc0000',
  'nnnnnnnnnnnnnnnnmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlllllllhhhhhhfedc3300',
  'nnnnnnnnnnnnnnnnmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmllkjihfedc3300',
  'nnnnnnnnnnnnnnnnmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlkjihfedc3300',
  'nnnnnnnnnnnnnnnnmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlkjihfedc3300',
  'nnnnnnnnnnnnnnnnmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlkjihfedc3300',
  'nnnnnnnnnnnnnnnnmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlllllllllljjihfedc3300',
  'nnnnnnnnnnnnnnnnmmmmmmmmmmmmmmmmmmmmmmmllllllllljjjjjjjjjjhhhhfedc3300',
  'nnnnnnnnnnnnnnnnmmmmmmmmmmmmmlllllllllljjjjjjjjjhhhhhhhhhhfffffedc3300',
  'nnnnnnnnnnnnnnnnmmmmllllllllljjjjjjjjjjhhhhhhhhhffffffffffcccccccc3300',
  'nnnnnnnnnnlllllllllljjjjjjjjjhhhhhhhhhhfffffffffccccccccccaaaaaaaa0000',
  'lllllllllljjjjjjjjjjhhhhhhhhhffffffffffcccccccccaaaaaaaaaa888888880000',
  'jjjjjjjjjjhhhhhhhhhhfffffffffccccccccccaaaaaaaaa8888888888555555550000',
  'hhhhhhhhhhffffffffffcccccccccaaaaaaaaaa8888888885555555555333333330000',
  'ffffffffffccccccccccaaaaaaaaa88888888885555555553333333333000000000000',
  'ccccccccccaaaaaaaaaa88888888855555555553333333330000000000000000000000',
  'aaaaaaaaaa888888888855555555533333333330000000000000000000000000000000',
  '8888888888555555555533333333300000000000000000000000000000000000000000',
  '5555555555333333333300000000000000000000000000000000000000000000000000',
  '3333333333000000000000000000000000000000000000000000000000000000000000',
  '0000000000000000000000000000000000000000000000000000000000000000000000',
  '0000000000000000000000000000000000000000000000000000000000000000000000',
  '0000000000000000000000000000000000000000000000000000000000000000000000',
];

/** Districts by tile rectangle [c0, r0, c1, r1] (inclusive); the first match wins. */
export const DISTRICTS: { id: string; zh: string; en: string; box: [number, number, number, number] }[] = [
  { id: 'shibati', zh: '十八梯', en: 'Shibati', box: [19, 19, 28, 30] },
  { id: 'jiaochangkou', zh: '较场口', en: 'Jiaochangkou', box: [16, 14, 31, 18] },
  { id: 'site', zh: '工地', en: 'Construction site', box: [8, 15, 15, 22] },
  { id: 'hongyadong', zh: '洪崖洞', en: 'Hongyadong', box: [41, 6, 48, 10] },
  { id: 'jiefangbei', zh: '解放碑', en: 'Jiefangbei', box: [30, 8, 45, 21] },
  { id: 'xinhua', zh: '新华路', en: 'Xinhua Road', box: [44, 21, 53, 29] },
  { id: 'xiaoshizi', zh: '小什字', en: 'Xiaoshizi', box: [49, 14, 56, 20] },
  { id: 'chaotianmen', zh: '朝天门', en: 'Chaotianmen', box: [57, 8, 69, 23] },
  { id: 'border', zh: '鹅岭边界', en: 'Eling border', box: [0, 0, 3, 34] },
  { id: 'west', zh: '上清寺', en: 'Shangqingsi', box: [0, 0, 18, 34] },
  { id: 'south', zh: '储奇门', en: 'Chuqimen', box: [28, 20, 44, 34] },
];
