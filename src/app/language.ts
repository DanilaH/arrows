export type GameLanguage = 'en' | 'ru';
export const normalizeGameLanguage = (value: string | undefined): GameLanguage =>
  value?.toLowerCase().startsWith('ru') ? 'ru' : 'en';

export const copy = {
  ru: {
    title: 'Стрелки', status: 'Сцена инициализации',
    loading: 'Загрузка', preparing: 'Подготавливаем игру…',
    failed: 'Не удалось запустить игру', retry: 'Перезапустите приложение.',
  },
  en: {
    title: 'Arrows', status: 'Initialization scene',
    loading: 'Loading', preparing: 'Preparing the game…',
    failed: 'Could not start the game', retry: 'Restart the application.',
  },
} satisfies Record<GameLanguage, Record<string, string>>;
