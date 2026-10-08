/** Add the four authored bond chapters required for every newly published pet. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { validateBondStories } from '../src/bondStoryCatalog.js';

const root = path.resolve(import.meta.dirname, '..');
const series = path.join(root, 'content/pet-series/sunward_letters');
const pets = JSON.parse(await fs.readFile(path.join(series, 'pets.json'))).pets;
const lorePath = path.join(series, 'pets-lore.json');
const catalog = JSON.parse(await fs.readFile(lorePath));
const details = {
  pet_n41: ['麥穗鈴結', '風向、鈴聲與乾田埂', '先聽風，再替後來的人繫好路標'],
  pet_n42: ['護信葉脈', '寬葉、濕信與屋簷', '等信紙乾了，才安心踏上下一段路'],
  pet_n43: ['露痕小石', '高石階、積水與細長露痕', '讓走得慢的人也能留下清楚方向'],
  pet_r44: ['穩樁藍結', '木樁、滑坡與藍布', '先穩住腳下，再用力拉直路標'],
  pet_r45: ['簷影布羽', '屋簷、樹梢與晴色布帶', '把高處的訊號放回地上看得見的位置'],
  pet_r46: ['導流木片', '破岸、低水道與乾草苗', '先讓水有出口，才讓大家有路可走'],
  pet_sr38: ['晴布角記', '高石、晴布與向乾路延伸的影子', '把藏起來的晴布交給迷路的夥伴'],
  pet_sr39: ['雙響羽記', '霧樹、路標與第二個回音', '多等一次回音，分清回聲與回答'],
  pet_sr40: ['信筒紅結', '溪流、乾石與紅繩信筒', '先把信送上岸，再帶大家一起渡溪'],
  pet_ssr27: ['折光色邊', '岔路、水珠與不同顏色的布標', '讓漂亮的顏色真正指向不同道路'],
  pet_ssr28: ['雙路繩環', '繩結、鹿角與兩條通道', '讓匆忙的人和需要休息的人各有道路'],
  pet_ur21: ['晴界路線片', '長幅路線布、陽光與連續的地面路標', '從天空看見全圖，也記得每一步的落點'],
};

for (const pet of pets) {
  const entry = catalog.lore.find((row) => row.id === pet.id);
  const [keepsake, place, promise] = details[pet.id] || [];
  if (!entry || !keepsake) throw new Error(`Missing story input: ${pet.id}`);
  const chapters = [2, 3, 4, 5].map((level, index) => ({
    level,
    title: [`在${place.split('、')[0]}相遇`, '那次走錯的路', '一起留下的記號', '給下一位旅人的信'][index],
    paragraphs: [
      entry.bondUnlocks[String(level)],
      [
        `你和${pet.name}停在${place}旁。牠先讓你看清眼前的路，再說：「${entry.dialogues.normal[0]}」`,
        `${pet.name}沒有略過那次失誤。你聽完牠的經歷，也知道牠現在選擇${promise}。`,
        `你們重回${place}旁，把各自看見的方向放在一起；牠說：「${entry.dialogues.important[0]}」`,
        `${pet.name}把「${keepsake}」交到你手中。${promise}，從此是你們共同記得的約定。`,
      ][index],
    ],
    invitation: `和${pet.name}完成一項自己選定的任務或習慣，再一起練習：${promise}。`,
    choices: [
      { id: 'gentle', label: '我們先聽聽彼此看見了什麼。', reply: `${pet.name}靠近你說：「${entry.dialogues.bondUp[0]}」` },
      { id: 'steady', label: '把今天這一步走穩。', reply: `${pet.name}看著路標說：「${entry.dialogues.normal[(index + 1) % entry.dialogues.normal.length]}」` },
    ],
    ending: `${pet.name}和你完成了這段約定，說：「${entry.dialogues.praise[index]}」${level === 5 ? `你收下「${keepsake}」，也答應把方向留給下一位旅人。` : '你們把這一步記在旅圖上，等下次再出發。'}`,
  }));
  const story = {
    petId: pet.id,
    title: `${pet.name}的晴信同行故事`,
    keepsake: { name: keepsake, description: `從${place}留下的小小紀念。它提醒你和${pet.name}：${promise}。` },
    chapters,
  };
  const errors = validateBondStories({ schemaVersion: 1, stories: [story] }, [pet]);
  if (errors.length) throw new Error(`${pet.id}: ${errors.join('; ')}`);
  if (entry.bondJourneyStory && JSON.stringify(entry.bondJourneyStory) !== JSON.stringify(story)) {
    throw new Error(`Existing story differs: ${pet.id}`);
  }
  entry.bondJourneyStory = story;
}

await fs.writeFile(lorePath, JSON.stringify(catalog, null, 2) + '\n');
console.log(`Completed ${pets.length} reviewed bond story inputs`);
