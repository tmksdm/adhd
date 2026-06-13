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

// Одна строка-настройка приложения: серия (streak) и счётчики.
// Лежит в той же базе, чтобы экспорт/импорт на Этапе 8 выгружал ВСЁ разом.
export interface Meta {
  id: number;            // всегда 1 — строка одна-единственная
  streakCount: number;   // длина текущей серии (дней подряд)
  lastDoneDate: string;  // дата последнего засчитанного дня "YYYY-MM-DD" ("" если ещё не было)
  totalDone: number;     // всего выполнений за всё время (на будущее)
}

// Создаём базу данных в браузере (IndexedDB) с именем "adhd-planner".
export const db = new Dexie('adhd-planner') as Dexie & {
  tasks: EntityTable<Task, 'id'>;
  meta: EntityTable<Meta, 'id'>;
};

// Версия 1 схемы.
db.version(1).stores({
  tasks: '++id, date, done, order, createdAt',
});

// Версия 2: добавили таблицу meta (одна строка с серией).
// Dexie сам обновит существующую базу с v1 до v2 — задачи НЕ потеряются.
db.version(2).stores({
  tasks: '++id, date, done, order, createdAt',
  meta: 'id', // ключ = id, без автонумерации (мы сами кладём id: 1)
});
