import { popoverPosition } from '../CampaignMap';

const box = { width: 800, height: 400, popWidth: 280, popHeight: 120 };

describe('popoverPosition', () => {
  it('à droite du repère quand la place le permet, centrée sur lui', () => {
    expect(popoverPosition({ x: 100, y: 200, r: 10 }, box)).toEqual({ left: 118, top: 140 });
  });

  it('à gauche près du bord droit', () => {
    expect(popoverPosition({ x: 700, y: 200, r: 10 }, box)).toEqual({ left: 402, top: 140 });
  });

  it('sans sortir de la carte en haut ou en bas', () => {
    expect(popoverPosition({ x: 100, y: 10, r: 10 }, box).top).toBe(0);
    expect(popoverPosition({ x: 100, y: 395, r: 10 }, box).top).toBe(280);
  });

  it('téléphone : dessous le repère, sinon dessus, sans le masquer', () => {
    const phone = { width: 340, height: 330, popWidth: 280, popHeight: 100 };
    expect(popoverPosition({ x: 170, y: 100, r: 8 }, phone)).toEqual({ left: 30, top: 116 });
    expect(popoverPosition({ x: 170, y: 280, r: 8 }, phone)).toEqual({ left: 30, top: 164 });
  });
});
