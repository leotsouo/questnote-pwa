/**
 * QuestNote Service Worker — V3.4.11 verified preview cache recovery
 * 快取 App Shell 與靜態資源，支援離線使用
 * data/global-mailbox.json 使用動態 Network First，不進 App Shell precache
 * 作者本機工具（mailbox publisher／pet series builder／summon preview）原始碼不得加入 App Shell precache
 * 寵物圖片不得加入 App Shell precache
 */

const CACHE_NAME = 'questnote-production-app-1a1a51c938ee04c1300caedf019efdd17f8b3a706442d35936bb5b9ff493c842';
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
  "artifactId": "1a1a51c938ee04c1300caedf019efdd17f8b3a706442d35936bb5b9ff493c842",
  "sourceCommit": "377b62ffeef20328b7f3b7ebe9d5acd5ee9b67cc",
  "scopePath": "/questnote-pwa/",
  "runtimeContentSchema": 1,
  "dbName": "QuestNoteDB",
  "cacheNamespace": "questnote-production-",
  "contentBundleSha256": "509f8172c0a5f1f29513b10b9bcf46ef5a64668ef9970d1eac35f16f62f41223",
  "contentBundleUrl": "data/releases/509f8172c0a5f1f29513b10b9bcf46ef5a64668ef9970d1eac35f16f62f41223/catalog.json"
};
const PRECACHE_HASHES = {
  "assets/brand/questnote-icon-180.png": "568c5f586481050de3c0263794de557f36acb340346eba7db1a9cdc7b000f9bf",
  "assets/brand/questnote-icon-192.png": "7a2c068ff50729b5b68aba6999ffed491234c11a267ddf26ee6f7a5bc0a1db11",
  "assets/brand/questnote-icon-32.png": "0c09c5fef9a6c10f9e10fab7a923d6e84e06972791106a9960bfe062b83952fe",
  "assets/brand/questnote-icon-512.png": "32c505609ea48e4ffab010e2fc53b184441a8bad39d79a45701b658b31040a06",
  "assets/brand/questnote-icon-maskable-512.png": "54dc03e7eb13c3f4714bc276ea2b9bb1313ef171d27e06f6aa1f378931c6f506",
  "assets/brand/questnote-icon-master-1024.png": "45eabdd090efcaee9c9305bca6d559983433c00db41c287f92f66fbac809adf3",
  "assets/expeditions/astral_rift.webp": "343c7342d7156be0fef42c809e0028811a936e2ba478b2785eaf498845dc4d2d",
  "assets/expeditions/cloudrest_trail.svg": "7c515cbfa33e475c939c53ff680ebe25c8f5f37f8cd2b4e33771b7a3ac8bffa8",
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
  "data/achievements.json": "776500e4349d56741a41e4ff6b45ccf8cf342c0b2fa41f11496c51d21c9455dc",
  "data/bond-stories.json": "4b6f40038a9477517adbcc80682ae1f0a753afe2217e487e135634e77c15ba35",
  "data/categories.json": "0b541c002a6684818e679e9c4b1925579fa5deeae5174003643b7c2435eb25db",
  "data/craftables.json": "aae00091888b74f3223919ce2f06f72c10f8ee505cf40b565e0054ae789ac19e",
  "data/dailyWheelRewards.json": "caa1634588c66e4ea46ede23ed5c8bdb4a3d5fa0deceed9521d12234477824d8",
  "data/expeditions.json": "9d14ec309b570be01c65c29dfa8236c1f05b8d5447374e562df5a37537f08530",
  "data/gift-affinities.json": "5c4ae4f64bd97acf70d0ac5d229ddf344c6251f4c54c0dbb5fb2ed63da8afee5",
  "data/materials.json": "ef3aa0d8d7833c5c15504634de7680d43a7404a4012a1377d7d540796125c08c",
  "data/pet-series.json": "b176c710383e78b2e0b6d543bfce5d4244438dfabf2b38806c972f9b555dbc57",
  "data/pets-lore.json": "77dce9e5fbab60b01bf31d5b2e73564c4feeadd8f63380c18bebfec128d6123f",
  "data/pets.json": "a90c6afec9c1d7f95f6dff52020ece50c18d820e5c386a0a067618e9b20b9d00",
  "data/pools.json": "4fd1cdc8674e5592b6b2256603bad59b5bf555650c482237eedb6a86b3867fcc",
  "data/releases/509f8172c0a5f1f29513b10b9bcf46ef5a64668ef9970d1eac35f16f62f41223/catalog.json": "509f8172c0a5f1f29513b10b9bcf46ef5a64668ef9970d1eac35f16f62f41223",
  "data/titles.json": "ea884cd1a86ff66a8512ba8016632eaea57ee25d55db3cff2a3afac6dc602fcb",
  "index.html": "6969b040bbc0c31876f138c5194003531bf2ee8de533a6389003f09cffefe53f",
  "manifest.webmanifest": "45efb645d3caed544546178ec4b0306f16ea4b5d6ff1874cf220284e739d6d28",
  "src/achievementService.js": "649b6e56b70a789559dd62650fd849bd5fa665654c244f024dc42760bf17a132",
  "src/adventureHandbookService.js": "6f014241369b1c585ea893741b01ba8618691149401bbf19cb07c5768bc28f92",
  "src/app.js": "79c68aa3024c301975680699179c15ed8e5891b86db4ff70ef8e071f57c52c49",
  "src/backupSchema.js": "7e2db0f0e31da73d8f4a60beef87d7ed270720653ccfd3036f0cbcd2e59c6175",
  "src/backupService.js": "3517f6a465d1f0806fd82882ebc65bd0ca38b25aca7971aa81c414d02e815d16",
  "src/bond-journey.css": "be3fe7bd609e5d497767d29981c9a3b6569d8272e84d6e21cd0b30e729824f9c",
  "src/bondJourneyController.js": "1502a76313d7bc71c55e567455609a195d1d67fc081ecfe609e33bb354602e10",
  "src/bondJourneyCore.js": "58982c5b7926c25a0772be03dc0d128f919c7c0c4eadfe2230b538bdaaf9e81c",
  "src/bondJourneyService.js": "156c790065f6b8a766abcf31f098ecf57113a8fd5c9c50d8e48360597bc95258",
  "src/bondJourneyView.js": "439e5efc4417e5c7513ee3a995285e119450664813e3f5a7636326c9943c6dc9",
  "src/bootstrap.js": "574db152711d0fdc9b744d7cd52a4bd025f594b8550dd32d051dd47359938e44",
  "src/bootstrapRecovery.js": "eb176fdeda0af8c1605c3fdc8f18876028938ce04541154c8faee530732bad34",
  "src/campService.js": "54b82fc8da105b747407ba320f6ca36c94eea5c7597b052f9a577783803a8038",
  "src/categoryService.js": "291e9605c019809dbc706d864f39cc7fc0f49d199c70257b596d77f1f35e6785",
  "src/collectionMilestoneService.js": "b5879ace8a7106a8247a7d6e2e3ae0e99d883943da3b5dcf173b85a8960daa9a",
  "src/collectionService.js": "8d7113f827c1ead4a96e9035d0a37cd95c450917d8cae6cfde485ac7a2464900",
  "src/companionDialogueService.js": "5baf8749030c06f0bf7a9156258976f88e5fd090e9e92f57b4eba641df72a0c3",
  "src/companionService.js": "22ad8636d5d55f879d88e62a22d4bf55c7bf8b149bad897a9b1b9ff2b8c4fd8d",
  "src/dailyCheckInService.js": "161ae6f41c4c11cfff7f03600bd478e8976667c48ce7a76842d547598402797a",
  "src/db.js": "1a7c8a1c8b6513486a2c4b57485a4746cf2bb76d5639704b2c5810f83fe5b980",
  "src/deferredRenderGate.js": "bc61acac0c9e763535a9da3a4341a1ba830147f31615d39f9431228c6ce65bcb",
  "src/devService.js": "74aed8ab9f20de8436fbceebfdab4f7d6c31315d3ee9cb131192fd14b4667b03",
  "src/dialogFocus.js": "5795a512b70013a40981b520534e5fc32dffc3185b26a1c40d67c72a3d67730c",
  "src/expeditionGameplay.js": "35fd8a110ccf27f09c30f8128b49b00bee30b32516ded08fcbd4320d1e6353e4",
  "src/expeditionService.js": "a0393db1951029c6496216e3af4c6b771ab35c590ddff74adc44c5c68136581d",
  "src/expeditionStatusService.js": "3682a96f9df5da9b34b0afb6c944a191a76a8de40b7bbc6b5226636b69b883c4",
  "src/explorationService.js": "49224d065381eafca0b6d27d361da0bce07e33cfadfa3756dd962e9c1a7c6937",
  "src/feedbackConfig.js": "a4d552eeb313ec5c6fb34f04b37b4132e7320c1de71f4a40fd138bdd8eab3827",
  "src/feedbackController.js": "259d2ce58a2749f70971cb6a4846a8adfb1c379b30cbffff92b36e4be5e22c7e",
  "src/feedbackService.js": "b1a8e7b5ce29198557ab8c672e610d9bf5a20d9c2658676152a80e15ff84e11d",
  "src/filterGestureController.js": "afe7a9bc2b5ad8f11d25bdd241f88daa07367ceb070db1db512a3f937bcce64c",
  "src/font-size-settings.css": "c726cdeea1da35ab3a05c5379928a91c5e58412c25de821310ef089ed351f60e",
  "src/gachaService.js": "ef1e5059922b4a2e7ab561484aca2ce9f63a328c68a97af20bf5c9f94288466c",
  "src/gachaTransactionCore.js": "9c56154b44ebaf61d7edb0f254797ca687379583391329ee9bf552eddc369165",
  "src/glacierArrivalScene.js": "31375960b58c559e0b3f297216dcfacea3724e83a38f9e20d3decbbc6855054a",
  "src/habitService.js": "681b4a8fe994a0767c24bc1cdbf7176087873881eb801a08b7adccc7b63e1c07",
  "src/healthCheckService.js": "95c6b0b4ad5a4a039c70fbc128f38e98e1d9161503deb28c4d7c77691b97bad4",
  "src/honeylight-sugar.css": "01b104d69f5f55ca821b8c73b1dd9fbd40a7aed63afc62eb89b79b61d45ae6d6",
  "src/honeylightSugarScene.js": "cf6bc2feee9c2051e3ab464e83253d2062d951c616413fe6aa16e87127a86787",
  "src/iconPresentation.js": "7968b5b39c17d4e912486df1fc912f93c9d368579ee6e16875ab069e53b46e2a",
  "src/imagePreloadService.js": "9d4d35d3522c30e3c85510396f3a8548d3856f3d5a719d54c150c068391f3d0b",
  "src/loreService.js": "1ea30235cd11a9fb76be1d4dfe5574e2ddf989d57fc04a640370d92e46edb91c",
  "src/mailboxSchema.js": "40c409144774634dbc70124d3b74c9f73f94ea944f376759a4fc90f0789f2a15",
  "src/mailboxService.js": "08ba2b599f54d8e9f828b558bfe8a6f4ffc28370e383cdc78d682e82de9d9317",
  "src/onboardingController.js": "b160c7b2da0f3e52da31d8ba420b720f54c0b33f9d2f9e6365880a7196bef1f3",
  "src/onboardingLessons.js": "2bf317d413254ee974e7d23534e3f067fc6e3bb68be23794542aa3eb71319ef6",
  "src/onboardingService.js": "12bd26cea570d3be595f37ac68353198d0812e2ef8ad7125528f7595c197af75",
  "src/perfDiagnostics.js": "ad7c93572b070e9781236930f7fbe00c7ef0913428c7768004175508730f360a",
  "src/petDataSchema.js": "ba760af769f4af280cad971e989a0d64a51a42e0459ecab126c378ffffe84642",
  "src/petPoolFilter.js": "c87b18d9fc84ae173f7648f30e05484b56afb0ff676c465c40b945509602e4f8",
  "src/poolAwakeningController.js": "811e8161b8a80d7cae499c17204d443aab8538104092b6a065ca30fafc049137",
  "src/poolContentContract.js": "2f0ac22d0406c4a6d5f5496ff72fb56ec20bf0b6030e743ab6f98fec03ed20bc",
  "src/poolDebutService.js": "ca57614cf5b132ace575c58b5179be397644a0c93c72d013367b01fe18b906aa",
  "src/poolPresentation.js": "8ceeb36eb66f87277fd9a9d87d07ccd50d20c154345f42fd0443ea684047418f",
  "src/poolUnlockCore.js": "bb8804fc7eeb042acb3bdf9aeb3168861eb27d13981eb7fd2f7377ccc51d6fa0",
  "src/poolUnlockService.js": "277cde79c71d07d444d2c7fec365a0e48688a082a2f980da39fa041352ffb430",
  "src/preferencesService.js": "910e3c2e523cbc2ee7732f1c80e7a996f3d063e26745589989ca2ef6d63bf723",
  "src/questIcons.js": "fa0cb1d6c415b3c5812a5d769526050f3fe7fde36a3734d49e09cc622e5959ba",
  "src/questService.js": "fd5f310a174dd677ec63318a2e3b8e6b9ac3f1fa6f94bca751751f6b1b4e13d6",
  "src/releaseCatalog.js": "1483284705afd533d78d07bdd87f90d29eb20454c004bc624f01f45e51fd9b30",
  "src/releaseProfile.js": "9234ea73226272ddad108d51ab5ecf84d0bafa1a67b7aade29a8d1b1e1a8529d",
  "src/reminder-settings.css": "3332cd2d88fc7e6db264d4b5669ed43334fb48e0538629b0f15afbeeb5c6c88d",
  "src/reminderController.js": "f11298bb890a387e52babc9d19ad2f40ab3d60c40ac97f475bd39a67b1666653",
  "src/reminderRules.js": "7081201ce320e8f29014b4d70544bce839fa0fbe12c7c5d7836df3669f71f622",
  "src/reminderService.js": "0020c416619da8746f8dcd8e0d4105b20698d6974aa74fcc6ff8f2101e2b8ed2",
  "src/rewardService.js": "6651f8c1241af73129b322350ac94fd6b07552c3e48ad65e490b64d624169594",
  "src/shareService.js": "6f2129e111c22b503e655b34c12c67580ae7c9d3955c2957cf4f687b95c6019a",
  "src/styles.css": "9d5a1101293f003b367eb93d1bee6d4d3dee383def308bcb5af9acad5306f73a",
  "src/summon-polish.css": "4638ce67912816bbd4ab14d689efadeb556a4739c8d9844386eb2909ca610b86",
  "src/summonRevealService.js": "cfdbc7d48699373b7a1644dc1fbe9bd01f7134a83c62e013620d0aa91ee705b0",
  "src/swordwild-shanhe.css": "366ac697dd358a9d277cad9a49c97e628394255d2c78305dc66503b56af24852",
  "src/swordwildShanheScene.js": "3c723ec4be07478a5125de310b677380223f2c55e391d50b29cb936fde07fada",
  "src/taskFilterService.js": "01f1177dbf2149fa52c70d9dec519d106d0fe618be3209d05bf84d0d12853063",
  "src/taskMigration.js": "487cd55d7ded84b3809b3015c60ab8d79d122db292c92c9a07091a0a161910ee",
  "src/taskService.js": "b6e5d8328cc3b97a9e5108bb2a81ae67109b9d7a3d23d29e9b716fe1f1c106d2",
  "src/taskStatsService.js": "c07ac5d6c718b362768c86b74c9a1532a19c3112564c18ec13b3b43620cf19f9",
  "src/theme-refinements.css": "2dcbcffd3f0c15bcdb4cc14d9956563ff365e189da5b24507e67c3ecf74edd4d",
  "src/theme-system.css": "ddac0e64f48064321eab8c873a8a8a67e173aa7430d08e3beea89472923459b1",
  "src/themedSummonController.js": "bdec20f49d44b1e061083b3ed3bf8e5121ed24bb39333a85ed6955d470a7d809",
  "src/themeRegistry.js": "1a48b57e0204a71f8a18ae58d939a1a27ae394604544208c673e36c47ad4a90c",
  "src/themeTokens.css": "054866884d3a1ec208fa5ba7bb80231c52a89da169baae9a7a22e44217df31d5",
  "src/todayHabitsView.js": "5045029495d905c7252b142765c2ee8db884090011902fbfd9f0a448624bec4c",
  "src/twilightPresentation.js": "900f87c5277cac37563c2fabb055adc015972c73f21b7d104178219e625f47b9",
  "src/ui-polish.css": "751b7b547b8d511b2f1361edff0e4c2ec2754bd910506fa2ea533b4212651cad",
  "src/ui.js": "ed44ff92a89f0013ad9daf0bf9c09b357b7d4a28089639c9c4ad6c27e80a94d3",
  "src/uiHelpers.js": "97e36e6f1b64b18e4453a94cec7f943990ff9fac3bff399ec268f7a89de0c9e4",
  "src/updateActivity.js": "2cb4d2e9f5b4a77b0e92cd2793e577578914cdc4a5f4c2aee3410838a22526b5",
  "src/updateController.js": "fcf45665a4ed9fa8dc8e14f719e65320ce2de90fe877cfa87245387cfafaa8e4",
  "src/updateProtocol.js": "df73542b7899fb473b91f913bc890463331fbb0832db56289f783c33e9d588a0",
  "src/version.js": "7fe27ed780a2dd6313491a5f606c56cffee029f38064e588a2f962d7ab0bb2ab",
  "src/workshopGiftView.js": "7465474a1ac4ed2270e2d1fe9106760ec3855ea1ca48958c0762861d3ce25f09",
  "src/workshopService.js": "5c1940a3116e93e8e9376a102621f02ff3a58c9d575491e875420dd4890b9480"
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
  "assets/expeditions/cloudrest_trail.svg",
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
  "data/bond-stories.json",
  "data/categories.json",
  "data/craftables.json",
  "data/dailyWheelRewards.json",
  "data/expeditions.json",
  "data/gift-affinities.json",
  "data/materials.json",
  "data/pet-series.json",
  "data/pets-lore.json",
  "data/pets.json",
  "data/pools.json",
  "data/releases/509f8172c0a5f1f29513b10b9bcf46ef5a64668ef9970d1eac35f16f62f41223/catalog.json",
  "data/titles.json",
  "index.html",
  "manifest.webmanifest",
  "src/achievementService.js",
  "src/adventureHandbookService.js",
  "src/app.js",
  "src/backupSchema.js",
  "src/backupService.js",
  "src/bond-journey.css",
  "src/bondJourneyController.js",
  "src/bondJourneyCore.js",
  "src/bondJourneyService.js",
  "src/bondJourneyView.js",
  "src/bootstrap.js",
  "src/bootstrapRecovery.js",
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
  "src/filterGestureController.js",
  "src/font-size-settings.css",
  "src/gachaService.js",
  "src/gachaTransactionCore.js",
  "src/glacierArrivalScene.js",
  "src/habitService.js",
  "src/healthCheckService.js",
  "src/honeylight-sugar.css",
  "src/honeylightSugarScene.js",
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
  "src/swordwild-shanhe.css",
  "src/swordwildShanheScene.js",
  "src/taskFilterService.js",
  "src/taskMigration.js",
  "src/taskService.js",
  "src/taskStatsService.js",
  "src/theme-refinements.css",
  "src/theme-system.css",
  "src/themeRegistry.js",
  "src/themeTokens.css",
  "src/themedSummonController.js",
  "src/todayHabitsView.js",
  "src/twilightPresentation.js",
  "src/ui-polish.css",
  "src/ui.js",
  "src/uiHelpers.js",
  "src/updateActivity.js",
  "src/updateController.js",
  "src/updateProtocol.js",
  "src/version.js",
  "src/workshopGiftView.js",
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

// Legacy SKIP_WAITING stays ignored. Only a deliberate, single-window update
// can activate a fully installed generation; other windows keep their edits.
self.addEventListener('message', (event) => {
  if (!['QUESTNOTE_UPDATE_INFO', 'QUESTNOTE_APPLY_UPDATE'].includes(event.data?.type)) return;
  event.waitUntil((async () => {
    const reply = (data) => event.ports?.[0]?.postMessage(data);
    const scope = self.registration.scope;
    if (!event.source?.id || !event.source.url?.startsWith(scope) || !BUILD_PROFILE) {
      reply({ status: 'unavailable' }); return;
    }
    if (event.data.type === 'QUESTNOTE_UPDATE_INFO') {
      reply({ artifactId: BUILD_PROFILE.artifactId, scopePath: BUILD_PROFILE.scopePath }); return;
    }
    if (event.data.artifactId !== BUILD_PROFILE.artifactId
      || !self.registration.waiting || self.registration.waiting.scriptURL !== self.location.href) {
      reply({ status: 'unavailable' }); return;
    }
    // Eviction may happen after install. Do not switch to an incomplete shell.
    const cache = await caches.open(CACHE_NAME);
    const complete = await Promise.all(PRECACHE_URLS.map(async (path) => {
      const response = await cache.match(resolveUrl(path));
      if (!response?.ok) return false;
      if (!PRECACHE_HASHES) return true;
      const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
      const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      return hash === PRECACHE_HASHES[path];
    }));
    if (complete.some((ok) => !ok)) { reply({ status: 'unavailable' }); return; }
    // includeUncontrolled is needed because a waiting worker has no clients yet.
    const windows = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .filter((client) => client.url.startsWith(scope));
    if (windows.length !== 1 || windows[0].id !== event.source.id) {
      reply({ status: 'other-clients' }); return;
    }
    reply({ status: 'accepted' });
    await self.skipWaiting();
  })().catch(() => event.ports?.[0]?.postMessage({ status: 'unavailable' })));
});

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

