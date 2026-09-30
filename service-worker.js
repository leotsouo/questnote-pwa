/**
 * QuestNote Service Worker — V3.4.11 verified preview cache recovery
 * 快取 App Shell 與靜態資源，支援離線使用
 * data/global-mailbox.json 使用動態 Network First，不進 App Shell precache
 * 作者本機工具（mailbox publisher／pet series builder／summon preview）原始碼不得加入 App Shell precache
 * 寵物圖片不得加入 App Shell precache
 */

const CACHE_NAME = 'questnote-production-app-1f204115bb343502ceb8f978f1160130fec07f7828458116c9447f4cd27f8247';
const PET_IMAGE_CACHE = 'questnote-production-pet-images-v1';
const MAILBOX_RUNTIME_CACHE = 'questnote-production-mailbox-runtime-v1';
const MAILBOX_FETCH_TIMEOUT_MS = 7000;

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let data = {};
    try { data = event.data?.json() || {}; } catch { /* Always show a visible fallback. */ }
    const expired = typeof data.expiresAt === 'number' && data.expiresAt < Date.now();
    await self.registration.showNotification(expired ? 'QuestNote' : String(data.title || 'QuestNote 今日計畫').slice(0, 100), {
      body: expired ? '開啟 QuestNote 查看最新計畫。' : String(data.body || '點開查看今日任務與習慣。').slice(0, 700),
      icon: new URL('assets/brand/questnote-icon-192.png', self.registration.scope).href,
      badge: new URL('assets/brand/questnote-icon-192.png', self.registration.scope).href,
      tag: String(data.tag || 'questnote-daily').slice(0, 100),
      data: { type: 'questnote-open-today' },
    });
  })());
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: false });
    const client = windows.find((c) => c.url.startsWith(self.registration.scope));
    if (client) { await client.focus(); client.postMessage({ type: 'questnote-open-today' }); return; }
    const url = new URL('index.html', self.registration.scope);
    url.searchParams.set('reminder', 'today');
    await self.clients.openWindow(url.href);
  })());
});
// Filled by the release assembler. Source checkouts are not release artifacts.
const BUILD_PROFILE = {
  "schemaVersion": 1,
  "profile": "production",
  "artifactId": "1f204115bb343502ceb8f978f1160130fec07f7828458116c9447f4cd27f8247",
  "sourceCommit": "eb9be8f47343180fa63f6a55ecf2a9d6349b78b6",
  "scopePath": "/questnote-pwa/",
  "runtimeContentSchema": 1,
  "dbName": "QuestNoteDB",
  "cacheNamespace": "questnote-production-",
  "contentBundleSha256": "3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32",
  "contentBundleUrl": "data/releases/3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32/catalog.json"
};
const PRECACHE_HASHES = {
  "assets/brand/questnote-icon-180.png": "568c5f586481050de3c0263794de557f36acb340346eba7db1a9cdc7b000f9bf",
  "assets/brand/questnote-icon-192.png": "7a2c068ff50729b5b68aba6999ffed491234c11a267ddf26ee6f7a5bc0a1db11",
  "assets/brand/questnote-icon-32.png": "0c09c5fef9a6c10f9e10fab7a923d6e84e06972791106a9960bfe062b83952fe",
  "assets/brand/questnote-icon-512.png": "32c505609ea48e4ffab010e2fc53b184441a8bad39d79a45701b658b31040a06",
  "assets/brand/questnote-icon-maskable-512.png": "54dc03e7eb13c3f4714bc276ea2b9bb1313ef171d27e06f6aa1f378931c6f506",
  "assets/brand/questnote-icon-master-1024.png": "45eabdd090efcaee9c9305bca6d559983433c00db41c287f92f66fbac809adf3",
  "assets/expeditions/astral_rift.webp": "343c7342d7156be0fef42c809e0028811a936e2ba478b2785eaf498845dc4d2d",
  "assets/expeditions/harvest_fields.webp": "6196b84c367ff547d91741d36a57ed06aa34e15464ddafb071d4940d0014a29c",
  "assets/expeditions/lava_rift.webp": "9c14dd71f7752f8ca652992659ba929a094512ec5dc34b4d3806b90dabac904e",
  "assets/expeditions/machine_ruins.webp": "14947a69cacfa25522b20159f5f135734fc5eac25f58a55ae9cb09fc3dccd3b1",
  "assets/expeditions/mist_forest.webp": "d97f0f24d8189b4e882b8da213399b5dba992481d97917c196c5d9bbaded8dc1",
  "assets/expeditions/polar_shore.webp": "e963c18f17a9d60746f2601822f7e0ab18be730629b8de9a3fdf546381891506",
  "assets/icons/icon-192.png": "f47dd61d5e26732d2d20aba9051e7ce922449a6095a3715f7e803a2037857fb1",
  "assets/icons/icon-512.png": "8623855b674e1bb7c10525ff0118b0f4b1da5de551753d724238b62db8c403be",
  "assets/icons/lucide/LICENSE": "b495047bd93a9b06913511076f504daba17d5bbeb3e0650f3bb53a4220329c57",
  "assets/icons/lucide/provenance.json": "8464eee7709fe8ba57a1020c0a36b3ecf52175691d9453860322b22997f9ac2c",
  "assets/scenes/garden-graywolf.webp": "6379b2ad98da53856816d0e11b0048af8a9632002a28c3d362f16fa98c2f5cdc",
  "assets/scenes/night-graywolf.webp": "4dd1183fd2aa0db6ac52f845515c3c8e2e0fe2aced5a4a7d6a66732d5c114edb",
  "assets/scenes/twilight-graywolf.webp": "f8000f2b473ec9eedb3bef4e1a34dc8354351041cfc5eb261d80f98271e84f9a",
  "data/achievements.json": "b7d57297344dc4223a8eefc72d42d9f9cdd44c4f812f1e59b3d7aeb2d592db6e",
  "data/categories.json": "166e8f4de44f41d6ec27b3a6b1780f9cd155aa599371b443c92537949276ebe1",
  "data/craftables.json": "7dcac55dcb152e38999596da48281900fdd04db5abd4f3ed6ffd23f9e654d569",
  "data/dailyWheelRewards.json": "98f1fb5b3dc5e49fb0815cf60842bc53fd34e604baf540b4d0e2946929030f12",
  "data/expeditions.json": "20c9ea6a7ddbcf8a0300268c4653a1d7619c8561cabd35d3cf21a3e31be0c7a3",
  "data/materials.json": "2c13faf4c26ed398297ef4a81ccdb6be0bc0bedadb4c8305a466a68437fcb75b",
  "data/pet-series.json": "b176c710383e78b2e0b6d543bfce5d4244438dfabf2b38806c972f9b555dbc57",
  "data/pets-lore.json": "77dce9e5fbab60b01bf31d5b2e73564c4feeadd8f63380c18bebfec128d6123f",
  "data/pets.json": "a90c6afec9c1d7f95f6dff52020ece50c18d820e5c386a0a067618e9b20b9d00",
  "data/pools.json": "4fd1cdc8674e5592b6b2256603bad59b5bf555650c482237eedb6a86b3867fcc",
  "data/releases/3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32/catalog.json": "3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32",
  "data/titles.json": "318675b79872dfabccc4b8beb99f77eb248a40e5e50bbbd4e4dc24886b3a1398",
  "index.html": "59e96a1546e32995724ab074d5d373a2c4bb8c4ba69fb9171cd36e59861e0f39",
  "manifest.webmanifest": "45efb645d3caed544546178ec4b0306f16ea4b5d6ff1874cf220284e739d6d28",
  "src/achievementService.js": "25eba10a95247380c424a59dd539b7c0e55b866992a2eb6404ac74d3fb4b0316",
  "src/adventureHandbookService.js": "d9dc8d34fc08a83c0c2f36682698fd4d96ebd0852c8cb0fde161a5a718d065b9",
  "src/app.js": "7ab42490004bac0be0b4145cc172bb42beb009177c6dc8e913d3a2e5f0797156",
  "src/backupSchema.js": "70448806c5b03d4cca512b9d856300ea9e3683301fd15a2b0aac201d0c0dd80e",
  "src/backupService.js": "e48da4ded47c5e6c984b8f09fcbe5b5f2deb7b8ecb2477c4d0169c11e2c7cfa1",
  "src/bootstrap.js": "975974b344ff1f3e8100eed78a1fafa054b6b549c185dc03cd918dd31be6f08d",
  "src/campService.js": "fee6e4aeafbde7e3d356214099b50523d31089fb00e573c853810c32062a65b1",
  "src/categoryService.js": "8636cdb8453e0a383b813f99d117ead49911353bd6848de05d7f513c28713e32",
  "src/collectionMilestoneService.js": "2f9fe055d3facfb2ce5f6eee96ee0026eb41dab602f27a0eef104402dbe2db5f",
  "src/collectionService.js": "4babc98a28293244bc833788c641fa20dc0aca396eab6aba0f5ba797f35d3da6",
  "src/companionDialogueService.js": "8fe79ef7d7d94e3a654b8f9ee43178cc4fac01bfbf1cc67b53b173be3f17c955",
  "src/companionService.js": "3974b56613aea67e80f7659caa9dbca0d9397f298948f1f98c9e60b8e446d6aa",
  "src/dailyCheckInService.js": "d994210565a779da2265f8a32334dc233a06b4dee037672ef433eb5fa123b62b",
  "src/db.js": "646ad94adfaed2031d1c27a0d2bafb17f3830ef606b6bb091dc54d9ccc604c78",
  "src/deferredRenderGate.js": "cbbaf2e401be35eab6d673a935c13fef615286a554937dc497b02c4aa6aca6e5",
  "src/devService.js": "af56b92e6fcf886786f4a41d777dc355c35c0d0bd4b39fd72fc11217c4238dd4",
  "src/dialogFocus.js": "24eb36d909579732f8b9776c4f2e2a3fec8e112d8e96194257b6b16bee49eecf",
  "src/expeditionGameplay.js": "ece2a8d10bd2416805ac0c5a82ff19d946c26134f02ac9860f2736e590c62f1f",
  "src/expeditionService.js": "a0393db1951029c6496216e3af4c6b771ab35c590ddff74adc44c5c68136581d",
  "src/expeditionStatusService.js": "6e45a6ec8e7b3bfa6018b431991b5540cc214e582e1113fe7636da2f95e141e9",
  "src/explorationService.js": "5ee9429d826df97d8bbe0b89fff95a9accc5aec23cd4d99f0105cb3bfaf0ab8f",
  "src/feedbackConfig.js": "77e9eda8efe76ad2ea3d1d216d10be01bb219c954c6c619e925d8e2aeafe49f7",
  "src/feedbackController.js": "2d1d4956ba24a114bae0fffbe504ab83a55c58194dbf0a83dd3c0d5d774b757e",
  "src/feedbackService.js": "f96898f3d97d6dc86157f65aae8e8f2b763f222b04bf778aab386276d8bb9310",
  "src/gachaService.js": "d631816bfcb980ecbe502cbecf867e0adf65871d00d6ef4e70adce22df9c9bf9",
  "src/gachaTransactionCore.js": "ac2b5db58e2cdec942bb28e0e7b8dae446282fd45518bdf6666fafdc6d579dde",
  "src/glacierArrivalScene.js": "bb3d646a9faaece23f41d29f6248b682fb67e3851e702ac3667f006c02d8b2bb",
  "src/habitService.js": "64d488828c26e49b47ec06d17ad853b473ea21aee2307b0cd5963fb225cc78de",
  "src/healthCheckService.js": "83e35ca90fb51b2029a82adac11cb96a4fec40063ce840081a05fb24092e365f",
  "src/iconPresentation.js": "7968b5b39c17d4e912486df1fc912f93c9d368579ee6e16875ab069e53b46e2a",
  "src/imagePreloadService.js": "73f6488373daac9b4134c4c7a9549da98f4974d3a4987b4698dc4a56680ad333",
  "src/loreService.js": "2beab9e2c2ab3418b16e638e247d1976c916b537e6a7a21d754751c54336541c",
  "src/mailboxSchema.js": "070e2c731ac75a6bdbecfc24afad986d0357e440d1449c374d898d7e0b0ccd15",
  "src/mailboxService.js": "9e2b08feedc9dc73beb9d18bcff62fd722af276c57ab4f79f9bc8d20eccfa0d0",
  "src/onboardingController.js": "e56386ff4457b3a37fd8f3790f502dad75db568079b8ed63c8441c8f4f8b4527",
  "src/onboardingLessons.js": "972c8f06a2d5ccd92662f211568234b7948c20c4b41213e9919f95e3dc3bbe8c",
  "src/onboardingService.js": "4289008c57efc95843d141a33cb2333c0d9af8c1188a3ba4157e2ab2dfd49a6a",
  "src/perfDiagnostics.js": "e6e5e3a4fe72ec00df1bd5469147b07d3d6cf8377e9ec691b2908af2cfd494d7",
  "src/petDataSchema.js": "157323ee04b497c281cb5a5371b298e0e9af40761f3d35a6c303b868698db73b",
  "src/petPoolFilter.js": "8aab1c055fbdcd40209864ab4ec8b489cb284c73bcded88fa8a45e7b4eacb6db",
  "src/poolAwakeningController.js": "9db87f801c43d1fe4a69e8b0c91a119ae0e6622f0d477246b606aa56eabf3b51",
  "src/poolContentContract.js": "9da0023ea8f438ad40fda5dfd36af25839aa7c62259e6372a748e02b45156fc8",
  "src/poolDebutService.js": "e820255c52313e465679be1f1ba2a26492dfe0aca7cbfbd8f3627716552e7f7c",
  "src/poolPresentation.js": "db5c946949ca4336a290d5a7f53049666f759583683be18885965ba68ffe5998",
  "src/poolUnlockCore.js": "2be9a055162feaf7dd521a054e40853c2c3af1106a098708e40d33d2478b2c22",
  "src/poolUnlockService.js": "6e76ffc3c61f002c750435578a7ea5843c91df6f047b2ac2212b50bc150b800a",
  "src/preferencesService.js": "a6ae09d8f8f120a5c7c74da67f73fde022d053a398aed3bb972e343d0fdcc135",
  "src/questIcons.js": "fa0cb1d6c415b3c5812a5d769526050f3fe7fde36a3734d49e09cc622e5959ba",
  "src/questService.js": "93e6c875b21a3fb6cf8d0c0ad2ddae2b4307cee870da3b1b92a2a0969977d8a6",
  "src/releaseCatalog.js": "38ac32aedef26d927638ef7413ec78520c0f9d114623a4a61283d488d99cbb4a",
  "src/releaseProfile.js": "0c74006844e072605d748dfab5b36177f3673391ebb42129d5404cf9a4b2e016",
  "src/reminder-settings.css": "4b5053346fb0bc697af1455fa4a6e763d450045094f94a6f952b0721a385bd4a",
  "src/reminderController.js": "aa658c836712da69273cde043b6894bdc7e93c4556bdd1764a7953e1babd4b10",
  "src/reminderRules.js": "fb8939a256305ef880ecebf063d029dc8a1d37a58e330851b2d96ac001ee57bb",
  "src/reminderService.js": "443462be0699934e7dc731b5a692381acb1f12f1499c237566a16b4ee2c0578b",
  "src/rewardService.js": "a245a6e08e6ead6aa65dc4dbb99e8c767fa81bd210e253955359be1a5442e0ff",
  "src/shareService.js": "04705dbca03c699f62781606b45d8bf483acb7463358750d6c9c4c0da47bcad1",
  "src/styles.css": "d66c91c9344dddacd5bf6ae52104fc7264400cd903d88225ae170007ba038838",
  "src/summon-polish.css": "0d3cbae026034e11034be8ecabc6ff9613a461fbaee616376a26f90f4b924bda",
  "src/summonRevealService.js": "71d4828b6e0c4a89285f63a2781c67e7b96b7966c3e0c98312c4c037c1c1bed4",
  "src/taskFilterService.js": "687858edc36119afcb388fc3fd75ebd058d0a93117da42740c8a1f18d4b00471",
  "src/taskMigration.js": "67055f714b759d43e1a333ce7d039619eca3537f5e83ce46ee76a0d4692f25b1",
  "src/taskService.js": "e12190eb4cf777b79e49d327547544be53af707e1237928b8d7c93c040ceca84",
  "src/taskStatsService.js": "1e61c0f67426459a73b2c6ec405dbfdef87b86840a519518d9f5432fb4d2cbb5",
  "src/theme-refinements.css": "4a83da960089984826727f0537ac4d13071c8cf59918a58e699edb6fe599f705",
  "src/theme-system.css": "72eb36f160c47b5ed950443083371bd68743272c3fe6d1e39dfd1e053a494348",
  "src/themedSummonController.js": "f2bcd1b922da8dee874ee5c2a678378f23841f44287b44b8d2b8f14014b3af6f",
  "src/themeRegistry.js": "e847adc2712293110685bea034d07c91b6e7e4a34964ea91dec92a3f01fdb7ca",
  "src/themeTokens.css": "20fdb5cdd3aee9835a770a4e039012c2684c5e321c7fa117414b7f1edffad3f0",
  "src/twilightPresentation.js": "68373c4d07a5a0dcd682c6bfac1cbd6888f5677e3b38004768a98bea077b8a54",
  "src/ui-polish.css": "d56b6c2dc56782a7833ee96c4573e7a4ffbc7b8580ab9e9e9d0bc08e1fe473f8",
  "src/ui.js": "8d3c2a4f0ea0d2e66c81d1a433562ce825c876fb86445b27c08e68d3b81eaac4",
  "src/uiHelpers.js": "875f08583510e7c246eebeff4b39d6a7273d2643f6a2a2931281672c6c4d7de6",
  "src/version.js": "6880bf8a62641e1f546a94b06dccabeab0eb42862b7e56eb68efaa6dd3a60d25",
  "src/workshopService.js": "9833bf353f6c13072f1c3995e2770408533be4e8ed19ea0d1e481740fb7e2e69"
};

