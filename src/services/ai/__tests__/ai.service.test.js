import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { suggestTitle, refineMythicText } from '../ai.service.js';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const server = setupServer(
  http.post(GEMINI_ENDPOINT, async ({ request }) => {
    const url = new URL(request.url);
    const apiKey = url.searchParams.get('key');

    if (!apiKey) {
      return new HttpResponse(null, { status: 400 });
    }

    const body = await request.json();
    const prompt = body.contents[0].parts[0].text;

    if (prompt.includes('Suggest ONE epic, mythic, or fantasy title')) {
      return HttpResponse.json({
        candidates: [{ content: { parts: [{ text: 'The Eternal Myth' }] } }],
      });
    }

    if (prompt.includes('Rewrite the following paragraph')) {
      return HttpResponse.json({
        candidates: [
          {
            content: {
              parts: [{ text: 'In the age of legends, the sun rose over the silver peaks.' }],
            },
          },
        ],
      });
    }

    return HttpResponse.json({
      candidates: [{ content: { parts: [{ text: 'Default Response' }] } }],
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ai.service', () => {
  const apiKey = 'test-api-key';

  describe('suggestTitle', () => {
    it('returns null if prompt is too short', async () => {
      expect(await suggestTitle('short', apiKey)).toBeNull();
    });

    it('returns suggested title from Gemini', async () => {
      const result = await suggestTitle(
        'This is a long synopsis about a hero in a fantasy world.',
        apiKey
      );
      expect(result).toBe('The Eternal Myth');
    });

    it('sanitizes input before sending to Gemini', async () => {
      let capturedPrompt = '';
      server.use(
        http.post(GEMINI_ENDPOINT, async ({ request }) => {
          const body = await request.json();
          capturedPrompt = body.contents[0].parts[0].text;
          return HttpResponse.json({
            candidates: [{ content: { parts: [{ text: 'Clean Title' }] } }],
          });
        })
      );

      const dirtyPrompt = 'Long synopsis with control characters \x00\x1F and more text...'.padEnd(
        2100,
        '.'
      );
      await suggestTitle(dirtyPrompt, apiKey);

      expect(capturedPrompt).not.toContain('\x00');
      expect(capturedPrompt).not.toContain('\x1F');
      // The total prompt includes the wrapper text, so we check if the dirty part was sliced
      expect(capturedPrompt.length).toBeLessThan(2100);
      expect(capturedPrompt).toContain('Long synopsis with control characters');
    });

    it('returns null if Gemini fails', async () => {
      server.use(
        http.post(GEMINI_ENDPOINT, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );
      const result = await suggestTitle(
        'This is a long synopsis about a hero in a fantasy world.',
        apiKey
      );
      expect(result).toBeNull();
    }, 20000);
  });

  describe('refineMythicText', () => {
    it('returns null if text is too short', async () => {
      expect(await refineMythicText('too short', apiKey)).toBeNull();
    });

    it('returns refined text from Gemini', async () => {
      const result = await refineMythicText(
        'The sun rose over the mountains. It was very beautiful and everyone was happy.',
        apiKey
      );
      expect(result).toBe('In the age of legends, the sun rose over the silver peaks.');
    });

    it('returns null if Gemini response is empty', async () => {
      server.use(
        http.post(GEMINI_ENDPOINT, () => {
          return HttpResponse.json({ candidates: [] });
        })
      );
      const result = await refineMythicText(
        'The sun rose over the mountains. It was very beautiful and everyone was happy.',
        apiKey
      );
      expect(result).toBeNull();
    });
  });
});
