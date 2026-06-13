import Dexie, { type EntityTable } from 'dexie';

// Описание одной задачи — как она хранится в базе.
export interface Task {
  id: number;            // уникальный номер, Dexie проставит сам (++)
  title: string;         // название — единственное обязательное при добавлении
  durationMin: number;   // длительность в минутах (по умолчанию 30)
  date: string;          // на какой день, формат "YYYY-MM-DD" (например "2026-06-13")
  done: boolean;         // выполнена или нет
  order: number;         // порядок в списке (для сортировки/перетаскивания)
  createdAt: number;     // когда создана — метка времени (Date.now()), служебное
}

// Создаём базу данных в браузере (IndexedDB) с именем "adhd-planner".
export const db = new Dexie('adhd-planner') as Dexie & {
  tasks: EntityTable<Task, 'id'>;
};

// Версия 1 схемы. Перечисляем поля, по которым хотим быстро искать/сортировать.
// "++id" = автонумерация. Остальные — индексы для выборок (по дате, статусу и т.д.).
db.version(1).stores({
  tasks: '++id, date, done, order, createdAt',
});
