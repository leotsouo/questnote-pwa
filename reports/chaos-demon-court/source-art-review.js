import { getPetImageSrc } from '../../src/imagePreloadService.js';
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function petDisplayName(pet) {
  return pet?.displayName || pet?.name || '';
}


function petOriginalName(pet) {
  return pet?.originalName || pet?.name || '';
}


function petNameBlockHtml(pet, { owned = true, heading = 'h3', className = 'collection-card__name' } = {}) {
  if (!owned) {
    return `<${heading} class="${className}">???</${heading}>`;
  }
  if (pet.nickname) {
    return `
      <${heading} class="${className}">${escapeHtml(petDisplayName(pet))}</${heading}>
      <p class="pet-original-name pet-original-name--sm">原名：${escapeHtml(petOriginalName(pet))}</p>`;
  }
  return `<${heading} class="${className}">${escapeHtml(petDisplayName(pet))}</${heading}>`;
}


function petImageHtml(pet, options = {}) {
  const {
    size = 'md',
    preview = false,
    loading = 'lazy',
    eager = false,
    framed = true,
    imageVariant = size === 'lg' ? 'stage' : 'card',
  } = options;
  const cls = `pet-img pet-img--${size}`;
  const src = getPetImageSrc(pet, imageVariant);
  const originalSrc = pet.fallbackImage || getPetImageSrc(pet);
  const loadAttr = eager || loading === 'eager' ? 'eager' : loading;
  const onload = "this.classList.add('is-loaded');this.closest('.pet-image-frame')?.classList.remove('is-loading')";
  const onerror = "if(this.dataset.originalSrc&&this.src!==new URL(this.dataset.originalSrc,location.href).href){this.src=this.dataset.originalSrc;return;}this.onerror=null;this.classList.add('is-error');var f=this.closest('.pet-image-frame');if(f){f.classList.remove('is-loading');f.classList.add('is-error');}";
  const fallbackAttr = originalSrc ? ` data-original-src="${escapeHtml(originalSrc)}"` : '';
  const placeholder = framed
    ? `<div class="pet-image-frame pet-image-frame--${size} is-error" role="img" aria-label="圖片暫時無法載入"><span class="pet-image-frame__fallback" aria-hidden="true">?</span></div>`
    : `<div class="${cls} pet-img--placeholder"><span>?</span></div>`;

  if (!src) return placeholder;

  if (preview) {
    return `<div class="pet-img-wrap pet-img-wrap--preview pet-img-wrap--${size} pet-image-frame pet-image-frame--${size} is-loading">
      <img class="${cls} pet-img--preview is-loading" src="${escapeHtml(src)}"${fallbackAttr} alt="" loading="${loadAttr}" decoding="async" onload="${onload}" onerror="${onerror}" />
      <span class="pet-image-frame__fallback" aria-hidden="true">圖片載入中</span>
    </div>`;
  }

  if (!framed) {
    const onErrorLegacy = `if(this.dataset.originalSrc&&this.src!==new URL(this.dataset.originalSrc,location.href).href){this.src=this.dataset.originalSrc;return;}this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'${cls} pet-img--placeholder',innerHTML:'<span>?</span>'}))`;
    return `<img class="${cls} is-loading" src="${escapeHtml(src)}"${fallbackAttr} alt="${escapeHtml(petDisplayName(pet))}" loading="${loadAttr}" decoding="async" onload="this.classList.add('is-loaded')" onerror="${onErrorLegacy}" />`;
  }

  return `<div class="pet-image-frame pet-image-frame--${size} is-loading">
    <img class="${cls} is-loading" src="${escapeHtml(src)}"${fallbackAttr} alt="${escapeHtml(petDisplayName(pet))}" loading="${loadAttr}" decoding="async" onload="${onload}" onerror="${onerror}" />
    <span class="pet-image-frame__fallback" aria-hidden="true">圖片載入中</span>
  </div>`;
}