/** 需要預快取的資源（相對於 SW 所在目錄） */
const PRECACHE_URLS = [
  "assets/brand/questnote-icon-180.png",
  "assets/brand/questnote-icon-192.png",
  "assets/brand/questnote-icon-32.png",
  "assets/brand/questnote-icon-512.png",
  "assets/brand/questnote-icon-maskable-512.png",
  "assets/brand/questnote-icon-master-1024.png",
  "assets/expeditions/astral_rift.webp",
  "assets/expeditions/harvest_fields.webp",
  "assets/expeditions/lava_rift.webp",
  "assets/expeditions/machine_ruins.webp",
  "assets/expeditions/mist_forest.webp",
  "assets/expeditions/polar_shore.webp",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/lucide/LICENSE",
  "assets/icons/lucide/provenance.json",
  "assets/scenes/garden-graywolf.webp",
  "assets/scenes/night-graywolf.webp",
  "assets/scenes/twilight-graywolf.webp",
  "data/achievements.json",
  "data/categories.json",
  "data/craftables.json",
  "data/dailyWheelRewards.json",
  "data/expeditions.json",
  "data/materials.json",
  "data/pet-series.json",
  "data/pets-lore.json",
  "data/pets.json",
  "data/pools.json",
  "data/releases/3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32/catalog.json",
  "data/titles.json",
  "index.html",
  "manifest.webmanifest",
  "src/achievementService.js",
  "src/adventureHandbookService.js",
  "src/app.js",
  "src/backupSchema.js",
  "src/backupService.js",
  "src/bootstrap.js",
  "src/campService.js",
  "src/categoryService.js",
  "src/collectionMilestoneService.js",
  "src/collectionService.js",
  "src/companionDialogueService.js",
  "src/companionService.js",
  "src/dailyCheckInService.js",
  "src/db.js",
  "src/deferredRenderGate.js",
  "src/devService.js",
  "src/dialogFocus.js",
  "src/expeditionGameplay.js",
  "src/expeditionService.js",
  "src/expeditionStatusService.js",
  "src/explorationService.js",
  "src/feedbackConfig.js",
  "src/feedbackController.js",
  "src/feedbackService.js",
  "src/gachaService.js",
  "src/gachaTransactionCore.js",
  "src/glacierArrivalScene.js",
  "src/habitService.js",
  "src/healthCheckService.js",
  "src/iconPresentation.js",
  "src/imagePreloadService.js",
  "src/loreService.js",
  "src/mailboxSchema.js",
  "src/mailboxService.js",
  "src/onboardingController.js",
  "src/onboardingLessons.js",
  "src/onboardingService.js",
  "src/perfDiagnostics.js",
  "src/petDataSchema.js",
  "src/petPoolFilter.js",
  "src/poolAwakeningController.js",
  "src/poolContentContract.js",
  "src/poolDebutService.js",
  "src/poolPresentation.js",
  "src/poolUnlockCore.js",
  "src/poolUnlockService.js",
  "src/preferencesService.js",
  "src/questIcons.js",
  "src/questService.js",
  "src/releaseCatalog.js",
  "src/releaseProfile.js",
  "src/reminder-settings.css",
  "src/reminderController.js",
  "src/reminderRules.js",
  "src/reminderService.js",
  "src/rewardService.js",
  "src/shareService.js",
  "src/styles.css",
  "src/summon-polish.css",
  "src/summonRevealService.js",
  "src/taskFilterService.js",
  "src/taskMigration.js",
  "src/taskService.js",
  "src/taskStatsService.js",
  "src/theme-refinements.css",
  "src/theme-system.css",
  "src/themeRegistry.js",
  "src/themeTokens.css",
  "src/themedSummonController.js",
  "src/twilightPresentation.js",
  "src/ui-polish.css",
  "src/ui.js",
  "src/uiHelpers.js",
  "src/version.js",
  "src/workshopService.js"
];

