import { db, type Task, type Meta } from './database';

// Возвращает сегодняшнюю дату в формате "YYYY-MM-DD" (локальное время, не UTC).
export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// CREATE — добавить задачу. Обязателен только title.
// Остальное подставляется по умолчанию (минимум трения).
export async function addTask(
  title: string,
  durationMin = 30,
): Promise<number> {
  const count = await db.tasks.count();
  const id = await db.tasks.add({
    title: title.trim(),
    durationMin,
    date: todayStr(), // поле оставляем для совместимости/экспорта, но фильтр по нему больше не идёт
    done: false,
    order: count, // новая задача встаёт в конец общего списка
    createdAt: Date.now(),
  } as Task);
  return id as number;
}

// READ — ВСЕ задачи (список «вечный», без привязки ко дню), в порядке поля order.
export async function getAllTasks(): Promise<Task[]> {
  const tasks = await db.tasks.toArray();
  return tasks.sort((a, b) => a.order - b.order);
}

// UPDATE — изменить любые поля задачи по её id.
export async function updateTask(
  id: number,
  changes: Partial<Task>,
): Promise<void> {
  await db.tasks.update(id, changes);
}

// Удобный переключатель "выполнено / не выполнено".
export async function toggleDone(id: number): Promise<void> {
  const task = await db.tasks.get(id);
  if (task) await db.tasks.update(id, { done: !task.done });
}

// Сменить длительность задачи (пресеты 15/30/60 мин).
export async function setDuration(id: number, durationMin: number): Promise<void> {
  await db.tasks.update(id, { durationMin });
}

// DELETE — удалить задачу по id.
export async function deleteTask(id: number): Promise<void> {
  await db.tasks.delete(id);
}

// ===== СЕРИЯ (STREAK) =====

// Прочитать строку meta. Если её ещё нет — создаём с нулями.
export async function getMeta(): Promise<Meta> {
  let meta = await db.meta.get(1);
  if (!meta) {
    meta = { id: 1, streakCount: 0, lastDoneDate: '', totalDone: 0 };
    await db.meta.put(meta);
  }
  return meta;
}

// Вчерашняя дата строкой "YYYY-MM-DD" (для проверки "серия не разорвана").
function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Засчитать выполнение задачи в серию.
// Вызывать ТОЛЬКО когда задачу отметили выполненной (не при снятии галочки).
// Возвращает свежий streakCount + флаг "сегодня засчитали впервые"
// (по нему решаем, показывать ли крупную награду серии).
export async function registerDone(): Promise<{ streak: number; firstToday: boolean }> {
  const meta = await getMeta();
  const today = todayStr();

  // totalDone растёт всегда — это просто счётчик всех выполнений.
  const totalDone = meta.totalDone + 1;

  // Если сегодня уже засчитывали — серию не трогаем, день уже в зачёте.
  if (meta.lastDoneDate === today) {
    await db.meta.update(1, { totalDone });
    return { streak: meta.streakCount, firstToday: false };
  }

  // Первое выполнение сегодня — решаем, продолжается серия или начинается заново.
  let streakCount: number;
  if (meta.lastDoneDate === yesterdayStr()) {
    streakCount = meta.streakCount + 1; // вчера был — серия продолжается
  } else {
    streakCount = 1; // пропуск (или самый первый раз) — тихо начинаем с 1, без наказания
  }

  await db.meta.update(1, {
    streakCount,
    lastDoneDate: today,
    totalDone,
  });
  return { streak: streakCount, firstToday: true };
}

// Удалить ВСЕ выполненные задачи одним махом ("уборка").
// Возвращает, сколько удалили (на случай, если захотим показать).
export async function deleteDoneTasks(): Promise<number> {
  const done = await db.tasks
    .filter((t) => t.done === true)
    .toArray();
  const ids = done.map((t) => t.id);
  await db.tasks.bulkDelete(ids);
  return ids.length;
}

// ===== ЭКСПОРТ / ИМПОРТ (перенос между устройствами одним JSON-файлом) =====

// Формат файла бэкапа. version — версия формата файла (НЕ версия схемы Dexie),
// чтобы в будущем можно было понять структуру старого файла и не сломаться.
export interface BackupFile {
  app: 'adhd-planner';   // метка-подпись, чтобы не импортировать чужой JSON
  version: 1;            // версия формата этого файла
  exportedAt: number;    // когда выгрузили (Date.now()) — для информации
  tasks: Task[];         // все задачи как есть
  meta: Meta[];          // строки meta (там лежит streak!) — массивом на всякий
}

// Собрать ВСЕ данные приложения в один объект для скачивания.
export async function exportAll(): Promise<BackupFile> {
  const tasks = await db.tasks.toArray();
  const meta = await db.meta.toArray();
  return {
    app: 'adhd-planner',
    version: 1,
    exportedAt: Date.now(),
    tasks,
    meta,
  };
}

// Проверить, что разобранный JSON — это действительно наш файл бэкапа.
// Бросает понятную ошибку, если что-то не так (покажем её пользователю).
function validateBackup(data: unknown): asserts data is BackupFile {
  if (!data || typeof data !== 'object') {
    throw new Error('Файл пустой или не похож на резервную копию.');
  }
  const d = data as Record<string, unknown>;
  if (d.app !== 'adhd-planner') {
    throw new Error('Это не файл резервной копии ADHD-планировщика.');
  }
  if (!Array.isArray(d.tasks) || !Array.isArray(d.meta)) {
    throw new Error('Файл повреждён: нет списка задач или настроек.');
  }
}

// ЗАМЕНИТЬ ВСЁ содержимым файла бэкапа (выбранный вариант поведения импорта).
// Всё происходит в одной транзакции: либо заменилось целиком, либо ничего.
export async function importAll(data: unknown): Promise<void> {
  validateBackup(data);
  await db.transaction('rw', db.tasks, db.meta, async () => {
    await db.tasks.clear();
    await db.meta.clear();
    if (data.tasks.length) await db.tasks.bulkAdd(data.tasks);
    if (data.meta.length) await db.meta.bulkAdd(data.meta);
  });
}
