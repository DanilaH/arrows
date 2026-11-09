import Phaser from 'phaser';

export const GAME_PRESENTABLE_EVENT = 'arrows:scene-authored';

/** A procedural startup mark, not a level or a gameplay-parity claim. */
export class BootstrapScene extends Phaser.Scene {
  public constructor() { super('bootstrap'); }

  public create(): void {
    const mark = this.add.graphics();
    const layout = (): void => {
      const { width, height } = this.scale;
      const ratio = 1 / this.scale.zoom;
      const unit = Math.min(width / 12, height / 15, 32 * ratio);
      const x = width / 2;
      const y = height / 2 - 30 * ratio;
      mark.clear();
      mark.lineStyle(3 * ratio, 0xbcb8fa, 1);
      mark.beginPath();
      mark.moveTo(x - unit * 2, y + unit);
      mark.lineTo(x - unit * 2, y - unit);
      mark.lineTo(x + unit * 2, y - unit);
      mark.strokePath();
      mark.beginPath();
      mark.moveTo(x + unit * 1.5, y - unit * 1.5);
      mark.lineTo(x + unit * 2, y - unit);
      mark.lineTo(x + unit * 1.5, y - unit * 0.5);
      mark.strokePath();
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, layout);
    });
    this.game.events.emit(GAME_PRESENTABLE_EVENT);
  }
}