function resolveUrl(path) {
  return new URL(path, self.location.href).href;
}

function isGlobalMailboxRequest(url) {
  const expected = new URL(resolveUrl('data/global-mailbox.json'));
  return url.origin === expected.origin && url.pathname === expected.pathname;
}

function getMailboxCacheRequest() {
  return new Request(resolveUrl('data/global-mailbox.json'));
}

/** 快取比對（忽略 URL query，避免 ?v= 導致離線載入失敗） */
async function matchCached(request, cacheName = CACHE_NAME) {
  const cache = await caches.open(cacheName);
  const direct = await cache.match(request);
  if (direct) return direct;

  const url = new URL(request.url);
  if (!url.search) return null;

  const requests = await cache.keys();
  for (const req of requests) {
    const stored = new URL(req.url);
    if (stored.origin === url.origin && stored.pathname === url.pathname) {
      return cache.match(req);
    }
  }
  return null;
}

function isMutableAppAsset(pathname) {
  return /\.(js|css|json)$/i.test(pathname)
    || pathname.endsWith('/manifest.webmanifest');
}

function isPetImagePath(pathname) {
  return pathname.includes('/assets/pets/');
}

function isImageAsset(pathname) {
  return /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(pathname)
    || pathname.includes('/assets/');
}

async function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(request, { signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 全域信箱 JSON：Network First + timeout + runtime cache fallback
 * 寫入時使用固定 URL key，避免 ?t= 造成無限 cache key
 */
async function networkFirstMailbox(request) {
  const cache = await caches.open(MAILBOX_RUNTIME_CACHE);
  const cacheKey = getMailboxCacheRequest();

  try {
    const response = await fetchWithTimeout(request, MAILBOX_FETCH_TIMEOUT_MS);
    if (response.ok) {
      await cache.put(cacheKey, response.clone());
      return response;
    }
    throw new Error(`Mailbox HTTP ${response.status}`);
  } catch {
    const cached = await cache.match(cacheKey)
      || await matchCached(request, MAILBOX_RUNTIME_CACHE)
      || await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({
      schemaVersion: 1,
      generatedAt: null,
      messages: [],
    }), {
      status: 503,
      statusText: 'Mailbox Offline',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/** 有網路時優先取新版，離線時 fallback 快取 */
async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
      return response;
    }
    throw new Error(`HTTP ${response.status}`);
  } catch {
    const cached = await matchCached(request, CACHE_NAME);
    if (cached) return cached;
    if (request.destination === 'document') {
      const page = await matchCached(new Request(resolveUrl('index.html')));
      if (page) return page;
    }
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

/** 寵物圖片：runtime cache-first，離線仍可顯示曾看過的圖 */
async function cachePetImage(request) {
  const cache = await caches.open(PET_IMAGE_CACHE);
  const cached = await matchCached(request, PET_IMAGE_CACHE);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const fallback = await cache.match(request);
    if (fallback) return fallback;
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

/** 其他圖片：快取優先，離線仍可顯示 */
async function cacheFirst(request) {
  const cached = await matchCached(request, CACHE_NAME);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

async function verifiedPrecacheResponse(path) {
  const request = new Request(resolveUrl(path));
  const cached = await matchCached(request);
  if (cached) return cached;
  // Older workers on a sibling scope and browser eviction can remove our cache.
  // Recover only bytes belonging to this exact release; never trust the live URL alone.
  const expected = PRECACHE_HASHES?.[path];
  if (BUILD_PROFILE && /^[a-f0-9]{64}$/.test(expected || '')) {
    try {
      const response = await fetch(request, { cache: 'no-store' });
      if (!response.ok) throw new Error('Required asset unavailable');
      const digest = await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer());
      const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      if (hash !== expected) throw new Error('Required asset belongs to another release');
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
      return response;
    } catch { /* Keep missing, offline or mixed-generation responses out of the cache. */ }
  }
  return new Response('Verified application cache unavailable. Reconnect, close all QuestNote windows, and reopen.', { status: 503 });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      if (BUILD_PROFILE && new URL('./', self.location.href).pathname !== BUILD_PROFILE.scopePath) {
        throw new Error('Release scope mismatch');
      }
      // Do not touch the cache until every required file has been fetched and verified.
      const entries = await Promise.all(PRECACHE_URLS.map(async (path) => {
        const url = resolveUrl(path);
        const response = await fetch(url, { cache: 'reload' });
        if (!response.ok) throw new Error(`Required asset unavailable: ${path} (${response.status})`);
        if (PRECACHE_HASHES) {
          const digest = await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer());
          const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
          if (hash !== PRECACHE_HASHES[path]) throw new Error(`Required asset mismatch: ${path}`);
        }
        return [url, response];
      }));
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(entries.map(([url, response]) => cache.put(url, response)));
      // Natural activation waits until the previous worker has no clients.
    })()
  );
});

