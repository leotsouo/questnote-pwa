const testName = `QuestNoteTest-Journey-${crypto.randomUUID()}`;
const nativeOpen = indexedDB.open.bind(indexedDB);
indexedDB.open = (name, version) => {
  if (!['QuestNoteDB', 'QuestNotePreviewDB'].includes(name)) throw new Error('Unexpected database');
  return nativeOpen(testName, version);
};
const output = document.getElementById('test-results');
const results = [];
const assert = (value, message) => { if (!value) throw new Error(message); };
async function test(name, run) {
  try { await run(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.message }); }
  output.textContent = JSON.stringify(results, null, 2);
}
let db;
try {
  assert(['127.0.0.1', 'localhost'].includes(location.hostname), 'Local acceptance only');
  assert(!navigator.serviceWorker.controller, 'Use a dedicated clean test origin');
  const storage = await import('../src/db.js');
  const tasks = await import('../src/taskService.js');
  const collection = await import('../src/collectionService.js');
  const rewards = await import('../src/rewardService.js');
  const backup = await import('../src/backupService.js');
  const journey = await import('../src/companionJourneyService.js');
  db = await storage.openDB();
  assert(db.name === testName, 'Isolation failed');
  await collection.addPetToCollection('pet_n04');
  await collection.setCompanion('pet_n04');
  let first;
  await test('eight overlapping completes commit one reward, memory and companion increment', async () => {
    first = await tasks.createTask({ content: '完成第一份報告', planToday: true, worthRemembering: true });
    const answers = await Promise.all(Array.from({ length: 8 }, () => tasks.toggleTaskComplete(first.id, { completed: true })));
    assert(answers.filter((answer) => answer.reward).length === 1, 'Duplicate rewards');
    assert((await rewards.getWallet()).stardust === 20, 'Wrong wallet');
    const pet = await collection.getPetCollection('pet_n04');
    assert(pet.bondExp === 5 && pet.journeyTaskCount === 1, 'Wrong shared progress');
  });
  await test('undo and redo with a different companion retain the original reward and memory', async () => {
    await tasks.toggleTaskComplete(first.id, { completed: false });
    assert(journey.getTaskMemories(await tasks.getAllTasks()).length === 0, 'Undone memory still visible');
    await collection.addPetToCollection('pet_n01');
    await collection.setCompanion('pet_n01');
    const result = await tasks.toggleTaskComplete(first.id, { completed: true });
    assert(!result.reward, 'Redo rewarded');
    assert(result.task.completionMemory.petId === 'pet_n04', 'Memory attributed to wrong pet');
    assert((await collection.getPetCollection('pet_n01')).bondExp === 0, 'New pet rewarded');
  });
  await test('transaction failure rolls back completion, wallet, bond and memory together', async () => {
    const item = await tasks.createTask({ content: '應保持未完成' });
    const before = JSON.stringify(await storage.readAllStoresSnapshot());
    let rejected = false;
    try {
      await storage.dbMutateRecords([
        { store: 'tasks', key: item.id }, { store: 'meta', key: 'wallet' },
        { store: 'collection', all: true }, { store: 'meta', key: 'taskStats' },
      ], ([task, wallet, pets, stats]) => {
        const plan = rewards.planTaskCompletion(task, wallet, pets, stats, new Date().toISOString());
        plan.puts.push({ store: 'tasks', value: { id: 'bad', unserializable: () => {} } });
        return plan;
      });
    } catch { rejected = true; }
    assert(rejected, 'Expected rejected write');
    assert(JSON.stringify(await storage.readAllStoresSnapshot()) === before, 'Partial completion escaped rollback');
  });
  await test('native backup export/import retains memories, flags, counts and replay protection', async () => {
    const exported = await backup.exportBackup();
    const validation = backup.validateBackup(exported);
    assert(validation.valid, validation.error);
    await backup.importBackup(JSON.parse(JSON.stringify(exported)));
    const restored = await backup.exportBackup();
    assert(JSON.stringify(restored.data) === JSON.stringify(exported.data), 'Backup changed state');
    await tasks.toggleTaskComplete(first.id, { completed: false });
    const result = await tasks.toggleTaskComplete(first.id, { completed: true });
    assert(!result.reward && result.task.completionMemory.petId === 'pet_n04', 'Restore lost replay protection');
  });
  await test('editing the remembrance flag updates history; deleting the task removes its stored title', async () => {
    await tasks.updateTask(first.id, { worthRemembering: false });
    assert(!(await tasks.getTaskById(first.id)).completionMemory.meaningful, 'Flag not updated');
    await tasks.deleteTask(first.id);
    assert(journey.getTaskMemories(await tasks.getAllTasks()).length === 0, 'Deleted task retained in history');
    assert((await collection.getPetCollection('pet_n04')).journeyTaskCount === 1, 'Deletion reset lifetime count');
  });
} catch (error) {
  results.push({ name: 'setup', ok: false, error: error.message });
} finally {
  db?.close();
  indexedDB.open = nativeOpen;
  indexedDB.deleteDatabase(testName);
  output.textContent = JSON.stringify({ passed: results.filter((r) => r.ok).length, total: results.length, results }, null, 2);
}
