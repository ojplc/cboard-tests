import * as helpers from '../helpers';
describe('helpers', () => {
  describe('dataURLtoFile', () => {
    const plainDataUrl = 'data:text/plain;base64,dGVzdGluZw==';
    const pngDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    describe('black-box: equivalence classes', () => {
      it('should create a file from dataurl without extension check', () => {
        const file = helpers.dataURLtoFile(plainDataUrl, 'myfile');

        expect(file.name).toBe('myfile');
      });

      it('should create a file with mime extension when checkExtension is true', () => {
        const file = helpers.dataURLtoFile(plainDataUrl, 'myfile', true);

        expect(file.name).toBe('myfile.plain');
      });

      it('should work with image/png mime type', () => {
        const file = helpers.dataURLtoFile(pngDataUrl, 'foto', false);

        expect(file.name).toBe('foto');
        expect(file.type).toBe('image/png');
      });

      it('should append correct extension for image/png', () => {
        const file = helpers.dataURLtoFile(pngDataUrl, 'image', true);

        expect(file.name).toBe('image.png');
      });

      it('should handle dataurl with charset parameter', () => {
        const dataUrl = 'data:text/plain;charset=utf-8;base64,dGVzdGluZw==';
        const file = helpers.dataURLtoFile(dataUrl, 'myfile', true);

        expect(file.name).toBe('myfile.plain');
      });

      it('should set correct type and size', () => {
        const file = helpers.dataURLtoFile(plainDataUrl, 'doc');

        expect(file.type).toBe('text/plain');
        expect(file.size).toBe(7);
      });

      it('should work with empty filename', () => {
        const file = helpers.dataURLtoFile(plainDataUrl, '');

        expect(file.name).toBe('');
      });

      it('should produce empty file for empty base64 content', () => {
        const dataUrl = 'data:text/plain;base64,';
        const file = helpers.dataURLtoFile(dataUrl, 'empty');

        expect(file.name).toBe('empty');
        expect(file.size).toBe(0);
      });

      it('should handle application/json mime type', () => {
        const dataUrl = 'data:application/json;base64,eyJub21lIjoiSm9obiJ9';
        const file = helpers.dataURLtoFile(dataUrl, 'data', true);

        expect(file.type).toBe('application/json');
        expect(file.name).toBe('data.json');
      });
    });

    describe('white-box: branch and statement coverage', () => {
      it('should not modify name when checkExtension is false', () => {
        const file = helpers.dataURLtoFile(plainDataUrl, 'arquivo', false);

        expect(file.name).toBe('arquivo');
      });

      it('should append extension when checkExtension is true', () => {
        const file = helpers.dataURLtoFile(plainDataUrl, 'arquivo', true);

        expect(file.name).toBe('arquivo.plain');
      });

      it('should lowercase the mime extension', () => {
        const dataUrl =
          'data:image/PNG;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const file = helpers.dataURLtoFile(dataUrl, 'img', true);

        expect(file.name).toBe('img.png');
      });

      it('should return a File instance with all statements executed', () => {
        const dataUrl = 'data:text/html;base64,PGh0bWw+PC9odG1sPg==';
        const file = helpers.dataURLtoFile(dataUrl, 'page');

        expect(file).toBeInstanceOf(File);
        expect(file.name).toBe('page');
        expect(file.type).toBe('text/html');
        expect(file.size).toBeGreaterThan(0);
      });

      it('should correctly decode larger base64 content with multiple loop iterations', () => {
        const svg =
          '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>';
        const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
        const file = helpers.dataURLtoFile(dataUrl, 'shape', true);

        expect(file.name).toBe('shape.svg+xml');
        expect(file.type).toBe('image/svg+xml');
      });
    });
  });
});
