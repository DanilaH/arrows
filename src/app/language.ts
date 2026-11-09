export type GameLanguage = 'en' | 'ru';
export const normalizeGameLanguage = (value: string | undefined): GameLanguage =>
  value?.toLowerCase().startsWith('ru') ? 'ru' : 'en';

export const copy = {
  ru: {
    title: 'Стрелки', status: 'Нажимай на свободные стрелки',
    loading: 'Загрузка', preparing: 'Подготавливаем игру…',
    failed: 'Не удалось запустить игру', retry: 'Перезапустите приложение.',
    straightName: 'Прямые стрелки', bentName: 'Повороты', hardName: 'Цветок', nightmareName: 'Бабочка',
    chooseField: 'Выбрать поле', restartQuestion: 'Начать заново?', restart: 'Заново', cancel: 'Вернуться',
    noLives: 'Жизни закончились', lives: 'Жизни', next: 'Дальше', win: 'Отлично!',
    tapTip: 'Нажимай на свободные стрелки', zoomTip: 'Приближай двумя пальцами · двигай поле',
    guides: 'Показать направления выхода',
  },
  en: {
    title: 'Arrows', status: 'Tap the arrows with a clear exit',
    loading: 'Loading', preparing: 'Preparing the game…',
    failed: 'Could not start the game', retry: 'Restart the application.',
    straightName: 'Straight arrows', bentName: 'Turns', hardName: 'Flower', nightmareName: 'Butterfly',
    chooseField: 'Choose a board', restartQuestion: 'Start again?', restart: 'Restart', cancel: 'Go back',
    noLives: 'No lives left', lives: 'Lives', next: 'Next', win: 'Well done!',
    tapTip: 'Tap the arrows with a clear exit', zoomTip: 'Pinch to zoom · drag to move',
    guides: 'Show exit directions',
  },
} satisfies Record<GameLanguage, Record<string, string>>;
