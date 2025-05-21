// src/utils/geminiService.test.js
import { generateNoteFromImage } from './geminiService';

describe('geminiService', () => {
  describe('generateNoteFromImage', () => {
    it('should return the expected hardcoded note structure after a delay', async () => {
      const fakeImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA'; // Minimal fake image data

      // Spy on console.log to ensure it's called, if desired
      const consoleSpy = jest.spyOn(console, 'log');

      const startTime = Date.now();
      const note = await generateNoteFromImage(fakeImageData);
      const endTime = Date.now();

      // Check that the function took at least 1 second (simulated delay)
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);

      // Check the structure of the returned object
      expect(note).toBeInstanceOf(Object);
      expect(note).toHaveProperty('title');
      expect(note).toHaveProperty('description');
      expect(note).toHaveProperty('content');
      expect(note).toHaveProperty('tags');

      // Check the types of the properties
      expect(typeof note.title).toBe('string');
      expect(typeof note.description).toBe('string');
      expect(typeof note.content).toBe('string');
      expect(Array.isArray(note.tags)).toBe(true);

      // Check specific values from the hardcoded response
      expect(note.title).toBe("AI-Generated Grocery List");
      expect(note.description).toBe("Based on the uploaded image of handwritten notes.");
      expect(note.content).toBe("- Milk\n- Eggs\n- Bread\n- Coffee");
      expect(note.tags).toEqual(["groceries", "shopping", "ai-generated"]);
      
      // Ensure console.log was called (optional, but good for checking simulation messages)
      expect(consoleSpy).toHaveBeenCalledWith('Simulating Gemini API call with image data:', fakeImageData);
      expect(consoleSpy).toHaveBeenCalledWith('Simulated Gemini API response:', note);

      // Clean up the spy
      consoleSpy.mockRestore();
    });

    it('should handle being called without image data (though current impl uses it only for logging)', async () => {
        // The current implementation doesn't strictly require imageData for the simulation to work,
        // but it's passed to console.log.
        const note = await generateNoteFromImage(null);
        expect(note).toBeDefined();
        expect(note.title).toBe("AI-Generated Grocery List"); // Check one field to confirm it ran
    });
  });
});
