import { mergeAllPetsWithLore } from '../src/loreService.js';
import { initialAwakeningPortrait } from '../src/petAwakeningView.js';
import { playInvitationCharacter } from '../src/encounterCeremony.js';
import { invitationEntry, reencounterMoment, renderInvitationScreen, intimacySummary, createInvitationController, invitationEscape as e } from '../src/invitationPresentation.js';
const [catalog, lore, pools, awakening] = await Promise.all(['pets','pets-lore','pools','pet-awakening'].map((name) => fetch(`../data/${name}.json`).then((response) => response.json())));
const pets = mergeAllPetsWithLore(catalog.pets, lore).map((pet) => initialAwakeningPortrait(pet, awakening));
const byId = (id) => pets.find((pet) => pet.id === id);
const seriesFor = (pet) => pools.pools.find((pool) => pet.poolTags.some((tag) => pool.petFilter.poolTags.includes(tag))) || pools.pools.find((pool) => pool.unlockExpansion?.extraPoolTags.some((tag) => pet.poolTags.includes(tag)));
const rows = pets.filter((pet) => ['SSR','UR'].includes(pet.rarity)).map((pet) => { const series = seriesFor(pet); return { pet, seriesId:series.id, seriesName:series.name, owned:pet.id === 'pet_ssr25', available:!['pet_ur06','pet_ssr07'].includes(pet.id), reason:'在永眠花海累積 20 次召喚，開啟晨醒花庭後即可邀請。' }; });
const scenarios = { summon:'A · 召喚入口', duplicate_n:'B · N 再次相遇', duplicate_sr:'C · SR 再次相遇', duplicate_ur:'D · UR 再次相遇', fragments:'碎片取得與接近目標', gallery:'E · 指定邀請畫廊', ssr:'F · SSR 角色預覽', ur:'G · UR 角色預覽', confirm:'H · 邀請確認', ceremony:'I · 邀請儀式', result:'J · 新的同行者', companion:'設為同行夥伴', insufficient:'相遇碎片不足', owned:'已相遇', locked:'故事尚未開啟', migration:'K · 舊玩家轉換', care:'L · 無星級夥伴手記', specialty:'親密度專長承接', interactive:'完整可互動邀請' };
const host = document.getElementById('preview');
document.getElementById('scenario').innerHTML = Object.entries(scenarios).map(([key,label]) => `<option value="${key}">${label}</option>`).join('');
let balance = 242;
const controller = createInvitationController(host, {
  invite:async (id) => { const row = rows.find((row) => row.pet.id === id); if (row.owned) throw new Error('這位夥伴已相遇。'); const cost = row.pet.rarity === 'UR' ? 200 : 100; if (balance < cost) throw new Error('相遇碎片尚不足。'); balance -= cost; row.owned = true; return { balance }; },
  playArrival:async ({ selected, reduceMotion }) => {
    const controls = [...document.querySelectorAll('.preview-controls select')];
    controls.forEach((control) => { control.disabled = true; });
    try { return await playInvitationCharacter(pools.pools, selected, { reduceMotion }); }
    finally { controls.forEach((control) => { control.disabled = false; }); }
  },
  setCompanion:async () => {}, close:() => render(),
});
const receipt = { total:202, items:[{petId:'pet_n01',leftover:0,refund:0,total:0},{petId:'pet_r01',leftover:7,refund:5,total:12},{petId:'pet_sr01',leftover:0,refund:20,total:20},{petId:'pet_ssr01',leftover:17,refund:50,total:67},{petId:'pet_ur01',leftover:3,refund:100,total:103}] };
function render() {
  const scenario = document.getElementById('scenario').value;
  const reduceMotion = document.getElementById('motion').value === 'reduced';
  const model = { route:'gallery', balance:142, rows, selected:rows.find((row) => row.pet.id === 'pet_ur19'), reduceMotion };
  document.body.dataset.theme = document.getElementById('theme').value;
  document.documentElement.dataset.theme = document.body.dataset.theme;
  document.body.dataset.reduceMotion = String(reduceMotion);
  document.documentElement.dataset.fontSize = document.getElementById('font').value;
  host.dataset.direction = document.getElementById('direction').value;
  if (scenario === 'interactive') { balance = 242; controller.open({ ...model, balance }); return; }
  if (['ssr','ur','confirm','ceremony','result','companion','insufficient','owned','locked'].includes(scenario)) {
    model.route = ['confirm','ceremony','result','companion'].includes(scenario) ? scenario === 'companion' ? 'result' : scenario : 'detail';
    model.selected = scenario === 'ssr' ? rows.find((row) => row.pet.id === 'pet_ssr26') : scenario === 'owned' ? rows.find((row) => row.pet.id === 'pet_ssr25') : scenario === 'locked' ? rows.find((row) => row.pet.id === 'pet_ur06') : model.selected;
    model.balance = scenario === 'confirm' ? 242 : ['ceremony','result','companion'].includes(scenario) ? 42 : scenario === 'insufficient' ? 142 : scenario === 'ur' ? 242 : 142;
    model.companionSet = scenario === 'companion';
  }
  if (scenario === 'migration') Object.assign(model, { route:'migration', receipt, names:new Map(pets.map((pet) => [pet.id,pet.name])) });
  balance = model.balance;
  controller.open(model);
  let content = renderInvitationScreen(model);
  if (scenario.startsWith('duplicate_') || scenario === 'fragments') {
    const pet = byId(scenario === 'duplicate_ur' ? 'pet_ur19' : scenario === 'duplicate_sr' ? 'pet_sr30' : 'pet_n01');
    const gain = {N:1,SR:5,UR:20}[pet.rarity];
    content = `<section class="invitation-arrival"><p class="eyebrow">熟悉的身影，再次來到旅途中</p><div class="invitation-arrival-art"><img src="../${pet.imageVariants?.stage || pet.image}" alt=""></div><h2 class="pet-name">${e(pet.name)}</h2><p class="pet-title">${e(pet.title)}</p><span class="rarity">${pet.rarity}</span>${reencounterMoment(pet,gain,scenario === 'fragments' ? 82 : 65)}</section>`;
  }
  if (scenario === 'summon') { const pet = byId('pet_ur19'); content = `<p class="eyebrow">循著星光，等待下一次相遇</p><h1>下一位同行者。</h1><div class="invitation-portrait"><img src="../${pet.imageVariants?.stage || pet.image}" alt=""></div><h2 class="pet-name">${e(pet.name)}</h2><p class="pet-title">${e(pet.title)}</p><div class="invitation-primary-action"><button class="primary">啟動相遇 · 100 星塵</button><button>十連相遇 · 1000 星塵</button></div>${invitationEntry(142)}`; }
  if (scenario === 'care' || scenario === 'specialty') { const pet = byId('pet_n01'); content = `<p class="eyebrow">夥伴手記</p><h1 class="pet-name">${e(pet.name)}</h1><p class="pet-title">${e(pet.title)}</p><img class="preview-care-art" src="../${pet.imageVariants?.stage || pet.image}" alt=""><p>${e(pet.lore)}</p>${intimacySummary(3,{label:'探路',level:scenario === 'specialty' ? 4 : 3},scenario === 'specialty' ? 4 : 1)}<section class="detail-section"><h3>一起走下去</h3><p>親密度、同行故事與覺醒，記下每一段共同旅程。</p><button>閱讀同行故事</button><button>養成與餵食</button></section>`; }
  if (scenario.startsWith('duplicate_') || ['fragments','summon','care','specialty'].includes(scenario)) host.innerHTML = `<div class="invitation-content">${content}</div>`;
}
for (const id of ['scenario','theme','direction','motion','font']) document.getElementById(id).addEventListener('change',render);
const params = new URLSearchParams(location.search);
if (params.get('capture') === '1') { document.querySelector('.preview-controls').style.display = 'none'; document.querySelector('.preview-note').style.display = 'none'; }
for (const id of ['scenario','theme','direction','motion','font']) if (params.has(id)) document.getElementById(id).value = params.get(id);
render();