function bondBadgeHtml(pet) {
  const bondLevel = pet?.bondLevel ?? 0;
  if (!pet?.owned || bondLevel < 3) return '';
  if (bondLevel >= 5) {
    return '<span class="bond-badge is-liberated" aria-label="羈絆解放">羈絆解放</span>';
  }
  return `<span class="bond-badge" aria-label="羈絆 Lv.${bondLevel}">羈絆 Lv.${bondLevel}</span>`;
}

/** 顯示羈絆解鎖提示（Lv.5 使用更醒目樣式，皆為輕量 toast，不干擾操作） */

function renderCollectionCard(pet, imageOptions = {}) {
  const { eager = false } = imageOptions;
  const owned = pet.owned;
  const rarityClass = `rarity-${pet.rarity}`;
  const imgOpts = owned
    ? { size: 'md', loading: eager ? 'eager' : 'lazy', eager }
    : { size: 'md', preview: true, loading: 'lazy' };
  const liberated = owned && (pet.bondLevel ?? 0) >= 5;
  const bondBadge = bondBadgeHtml(pet);
  // 已獲得：圖片獨立 button 開原圖；資訊區獨立 button 開詳情（避免巢狀 button）
  const imageBlock = owned
    ? `<button type="button" class="collection-card__image-btn" data-action="view-pet-image" data-pet-id="${pet.id}" aria-label="查看 ${escapeHtml(petDisplayName(pet))} 原圖">
         <div class="collection-card__image">
           ${petImageHtml(pet, imgOpts)}
           ${bondBadge ? `<div class="collection-card__bond-badge">${bondBadge}</div>` : ''}
         </div>
       </button>`
    : `<div class="collection-card__image">
         ${petImageHtml(pet, imgOpts)}
       </div>`;
  return `
    <article class="collection-card ${owned ? '' : 'collection-card--locked'} ${rarityClass} ${liberated ? 'is-bond-liberated' : ''}" data-pet-id="${pet.id}">
      ${owned ? imageBlock : ''}
      <button type="button" class="collection-card__tap" data-action="view-detail" aria-label="查看詳情">
        ${owned ? '' : imageBlock}
        <div class="collection-card__info">
          ${petNameBlockHtml(pet, { owned, heading: 'h3', className: 'collection-card__name' })}
          ${owned && pet.title ? `<p class="collection-card__title">${escapeHtml(pet.title)}</p>` : ''}
          <span class="badge badge--rarity ${rarityClass}">${pet.rarity}</span>
          ${
            owned
              ? `<div class="collection-card__meta"><span class="fragments">親密度 Lv.${pet.bondLevel || 1}</span></div>`
              : '<span class="locked-label">未獲得 · 點擊預覽</span>'
          }
        </div>
      </button>
      ${owned ? '<div class="collection-card__actions">' : ''}
      ${
        owned && !pet.isCompanion
          ? `<button type="button" class="btn btn--sm btn--companion" data-action="set-companion">設為陪伴</button>`
          : owned ? '<span class="collection-card__state">陪伴中</span>' : ''
      }

      ${owned ? '</div>' : ''}
    </article>`;
}


