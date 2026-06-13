import { db, type Task } from './database';

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
  date = todayStr(),
): Promise<number> {
  const count = await db.tasks.where('date').equals(date).count();
  const id = await db.tasks.add({
    title: title.trim(),
    durationMin,
    date,
    done: false,
    order: count, // новая задача встаёт в конец списка этого дня
    createdAt: Date.now(),
  } as Task);
  return id as number;
}

// READ — все задачи на конкретный день, в порядке поля order.
export async function getTasksByDate(date = todayStr()): Promise<Task[]> {
  const tasks = await db.tasks.where('date').equals(date).toArray();
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

// DELETE — удалить задачу по id.
export async function deleteTask(id: number): Promise<void> {
  await db.tasks.delete(id);
}