// Deliberately ignore legacy SKIP_WAITING messages from older open tabs.

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => (
            key.startsWith(BUILD_PROFILE?.cacheNamespace || 'questnote-preview-')
            && key !== CACHE_NAME
            && key !== PET_IMAGE_CACHE
            && key !== MAILBOX_RUNTIME_CACHE
          ))
          .map((key) => caches.delete(key))
      );
      // Do not claim already-open uncontrolled pages in the middle of an operation.
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const base = new URL('./', self.location.href);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return;
  const relativePath = url.pathname.slice(base.pathname.length);
  if (/^(devtools|scripts|content|reports|docs)\//.test(relativePath)) return;

  if (isGlobalMailboxRequest(url)) {
    event.respondWith(networkFirstMailbox(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(verifiedPrecacheResponse('index.html'));
    return;
  }

  if (PRECACHE_URLS.includes(relativePath)) {
    // A verified application generation is immutable; online requests must not mix releases.
    event.respondWith(verifiedPrecacheResponse(relativePath));
    return;
  }

  if (BUILD_PROFILE && isMutableAppAsset(url.pathname)) {
    event.respondWith(Promise.resolve(new Response('Asset is outside this release', { status: 503 })));
    return;
  }

  if (isPetImagePath(url.pathname)) {
    event.respondWith(cachePetImage(request));
    return;
  }

  if (isImageAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirstWithCache(request));
});
