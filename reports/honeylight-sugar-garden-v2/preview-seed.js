// This review tool is served only at a new loopback origin; never included in an artifact.
const button = document.getElementById('seed');
const output = document.getElementById('status');
button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    if (location.hostname !== '127.0.0.1' || !location.port || navigator.serviceWorker.controller
      || (await indexedDB.databases()).length || (await caches.keys()).length
      || (await navigator.serviceWorker.getRegistrations()).length) throw new Error('需要全新隔離預览 origin；不覆蓋任何既有資料。');
    const config = await fetch('/test/config').then((response) => response.json());
    if (config.origin !== location.origin || config.profiles.preview.profile.profile !== 'preview') throw new Error('非隔離 preview profile');
    const profile = config.profiles.preview.profile;
    const root = profile.scopePath;
    const bundle = await fetch(root + profile.contentBundleUrl).then((response) => response.json());
    const cast = bundle.petsData.pets.filter((pet) => pet.seriesId === 'honeylight_sugar_garden_v2');
    if (cast.length !== 12 || cast.filter((pet) => pet.rarity === 'UR').length !== 2) throw new Error('候選不符核准配置');
    const { dbPut, STORES } = await import(root + 'src/db.js');
    const { createCollectionEntry } = await import(root + 'src/collectionService.js');
    const { normalizeGachaStats } = await import(root + 'src/gachaTransactionCore.js');
    const { normalizeOnboardingState } = await import(root + 'src/onboardingService.js');
    await dbPut(STORES.META, { key: 'wallet', stardust: 3000, adventureEnergy: 60 });
    await dbPut(STORES.META, normalizeOnboardingState({ status: 'dismissed' }));
    await dbPut(STORES.META, { key: 'gachaStats', ...normalizeGachaStats({ selectedPoolId: 'honeylight_sugar_garden_v2', poolPity: { honeylight_sugar_garden_v2: { ssrPity: 0, urPity: 99 } } }) });
    for (const pet of cast) await dbPut(STORES.COLLECTION, createCollectionEntry(pet.id));
    output.textContent = '隔離審核資料建立完成：已擁有本池 12 隻、3000 測試星塵、UR 保底 99。此資料只屬於本機 preview，沒有改動正式站。';
    const link = document.createElement('a'); link.href = root; link.textContent = '開啟蜜光糖庭 App 預覽'; output.appendChild(document.createElement('br')); output.appendChild(link);
  } catch (error) { output.textContent = error.message; }
});
