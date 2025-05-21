// src/utils/geminiService.test.js
import { generateNoteFromImage } from './geminiService';

describe('geminiService', () => {
  describe('generateNoteFromImage', () => {
    const fakeImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA'; // Minimal fake image data
    const mockApiKey = 'test-api-key';

    it('should return the expected hardcoded note structure when API key is provided', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const startTime = Date.now();
      const note = await generateNoteFromImage(fakeImageData, mockApiKey);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(1000); // Check delay
      expect(note).toBeInstanceOf(Object);
      expect(note).toHaveProperty('title', "AI-Generated Grocery List");
      expect(note).toHaveProperty('description', "Based on the uploaded image of handwritten notes.");
      expect(note).toHaveProperty('content', "- Milk\n- Eggs\n- Bread\n- Coffee");
      expect(note.tags).toEqual(["groceries", "shopping", "ai-generated"]);
      expect(Array.isArray(note.tags)).toBe(true);

      expect(consoleSpy).toHaveBeenCalledWith('Simulating Gemini API call with image data:', fakeImageData);
      expect(consoleSpy).toHaveBeenCalledWith('Using (simulated) API Key:', "********"); // Key is masked
      expect(consoleSpy).toHaveBeenCalledWith('Simulated Gemini API response:', note);
      consoleSpy.mockRestore();
    });

    it('should return a rejected Promise if API key is missing (null)', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      try {
        await generateNoteFromImage(fakeImageData, null);
      } catch (error) {
        expect(error).toEqual({ error: "API key is missing. Cannot call Gemini Service." });
      }
      expect(consoleErrorSpy).toHaveBeenCalledWith("Gemini Service: API key is missing.");
      consoleErrorSpy.mockRestore();
    });

    it('should return a rejected Promise if API key is missing (undefined)', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      try {
        await generateNoteFromImage(fakeImageData, undefined);
      } catch (error) {
        expect(error).toEqual({ error: "API key is missing. Cannot call Gemini Service." });
      }
      expect(consoleErrorSpy).toHaveBeenCalledWith("Gemini Service: API key is missing.");
      consoleErrorSpy.mockRestore();
    });
    
    it('should still work if imageData is null but API key is provided (as per current simulation logic)', async () => {
      // The current simulation doesn't strictly use imageData beyond logging it.
      const note = await generateNoteFromImage(null, mockApiKey);
      expect(note).toBeDefined();
      expect(note.title).toBe("AI-Generated Grocery List");
    });
  });
});
