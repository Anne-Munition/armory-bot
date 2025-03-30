import { run } from '../temp.js';

let opts: { [key: string]: any };

const mockInteraction = {
  reply: jest.fn(),
  options: {
    getNumber(number: string) {
      return opts[number];
    },
    getString(string: string) {
      return opts[string];
    },
  },
};

describe('temp slash command', () => {
  test('c to f', async () => {
    opts = {
      degrees: 20,
      from: 'c',
      to: 'f',
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await run(mockInteraction);
    expect(mockInteraction.reply).toHaveBeenCalledWith('20*C* = **68*F***');
  });

  test('c to k', async () => {
    opts = {
      degrees: 20,
      from: 'c',
      to: 'k',
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await run(mockInteraction);
    expect(mockInteraction.reply).toHaveBeenCalledWith('20*C* = **293.1*K***');
  });

  test('f to c', async () => {
    opts = {
      degrees: 212,
      from: 'f',
      to: 'c',
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await run(mockInteraction);
    expect(mockInteraction.reply).toHaveBeenCalledWith('212*F* = **100*C***');
  });

  test('f to k', async () => {
    opts = {
      degrees: 22,
      from: 'f',
      to: 'k',
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await run(mockInteraction);
    expect(mockInteraction.reply).toHaveBeenCalledWith('22*F* = **267.5*K***');
  });

  test('k to c', async () => {
    opts = {
      degrees: 800,
      from: 'k',
      to: 'c',
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await run(mockInteraction);
    expect(mockInteraction.reply).toHaveBeenCalledWith('800*K* = **526.8*C***');
  });

  test('k to f', async () => {
    opts = {
      degrees: 800,
      from: 'k',
      to: 'f',
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await run(mockInteraction);
    expect(mockInteraction.reply).toHaveBeenCalledWith('800*K* = **980.3*F***');
  });
});