const pets=[{"id":"pet_ur28","name":"黯冠・無晝","rarity":"UR","image":"assets/pets/awakening/pet_ur28-initial-5a28ce020209.png","description":"古龍盤踞黑塔石座，以完整前爪壓住七色星路交會的界石，抬頭令裂冠日環吞光；界石裂出紅黑晶脈，七色星路仍各自保留一線抵抗，塔外階石崩裂。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"黯冠古龍","element":"餘燼／蝕星","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"guardian","presentation":{"revealKey":"chaos_crown","revealCaption":"界石 · 黯冠・無晝"},"owned":true,"form":"initial","imageVariants":{"card":"assets/pets/awakening/pet_ur28-initial-5a28ce020209-card.webp","stage":"assets/pets/awakening/pet_ur28-initial-5a28ce020209-stage.webp"}},{"id":"pet_ur29","name":"裂月・瑟因","rarity":"UR","image":"assets/pets/awakening/pet_ur29-initial-66302377ac10.png","description":"魔鰩以月刃角穿過潮汐上方的月光，展開完整鰭面劃出一道通道；水幕沿角劃開的線停在半空，北境誓火在通道邊緣留下暖色界線。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"裂月魔鰩","element":"裂月霜潮／蝕星","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"scout","presentation":{"revealKey":"chaos_moon","revealCaption":"潮汐門 · 裂月・瑟因"},"owned":true,"form":"initial","imageVariants":{"card":"assets/pets/awakening/pet_ur29-initial-66302377ac10-card.webp","stage":"assets/pets/awakening/pet_ur29-initial-66302377ac10-stage.webp"}},{"id":"pet_ur30","name":"終鐘・維爾","rarity":"UR","image":"assets/pets/awakening/pet_ur30-initial-b8b412a84e4a.png","description":"夢蛾停在懸鐘弓架上，以前足抵住鐘舌，翅紋向花庭夢光展開；靜音波紋在花間凝成透明黑玻璃，仍有一朵暖光花抵住封存。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"終鐘夢蛾","element":"蝕星","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"scholar","presentation":{"revealKey":"chaos_bell","revealCaption":"終鐘 · 終鐘・維爾"},"owned":true,"form":"initial","imageVariants":{"card":"assets/pets/awakening/pet_ur30-initial-b8b412a84e4a-card.webp","stage":"assets/pets/awakening/pet_ur30-initial-b8b412a84e4a-stage.webp"}},{"id":"pet_ssr37","name":"荊誓・洛恩","rarity":"SSR","image":"assets/pets/awakening/pet_ssr37-initial-3f8f8f80b5d8.png","description":"角麒以分枝荊角挑開一卷懸浮誓文上的紅線；山路承諾化成帶刺橋索，红线撕裂處仍有一根金線未斷。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"荊誓角麒","element":"黯棘／餘燼","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"guardian","presentation":{"revealKey":"chaos_thorn","revealCaption":"荊誓線 · 荊誓・洛恩"},"owned":true,"form":"initial","imageVariants":{"card":"assets/pets/awakening/pet_ssr37-initial-3f8f8f80b5d8-card.webp","stage":"assets/pets/awakening/pet_ssr37-initial-3f8f8f80b5d8-stage.webp"}},{"id":"pet_ssr38","name":"鏡宴・奈璃","rarity":"SSR","image":"assets/pets/awakening/pet_ssr38-initial-cd751bb19ef0.png","description":"銀狐以前爪翻動糖晶前的一片裂鏡，回首看向鏡中宴席；鏡宴越華麗，真實糖晶的光越暗，仍有一顆保持暖光。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"鏡宴銀狐","element":"蝕星","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"companion","presentation":{"revealKey":"chaos_mirror","revealCaption":"鏡宴 · 鏡宴・奈璃"},"owned":true,"form":"initial","imageVariants":{"card":"assets/pets/awakening/pet_ssr38-initial-cd751bb19ef0-card.webp","stage":"assets/pets/awakening/pet_ssr38-initial-cd751bb19ef0-stage.webp"}},{"id":"pet_ssr39","name":"灰律・奧鉻","rarity":"SSR","image":"assets/pets/awakening/pet_ssr39-initial-52ab5f0716e2.png","description":"銅鴉用完整雙爪抓住一枚符文齒輪並將其扭停；蒸汽在齒間結成灰晶，遠方獅心爐火仍明亮。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"灰律銅鴉","element":"灰律銅機／餘燼","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"scholar","presentation":{"revealKey":"chaos_law","revealCaption":"律輪 · 灰律・奧鉻"},"owned":true,"form":"initial","imageVariants":{"card":"assets/pets/awakening/pet_ssr39-initial-52ab5f0716e2-card.webp","stage":"assets/pets/awakening/pet_ssr39-initial-52ab5f0716e2-stage.webp"}},{"id":"pet_ssr40","name":"蝕星獄獅","rarity":"SSR","image":"assets/pets/awakening/pet_ssr40-initial-8749b511b29a.png","description":"獄獅前爪踩住通往城門的光链，低頭咆哮；锁鏈被壓成黑晶，城門外碎星沿地面倒流。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"蝕星獄獅","element":"蝕星","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"guardian","presentation":{"revealKey":"chaos_star","revealCaption":"星鏈 · 蝕星獄獅"},"owned":true,"form":"initial","imageVariants":{"card":"assets/pets/awakening/pet_ssr40-initial-8749b511b29a-card.webp","stage":"assets/pets/awakening/pet_ssr40-initial-8749b511b29a-stage.webp"}},{"id":"pet_sr51","name":"燼羽夜鴉","rarity":"SR","image":"reports/chaos-demon-court/images/sr_1-initial-revision-1.png","description":"牠展開完整雙翼掠過信路，攫取路標上的一束光；路標陰影逆轉、遠方仍有紙鳶引路。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"魔獸","element":"餘燼","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"scout","owned":true,"form":"initial"},{"id":"pet_sr52","name":"縛潮玄蛇","rarity":"SR","image":"reports/chaos-demon-court/images/sr_2-initial-revision-1.png","description":"牠盤繞一塊潮汐界石，身軀形成完整波浪曲線；海水沿身體抬起，界石下方留下乾涸通道。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"魔獸","element":"裂月霜潮","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"scout","owned":true,"form":"initial"},{"id":"pet_sr53","name":"斷祈霜狼","rarity":"SR","image":"reports/chaos-demon-court/images/sr_3-initial-original.png","description":"牠踏入北境誓火外圈，抬爪踩碎一片凝霜；冰裂沿地面伸展，橙色誓火保留一條安全線。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"魔獸","element":"裂月霜潮","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"guardian","owned":true,"form":"initial"},{"id":"pet_sr54","name":"噬夢絨蝠","rarity":"SR","image":"reports/chaos-demon-court/images/sr_4-initial-revision-1.png","description":"牠倒懸花庭拱枝，抓住飄過的一段夢光；夢光變成暗色絲卷，一朵花的色彩退去。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"魔獸","element":"蝕星","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"companion","owned":true,"form":"initial"},{"id":"pet_sr55","name":"棘令黑鹿","rarity":"SR","image":"reports/chaos-demon-court/images/sr_5-initial-revision-1.png","description":"牠以荊角抬起倒塌路標並旋向禁行方向；腳下長出刺牆，原路仍在刺牆外發亮。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"魔獸","element":"黯棘","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"gatherer","owned":true,"form":"initial"},{"id":"pet_r57","name":"幽燈影狐","rarity":"R","image":"reports/chaos-demon-court/images/r_1-initial-revision-1.png","description":"牠叼著幽燈在岔路回望；燈光投出錯誤出口，但真路的草仍向另一側傾斜。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"魔獸","element":"蝕星","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"scout","owned":true,"form":"initial"},{"id":"pet_r58","name":"銹齒穴鼬","rarity":"R","image":"reports/chaos-demon-court/images/r_2-initial-original.png","description":"牠用前爪卸下路橋一顆螺栓；橋板微沉，銹粉留下可追查足跡。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"魔獸","element":"灰律銅機","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"gatherer","owned":true,"form":"initial"},{"id":"pet_r59","name":"緘信墨梟","rarity":"R","image":"reports/chaos-demon-court/images/r_3-initial-revision-1.png","description":"牠用爪壓住未送達的信，低頭吹去封口光；封蠟影子化作黑羽，紙面仍保留收件者痕跡。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"魔獸","element":"蝕星","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"scholar","owned":true,"form":"initial"},{"id":"pet_r60","name":"逆芽棘兔","rarity":"R","image":"reports/chaos-demon-court/images/r_4-initial-revision-1.png","description":"牠在路標根部種下朝內彎曲的刺芽；刺芽把箭頭拽偏，旁邊正常嫩芽仍向陽。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"魔獸","element":"黯棘／逆芽","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"gatherer","owned":true,"form":"initial"},{"id":"pet_r61","name":"煤焰角羊","rarity":"R","image":"reports/chaos-demon-court/images/r_5-initial-original.png","description":"牠用前蹄推動燃煤越過熄火界線；一條低矮火帶封路，火外石碑仍清晰可讀。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"魔獸","element":"餘燼","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"guardian","owned":true,"form":"initial"},{"id":"pet_n50","name":"微燼小蜥","rarity":"N","image":"reports/chaos-demon-court/images/n_1-initial-original.png","description":"牠趴在餘燼旁吹動一顆火星；火星沿石縫串起短紅線。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"魔獸","element":"餘燼","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"guardian","owned":true,"form":"initial"},{"id":"pet_n51","name":"碎冠甲蟲","rarity":"N","image":"reports/chaos-demon-court/images/n_2-initial-original.png","description":"牠推著一小片裂冠穿過石階；碎片留下金黑摩擦痕，後方小石块翻起。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"魔獸","element":"灰律銅機","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"gatherer","owned":true,"form":"initial"},{"id":"pet_n52","name":"暮紗幼蛛","rarity":"N","image":"reports/chaos-demon-court/images/n_3-initial-original.png","description":"牠在門縫補好一道銀黑網线；露珠停在網上形成細小預警光點。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"魔獸","element":"黯棘","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"scholar","owned":true,"form":"initial"},{"id":"pet_ur28","name":"黯冠・無晝","rarity":"UR","image":"assets/pets/awakening/pet_ur28-awakened-aad0bb7e6cb4.png","description":"古龍盤踞黑塔石座，以完整前爪壓住七色星路交會的界石，抬頭令裂冠日環吞光；界石裂出紅黑晶脈，七色星路仍各自保留一線抵抗，塔外階石崩裂。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"黯冠古龍","element":"餘燼／蝕星","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"guardian","presentation":{"revealKey":"chaos_crown","revealCaption":"界石 · 黯冠・無晝"},"owned":true,"form":"awakened","imageVariants":{"card":"assets/pets/awakening/pet_ur28-awakened-aad0bb7e6cb4-card.webp","stage":"assets/pets/awakening/pet_ur28-awakened-aad0bb7e6cb4-stage.webp"}},{"id":"pet_ur29","name":"裂月・瑟因","rarity":"UR","image":"assets/pets/awakening/pet_ur29-awakened-78057f120705.png","description":"魔鰩以月刃角穿過潮汐上方的月光，展開完整鰭面劃出一道通道；水幕沿角劃開的線停在半空，北境誓火在通道邊緣留下暖色界線。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"裂月魔鰩","element":"裂月霜潮／蝕星","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"scout","presentation":{"revealKey":"chaos_moon","revealCaption":"潮汐門 · 裂月・瑟因"},"owned":true,"form":"awakened","imageVariants":{"card":"assets/pets/awakening/pet_ur29-awakened-78057f120705-card.webp","stage":"assets/pets/awakening/pet_ur29-awakened-78057f120705-stage.webp"}},{"id":"pet_ur30","name":"終鐘・維爾","rarity":"UR","image":"assets/pets/awakening/pet_ur30-awakened-b05c22b304bb.png","description":"夢蛾停在懸鐘弓架上，以前足抵住鐘舌，翅紋向花庭夢光展開；靜音波紋在花間凝成透明黑玻璃，仍有一朵暖光花抵住封存。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"終鐘夢蛾","element":"蝕星","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"scholar","presentation":{"revealKey":"chaos_bell","revealCaption":"終鐘 · 終鐘・維爾"},"owned":true,"form":"awakened","imageVariants":{"card":"assets/pets/awakening/pet_ur30-awakened-b05c22b304bb-card.webp","stage":"assets/pets/awakening/pet_ur30-awakened-b05c22b304bb-stage.webp"}},{"id":"pet_ssr37","name":"荊誓・洛恩","rarity":"SSR","image":"assets/pets/awakening/pet_ssr37-awakened-1f3d3d993efc.png","description":"角麒以分枝荊角挑開一卷懸浮誓文上的紅線；山路承諾化成帶刺橋索，红线撕裂處仍有一根金線未斷。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"荊誓角麒","element":"黯棘／餘燼","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"guardian","presentation":{"revealKey":"chaos_thorn","revealCaption":"荊誓線 · 荊誓・洛恩"},"owned":true,"form":"awakened","imageVariants":{"card":"assets/pets/awakening/pet_ssr37-awakened-1f3d3d993efc-card.webp","stage":"assets/pets/awakening/pet_ssr37-awakened-1f3d3d993efc-stage.webp"}},{"id":"pet_ssr38","name":"鏡宴・奈璃","rarity":"SSR","image":"assets/pets/awakening/pet_ssr38-awakened-98c5658396a8.png","description":"銀狐以前爪翻動糖晶前的一片裂鏡，回首看向鏡中宴席；鏡宴越華麗，真實糖晶的光越暗，仍有一顆保持暖光。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"鏡宴銀狐","element":"蝕星","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"companion","presentation":{"revealKey":"chaos_mirror","revealCaption":"鏡宴 · 鏡宴・奈璃"},"owned":true,"form":"awakened","imageVariants":{"card":"assets/pets/awakening/pet_ssr38-awakened-98c5658396a8-card.webp","stage":"assets/pets/awakening/pet_ssr38-awakened-98c5658396a8-stage.webp"}},{"id":"pet_ssr39","name":"灰律・奧鉻","rarity":"SSR","image":"assets/pets/awakening/pet_ssr39-awakened-a88de493e815.png","description":"銅鴉用完整雙爪抓住一枚符文齒輪並將其扭停；蒸汽在齒間結成灰晶，遠方獅心爐火仍明亮。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"灰律銅鴉","element":"灰律銅機／餘燼","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"scholar","presentation":{"revealKey":"chaos_law","revealCaption":"律輪 · 灰律・奧鉻"},"owned":true,"form":"awakened","imageVariants":{"card":"assets/pets/awakening/pet_ssr39-awakened-a88de493e815-card.webp","stage":"assets/pets/awakening/pet_ssr39-awakened-a88de493e815-stage.webp"}},{"id":"pet_ssr40","name":"蝕星獄獅","rarity":"SSR","image":"assets/pets/awakening/pet_ssr40-awakened-66bc952921e6.png","description":"獄獅前爪踩住通往城門的光链，低頭咆哮；锁鏈被壓成黑晶，城門外碎星沿地面倒流。","poolTags":["darkcrown_court_release"],"seriesId":"darkcrown_court_release","speciesType":"蝕星獄獅","element":"蝕星","visualTheme":"Dark Fantasy 90s Retro Anime & Pop Anime","expeditionSpecialty":"guardian","presentation":{"revealKey":"chaos_star","revealCaption":"星鏈 · 蝕星獄獅"},"owned":true,"form":"awakened","imageVariants":{"card":"assets/pets/awakening/pet_ssr40-awakened-66bc952921e6-card.webp","stage":"assets/pets/awakening/pet_ssr40-awakened-66bc952921e6-stage.webp"}}];
document.querySelector('#cards').innerHTML=pets.map(p=>renderCollectionCard(p,{eager:true})).join('');window.artReview={count:pets.length};